from fastapi import APIRouter, HTTPException, Header, Request
from services.plaid_service import PlaidService
from services.supabase_service import get_supabase_service
from models.plaid_schema import (
    LinkTokenRequest, LinkTokenResponse,
    PublicTokenRequest, TokenExchangeResponse,
    AccountsResponse
)
import os
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/plaid", tags=["plaid"])

@router.post("/create-link-token", response_model=LinkTokenResponse)
async def create_link_token(request: LinkTokenRequest, authorization: Optional[str] = Header(None)):
    """
    Create a link token for the Plaid Link flow
    """
    plaid_service = PlaidService()
    
    result = plaid_service.create_link_token(
        user_id=request.user_id,
        client_name=request.client_name
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return LinkTokenResponse(**result)

@router.post("/exchange-public-token", response_model=TokenExchangeResponse)
async def exchange_public_token(request: PublicTokenRequest, authorization: Optional[str] = Header(None)):
    """
    Exchange a public token for an access token
    """
    plaid_service = PlaidService()
    
    result = plaid_service.exchange_public_token(request.public_token)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return TokenExchangeResponse(**result)

def fetch_and_store_accounts(supabase_service, plaid_service, user_id, item_id, access_token):
    # Fetch accounts from Plaid using the access token
    print(f"[LINK] Fetching accounts from Plaid for user {user_id}, item {item_id}")
    accounts_result = plaid_service.get_accounts(access_token)
    print(f"[LINK] Plaid get_accounts result: {accounts_result}")
    if not accounts_result["success"]:
        print(f"[LINK] Error fetching accounts from Plaid: {accounts_result.get('error')}")
        raise HTTPException(status_code=400, detail=accounts_result["error"])

    # Attach access token to each account for storage
    accounts_with_token = []
    for account in accounts_result["accounts"]:
        account_with_token = account.copy()
        account_with_token["access_token"] = access_token
        accounts_with_token.append(account_with_token)
    print(f"[LINK] Accounts to store: {accounts_with_token}")

    # Store the accounts in the database
    accounts_store_result = supabase_service.store_plaid_accounts(
        user_id=user_id,
        item_id=item_id,
        accounts=accounts_with_token,
        access_token=access_token
    )
    print(f"[LINK] store_plaid_accounts result: {accounts_store_result}")
    if not accounts_store_result["success"]:
        print(f"[LINK] Warning: Failed to store accounts: {accounts_store_result.get('error')}")

    # Return the Plaid accounts result and access token for further use
    return accounts_result, access_token


def fetch_and_store_transactions(supabase_service, plaid_service, user_id, item_id, access_token):
    # Use the proven sync_transactions_for_item method instead of direct Plaid calls
    print(f"[LINK] Starting initial transaction sync for user {user_id}, item {item_id}")
    
    # Create a mock item object with the data needed by sync_transactions_for_item
    item = {
        'item_id': item_id,
        'access_token': access_token,
        'transaction_cursor': ''  # Initial sync with empty cursor as per Plaid docs
    }
    
    # Import the sync function from sync_routes
    from api.sync_routes import sync_transactions_for_item
    
    # Call the proven sync method
    sync_result = sync_transactions_for_item(supabase_service, plaid_service, user_id, item)
    print(f"[LINK] sync_transactions_for_item result: {sync_result}")
    
    if sync_result.get('success'):
        print(f"[LINK] Successfully synced {sync_result.get('added_count', 0)} transactions")
    elif sync_result.get('skipped'):
        print(f"[LINK] Sync skipped: {sync_result.get('reason', 'unknown')}")
    else:
        print(f"[LINK] Sync failed: {sync_result.get('error', 'unknown error')}")

@router.post("/accounts", response_model=AccountsResponse)
async def get_accounts(request: PublicTokenRequest, user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get accounts for a given public token and store them in the database
    """
    supabase_service = get_supabase_service()
    plaid_service = PlaidService()
    # Exchange public token for access token
    print(f"[LINK] Exchanging public token for access token for user {user_id}")
    exchange_result = plaid_service.exchange_public_token(request.public_token)
    print(f"[LINK] exchange_public_token result: {exchange_result}")
    if not exchange_result["success"]:
        print(f"[LINK] Error exchanging public token: {exchange_result.get('error')}")
        raise HTTPException(status_code=400, detail=exchange_result["error"])
    
    # Fetch and store accounts
    accounts_result, access_token = fetch_and_store_accounts(
        supabase_service, plaid_service, user_id, exchange_result["item_id"], exchange_result["access_token"]
    )
    # Fetch and store transactions and update plaid item sync state
    try:
        fetch_and_store_transactions(
            supabase_service, plaid_service, user_id, exchange_result["item_id"], access_token
        )
    except Exception as e:
        print(f"[LINK] Error fetching transactions: {e}")
    return AccountsResponse(**accounts_result)

from pydantic import BaseModel

class RemoveItemRequest(BaseModel):
    access_token: str

@router.post("/remove-item")
async def remove_plaid_item(request: RemoveItemRequest, authorization: Optional[str] = Header(None)):
    """
    Remove a Plaid item by access token and clean up local database
    """
    try:
        plaid_service = PlaidService()
        supabase_service = get_supabase_service()
        
        # First, try to remove from Plaid
        result = plaid_service.remove_item(request.access_token)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        # Only if Plaid removal was successful, clean up our database
        cleanup_result = supabase_service.remove_plaid_item_by_access_token(request.access_token)
        
        if not cleanup_result["success"]:
            print(f"Warning: Plaid item removed but failed to clean up local database: {cleanup_result.get('error')}")
            # Still return success since Plaid removal worked
            return {"success": True, "message": "Plaid item removed successfully (local cleanup had issues)"}
        
        return {"success": True, "message": "Plaid item removed successfully from both Plaid and local database"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing Plaid item: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/webhook")
async def plaid_webhook(request: Request):
    """
    Handle Plaid webhooks for transaction updates
    """
    try:
        # Get the webhook payload
        webhook_data = await request.json()
        print(f"[WEBHOOK] Received webhook: {webhook_data}")
        
        webhook_code = webhook_data.get('webhook_code')
        
        if webhook_code == 'SYNC_UPDATES_AVAILABLE':
            # Handle transaction sync updates
            item_id = webhook_data.get('item_id')
            initial_update_complete = webhook_data.get('initial_update_complete', False)
            historical_update_complete = webhook_data.get('historical_update_complete', False)
            
            print(f"[WEBHOOK] SYNC_UPDATES_AVAILABLE for item {item_id}")
            print(f"[WEBHOOK] initial_update_complete: {initial_update_complete}")
            print(f"[WEBHOOK] historical_update_complete: {historical_update_complete}")
            
            # Get the user_id for this item_id from plaid_items table
            supabase_service = get_supabase_service()
            plaid_item_result = supabase_service.get_plaid_item_by_item_id(item_id)
            
            if plaid_item_result.get('success'):
                plaid_item = plaid_item_result['plaid_item']
                user_id = plaid_item['user_id']
                access_token = plaid_item['access_token']
                
                print(f"[WEBHOOK] Found user {user_id} for item {item_id}")
                
                # Create item object for sync_transactions_for_item
                item = {
                    'item_id': item_id,
                    'access_token': access_token,
                    'transaction_cursor': plaid_item_result['plaid_item'].get('transaction_cursor', '')
                }
                
                # Import and call sync_transactions_for_item
                from api.sync_routes import sync_transactions_for_item
                plaid_service = PlaidService()
                
                print(f"[WEBHOOK] Triggering sync for item {item_id}")
                sync_result = sync_transactions_for_item(supabase_service, plaid_service, user_id, item)
                print(f"[WEBHOOK] Sync result: {sync_result}")
                
                return {"success": True, "message": f"Webhook processed, sync result: {sync_result}"}
            else:
                print(f"[WEBHOOK] Could not find sync state for item {item_id}")
                return {"success": False, "message": "Item not found"}
        
        else:
            print(f"[WEBHOOK] Unhandled webhook code: {webhook_code}")
            return {"success": True, "message": "Webhook received (unhandled)"}
            
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 