from typing import Dict, Any, Optional
from datetime import datetime
from .client import SupabaseClient

class SyncService:
    """Service for sync state management"""
    
    def __init__(self, client: SupabaseClient):
        self.client = client
    
    def create_or_update(self, user_id: str, item_id: str, access_token: str, 
                        transaction_cursor: str = None, last_transaction_sync: str = None) -> Dict[str, Any]:
        """Create or update sync state for user-item combination"""
        try:
            # Check if sync state exists
            existing = self.client.select('plaid_items', 'id', {'user_id': user_id, 'item_id': item_id})
            
            # Prepare sync state data
            sync_state_data = {
                'access_token': access_token,
                'updated_at': 'now()'
            }
            if transaction_cursor is not None:
                sync_state_data['transaction_cursor'] = transaction_cursor
            if last_transaction_sync is not None:
                sync_state_data['last_transaction_sync'] = last_transaction_sync
            
            if existing.get('success') and existing.get('data'):
                # Update existing sync state
                return self.client.update('plaid_items', sync_state_data, {'user_id': user_id, 'item_id': item_id})
            else:
                # Insert new sync state
                sync_state_data.update({
                    'user_id': user_id,
                    'item_id': item_id,
                    'sync_status': 'idle'
                })
                return self.client.insert('plaid_items', sync_state_data)
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_state(self, user_id: str, item_id: str) -> Dict[str, Any]:
        """Get sync state for user-item combination"""
        result = self.client.select('plaid_items', filters={'user_id': user_id, 'item_id': item_id})
        if result.get('success') and result.get('data'):
            return {"success": True, "sync_state": result['data'][0]}
        return {"success": False, "error": "Sync state not found"}
    
    def get_by_item_id(self, item_id: str) -> Dict[str, Any]:
        """Get plaid_item by item_id (for webhooks)"""
        result = self.client.select('plaid_items', filters={'item_id': item_id})
        if result.get('success') and result.get('data'):
            return {"success": True, "plaid_item": result['data'][0]}
        return {"success": False, "error": "Plaid item not found"}
    
    def update_cursor(self, user_id: str, item_id: str, cursor: str) -> Dict[str, Any]:
        """Update transaction cursor for sync state"""
        from datetime import datetime
        update_data = {
            'transaction_cursor': cursor,
            'last_transaction_sync': datetime.utcnow().isoformat(),
            'sync_status': 'idle',
            'last_error': None
        }
        return self.client.update('plaid_items', update_data, {'user_id': user_id, 'item_id': item_id})
    
    def update_status(self, user_id: str, item_id: str, status: str, error: str = None) -> Dict[str, Any]:
        """Update sync status and error message"""
        update_data = {'sync_status': status, 'updated_at': 'now()'}
        if error:
            update_data['last_error'] = error
        
        return self.client.update('plaid_items', update_data, {'user_id': user_id, 'item_id': item_id})
    
    def get_by_user(self, user_id: str) -> Dict[str, Any]:
        """Get all sync states for user"""
        return self.client.select('plaid_items', filters={'user_id': user_id})
    
    def get_all(self) -> Dict[str, Any]:
        """Get all sync states (for debugging)"""
        return self.client.select('plaid_items')
    
    def get_by_institution(self, user_id: str, institution_id: str) -> Dict[str, Any]:
        """Get plaid_item by institution_id for a user"""
        try:
            # Get all plaid_items for the user
            result = self.get_by_user(user_id)
            if not result.get('success') or not result.get('data'):
                return {"success": False, "error": "No plaid_items found for user"}
            
            # Check each item's institution_id via Plaid API
            from plaid_services import get_items
            items_service = get_items()
            
            for plaid_item in result['data']:
                access_token = plaid_item.get('access_token')
                if access_token:
                    item_result = items_service.get(access_token)
                    if item_result.get('success'):
                        item_institution_id = item_result['item'].get('institution_id')
                        if item_institution_id == institution_id:
                            return {"success": True, "plaid_item": plaid_item}
            
            return {"success": False, "error": "No plaid_item found for this institution"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete(self, user_id: str, item_id: str) -> Dict[str, Any]:
        """Delete sync state"""
        return self.client.delete('plaid_items', {'user_id': user_id, 'item_id': item_id})
    
    def delete_by_token(self, access_token: str) -> Dict[str, Any]:
        """Find and delete sync state by access_token"""
        try:
            # First find the item by access_token
            result = self.client.select('plaid_items', 'user_id, item_id', {'access_token': access_token})
            
            if not result.get('success') or not result.get('data'):
                return {'success': False, 'error': 'No plaid_item found with this access_token'}
            
            item_data = result['data'][0]
            user_id = item_data['user_id']
            item_id = item_data['item_id']
            
            # Delete the plaid_item
            delete_result = self.client.delete('plaid_items', {'user_id': user_id, 'item_id': item_id})
            
            if delete_result.get('success'):
                return {'success': True, 'message': f'Removed plaid_item {item_id} for user {user_id}'}
            else:
                return delete_result
                
        except Exception as e:
            return {'success': False, 'error': str(e)} 