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

def _trigger_initial_sync(user_id: str, item_id: str, access_token: str, supabase_accounts, sync_service):
    """Trigger initial transaction sync for new accounts (sandbox mode only)"""
    # Only sync in sandbox mode since webhooks handle sync in production
    environment = os.getenv('ENV', 'development')
    
    if environment != 'development':
        print(f"[LINK] Skipping initial sync in {environment} mode - webhooks will handle sync")
        return
    
    print(f"[LINK] Triggering initial transaction sync for sandbox mode")
    try:
        from api.sync_routes import sync_transactions_for_item
        from plaid_services import get_transactions
        from supabase_services import get_transactions as get_supabase_transactions
        
        supabase_transactions = get_supabase_transactions()
        plaid_transactions = get_transactions()
        
        item = {
            'item_id': item_id,
            'access_token': access_token,
            'transaction_cursor': ''
        }
        sync_result = sync_transactions_for_item(supabase_transactions, plaid_transactions, supabase_accounts, sync_service, user_id, item)
        print(f"[LINK] Initial sync result: {sync_result}")
        
        # Debug: Check if any transactions were stored
        if sync_result.get('success'):
            print(f"[LINK] Sync successful: {sync_result.get('added_count', 0)} transactions added")
        else:
            print(f"[LINK] Sync failed: {sync_result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"[LINK] Error during initial sync: {e}")

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
    
    # Store accounts using the service method (handles sync state creation)
    store_result = supabase_accounts.store_plaid_accounts(
        user_id=user_id,
        item_id=item_id,
        accounts=accounts_with_token,
        access_token=access_token
    )
    
    if not store_result["success"]:
        print(f"[LINK] Warning: Failed to store accounts: {store_result.get('error')}")
    
    # Only trigger transaction sync if we have new accounts (sandbox mode only)
    if new_accounts:
        _trigger_initial_sync(user_id, item_id, access_token, supabase_accounts, sync_service)
    else:
        print(f"[LINK] No new accounts, skipping transaction sync")
    
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
        print(f"[WEBHOOK] Received webhook: {webhook_data}")
        
        webhook_code = webhook_data.get('webhook_code')
        item_id = webhook_data.get('item_id')
        
        # Handle different webhook codes
        if webhook_code == 'SYNC_UPDATES_AVAILABLE':
            print(f"[WEBHOOK] SYNC_UPDATES_AVAILABLE for item {item_id}")
            
            # Get the user_id for this item_id
            sync_service = get_sync()
            plaid_item_result = sync_service.get_by_item_id(item_id)
            
            if plaid_item_result.get('success'):
                plaid_item = plaid_item_result['plaid_item']
                user_id = plaid_item['user_id']
                access_token = plaid_item['access_token']
                
                print(f"[WEBHOOK] Found user {user_id} for item {item_id}")
                
                # Create item object for sync_transactions_for_item
                item = {
                    'item_id': item_id,
                    'access_token': access_token,
                    'transaction_cursor': plaid_item.get('transaction_cursor', '')
                }
                
                # Trigger sync
                print(f"[WEBHOOK] Importing services...")
                from api.sync_routes import sync_transactions_for_item
                from plaid_services import get_transactions
                from supabase_services import get_transactions as get_supabase_transactions, get_accounts as get_supabase_accounts
                
                print(f"[WEBHOOK] Getting service instances...")
                supabase_transactions = get_supabase_transactions()
                plaid_transactions = get_transactions()
                supabase_accounts = get_supabase_accounts()
                
                print(f"[WEBHOOK] All services initialized successfully")
                print(f"[WEBHOOK] Triggering sync for item {item_id}")
                sync_result = sync_transactions_for_item(supabase_transactions, plaid_transactions, supabase_accounts, sync_service, user_id, item)
                print(f"[WEBHOOK] Sync result: {sync_result}")
                
                return {"success": True, "message": f"Webhook processed, sync result: {sync_result}"}
            else:
                print(f"[WEBHOOK] Could not find sync state for item {item_id}")
                return {"success": False, "message": "Item not found"}
        
        elif webhook_code == 'INITIAL_UPDATE':
            # Initial update completed - transactions are now available for sync
            new_transactions = webhook_data.get('new_transactions', 0)
            print(f"[WEBHOOK] INITIAL_UPDATE for item {item_id} - {new_transactions} new transactions available")
            return {"success": True, "message": f"Initial update completed with {new_transactions} transactions"}
        
        elif webhook_code == 'HISTORICAL_UPDATE':
            # Historical update completed - all historical transactions are now available
            new_transactions = webhook_data.get('new_transactions', 0)
            historical_complete = webhook_data.get('historical_update_complete', False)
            print(f"[WEBHOOK] HISTORICAL_UPDATE for item {item_id} - {new_transactions} transactions, complete: {historical_complete}")
            return {"success": True, "message": f"Historical update completed with {new_transactions} transactions"}
        
        else:
            print(f"[WEBHOOK] Unhandled webhook code: {webhook_code}")
            return {"success": True, "message": "Webhook received (unhandled)"}
            
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {e}")
        import traceback
        print(f"[WEBHOOK] Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error") 