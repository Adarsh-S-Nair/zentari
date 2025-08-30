from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi import BackgroundTasks
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
try:
    # When running under uvicorn with backend on PYTHONPATH
    from supabase_services import (
        get_accounts, get_transactions, get_categories, get_sync,
        get_institutions, get_portfolios, get_orders, get_positions, get_client
    )
    try:
        # Import Plaid items accessor for delete endpoints (not used in tests)
        from plaid_services import get_items  # type: ignore
    except Exception:
        def get_items():  # type: ignore
            raise ImportError('plaid_services not available')
except Exception:
    # Fallback for tests importing backend.* fully-qualified
    from backend.supabase_services import (
        get_accounts, get_transactions, get_categories, get_sync,
        get_institutions, get_portfolios, get_orders, get_positions, get_client
    )
    try:
        from backend.plaid_services import get_items  # type: ignore
    except Exception:
        def get_items():  # type: ignore
            raise ImportError('plaid_services not available')
import os
from datetime import datetime
import json
import calendar

router = APIRouter(prefix="/database", tags=["Database Operations"])

class CreatePortfolioRequest(BaseModel):
    user_id: str = Field(..., description="Auth user id")
    name: str = Field(..., min_length=1, max_length=100)
    starting_balance: int = Field(..., ge=10, le=100000000)
    is_paper: bool = Field(default=True)

    @field_validator('name', mode='before')
    def strip_name(cls, v: str) -> str:
        s = (v or '').strip()
        if not s:
            raise ValueError('name cannot be empty')
        return s


class PlaceOrderRequest(BaseModel):
    portfolio_id: str
    ticker: str
    side: Literal['buy', 'sell']
    order_type: Literal['market', 'limit'] = 'market'
    quantity: int = Field(..., gt=0)
    limit_price: Optional[float] = Field(default=None, gt=0)

    @field_validator('ticker', mode='before')
    def normalize_ticker(cls, v: str) -> str:
        s = (v or '').strip().upper()
        if not s:
            raise ValueError('ticker required')
        return s

@router.get("/user-accounts/{user_id}")
async def get_user_accounts(user_id: str, authorization: Optional[str] = Header(None)):
    """Get all stored accounts for a user from the database, including institution info for frontend display"""
    try:
        accounts_service = get_accounts()
        result = accounts_service.get_by_user(user_id)
        
        if not result["success"]:
            return {"success": True, "accounts": []}
        
        accounts = result["data"] if "data" in result else []
        institution_ids = list({a.get('institution_id') for a in accounts if a.get('institution_id')})
        
        print(f"[DB] Found {len(accounts)} accounts with {len(institution_ids)} unique institution IDs: {institution_ids}")
        
        # Get institution data if needed
        if institution_ids:
            institutions_service = get_institutions()
            institution_map = institutions_service.get_by_ids(institution_ids)
            
            for account in accounts:
                inst = institution_map.get(account.get('institution_id'))
                if inst:
                    account.update({
                        'institution_name': inst.get('name'),
                        'institution_logo': inst.get('logo'),
                        'institution_primary_color': inst.get('primary_color'),
                        'institution_url': inst.get('url')
                    })
        
        return {"success": True, "accounts": accounts}
    except Exception as e:
        print(f"Exception in get_user_accounts for user {user_id}: {str(e)}")
        return {"success": True, "accounts": []}

