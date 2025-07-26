from fastapi import APIRouter, HTTPException, Header, Request
from plaid_services import get_link, get_accounts, get_items
from supabase_services import get_accounts as get_supabase_accounts, get_sync
from models.plaid_schema import (
    LinkTokenRequest, LinkTokenResponse,
    PublicTokenRequest, TokenExchangeResponse,
    AccountsResponse
)
from typing import Optional
import os

router = APIRouter(prefix="/plaid", tags=["plaid"])

@router.post("/create-link-token", response_model=LinkTokenResponse)
async def create_link_token(request: LinkTokenRequest, authorization: Optional[str] = Header(None)):
    """Create a link token for the Plaid Link flow"""
    link_service = get_link()
    result = link_service.create_token(request.user_id, request.client_name)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return LinkTokenResponse(**result)

@router.post("/exchange-public-token", response_model=TokenExchangeResponse)
async def exchange_public_token(request: PublicTokenRequest, authorization: Optional[str] = Header(None)):
    """Exchange a public token for an access token"""
    link_service = get_link()
    result = link_service.exchange_token(request.public_token)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return TokenExchangeResponse(**result)

@router.post("/accounts", response_model=AccountsResponse)
async def create_accounts(request: PublicTokenRequest, user_id: str, authorization: Optional[str] = Header(None)):
    """Get accounts for a given public token and store them in the database"""
    link_service = get_link()
    plaid_accounts = get_accounts()
    supabase_accounts = get_supabase_accounts()
    sync_service = get_sync()
    
    # Exchange public token for access token
    print(f"[LINK] Exchanging public token for access token for user {user_id}")
    exchange_result = link_service.exchange_token(request.public_token)
    if not exchange_result["success"]:
        print(f"[LINK] Error exchanging public token: {exchange_result.get('error')}")
        raise HTTPException(status_code=400, detail=exchange_result["error"])
    
    access_token = exchange_result["access_token"]
    item_id = exchange_result["item_id"]
    
    # Fetch accounts from Plaid
    print(f"[LINK] Fetching accounts from Plaid for user {user_id}, item {item_id}")
    accounts_result = plaid_accounts.get(access_token)
    if not accounts_result["success"]:
        print(f"[LINK] Error fetching accounts from Plaid: {accounts_result.get('error')}")
        raise HTTPException(status_code=400, detail=accounts_result["error"])
    
    # Check if user already has an item for this institution
    institution_id = accounts_result.get("institution_id")
    if institution_id:
        existing_item = sync_service.get_by_institution(user_id, institution_id)
        if existing_item.get('success') and existing_item.get('plaid_item'):
            existing_access_token = existing_item['plaid_item']['access_token']
            print(f"[LINK] User already has item for institution {institution_id}, existing access token: {existing_access_token[:10]}...")
            
            # Check if the existing item has the same accounts
            existing_accounts_result = plaid_accounts.get(existing_access_token)
            if existing_accounts_result.get('success'):
                existing_accounts = existing_accounts_result.get('accounts', [])
                new_accounts_from_plaid = accounts_result.get('accounts', [])
                
                # Compare account lists
                existing_account_keys = {supabase_accounts.create_key(acc) for acc in existing_accounts}
                new_account_keys = {supabase_accounts.create_key(acc) for acc in new_accounts_from_plaid}
                
                if existing_account_keys == new_account_keys:
                    print(f"[LINK] Same accounts found in existing item, removing new item and reusing existing")
                    # Remove the new item since it's redundant
                    from plaid_services import get_items
                    items_service = get_items()
                    items_service.remove(access_token)
                    
                    # Return the existing accounts instead
                    return AccountsResponse(**existing_accounts_result)
                else:
                    print(f"[LINK] Different accounts found, keeping both items")
    
    # Check which accounts are new vs existing before storing
    new_accounts = []
    existing_accounts = []
    
    for account in accounts_result["accounts"]:
        account_key = supabase_accounts.create_key(account)
        if supabase_accounts.exists(user_id, account_key):
            existing_accounts.append(account)
            print(f"[LINK] Account {account.get('name')} already exists, will update")
        else:
            new_accounts.append(account)
            print(f"[LINK] Account {account.get('name')} is new, will insert")
    
    print(f"[LINK] Found {len(new_accounts)} new accounts and {len(existing_accounts)} existing accounts")
    
    # Attach access token to each account for storage
    accounts_with_token = []
    for account in accounts_result["accounts"]:
        account_with_token = account.copy()
        account_with_token["access_token"] = access_token
        accounts_with_token.append(account_with_token)
    
    # Store accounts in database
    print(f"[LINK] Storing {len(accounts_with_token)} accounts in database")
    store_result = supabase_accounts.store_plaid_accounts(user_id, item_id, accounts_with_token, access_token)
    
    if not store_result["success"]:
        print(f"[LINK] Error storing accounts: {store_result.get('error')}")
        raise HTTPException(status_code=500, detail=store_result["error"])
    
    print(f"[LINK] Successfully stored accounts: {store_result.get('inserted', 0)} inserted, {store_result.get('updated', 0)} updated")
    
    # Don't trigger initial sync here - wait for HISTORICAL_UPDATE webhook
    print(f"[LINK] Skipping initial sync - waiting for HISTORICAL_UPDATE webhook")
    
    return AccountsResponse(**accounts_result)

