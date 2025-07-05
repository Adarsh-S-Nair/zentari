from fastapi import APIRouter, Depends, HTTPException, Header
from typing import Optional
from services.sync_service import get_sync_service
from services.supabase_service import get_supabase_service
import os

router = APIRouter(prefix="/sync", tags=["Account Synchronization"])

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Get current user from authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Extract user_id from authorization header
    # This is a simplified version - you might want to add proper JWT validation
    try:
        # Assuming authorization format: "Bearer user_id"
        user_id = authorization.replace("Bearer ", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authorization token")
        return user_id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid authorization token")

@router.post("/accounts")
async def sync_user_accounts(user_id: str = Depends(get_current_user)):
    """
    Sync all accounts for the current user
    """
    try:
        # Get user environment
        supabase_service = get_supabase_service()
        environment = supabase_service.get_user_environment(user_id)
        
        if not environment:
            raise HTTPException(status_code=400, detail="User environment not found")
        
        # Get sync service and perform sync
        sync_service = get_sync_service(environment)
        result = sync_service.sync_user_accounts(user_id)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error', 'Sync failed'))
        
        return {
            "success": True,
            "message": "Account sync completed",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in sync_user_accounts: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/accounts/{item_id}/force")
async def force_full_sync(item_id: str, user_id: str = Depends(get_current_user)):
    """
    Force a full sync for a specific Plaid Item
    """
    try:
        # Get user environment
        supabase_service = get_supabase_service()
        environment = supabase_service.get_user_environment(user_id)
        
        if not environment:
            raise HTTPException(status_code=400, detail="User environment not found")
        
        # Get sync service and perform force sync
        sync_service = get_sync_service(environment)
        result = sync_service.force_full_sync(user_id, item_id)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error', 'Force sync failed'))
        
        return {
            "success": True,
            "message": "Force sync completed",
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in force_full_sync: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/status")
async def get_sync_status(user_id: str = Depends(get_current_user)):
    """
    Get sync status for all user's accounts
    """
    try:
        # Get user environment
        supabase_service = get_supabase_service()
        environment = supabase_service.get_user_environment(user_id)
        
        if not environment:
            raise HTTPException(status_code=400, detail="User environment not found")
        
        # Get sync service and get status
        sync_service = get_sync_service(environment)
        result = sync_service.get_sync_status(user_id)
        
        if not result.get('success'):
            raise HTTPException(status_code=500, detail=result.get('error', 'Failed to get sync status'))
        
        return {
            "success": True,
            "data": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_sync_status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/accounts/{item_id}/status")
async def get_item_sync_status(item_id: str, user_id: str = Depends(get_current_user)):
    """
    Get sync status for a specific Plaid Item
    """
    try:
        supabase_service = get_supabase_service()
        result = supabase_service.get_sync_state(user_id, item_id)
        
        if not result.get('success'):
            raise HTTPException(status_code=404, detail="Sync state not found")
        
        return {
            "success": True,
            "data": result['sync_state']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_item_sync_status: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/accounts/{item_id}/snapshots")
async def get_account_snapshots(
    item_id: str, 
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    user_id: str = Depends(get_current_user)
):
    """
    Get balance snapshots for accounts in a specific Item
    """
    try:
        supabase_service = get_supabase_service()
        
        # Get accounts for this item
        accounts_response = supabase_service.client.table('accounts').select('id').eq('item_id', item_id).eq('user_id', user_id).execute()
        
        if not accounts_response.data:
            return {
                "success": True,
                "data": {
                    "snapshots": [],
                    "total": 0
                }
            }
        
        # Get snapshots for all accounts in this item
        all_snapshots = []
        for account in accounts_response.data:
            account_id = account['id']
            snapshots_result = supabase_service.get_account_snapshots(account_id, start_date, end_date, limit)
            
            if snapshots_result.get('success'):
                all_snapshots.extend(snapshots_result.get('snapshots', []))
        
        # Sort by snapshot date (newest first)
        all_snapshots.sort(key=lambda x: x.get('snapshot_date', ''), reverse=True)
        
        return {
            "success": True,
            "data": {
                "snapshots": all_snapshots[:limit],
                "total": len(all_snapshots)
            }
        }
        
    except Exception as e:
        print(f"Error in get_account_snapshots: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error") 