from fastapi import APIRouter, HTTPException, Header
from services.supabase_service import get_supabase_service
from typing import Optional

router = APIRouter(prefix="/database", tags=["database"])

@router.get("/user-accounts/{user_id}")
async def get_user_accounts(user_id: str, authorization: Optional[str] = Header(None)):
    """
    Get all stored accounts for a user from the database
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