from pydantic import BaseModel

class RemoveItemRequest(BaseModel):
    access_token: str

@router.post("/remove-item")
async def remove_plaid_item(request: RemoveItemRequest, authorization: Optional[str] = Header(None)):
    """Remove a Plaid item by access token and clean up local database"""
    items_service = get_items()
    sync_service = get_sync()
    
    # Remove from Plaid
    result = items_service.remove(request.access_token)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    # Clean up local database
    cleanup_result = sync_service.delete_by_token(request.access_token)
    if not cleanup_result["success"]:
        print(f"Warning: Plaid item removed but failed to clean up local database: {cleanup_result.get('error')}")
        return {"success": True, "message": "Plaid item removed successfully (local cleanup had issues)"}
    
    return {"success": True, "message": "Plaid item removed successfully from both Plaid and local database"}

@router.post("/webhook")
async def plaid_webhook(request: Request):
    """Handle Plaid webhooks for transaction updates"""
    try:
        webhook_data = await request.json()
        webhook_code = webhook_data.get('webhook_code')
        item_id = webhook_data.get('item_id')
        
        print(f"[WEBHOOK] {webhook_code} for item {item_id}")
        
        # Only sync when both updates are complete
        if webhook_code == 'SYNC_UPDATES_AVAILABLE':
            initial_complete = webhook_data.get('initial_update_complete', False)
            historical_complete = webhook_data.get('historical_update_complete', False)
            
            print(f"[WEBHOOK] initial_update_complete: {initial_complete}, historical_update_complete: {historical_complete}")
            
            # Only sync if both updates are complete (this ensures we get icon URLs)
            if initial_complete and historical_complete:
                sync_service = get_sync()
                plaid_item = sync_service.get_by_item_id(item_id)
                
                if plaid_item.get('success'):
                    user_id = plaid_item['plaid_item']['user_id']
                    access_token = plaid_item['plaid_item']['access_token']
                    
                    # Trigger sync
                    from api.sync_routes import sync_transactions_for_item
                    from plaid_services import get_transactions
                    from supabase_services import get_transactions as get_supabase_transactions, get_accounts as get_supabase_accounts
                    
                    supabase_transactions = get_supabase_transactions()
                    plaid_transactions = get_transactions()
                    supabase_accounts = get_supabase_accounts()
                    
                    item = {
                        'item_id': item_id,
                        'access_token': access_token,
                        'transaction_cursor': plaid_item['plaid_item'].get('transaction_cursor', '')
                    }
                    
                    sync_result = sync_transactions_for_item(supabase_transactions, plaid_transactions, supabase_accounts, sync_service, user_id, item)
                    
                    if sync_result.get('success'):
                        sync_service.update_status(user_id, item_id, 'idle')
                        print(f"[WEBHOOK] Sync completed for item {item_id}")
                else:
                    print(f"[WEBHOOK] Could not find sync state for item {item_id}")
            else:
                print(f"[WEBHOOK] Skipping sync - updates not complete (initial: {initial_complete}, historical: {historical_complete})")
        
        return {"success": True, "message": "Webhook processed"}
        
    except Exception as e:
        print(f"[WEBHOOK] Error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 