from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from services.plaid_service import get_plaid_service
from services.supabase_service import get_supabase_service
import os

router = APIRouter(prefix="/sync", tags=["Account Synchronization"])

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    try:
        user_id = authorization.replace("Bearer ", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authorization token")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

@router.post("/balances")
async def sync_account_balances(user_id: str = Depends(get_current_user)):
    """
    Sync account balances for the current user using Plaid API
    """
    try:
        supabase_service = get_supabase_service()
        environment = os.environ.get('ENV', 'development')
        plaid_service = get_plaid_service(environment)

        # Fetch all accounts for the user
        accounts_result = supabase_service.get_user_accounts(user_id)
        if not accounts_result.get('success'):
            raise HTTPException(status_code=500, detail="Failed to get accounts")

        accounts = accounts_result.get('accounts', [])
        token_to_account_ids = {}

        # Group account IDs by access_token, only if auto_sync is True
        for account in accounts:
            # Skip if auto_sync is not True
            if not account.get('auto_sync'):
                continue

            token = account.get('access_token')
            account_id = account.get('account_id')

            # Skip if missing token or account_id
            if not token or not account_id:
                continue

            # Add account_id to the list for this access_token
            token_to_account_ids.setdefault(token, []).append(account_id)

        all_balances = []

        # For each access_token, fetch balances for the filtered account_ids
        for access_token, account_ids in token_to_account_ids.items():
            print(f"Calling Plaid with access_token: {access_token}, account_ids: {account_ids}")
            balances_result = plaid_service.get_account_balances(access_token, account_ids)
            print(f"Plaid response for token {access_token}: {balances_result}")
            if not balances_result.get('success'):
                continue
            all_balances.extend(balances_result.get('accounts', []))

        # Prepare list of dicts with account_id, balances, and item_id for DB update
        db_balances = []
        for acct in all_balances:
            db_bal = {
                'account_id': acct.get('account_id'),
                'balances': acct.get('balances'),
                'item_id': acct.get('item_id') if 'item_id' in acct else None
            }
            db_balances.append(db_bal)
        supabase_service.update_balances_and_snapshots(user_id, db_balances)

        result = {"success": True, "accounts": all_balances}
        print("/sync/balances result:", result)
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync_account_balances: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

def sync_transactions_for_item(supabase_service, plaid_service, user_id, item):
    """Sync transactions for a single plaid_item if any associated account has auto_sync=True."""
    item_id = item.get('item_id')
    access_token = item.get('access_token')
    cursor = item.get('transaction_cursor')
    if not item_id or not access_token:
        return {'item_id': item_id, 'success': False, 'error': 'Missing item_id or access_token'}
    # Only sync if at least one account for this item has auto_sync = True
    accounts = supabase_service.get_accounts_for_item_with_auto_sync(user_id, item_id)
    if not accounts:
        return {'item_id': item_id, 'success': False, 'skipped': True, 'reason': 'No accounts with auto_sync'}
    # Sync transactions for this item
    print(f"Syncing transactions for item {item_id} (access_token: {access_token}) with cursor: {cursor}")
    sync_result = plaid_service.sync_transactions(access_token, cursor)
    if not sync_result.get('success'):
        print(f"Error syncing transactions for item {item_id}: {sync_result.get('error')}")
        return {
            'item_id': item_id,
            'success': False,
            'error': sync_result.get('error')
        }
    # Store new/modified transactions
    added = sync_result.get('added', [])
    store_result = supabase_service.store_transactions(added)
    # Update the cursor
    next_cursor = sync_result.get('next_cursor')
    if next_cursor:
        supabase_service.update_sync_cursor(user_id, item_id, next_cursor)
    return {
        'item_id': item_id,
        'success': True,
        'added_count': len(added),
        'error': store_result.get('error') if not store_result.get('success') else None
    }

@router.post("/transactions")
async def sync_account_transactions(user_id: str = Depends(get_current_user)):
    """
    Sync transactions for all plaid items for the current user using Plaid's incremental sync API.
    Only syncs plaid_items with at least one account where auto_sync is True.
    """
    try:
        supabase_service = get_supabase_service()
        environment = os.environ.get('ENV', 'development')
        plaid_service = get_plaid_service(environment)

        # Get all plaid_items for the user
        sync_states_result = supabase_service.get_user_sync_states(user_id)
        if not sync_states_result.get('success'):
            raise HTTPException(status_code=500, detail="Failed to get plaid items")
        plaid_items = sync_states_result.get('sync_states', [])

        results = [sync_transactions_for_item(supabase_service, plaid_service, user_id, item) for item in plaid_items]
        return {'success': True, 'results': results}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync_account_transactions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error") 