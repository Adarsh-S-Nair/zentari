from fastapi import APIRouter, HTTPException, Header, Request
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

# PATCH endpoint to update auto_sync for an account
@router.patch("/account/{account_id}/auto-sync")
async def update_account_auto_sync(account_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """
    Update the auto_sync column for a specific account.
    """
    try:
        data = await request.json()
        auto_sync = data.get("auto_sync")
        if auto_sync is None:
            return {"success": False, "error": "Missing 'auto_sync' in request body"}
        supabase_service = get_supabase_service()
        # Update the account's auto_sync column
        result = supabase_service.client.table('accounts').update({"auto_sync": auto_sync}).eq('account_id', account_id).execute()
        if result.data:
            return {"success": True, "account_id": account_id, "auto_sync": auto_sync}
        else:
            return {"success": False, "error": "Account not found or update failed"}
    except Exception as e:
        print(f"Exception in update_account_auto_sync for account {account_id}: {str(e)}")
        return {"success": False, "error": str(e)}

@router.get("/account/{account_id}/plaid-item")
async def get_account_plaid_item(account_id: str, authorization: Optional[str] = Header(None)):
    """
    Get the plaid_item (including last_transaction_sync) for a given account_id.
    """
    supabase_service = get_supabase_service()
    account_result = supabase_service.get_account_by_id(account_id)
    if not account_result.get("success"):
        return {"success": False, "error": "Account not found"}
    account = account_result["account"]
    item_id = account.get("item_id")
    if not item_id:
        return {"success": False, "error": "Account missing item_id"}
    # Query plaid_items by item_id only (assumed unique)
    response = supabase_service.client.table('plaid_items').select('*').eq('item_id', item_id).single().execute()
    if not response.data:
        return {"success": False, "error": "Plaid item not found"}
    plaid_item = dict(response.data)
    # Remove sensitive fields if present
    plaid_item.pop('access_token', None)
    return {"success": True, "plaid_item": plaid_item}

@router.get("/user-plaid-items/{user_id}")
async def get_user_plaid_items(user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get all plaid_items for a user.
    """
    try:
        supabase_service = get_supabase_service()
        result = supabase_service.get_user_sync_states(user_id)
        if not result["success"]:
            return {"success": True, "plaid_items": []}
        plaid_items = result["sync_states"]
        # Remove sensitive fields
        for item in plaid_items:
            item.pop('access_token', None)
        return {"success": True, "plaid_items": plaid_items}
    except Exception as e:
        print(f"Exception in get_user_plaid_items for user {user_id}: {str(e)}")
        return {"success": True, "plaid_items": []}

@router.delete("/user/{user_id}")
async def delete_user_completely(user_id: str, authorization: Optional[str] = Header(None)):
    """
    Delete all user data (accounts, plaid_items, transactions, etc.) and remove the user from Supabase Auth.
    """
    supabase_service = get_supabase_service()
    # Step 1: Delete all accounts and related data
    accounts_result = await delete_all_accounts_for_user(user_id, authorization)
    if not accounts_result.get("success"):
        raise HTTPException(status_code=400, detail="Failed to delete user accounts: " + str(accounts_result.get("error")))
    # Step 2: Delete user from Supabase Auth
    try:
        # This uses the service_role key, so it's safe to call admin methods
        supabase_service.client.auth.admin.delete_user(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user from Supabase Auth: {e}")
    return {"success": True, "message": f"User {user_id} and all associated data deleted."}

# PATCH endpoint to update account name
@router.patch("/account/{account_id}/name")
async def update_account_name(account_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """
    Update the name column for a specific account.
    """
    try:
        data = await request.json()
        name = data.get("name")
        if not name or not name.strip():
            return {"success": False, "error": "Missing or empty 'name' in request body"}
        supabase_service = get_supabase_service()
        # Update the account's name column
        result = supabase_service.client.table('accounts').update({"name": name.strip()}).eq('account_id', account_id).execute()
        if result.data:
            return {"success": True, "account_id": account_id, "name": name.strip()}
        else:
            return {"success": False, "error": "Account not found or update failed"}
    except Exception as e:
        print(f"Exception in update_account_name for account {account_id}: {str(e)}")
        return {"success": False, "error": str(e)} 