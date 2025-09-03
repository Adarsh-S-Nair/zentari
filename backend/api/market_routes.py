from fastapi import APIRouter, HTTPException
import yfinance as yf
import os
import requests
from typing import Optional
from datetime import datetime, timezone, timedelta

try:
    from supabase_services import get_client
except Exception:
    from backend.supabase_services import get_client

router = APIRouter(prefix="/market", tags=["Market Data"]) 


def _domain_from_url(url: str) -> Optional[str]:
    try:
        if not url:
            return None
        s = url.strip()
        if s.startswith('http://') or s.startswith('https://'):
            s = s.split('://', 1)[1]
        host = s.split('/', 1)[0]
        return host.lower()
    except Exception:
        return None


@router.get("/quote/{ticker}")
async def get_quote(ticker: str):
    """
    Return the latest price for a ticker, sourced from the database when fresh.
    If missing or stale, fetch from yfinance, upsert into companies, then return.
    """
    try:
        symbol = (ticker or '').strip().upper()
        if not symbol:
            raise HTTPException(status_code=400, detail="Ticker required")

        client = get_client().client

        # 1) Try DB-first: if we have a fresh latest_price within the staleness window, return it
        STALE_AFTER = int(os.getenv('PRICE_STALE_SECONDS', '300'))  # default 5 minutes
        try:
            db_res = client.table('companies').select('id, ticker, latest_price, latest_price_as_of, latest_price_currency').eq('ticker', symbol).limit(1).execute()
            row = (db_res.data or [None])[0]
        except Exception:
            row = None

        if row:
            price = row.get('latest_price')
            as_of = row.get('latest_price_as_of')
            currency = row.get('latest_price_currency') or 'USD'
            try:
                # Supabase returns ISO timestamp strings
                if isinstance(as_of, str):
                    as_of_dt = datetime.fromisoformat(as_of.replace('Z', '+00:00'))
                elif isinstance(as_of, datetime):
                    as_of_dt = as_of
                else:
                    as_of_dt = None
            except Exception:
                as_of_dt = None
            if price is not None and as_of_dt is not None:
                age = (datetime.now(timezone.utc) - as_of_dt.replace(tzinfo=timezone.utc)).total_seconds()
                if age <= STALE_AFTER:
                    return {"success": True, "ticker": symbol, "price": float(price), "currency": currency}

        # 2) Fetch from yfinance if DB is empty/stale
        info = yf.Ticker(symbol).fast_info
        price = info.get('last_price') or info.get('regularMarketPrice') or None
        currency = info.get('currency') or 'USD'
        if price is None:
            hist = yf.Ticker(symbol).history(period='1d')
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])
        if price is None:
            raise HTTPException(status_code=404, detail="Price not available")

        # 3) Best-effort upsert into companies
        try:
            now = datetime.now(timezone.utc).isoformat()
            if row and row.get('id'):
                # Update existing row by id
                client.table('companies').update({
                    'latest_price': float(price),
                    'latest_price_as_of': now,
                    'latest_price_currency': currency,
                    'latest_price_source': 'yfinance',
                }).eq('id', row['id']).execute()
            else:
                # Try to insert minimal row with ticker, then update price fields
                # Attempt enrichment (best-effort)
                name = symbol
                web = None
                domain = None
                try:
                    api_key = os.getenv('FINNHUB_API_KEY')
                    if api_key:
                        prof = requests.get('https://finnhub.io/api/v1/stock/profile2', params={'symbol': symbol, 'token': api_key}, timeout=6)
                        if prof.ok:
                            js = prof.json() or {}
                            name = js.get('name') or symbol
                            web = js.get('weburl') or js.get('url') or None
                            domain = _domain_from_url(web)
                except Exception:
                    pass

                payload = {'ticker': symbol, 'name': name}
                if web:
                    payload['web_url'] = web
                if domain:
                    payload['domain'] = domain
                try:
                    ins = client.table('companies').insert(payload).execute()
                    new_id = (ins.data or [{}])[0].get('id')
                except Exception:
                    # If insert failed (e.g., row exists), try to locate by ticker
                    sel = client.table('companies').select('id').eq('ticker', symbol).limit(1).execute()
                    new_id = (sel.data or [{}])[0].get('id')
                if new_id:
                    client.table('companies').update({
                        'latest_price': float(price),
                        'latest_price_as_of': now,
                        'latest_price_currency': currency,
                        'latest_price_source': 'yfinance',
                    }).eq('id', new_id).execute()
        except Exception:
            # price caching is best-effort; do not fail the request
            pass

        return {"success": True, "ticker": symbol, "price": float(price), "currency": currency}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/universe")
