from fastapi import APIRouter, HTTPException, Header
from services.plaid_service import PlaidService
from services.supabase_service import get_supabase_service
from models.plaid_schema import (
    LinkTokenRequest, LinkTokenResponse,
    PublicTokenRequest, TokenExchangeResponse,
    AccountsResponse, SandboxCredentialsResponse
)
import os
from typing import Optional

router = APIRouter(prefix="/plaid", tags=["plaid"])

@router.post("/create-link-token", response_model=LinkTokenResponse)
async def create_link_token(request: LinkTokenRequest, authorization: Optional[str] = Header(None)):
    """
    Create a link token for the Plaid Link flow
    """
    # Get user environment from Supabase
    supabase_service = get_supabase_service()
    user_environment = supabase_service.get_user_environment(request.user_id)
    
    if not user_environment:
        raise HTTPException(status_code=400, detail="User environment not found")
    
    # Create Plaid service with user's environment
    plaid_service = PlaidService(environment=user_environment)
    
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
    # For now, we'll use sandbox as default since we don't have user_id in this endpoint
    # In a real implementation, you'd get user_id from the authorization header
    plaid_service = PlaidService(environment='sandbox')
    
    result = plaid_service.exchange_public_token(request.public_token)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return TokenExchangeResponse(**result)

@router.post("/accounts", response_model=AccountsResponse)
async def get_accounts(request: PublicTokenRequest, user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get accounts for a given public token and store them in the database
    """
    # Get user environment from Supabase
    supabase_service = get_supabase_service()
    user_environment = supabase_service.get_user_environment(user_id)
    
    if not user_environment:
        raise HTTPException(status_code=400, detail="User environment not found")
    
    # Create Plaid service with user's environment
    plaid_service = PlaidService(environment=user_environment)
    
    # First exchange the public token for an access token
    exchange_result = plaid_service.exchange_public_token(request.public_token)
    
    if not exchange_result["success"]:
        raise HTTPException(status_code=400, detail=exchange_result["error"])
    
    # Then get the accounts using the access token
    accounts_result = plaid_service.get_accounts(exchange_result["access_token"])
    
    if not accounts_result["success"]:
        raise HTTPException(status_code=400, detail=accounts_result["error"])
    
    # Add access token to each account for storage
    access_token = exchange_result["access_token"]
    accounts_with_token = []
    for account in accounts_result["accounts"]:
        account_with_token = account.copy()
        account_with_token["access_token"] = access_token
        accounts_with_token.append(account_with_token)
    
    # Store the accounts in the database (access token is now included with each account)
    accounts_store_result = supabase_service.store_plaid_accounts(
        user_id=user_id,
        item_id=exchange_result["item_id"],
        accounts=accounts_with_token,
        environment=user_environment,
        access_token=access_token
    )
    
    if not accounts_store_result["success"]:
        print(f"Warning: Failed to store accounts: {accounts_store_result.get('error')}")
    
    return AccountsResponse(**accounts_result)

@router.get("/user-accounts/{user_id}")
async def get_user_accounts(user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get all stored accounts for a user
    """
    try:
        # Get accounts from database
        supabase_service = get_supabase_service()
        result = supabase_service.get_user_plaid_accounts(user_id, None)  # environment not needed anymore
        
        if not result["success"]:
            print(f"Error getting accounts for user {user_id}: {result.get('error')}")
            return {"success": True, "accounts": []}  # Return empty instead of error
        
        return {"success": True, "accounts": result["accounts"]}
    except Exception as e:
        print(f"Exception in get_user_accounts for user {user_id}: {str(e)}")
        return {"success": True, "accounts": []}  # Return empty instead of error

@router.get("/sandbox-credentials", response_model=SandboxCredentialsResponse)
async def get_sandbox_credentials():
    """
    Get test credentials for sandbox mode
    """
    plaid_service = PlaidService(environment='sandbox')
    credentials = plaid_service.get_sandbox_test_credentials()
    
    if not credentials["success"]:
        raise HTTPException(status_code=400, detail=credentials["error"])
    
    return SandboxCredentialsResponse(**credentials) 