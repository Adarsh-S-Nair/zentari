from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from plaid_services import get_transactions
from supabase_services import get_transactions as get_supabase_transactions, get_accounts, get_sync
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

def sync_transactions_for_item(supabase_transactions, plaid_transactions, supabase_accounts, sync_service, user_id, item):
    """Sync transactions for a single plaid_item if any associated account has auto_sync=True."""
    item_id = item.get('item_id')
    access_token = item.get('access_token')
    cursor = item.get('transaction_cursor')
    
    if not item_id or not access_token:
        print(f"[SYNC] Skipping item {item_id}: missing item_id or access_token")
        return {'item_id': item_id, 'success': False, 'error': 'Missing item_id or access_token'}
    
    # Only sync if at least one account for this item has auto_sync = True
    accounts = supabase_accounts.get_auto_sync(user_id, item_id)
    if not accounts:
        print(f"[SYNC] Skipping item {item_id}: no accounts with auto_sync")
        return {'item_id': item_id, 'success': False, 'skipped': True, 'reason': 'No accounts with auto_sync'}
    
    # Sync transactions for this item
    print(f"[SYNC] Syncing transactions for item {item_id} with cursor: {cursor}")
    sync_result = plaid_transactions.sync(access_token, cursor)
    
    if not sync_result.get('success'):
        print(f"[SYNC] Error syncing transactions for item {item_id}: {sync_result.get('error')}")
        return {'item_id': item_id, 'success': False, 'error': sync_result.get('error')}
    
    # Store new transactions
    added = sync_result.get('added', [])
    print(f"[SYNC] {len(added)} transactions to add for item {item_id}")
    store_result = supabase_transactions.store(added)
    
    # Handle modified transactions
    modified_ids = sync_result.get('modified', [])
    modified_count = 0
    if modified_ids:
        print(f"[SYNC] {len(modified_ids)} modified transaction IDs for item {item_id}")
        modified_transactions = plaid_transactions.get_by_ids(access_token, modified_ids)
        if modified_transactions.get('success'):
            modified_count = len(modified_transactions.get('transactions', []))
            supabase_transactions.update(modified_transactions.get('transactions', []))
    
    # Handle removed transactions
    removed_ids = sync_result.get('removed', [])
    removed_count = 0
    if removed_ids:
        print(f"[SYNC] {len(removed_ids)} removed transaction IDs for item {item_id}")
        removed_result = supabase_transactions.delete_by_plaid_ids(removed_ids)
        removed_count = removed_result.get('deleted_count', 0) if removed_result.get('success') else 0
    
    # Update account balances if included in response
    balance_updates = 0
    accounts_with_balances = sync_result.get('accounts', [])
    if accounts_with_balances:
        supabase_accounts.update_balances(user_id, accounts_with_balances)
        balance_updates = len(accounts_with_balances)
    
    # Update the cursor
    next_cursor = sync_result.get('next_cursor')
    if next_cursor is not None:
        sync_service.update_cursor(user_id, item_id, next_cursor)
    
    return {
        'item_id': item_id,
        'success': True,
        'added_count': len(added),
        'modified_count': modified_count,
        'removed_count': removed_count,
        'balance_updates': balance_updates,
        'error': store_result.get('error') if not store_result.get('success') else None
    }

@router.post("/transactions")
async def sync_account_transactions(user_id: str = Depends(get_current_user)):
    """Sync transactions for all plaid items for the current user using Plaid's incremental sync API."""
    try:
        supabase_transactions = get_supabase_transactions()
        plaid_transactions = get_transactions()
        supabase_accounts = get_accounts()
        sync_service = get_sync()

        # Get all plaid_items for the user
        sync_states_result = sync_service.get_by_user(user_id)
        if not sync_states_result.get('success'):
            raise HTTPException(status_code=500, detail="Failed to get plaid items")
        
        plaid_items = sync_states_result.get('data', [])
        results = [sync_transactions_for_item(supabase_transactions, plaid_transactions, supabase_accounts, sync_service, user_id, item) for item in plaid_items]
        
        return {'success': True, 'results': results}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync_account_transactions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error") 