async def get_universe_candidates(cap: str = 'micro', limit: int = 50, min_median_dollar_volume: int = 300000):
    try:
        limit = max(1, min(200, limit))
        client = get_client().client
        q = client.table('companies').select('ticker, latest_price, market_cap, avg_volume_30d, median_dollar_volume_30d, exchange, is_otc, is_etf, is_warrant')
        # Base filters
        q = q.in_('exchange', ['NASDAQ', 'NYSE', 'AMEX']).eq('is_otc', False).eq('is_etf', False).eq('is_warrant', False)
        # Liquidity and price
        q = q.gte('latest_price', 1).gte('median_dollar_volume_30d', min_median_dollar_volume)
        # Market cap bucket
        if cap == 'micro':
            q = q.lt('market_cap', 300_000_000)
        # Execute and post-filter/sort
        res = q.execute()
        rows = res.data or []
        rows.sort(key=lambda r: int(r.get('avg_volume_30d') or 0), reverse=True)
        universe = [
            {
                'ticker': r.get('ticker'),
                'price': float(r.get('latest_price') or 0),
                'market_cap': float(r.get('market_cap') or 0),
                'avg_volume': int(r.get('avg_volume_30d') or 0),
                'exchange': r.get('exchange'),
            }
            for r in rows
        ][:limit]
        return {"success": True, "universe": universe}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prices")
async def get_prices(tickers: str):
    """
    Batch price fetch. Returns latest prices from DB when fresh; if any are missing or stale,
    refresh from yfinance, upsert into companies, and return the updated values.
    Query param: tickers=CSV like AAPL,MSFT,NVDA
    """
    try:
        if not tickers:
            return {"success": True, "prices": []}
        symbols = [t.strip().upper() for t in tickers.split(',') if t.strip()]
        symbols = list(dict.fromkeys(symbols))  # de-dupe, preserve order
        if not symbols:
            return {"success": True, "prices": []}

        client = get_client().client
        STALE_AFTER = int(os.getenv('PRICE_STALE_SECONDS', '300'))

        # Fetch existing rows in one call
        db_rows = {}
        try:
            sel = client.table('companies').select('id, ticker, latest_price, latest_price_as_of, latest_price_currency').in_('ticker', symbols).execute()
            for r in (sel.data or []):
                db_rows[(r.get('ticker') or '').upper()] = r
        except Exception:
            pass

        out = []
        now = datetime.now(timezone.utc)

        def is_fresh(row) -> bool:
            try:
                as_of = row.get('latest_price_as_of')
                if isinstance(as_of, str):
                    as_dt = datetime.fromisoformat(as_of.replace('Z', '+00:00'))
                elif isinstance(as_of, datetime):
                    as_dt = as_of
                else:
                    return False
                if row.get('latest_price') is None:
                    return False
                age = (now - as_dt.replace(tzinfo=timezone.utc)).total_seconds()
                return age <= STALE_AFTER
            except Exception:
                return False

        # First pass: collect fresh from DB
        for sym in symbols:
            row = db_rows.get(sym)
            if row and is_fresh(row):
                out.append({
                    'ticker': sym,
                    'price': float(row.get('latest_price')),
                    'currency': row.get('latest_price_currency') or 'USD',
                })
            else:
                out.append(None)  # placeholder to fill later

        # Second pass: fetch stale/missing from yfinance and update DB
        for idx, sym in enumerate(symbols):
            if out[idx] is not None:
                continue
            price = None
            currency = 'USD'
            try:
                info = yf.Ticker(sym).fast_info
                price = info.get('last_price') or info.get('regularMarketPrice') or None
                currency = info.get('currency') or 'USD'
                if price is None:
                    hist = yf.Ticker(sym).history(period='1d')
                    if not hist.empty:
                        price = float(hist['Close'].iloc[-1])
            except Exception:
                price = None

            if price is not None:
                out[idx] = { 'ticker': sym, 'price': float(price), 'currency': currency }
                # Upsert into DB best-effort
                try:
                    row = db_rows.get(sym)
                    iso_now = now.isoformat()
                    if row and row.get('id'):
                        client.table('companies').update({
                            'latest_price': float(price),
                            'latest_price_as_of': iso_now,
                            'latest_price_currency': currency,
                            'latest_price_source': 'yfinance',
                        }).eq('id', row['id']).execute()
                    else:
                        # Insert minimal row with ticker
                        ins = client.table('companies').insert({'ticker': sym, 'name': sym}).execute()
                        new_id = (ins.data or [{}])[0].get('id')
                        if not new_id:
                            sel_one = client.table('companies').select('id').eq('ticker', sym).limit(1).execute()
                            new_id = (sel_one.data or [{}])[0].get('id')
                        if new_id:
                            client.table('companies').update({
                                'latest_price': float(price),
                                'latest_price_as_of': iso_now,
                                'latest_price_currency': currency,
                                'latest_price_source': 'yfinance',
                            }).eq('id', new_id).execute()
                except Exception:
                    pass
            else:
                out[idx] = { 'ticker': sym, 'price': None, 'currency': 'USD' }

        return {"success": True, "prices": out}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/update-portfolio-snapshots")
