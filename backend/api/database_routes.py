from fastapi import APIRouter, HTTPException, Header
from services.supabase_service import get_supabase_service
from typing import Optional
from services.plaid_service import PlaidService

router = APIRouter(prefix="/database", tags=["database"])

@router.get("/user-accounts/{user_id}")
async def get_user_accounts(user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get all stored accounts for a user from the database, including institution info for frontend display
    """
    try:
        supabase_service = get_supabase_service()
        result = supabase_service.get_user_accounts(user_id)
        if not result["success"]:
            return {"success": True, "accounts": []}
        accounts = result["accounts"]
        institution_ids = list({a.get('institution_id') for a in accounts if a.get('institution_id')})
        institution_map = supabase_service.get_institution_data(institution_ids)
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
async def get_user_transactions(user_id: str, limit: int = 100, offset: int = 0, authorization: Optional[str] = Header(None)):
    """
    Get all stored transactions for a user from the database
    """
    try:
        # Get transactions from database
        supabase_service = get_supabase_service()
        result = supabase_service.get_user_transactions(user_id, limit, offset)
        
        if not result["success"]:
            print(f"Error getting transactions for user {user_id}: {result.get('error')}")
            return {"success": True, "transactions": []}  # Return empty instead of error
        
        return {"success": True, "transactions": result["transactions"]}
    except Exception as e:
        print(f"Exception in get_user_transactions for user {user_id}: {str(e)}")
        return {"success": True, "transactions": []}  # Return empty instead of error

@router.get("/categories")
async def get_categories(authorization: Optional[str] = Header(None)):
    """
    Get all categories from the database
    """
    try:
        # Get categories from database
        supabase_service = get_supabase_service()
        result = supabase_service.get_categories()
        
        if not result["success"]:
            print(f"Error getting categories: {result.get('error')}")
            return {"success": True, "categories": []}  # Return empty instead of error
        
        return {"success": True, "categories": result["categories"]}
    except Exception as e:
        print(f"Exception in get_categories: {str(e)}")
        return {"success": True, "categories": []}  # Return empty instead of error

@router.delete("/account/{account_id}")
async def delete_account(account_id: str, authorization: Optional[str] = Header(None)):
    """
    Delete a single account by its unique account_id. If this is the last account for its plaid_item, also delete the plaid_item and call Plaid /item/remove.
    """
    supabase_service = get_supabase_service()
    account_result = supabase_service.get_account_by_id(account_id)
    if not account_result.get("success"):
        raise HTTPException(status_code=404, detail="Account not found")
    account = account_result["account"]
    item_id = account.get("item_id")
    user_id = account.get("user_id")
    accounts_left = supabase_service.count_accounts_for_item(item_id)
    # Only log when this is the last account for the plaid_item
    if accounts_left == 1:
        print(f"[Plaid Cleanup] Deleting last account for plaid_item {item_id} (user {user_id}). Preparing to remove from Plaid...")
        sync_state = supabase_service.get_sync_state(user_id, item_id)
        access_token = None
        if sync_state.get("success"):
            access_token = sync_state["sync_state"].get("access_token")
            print(f"[Plaid Cleanup] Calling Plaid /item/remove for access_token: {access_token}")
        else:
            print(f"[Plaid Cleanup] No sync state found for plaid_item {item_id} and user {user_id}")
    else:
        access_token = None
    delete_result = supabase_service.delete_account(account_id)
    if not delete_result.get("success"):
        raise HTTPException(status_code=400, detail=delete_result.get("error"))
    if accounts_left == 1 and access_token:
        plaid_service = PlaidService()
        plaid_service.remove_item(access_token)
        supabase_service.delete_plaid_item(user_id, item_id)
    return {"success": True}

@router.delete("/accounts/user/{user_id}")
async def delete_all_accounts_for_user(user_id: str, authorization: Optional[str] = Header(None)):
    supabase_service = get_supabase_service()
    accounts_result = supabase_service.get_user_accounts(user_id)
    if not accounts_result.get("success"):
        raise HTTPException(status_code=400, detail=accounts_result.get("error"))
    accounts = accounts_result["accounts"]
    for account in accounts:
        await delete_account(account["id"], authorization)
    print(f"[Plaid Cleanup] Finished deleting all accounts for user {user_id}")
    return {"success": True} 