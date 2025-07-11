from fastapi import APIRouter, HTTPException, Header
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
    accounts_result = plaid_service.get_accounts(access_token)
    if not accounts_result["success"]:
        raise HTTPException(status_code=400, detail=accounts_result["error"])

    # Attach access token to each account for storage
    accounts_with_token = []
    for account in accounts_result["accounts"]:
        account_with_token = account.copy()
        account_with_token["access_token"] = access_token
        accounts_with_token.append(account_with_token)

    # Store the accounts in the database
    accounts_store_result = supabase_service.store_plaid_accounts(
        user_id=user_id,
        item_id=item_id,
        accounts=accounts_with_token,
        access_token=access_token
    )
    if not accounts_store_result["success"]:
        print(f"Warning: Failed to store accounts: {accounts_store_result.get('error')}")

    # Return the Plaid accounts result and access token for further use
    return accounts_result, access_token

def fetch_and_store_transactions(supabase_service, plaid_service, user_id, item_id, access_token):
    # Perform initial full sync using /transactions/sync (cursor=None)
    sync_result = plaid_service.sync_transactions(access_token=access_token, cursor=None)

    if sync_result["success"]:
        # Store new transactions in the database
        transactions_store_result = supabase_service.store_transactions(sync_result["added"])
        if transactions_store_result["success"]:
            print(f"Successfully stored {transactions_store_result.get('stored_count', 0)} transactions")
        else:
            print(f"Warning: Failed to store transactions: {transactions_store_result.get('error')}")

        # Prepare sync state info for plaid_items
        cursor = sync_result.get("next_cursor")
        last_sync = datetime.utcnow().isoformat()

        # Update or create the plaid_items sync state with cursor and sync time
        supabase_service.create_or_update_plaid_item(
            user_id=user_id,
            item_id=item_id,
            access_token=access_token,
            transaction_cursor=cursor,
            last_transaction_sync=last_sync
        )
    else:
        # Log if there was an error or no transactions found
        print(f"No transactions found or error fetching transactions: {sync_result.get('error', 'No transactions')}")

@router.post("/accounts", response_model=AccountsResponse)
async def get_accounts(request: PublicTokenRequest, user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get accounts for a given public token and store them in the database
    """
    supabase_service = get_supabase_service()
    plaid_service = PlaidService()
    # Exchange public token for access token
    exchange_result = plaid_service.exchange_public_token(request.public_token)
    if not exchange_result["success"]:
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
        print(f"Error fetching transactions: {e}")
    return AccountsResponse(**accounts_result) 