async def update_portfolio_snapshots():
    """Update prices for all companies and create portfolio snapshots using yfinance."""
    try:
        client = get_client().client
        
        # Get all companies that have tickers
        companies_result = client.table('companies').select('id, ticker').not_.is_('ticker', None).execute()
        companies = companies_result.data or []
        
        if not companies:
            return {"success": True, "message": "No companies with tickers found", "updated_count": 0}
        
        updated_count = 0
        errors = []
        
        print(f"Updating prices for {len(companies)} companies...")
        
        # Process companies in batches to avoid overwhelming the API
        batch_size = 10
        for i in range(0, len(companies), batch_size):
            batch = companies[i:i + batch_size]
            
            # Process batch sequentially to avoid async issues
            for company in batch:
                ticker = company.get('ticker')
                if not ticker:
                    continue
                    
                try:
                    print(f"Updating price for {ticker}...")
                    
                    # Get current price using yfinance
                    ticker_obj = yf.Ticker(ticker)
                    info = ticker_obj.fast_info
                    price = info.get('last_price') or info.get('regularMarketPrice')
                    
                    if price is None:
                        # Try getting from history if fast_info doesn't work
                        hist = ticker_obj.history(period='1d')
                        if not hist.empty:
                            price = float(hist['Close'].iloc[-1])
                    
                    if price is not None:
                        # Update the company record
                        update_result = client.table('companies').update({
                            'latest_price': float(price),
                            'latest_price_as_of': 'now()',
                            'latest_price_currency': 'USD',
                            'latest_price_source': 'yfinance'
                        }).eq('id', company.get('id')).execute()
                        
                        if update_result.data:
                            print(f"Updated {ticker} price to ${price}")
                            updated_count += 1
                        else:
                            print(f"Failed to update {ticker} in database")
                            errors.append(f"{ticker}: Database update failed")
                    else:
                        print(f"Could not get price for {ticker}")
                        errors.append(f"{ticker}: Price not available")
                        
                except Exception as e:
                    print(f"Error updating {ticker}: {e}")
                    errors.append(f"{ticker}: {str(e)}")
            
            # Small delay between batches to be respectful to the API
            if i + batch_size < len(companies):
                import time
                time.sleep(1)
        
        print(f"📈 Price update completed. Updated {updated_count}/{len(companies)} companies.")
        if errors:
            print(f"❌ Price update errors encountered: {len(errors)}")
            for error in errors[:5]:  # Show first 5 errors
                print(f"   - {error}")
        else:
            print(f"✅ All {len(companies)} companies updated successfully")
        
        # Now create portfolio snapshots for all portfolios
        print("📊 Starting portfolio snapshots creation...")
        snapshot_count = 0
        skipped_count = 0
        snapshot_errors = []
        
        try:
            # Get all portfolios
            portfolios_result = client.table('portfolios').select('id, cash_balance').execute()
            portfolios = portfolios_result.data or []
            
            print(f"📋 Found {len(portfolios)} portfolios to process")
            
            # Get today's date for checking existing snapshots
            from datetime import datetime, timezone
            today = datetime.now(timezone.utc).date()
            
            for i, portfolio in enumerate(portfolios, 1):
                try:
                    portfolio_id = portfolio.get('id')
                    cash_balance = float(portfolio.get('cash_balance', 0))
                    
                    print(f"🔄 Processing portfolio {i}/{len(portfolios)}: {portfolio_id}")
                    
                    # Check if snapshot already exists for today
                    existing_snapshot = client.table('portfolio_snapshots').select('id').eq('portfolio_id', portfolio_id).gte('recorded_at', f"{today}T00:00:00Z").lt('recorded_at', f"{today}T23:59:59Z").execute()
                    
                    if existing_snapshot.data:
                        print(f"⏭️  Skipping portfolio {portfolio_id} - snapshot already exists for today")
                        skipped_count += 1
                        continue
                    
                    # Get positions for this portfolio with company info
                    positions_result = client.table('positions').select('quantity, avg_entry_price, company_id').eq('portfolio_id', portfolio_id).execute()
                    positions = positions_result.data or []
                    
                    print(f"📈 Portfolio {portfolio_id} has {len(positions)} positions")
                    
                    # Calculate total portfolio value
                    total_value = cash_balance
                    positions_with_prices = 0
                    positions_without_prices = 0
                    
                    for position in positions:
                        quantity = abs(float(position.get('quantity', 0)))
                        company_id = position.get('company_id')
                        
                        # Get current price from companies table using company_id
                        if company_id:
                            company_result = client.table('companies').select('latest_price, ticker').eq('id', company_id).execute()
                            if company_result.data:
                                company_data = company_result.data[0]
                                current_price = float(company_data.get('latest_price', 0))
                                if current_price > 0:
                                    total_value += quantity * current_price
                                    positions_with_prices += 1
                                else:
                                    # Fallback to avg entry price if no current price
                                    avg_price = float(position.get('avg_entry_price', 0))
                                    total_value += quantity * avg_price
                                    positions_without_prices += 1
                    
                    print(f"💰 Portfolio {portfolio_id} calculated value: ${total_value:.2f} (${cash_balance:.2f} cash + ${total_value - cash_balance:.2f} positions)")
                    print(f"📊 Positions: {positions_with_prices} with current prices, {positions_without_prices} using avg prices")
                    
                    # Create portfolio snapshot
                    snapshot_result = client.table('portfolio_snapshots').insert({
                        'portfolio_id': portfolio_id,
                        'recorded_at': 'now()',
                        'total_value': total_value
                    }).execute()
                    
                    if snapshot_result.data:
                        print(f"✅ Created snapshot for portfolio {portfolio_id}: ${total_value:.2f}")
                        snapshot_count += 1
                    else:
                        print(f"❌ Failed to create snapshot for portfolio {portfolio_id}")
                        snapshot_errors.append(f"Portfolio {portfolio_id}: Database insert failed")
                        
                except Exception as e:
                    print(f"❌ Error creating snapshot for portfolio {portfolio.get('id')}: {e}")
                    snapshot_errors.append(f"Portfolio {portfolio.get('id')}: {str(e)}")
                    
        except Exception as e:
            print(f"❌ Error in portfolio snapshot creation: {e}")
            snapshot_errors.append(f"Snapshot creation error: {str(e)}")
        
        print(f"📊 Portfolio snapshots summary:")
        print(f"   ✅ Created: {snapshot_count}")
        print(f"   ⏭️  Skipped: {skipped_count}")
        print(f"   ❌ Errors: {len(snapshot_errors)}")
        
        if snapshot_errors:
            print(f"❌ Snapshot errors encountered:")
            for error in snapshot_errors[:5]:  # Show first 5 errors
                print(f"   - {error}")
        
        return {
            "success": True,
            "message": f"Portfolio snapshots update completed. Updated {updated_count} companies, created {snapshot_count} snapshots, skipped {skipped_count} portfolios.",
            "updated_prices_count": updated_count,
            "created_snapshots_count": snapshot_count,
            "skipped_snapshots_count": skipped_count,
            "total_companies": len(companies),
            "total_portfolios": len(portfolios),
            "price_errors": errors[:10] if errors else [],
            "snapshot_errors": snapshot_errors[:10] if snapshot_errors else []
        }
        
    except Exception as e:
        print(f"Error in update_portfolio_snapshots: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