@router.get("/user-transactions/{user_id}")
async def get_user_transactions(
    user_id: str, 
    limit: int = 100, 
    offset: int = 0, 
    category_ids: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Get all stored transactions for a user from the database"""
    try:
        print(f"[DB] Getting transactions for user {user_id}, limit={limit}, offset={offset}")
        
        # Parse category_ids if provided
        category_filter = None
        if category_ids:
            try:
                category_filter = [cat_id.strip() for cat_id in category_ids.split(',') if cat_id.strip()]
                print(f"[DB] Filtering by categories: {category_filter}")
            except Exception as e:
                print(f"[DB] Error parsing category_ids: {e}")
                category_filter = None
        
        transactions_service = get_transactions()
        result = transactions_service.get_by_user(user_id, limit, offset, category_filter)
        
        if not result["success"]:
            print(f"[DB] Error getting transactions for user {user_id}: {result.get('error')}")
            return {"success": True, "transactions": []}
        
        transactions = result["data"] if "data" in result else []
        print(f"[DB] Found {len(transactions)} transactions for user {user_id}")
        
        return {"success": True, "transactions": transactions}
    except Exception as e:
        print(f"[DB] Exception in get_user_transactions for user {user_id}: {str(e)}")
        return {"success": True, "transactions": []}

@router.get("/debug/transactions")
async def debug_transactions():
    """Debug endpoint to check if there are any transactions in the database"""
    try:
        from supabase_services import get_client
        client = get_client()
        
        # Get total count of transactions
        count_response = client.client.table('transactions').select('id', count='exact').execute()
        total_count = count_response.count if count_response.count is not None else 0
        
        # Get a few sample transactions
        sample_response = client.client.table('transactions').select('*').limit(5).execute()
        sample_transactions = sample_response.data if sample_response.data else []
        
        print(f"[DEBUG] Total transactions in database: {total_count}")
        print(f"[DEBUG] Sample transactions: {sample_transactions}")
        
        return {
            "success": True,
            "total_transactions": total_count,
            "sample_transactions": sample_transactions
        }
    except Exception as e:
        print(f"[DEBUG] Error checking transactions: {e}")
        return {"success": False, "error": str(e)}

@router.get("/categories")
async def fetch_categories(authorization: Optional[str] = Header(None)):
    """Get all categories from the database"""
    try:
        categories_service = get_categories()
        result = categories_service.get_all()
        
        if not result["success"]:
            print(f"[CATEGORIES-API] Error getting categories: {result.get('error')}")
            return {"success": True, "categories": []}
        
        categories = result["categories"] if "categories" in result else []
        return {"success": True, "categories": categories}
    except Exception as e:
        print(f"[CATEGORIES-API] Exception in get_categories: {str(e)}")
        return {"success": True, "categories": []}

@router.delete("/plaid-item/{item_id}")
async def delete_plaid_item(item_id: str, authorization: Optional[str] = Header(None)):
    """Delete a Plaid item and all its associated accounts. First removes from Plaid, then cleans up local database."""
    sync_service = get_sync()
    items_service = get_items()
    accounts_service = get_accounts()
    
    # Get the Plaid item details
    plaid_item_result = sync_service.get_by_item_id(item_id)
    if not plaid_item_result.get("success"):
        raise HTTPException(status_code=404, detail="Plaid item not found")
    
    plaid_item = plaid_item_result["plaid_item"]
    user_id = plaid_item["user_id"]
    access_token = plaid_item.get("access_token")
    
    print(f"[Plaid Cleanup] Deleting Plaid item {item_id} for user {user_id}")
    
    # Step 1: Remove from Plaid first - EXIT EARLY IF THIS FAILS
    if access_token:
        print(f"[Plaid Cleanup] Calling Plaid /item/remove for access_token: {access_token}")
        plaid_result = items_service.remove(access_token)
        if not plaid_result.get("success"):
            error_msg = f"Failed to remove Plaid item {item_id} from Plaid: {plaid_result.get('error')}"
            print(f"[Plaid Cleanup] ERROR: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        print(f"[Plaid Cleanup] Successfully removed Plaid item {item_id} from Plaid")
    else:
        error_msg = f"No access token found for Plaid item {item_id}"
        print(f"[Plaid Cleanup] ERROR: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Step 2: Only proceed with local cleanup if Plaid removal was successful
    accounts_result = accounts_service.get_by_item(item_id)
    if accounts_result.get("success"):
        accounts = accounts_result["data"] if "data" in accounts_result else []
        deleted_count = 0
        
        for account in accounts:
            delete_result = accounts_service.delete(account["id"])
            if delete_result.get("success"):
                deleted_count += 1
                print(f"[Plaid Cleanup] Deleted account {account['id']} ({account.get('name', 'Unknown')})")
        
        print(f"[Plaid Cleanup] Deleted {deleted_count} accounts for item {item_id}")
    
    # Step 3: Delete the Plaid item record
    sync_result = sync_service.delete(user_id, item_id)
    if not sync_result.get("success"):
        print(f"[Plaid Cleanup] Warning: Failed to delete local Plaid item record: {sync_result.get('error')}")
    
    return {"success": True, "message": f"Plaid item {item_id} and all associated accounts deleted"}

@router.delete("/plaid-items/user/{user_id}")
async def delete_all_plaid_items_for_user(user_id: str, authorization: Optional[str] = Header(None)):
    """Delete all Plaid items for a user. Ensures /item/remove is called for all items before database cleanup."""
    sync_service = get_sync()
    
    # Get all Plaid items for the user
    plaid_items_result = sync_service.get_by_user(user_id)
    if not plaid_items_result.get("success"):
        return {"success": True, "message": "No Plaid items found for user"}
    
    plaid_items = plaid_items_result["data"] if "data" in plaid_items_result else []
    if not plaid_items:
        return {"success": True, "message": "No Plaid items found for user"}
    
    print(f"[Plaid Cleanup] Deleting {len(plaid_items)} Plaid items for user {user_id}")
    
    deleted_items = 0
    for plaid_item in plaid_items:
        item_id = plaid_item["item_id"]
        try:
            await delete_plaid_item(item_id, authorization)
            deleted_items += 1
        except Exception as e:
            print(f"[Plaid Cleanup] Error deleting item {item_id}: {e}")
    
    print(f"[Plaid Cleanup] Successfully deleted {deleted_items}/{len(plaid_items)} Plaid items for user {user_id}")
    return {"success": True, "message": f"Deleted {deleted_items} Plaid items for user {user_id}"}

@router.delete("/user/{user_id}")
async def delete_user_completely(user_id: str, authorization: Optional[str] = Header(None)):
    """Delete all user data (Plaid items, accounts, transactions, etc.) and remove the user from Supabase Auth."""
    
    # Step 1: Delete all Plaid items and associated accounts
    plaid_result = await delete_all_plaid_items_for_user(user_id, authorization)
    if not plaid_result.get("success"):
        raise HTTPException(status_code=400, detail="Failed to delete user Plaid items: " + str(plaid_result.get("error")))
    
    # Step 2: Delete user from Supabase Auth
    try:
        from supabase_services import get_client
        client = get_client()
        client.client.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user from Supabase Auth: {e}")
    
    return {"success": True, "message": f"User {user_id} and all associated data deleted."}

@router.patch("/account/{account_id}/auto-sync")
async def update_account_auto_sync(account_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Update the auto_sync column for a specific account."""
    try:
        data = await request.json()
        auto_sync = data.get("auto_sync")
        if auto_sync is None:
            return {"success": False, "error": "Missing 'auto_sync' in request body"}
        
        accounts_service = get_accounts()
        result = accounts_service.update_auto_sync(account_id, auto_sync)
        
        if result.get("success"):
            return {"success": True, "account_id": account_id, "auto_sync": auto_sync}
        else:
            return {"success": False, "error": "Account not found or update failed"}
    except Exception as e:
        print(f"Exception in update_account_auto_sync for account {account_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/user-account-snapshots/{user_id}")
async def get_user_account_snapshots(
    user_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 2000,
    authorization: Optional[str] = Header(None)
):
    """Aggregate account snapshots across all user accounts into a daily total time series.

    Returns items like [{"date": "2024-01-01", "total": 12345.67}]
    """
    try:
        accounts_service = get_accounts()
        result = accounts_service.get_by_user(user_id)
        if not result.get("success"):
            return {"success": True, "series": []}
        accounts = result.get("data") or []
        account_ids = [a.get('id') for a in accounts if a.get('id')]
        if not account_ids:
            return {"success": True, "series": []}

        client = get_client().client
        query = client.table('account_snapshots').select('account_id, current_balance, available_balance, recorded_at')
        # Supabase Python client supports the in_ method
        query = query.in_('account_id', account_ids)
        if start_date:
            query = query.gte('recorded_at', start_date)
        if end_date:
            query = query.lte('recorded_at', end_date)
        # Order ascending for client-side charting
        resp = query.order('recorded_at', desc=False).limit(limit).execute()
        rows = resp.data or []

        # Aggregate by date (YYYY-MM-DD)
        daily = {}
        for r in rows:
            ts = r.get('recorded_at') or ''
            day = str(ts)[:10]
            val = r.get('current_balance')
            if val is None:
                val = r.get('available_balance')
            try:
                val = float(val) if val is not None else 0.0
            except Exception:
                val = 0.0
            daily[day] = daily.get(day, 0.0) + val

        series = [{"date": k, "total": round(v, 2)} for k, v in sorted(daily.items(), key=lambda x: x[0])]
        return {"success": True, "series": series}
    except Exception as e:
        print(f"[DB] Exception in get_user_account_snapshots for user {user_id}: {e}")
        return {"success": True, "series": []}

@router.get("/account/{account_id}/plaid-item")
async def get_account_plaid_item(account_id: str, authorization: Optional[str] = Header(None)):
    """Get the plaid_item (including last_transaction_sync) for a given account_id."""
    accounts_service = get_accounts()
    sync_service = get_sync()
    
    account_result = accounts_service.get_by_id(account_id)
    if not account_result.get("success"):
        return {"success": False, "error": "Account not found"}
    
    account = account_result["data"][0] if account_result.get("data") else None
    if not account:
        return {"success": False, "error": "Account not found"}
    
    item_id = account.get("item_id")
    if not item_id:
        return {"success": False, "error": "Account missing item_id"}
    
    plaid_item_result = sync_service.get_by_item_id(item_id)
    if not plaid_item_result.get("success"):
        return {"success": False, "error": "Plaid item not found"}
    
    plaid_item = plaid_item_result["plaid_item"]
    # Remove sensitive fields
    plaid_item.pop('access_token', None)
    return {"success": True, "plaid_item": plaid_item}

@router.get("/user-plaid-items/{user_id}")
async def get_user_plaid_items(user_id: str, authorization: Optional[str] = Header(None)):
    """Get all plaid_items for a user."""
    try:
        sync_service = get_sync()
        result = sync_service.get_by_user(user_id)
        
        if not result["success"]:
            return {"success": True, "plaid_items": []}
        
        plaid_items = result["data"] if "data" in result else []
        # Remove sensitive fields
        for item in plaid_items:
            item.pop('access_token', None)
        
        return {"success": True, "plaid_items": plaid_items}
    except Exception as e:
        print(f"Exception in get_user_plaid_items for user {user_id}: {str(e)}")
        return {"success": True, "plaid_items": []}

@router.patch("/account/{account_id}/name")
async def update_account_name(account_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Update the name column for a specific account."""
    try:
        data = await request.json()
        name = data.get("name")
        if not name or not name.strip():
            return {"success": False, "error": "Missing or empty 'name' in request body"}
        
        accounts_service = get_accounts()
        result = accounts_service.update_name(account_id, name.strip())
        
        if result.get("success"):
            return {"success": True, "account_id": account_id, "name": name.strip()}
        else:
            return {"success": False, "error": "Account not found or update failed"}
    except Exception as e:
        print(f"Exception in update_account_name for account {account_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.patch("/transaction/{transaction_id}/category")
async def update_transaction_category(transaction_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Update the category_id column for a specific transaction."""
    try:
        data = await request.json()
        category_id = data.get("category_id")
        
        transactions_service = get_transactions()
        result = transactions_service.update_category(transaction_id, category_id)
        
        if result.get("success"):
            return {"success": True, "transaction_id": transaction_id, "category_id": category_id}
        else:
            return {"success": False, "error": "Transaction not found or update failed"}
    except Exception as e:
        print(f"Exception in update_transaction_category for transaction {transaction_id}: {str(e)}")
        return {"success": False, "error": str(e)} 


@router.post("/portfolios")
async def create_portfolio(payload: CreatePortfolioRequest, background_tasks: BackgroundTasks):
    """Create a portfolio row with basic validation. Returns inserted record(s)."""
    try:
        portfolios = get_portfolios()
        result = portfolios.create(
            user_id=payload.user_id,
            name=payload.name,
            starting_balance=payload.starting_balance,
            is_paper=payload.is_paper
        )
        if not result.get('success'):
            raise HTTPException(status_code=400, detail=result.get('error') or 'Failed to create portfolio')
        data = result.get('data') or []
        portfolio = (data[0] if data else None)

        # Fire-and-forget OpenAI greeting in the background
        try:
            # Import lazily to avoid hard dependency during tests
            try:
                from openai_services import get_openai  # type: ignore
            except Exception:
                from backend.openai_services import get_openai  # type: ignore

            def _send_portfolio_creation_message():
                svc = get_openai()
                # Print debug status first
                try:
                    status = svc.debug_status()
                    print(f"[OPENAI] Debug: has_api_key={status.get('has_api_key')} length={status.get('api_key_length')} preview={status.get('api_key_preview')} model={status.get('model')} client_initialized={status.get('client_initialized')} prompts_available={status.get('prompts_available')}")
                except Exception as e:
                    print(f"[OPENAI] Debug status failed: {e}")
                if not svc.is_configured():
                    # Try to initialize if env became available post-import
                    try:
                        svc.ensure_client()
                    except Exception:
                        pass
                    if not svc.is_configured():
                        print("[OPENAI] Skipping call: API not configured")
                        return
                print("[OPENAI] Triggered on portfolio creation")
                # Provide only current holdings in the portfolio context (universe removed)

                # Use the new portfolio strategy template
                resp = svc.send_portfolio_strategy_message(
                    starting_balance=payload.starting_balance,
                    timeframe_months=6,  # Default to 6 months
                    market_cap_constraint="micro-cap stocks (market cap under $300M)",
                    rebalancing_frequency="weekly",
                    portfolio_context=f"Cash: ${payload.starting_balance}\nPositions: None"
                )
                if resp.get('success'):
                    print(f"[OPENAI] Portfolio strategy message sent for ${payload.starting_balance} portfolio")
                    print(f"[OPENAI] Response: {str(resp.get('data'))[:500]}")
                else:
                    err = str(resp.get('error') or '')
                    print(f"[OPENAI] Error: {err}")
                    # Graceful fallback to simple message if templates are unavailable
                    if 'Prompt templates not available' in err:
                        print("[OPENAI] Falling back to simple greeting message")
                        fallback = svc.send_simple_message("Hi")
                        if fallback.get('success'):
                            print(f"[OPENAI] Fallback response: {str(fallback.get('data'))[:500]}")
                        else:
                            print(f"[OPENAI] Fallback error: {fallback.get('error')}")

            background_tasks.add_task(_send_portfolio_creation_message)
        except Exception as e:
            print(f"[OPENAI] Failed to schedule background task: {e}")

        return {"success": True, "portfolio": portfolio}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DB] Exception in create_portfolio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/portfolios/{portfolio_id}/orders")
async def get_portfolio_orders(portfolio_id: str):
    try:
        orders = get_orders()
        result = orders.get_by_portfolio(portfolio_id)
        if not result.get('success'):
            return {"success": True, "orders": []}
        return {"success": True, "orders": result.get('data') or []}
    except Exception as e:
        print(f"[DB] Exception in get_portfolio_orders: {e}")
        return {"success": True, "orders": []}


@router.get("/portfolios/{portfolio_id}/positions")
async def get_portfolio_positions(portfolio_id: str):
    try:
        positions = get_positions()
        result = positions.get_by_portfolio(portfolio_id)
        if not result.get('success'):
            return {"success": True, "positions": []}
        return {"success": True, "positions": result.get('data') or []}
    except Exception as e:
        print(f"[DB] Exception in get_portfolio_positions: {e}")
        return {"success": True, "positions": []}


@router.post("/portfolios/order")
async def place_order(payload: PlaceOrderRequest):
    """Place a simple market/limit order that affects cash and positions."""
    try:
        try:
            dbg_payload = payload.model_dump(exclude_none=True)  # pydantic v2
        except Exception:
            try:
                dbg_payload = payload.dict(exclude_none=True)  # v1 fallback
            except Exception:
                dbg_payload = {
                    'portfolio_id': getattr(payload, 'portfolio_id', None),
                    'ticker': getattr(payload, 'ticker', None),
                    'side': getattr(payload, 'side', None),
                    'order_type': getattr(payload, 'order_type', None),
                    'quantity': getattr(payload, 'quantity', None),
                    'limit_price': getattr(payload, 'limit_price', None),
                }
        print(f"[ORDER] Incoming place_order: {dbg_payload}")
        portfolios = get_portfolios()
        positions = get_positions()
        orders = get_orders()

        # Fetch portfolio
        pf = portfolios.get_by_id(payload.portfolio_id)
        if not pf.get('success') or not pf.get('data'):
            raise HTTPException(status_code=404, detail='Portfolio not found')
        portfolio = pf['data'][0]
        cash = float(portfolio.get('cash_balance') or 0)
        print(f"[ORDER] Portfolio {payload.portfolio_id} current cash: {cash}")

        qty = int(payload.quantity)
        if payload.order_type == 'limit':
            if payload.limit_price is None or payload.limit_price <= 0:
                raise HTTPException(status_code=400, detail='Valid limit_price required for limit orders')
            exec_price = float(payload.limit_price)
        else:
            # For demo we require limit_price as execution for market too, if not provided
            exec_price = float(payload.limit_price or 0)
            if exec_price <= 0:
                raise HTTPException(status_code=400, detail='Execution price required (use limit price)')

        cost = round(exec_price * qty, 2)
        side = payload.side.lower()

        # Resolve company (if schema migrated to company_id)
        company_id = None
        try:
            comp = get_client().client.table('companies').select('id, ticker').eq('ticker', payload.ticker.upper()).limit(1).execute()
            if comp.data:
                company_id = (comp.data[0] or {}).get('id')
        except Exception:
            company_id = None

        # Get existing open position (if any)
        pos_result = positions.get_by_portfolio(payload.portfolio_id)
        print(f"[ORDER] Positions lookup result success={pos_result.get('success')} count={len(pos_result.get('data') or [])}")
        current = None
        if pos_result.get('success'):
            for row in (pos_result.get('data') or []):
                if (row.get('ticker') or '').upper() == payload.ticker:
                    current = row
                    break
                # Support company_id flows
                if company_id and (row.get('company_id') == company_id):
                    current = row
                    break
        print(f"[ORDER] Existing position found? {bool(current)}")

        # Update cash and position logic
        if side == 'buy':
            if cash < cost:
                raise HTTPException(status_code=400, detail='Insufficient cash')
            cash -= cost
            if current:
                # Recompute avg cost
                old_qty = float(current.get('quantity') or 0)
                old_cost = float(current.get('avg_entry_price') or 0) * abs(old_qty)
                new_qty = old_qty + qty
                new_avg = round((old_cost + cost) / new_qty, 6) if new_qty != 0 else exec_price
                up_res = positions.client.update('positions', { 'quantity': new_qty, 'avg_entry_price': new_avg }, { 'id': current['id'] })
                print(f"[ORDER] Update position result: {up_res}")
                if not up_res.get('success'):
                    raise HTTPException(status_code=500, detail='Failed to update position')
            else:
                # Try inserting with company_id first if available
                payload_pos = {
                    'portfolio_id': payload.portfolio_id,
                    'quantity': qty,
                    'avg_entry_price': exec_price,
                    'realized_pnl': 0
                }
                if company_id:
                    payload_pos['company_id'] = company_id
                else:
                    payload_pos['ticker'] = payload.ticker
                ins_res = positions.client.insert('positions', payload_pos)
                print(f"[ORDER] Insert position result: {ins_res}")
                if not ins_res.get('success'):
                    # Fallback: if first attempt used company_id, try legacy ticker; or vice versa
                    try_alt = None
                    if 'company_id' in payload_pos:
                        try_alt = { **payload_pos }
                        try_alt.pop('company_id', None)
                        try_alt['ticker'] = payload.ticker
                    else:
                        if company_id:
                            try_alt = { **payload_pos }
                            try_alt.pop('ticker', None)
                            try_alt['company_id'] = company_id
                    if try_alt is not None:
                        print(f"[ORDER] Insert position retry with alternate schema: {try_alt.keys()}")
                        ins_res2 = positions.client.insert('positions', try_alt)
                        print(f"[ORDER] Insert position retry result: {ins_res2}")
                        if not ins_res2.get('success'):
                            raise HTTPException(status_code=500, detail='Failed to create position')
                    else:
                        raise HTTPException(status_code=500, detail='Failed to create position')
        else:  # sell
            if not current:
                raise HTTPException(status_code=400, detail='No position to sell')
            old_qty = float(current.get('quantity') or 0)
            if qty > old_qty:
                raise HTTPException(status_code=400, detail='Sell quantity exceeds position')
            cash += cost
            new_qty = old_qty - qty
            realized_pnl = float(current.get('realized_pnl') or 0)
            realized_pnl += round((exec_price - float(current.get('avg_entry_price') or 0)) * qty, 2)
            if new_qty == 0:
                # Close position
                del_res = positions.client.delete('positions', { 'id': current['id'] })
                print(f"[ORDER] Delete position result: {del_res}")
                if not del_res.get('success'):
                    raise HTTPException(status_code=500, detail='Failed to close position')
            else:
                up_res = positions.client.update('positions', { 'quantity': new_qty, 'realized_pnl': realized_pnl }, { 'id': current['id'] })
                print(f"[ORDER] Update position (sell) result: {up_res}")
                if not up_res.get('success'):
                    raise HTTPException(status_code=500, detail='Failed to update position')

        # Persist new cash
        pc_res = portfolios.update_cash(payload.portfolio_id, cash)
        print(f"[ORDER] Update cash result: {pc_res}")
        if not pc_res.get('success'):
            raise HTTPException(status_code=500, detail='Failed to persist cash balance')

        # Record order (use ISO timestamps to avoid DB function call issues)
        from datetime import datetime, timezone
        ts = datetime.now(timezone.utc).isoformat()
        order_payload = {
            'portfolio_id': payload.portfolio_id,
            'ticker': payload.ticker,
            'side': side,
            'type': payload.order_type,
            'status': 'filled',
            'quantity': qty,
            'filled_quantity': qty,
            'avg_fill_price': exec_price,
            'limit_price': payload.limit_price,
            'submitted_at': ts,
            'filled_at': ts
        }
        ord_result = orders.client.insert('orders', order_payload)
        print(f"[ORDER] Insert order result: {ord_result}")
        if not ord_result.get('success'):
            print(f"[DB] Failed to insert order: {ord_result.get('error')}")
            raise HTTPException(status_code=500, detail='Failed to record order')

        return { 'success': True }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[DB] Exception in place_order: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail='Internal server error')


