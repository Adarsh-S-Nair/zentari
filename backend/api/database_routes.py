from fastapi import APIRouter, HTTPException, Header, Request, Depends
from typing import Optional
from pydantic import BaseModel, Field, validator
from supabase_services import get_accounts, get_transactions, get_categories, get_sync, get_institutions, get_portfolios
from plaid_services import get_items
import os
from supabase_services import get_client

router = APIRouter(prefix="/database", tags=["Database Operations"])

class CreatePortfolioRequest(BaseModel):
    user_id: str = Field(..., description="Auth user id")
    name: str = Field(..., min_length=1, max_length=100)
    starting_balance: int = Field(..., ge=10, le=100000000)
    is_paper: bool = Field(default=True)

    @validator('name')
    def strip_name(cls, v: str) -> str:
        s = v.strip()
        if not s:
            raise ValueError('name cannot be empty')
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
async def create_portfolio(payload: CreatePortfolioRequest):
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
        return {"success": True, "portfolio": (data[0] if data else None)}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DB] Exception in create_portfolio: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")