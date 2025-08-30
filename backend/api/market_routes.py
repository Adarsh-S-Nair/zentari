from fastapi import APIRouter, HTTPException
import yfinance as yf
import os
import requests
from typing import Optional

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
    try:
        symbol = (ticker or '').strip().upper()
        if not symbol:
            raise HTTPException(status_code=400, detail="Ticker required")
        info = yf.Ticker(symbol).fast_info
        price = info.get('last_price') or info.get('regularMarketPrice') or None
        currency = info.get('currency') or 'USD'
        if price is None:
            hist = yf.Ticker(symbol).history(period='1d')
            if not hist.empty:
                price = float(hist['Close'].iloc[-1])
        if price is None:
            raise HTTPException(status_code=404, detail="Price not available")

        # Best-effort: ensure a companies row exists for this symbol
        try:
            client = get_client().client
            api_key = os.getenv('FINNHUB_API_KEY')
            if api_key:
                prof = requests.get('https://finnhub.io/api/v1/stock/profile2', params={'symbol': symbol, 'token': api_key}, timeout=6)
                if prof.ok:
                    js = prof.json() or {}
                    name = js.get('name') or symbol
                    web = js.get('weburl') or js.get('url') or None
                    domain = _domain_from_url(web)
                    if domain:
                        # Check by exact domain
                        existing = client.table('companies').select('id').eq('domain', domain).limit(1).execute()
                        if not existing.data:
                            payload = {
                                'name': name,
                                'web_url': web,
                                'domain': domain,
                                'ticker': symbol
                            }
                            try:
                                # Do not send logo_url if it's a generated column
                                client.table('companies').insert(payload).execute()
                            except Exception:
                                # Retry without ticker in case the column doesn't exist
                                payload.pop('ticker', None)
                                client.table('companies').insert(payload).execute()
        except Exception:
            # enrichment is best-effort; ignore failures
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
        q = client.table('companies').select('ticker, price, market_cap, avg_volume_30d, median_dollar_volume_30d, exchange, is_otc, is_etf, is_warrant')
        # Base filters
        q = q.in_('exchange', ['NASDAQ', 'NYSE', 'AMEX']).eq('is_otc', False).eq('is_etf', False).eq('is_warrant', False)
        # Liquidity and price
        q = q.gte('price', 1).gte('median_dollar_volume_30d', min_median_dollar_volume)
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
                'price': float(r.get('price') or 0),
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