@router.get("/user-spending-earning/{user_id}")
async def get_user_spending_earning(
    user_id: str,
    months: int = 6,
    end_date: Optional[str] = None,
    authorization: Optional[str] = Header(None)
):
    """Return monthly income and spending aggregates for the last N months.

    Returns series compatible with the dashboard chart.
    """
    try:
        months = max(1, min(24, int(months or 6)))

        # Determine window end as first day of next month of provided end (exclusive)
        if end_date:
            try:
                if len(end_date) == 7:  # YYYY-MM
                    base = datetime.strptime(end_date + "-01", "%Y-%m-%d")
                else:
                    base = datetime.fromisoformat(end_date)
                end_month = base.month
                end_year = base.year
                # move to first day of next month
                end_dt = datetime(end_year + (end_month // 12), 1 if end_month == 12 else end_month + 1, 1)
            except Exception:
                end_dt = datetime.utcnow()
        else:
            now = datetime.utcnow()
            # first day of next month
            end_dt = datetime(now.year + (now.month // 12), 1 if now.month == 12 else now.month + 1, 1)

        # Start at first day months-1 before end_dt's previous month
        start_month = end_dt.month - (months)
        start_year = end_dt.year
        while start_month <= 0:
            start_month += 12
            start_year -= 1
        start_dt = datetime(start_year, start_month, 1)

        # Labels for each month
        labels = []
        cursor = datetime(start_dt.year, start_dt.month, 1)
        for _ in range(months):
            labels.append(calendar.month_abbr[cursor.month])
            y, m = cursor.year, cursor.month
            cursor = datetime(y + (m // 12), 1 if m == 12 else m + 1, 1)

        # Get user accounts
        accounts_service = get_accounts()
        acc = accounts_service.get_by_user(user_id)
        if not acc.get('success'):
            return {"success": True, "series": []}
        account_ids = [a.get('id') for a in (acc.get('data') or []) if a.get('id')]
        if not account_ids:
            return {"success": True, "series": []}

        # Fetch transactions in window (minimal columns)
        client = get_client().client
        q = client.table('transactions').select('account_id, datetime, amount')
        q = q.in_('account_id', account_ids).gte('datetime', start_dt.isoformat()).lt('datetime', end_dt.isoformat())
        rows = (q.limit(50000).execute().data) or []

        income = {lbl: 0.0 for lbl in labels}
        spending = {lbl: 0.0 for lbl in labels}
        for r in rows:
            ts = r.get('datetime')
            try:
                d = datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
            except Exception:
                continue
            lbl = calendar.month_abbr[d.month]
            if lbl not in income:
                continue
            try:
                amt = float(r.get('amount') or 0)
            except Exception:
                amt = 0.0
            if amt > 0:
                income[lbl] += amt
            elif amt < 0:
                spending[lbl] += abs(amt)

        series = [
            {"id": "Income", "color": "#16a34a", "data": [{"x": l, "y": round(income[l])} for l in labels]},
            {"id": "Spending", "color": "#6366f1", "data": [{"x": l, "y": round(spending[l])} for l in labels]}
        ]

        return {"success": True, "series": series}
    except Exception as e:
        print(f"[DB] Exception in get_user_spending_earning for user {user_id}: {e}")
        return {"success": True, "series": []}