import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from .plaid_service import PlaidService
from .supabase_service import get_supabase_service

class SyncService:
    def __init__(self, environment: str = 'sandbox'):
        self.environment = environment
        self.plaid_service = PlaidService(environment)
        self.supabase_service = get_supabase_service()
    
    def sync_user_accounts(self, user_id: str) -> Dict:
        """
        Sync all accounts for a user (balances and transactions)
        """
        try:
            # Get all sync states for the user
            sync_states_result = self.supabase_service.get_user_sync_states(user_id)
            if not sync_states_result.get('success'):
                return {"success": False, "error": "Failed to get sync states"}
            
            sync_states = sync_states_result.get('sync_states', [])
            if not sync_states:
                return {"success": False, "error": "No accounts found for user"}
            
            results = {
                "success": True,
                "items_synced": 0,
                "items_failed": 0,
                "total_transactions_added": 0,
                "total_balance_updates": 0,
                "errors": []
            }
            
            for sync_state in sync_states:
                try:
                    item_result = self._sync_single_item(
                        user_id=user_id,
                        item_id=sync_state['item_id'],
                        access_token=sync_state['access_token']
                    )
                    
                    if item_result['success']:
                        results['items_synced'] += 1
                        results['total_transactions_added'] += item_result.get('transactions_added', 0)
                        results['total_balance_updates'] += item_result.get('balance_updates', 0)
                    else:
                        results['items_failed'] += 1
                        results['errors'].append({
                            'item_id': sync_state['item_id'],
                            'error': item_result.get('error', 'Unknown error')
                        })
                        
                except Exception as e:
                    results['items_failed'] += 1
                    results['errors'].append({
                        'item_id': sync_state['item_id'],
                        'error': str(e)
                    })
            
            return results
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _sync_single_item(self, user_id: str, item_id: str, access_token: str) -> Dict:
        """
        Sync a single Plaid Item (one bank connection)
        """
        try:
            # Update sync status to 'syncing'
            self.supabase_service.update_sync_status(user_id, item_id, 'syncing')
            
            # Get current sync state
            sync_state_result = self.supabase_service.get_sync_state(user_id, item_id)
            if not sync_state_result.get('success'):
                return {"success": False, "error": "Failed to get sync state"}
            
            sync_state = sync_state_result['sync_state']
            cursor = sync_state.get('transaction_cursor')
            
            # Sync transactions
            transaction_result = self._sync_transactions(user_id, item_id, access_token, cursor)
            
            # Sync balances
            balance_result = self._sync_balances(user_id, item_id, access_token)
            
            # Update sync status to 'idle'
            self.supabase_service.update_sync_status(user_id, item_id, 'idle')
            
            return {
                "success": True,
                "transactions_added": transaction_result.get('transactions_added', 0),
                "balance_updates": balance_result.get('balance_updates', 0),
                "has_more_transactions": transaction_result.get('has_more', False)
            }
            
        except Exception as e:
            # Update sync status to 'error'
            self.supabase_service.update_sync_status(user_id, item_id, 'error', str(e))
            return {"success": False, "error": str(e)}
    
    def _sync_transactions(self, user_id: str, item_id: str, access_token: str, cursor: str = None) -> Dict:
        """
        Sync transactions for a single Item
        """
        try:
            # Call Plaid's sync API
            sync_result = self.plaid_service.sync_transactions(access_token, cursor)
            
            if not sync_result.get('success'):
                return {"success": False, "error": sync_result.get('error')}
            
            added_transactions = sync_result.get('added', [])
            modified_transactions = sync_result.get('modified', [])
            removed_transactions = sync_result.get('removed', [])
            next_cursor = sync_result.get('next_cursor')
            has_more = sync_result.get('has_more', False)
            
            # Store new transactions
            transactions_added = 0
            if added_transactions:
                store_result = self.supabase_service.store_transactions(added_transactions)
                if store_result.get('success'):
                    transactions_added = store_result.get('stored_count', 0)
            
            # Update cursor if we have one
            if next_cursor:
                self.supabase_service.update_sync_cursor(user_id, item_id, next_cursor)
            
            # Handle modified transactions (for now, just log them)
            if modified_transactions:
                print(f"Modified transactions for item {item_id}: {len(modified_transactions)}")
            
            # Handle removed transactions (for now, just log them)
            if removed_transactions:
                print(f"Removed transactions for item {item_id}: {len(removed_transactions)}")
            
            return {
                "success": True,
                "transactions_added": transactions_added,
                "transactions_modified": len(modified_transactions),
                "transactions_removed": len(removed_transactions),
                "has_more": has_more
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def _sync_balances(self, user_id: str, item_id: str, access_token: str) -> Dict:
        """
        Sync account balances for a single Item
        """
        try:
            # Get current balances from Plaid
            balance_result = self.plaid_service.get_account_balances(access_token)
            
            if not balance_result.get('success'):
                return {"success": False, "error": balance_result.get('error')}
            
            accounts_with_balances = balance_result.get('accounts', [])
            balance_updates = 0
            
            for account_data in accounts_with_balances:
                account_id = account_data['account_id']
                balances = account_data.get('balances')
                
                if balances:
                    # Get account UUID from our database
                    account_response = self.supabase_service.client.table('accounts').select('id').eq('account_id', account_id).execute()
                    
                    if account_response.data:
                        account_uuid = account_response.data[0]['id']
                        
                        # Store balance snapshot
                        snapshot_result = self.supabase_service.store_account_snapshot(
                            account_uuid, 
                            balances,
                            datetime.now().date().isoformat()
                        )
                        
                        if snapshot_result.get('success'):
                            balance_updates += 1
            
            return {
                "success": True,
                "balance_updates": balance_updates
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def force_full_sync(self, user_id: str, item_id: str) -> Dict:
        """
        Force a full sync by clearing the cursor and re-syncing
        """
        try:
            # Get sync state
            sync_state_result = self.supabase_service.get_sync_state(user_id, item_id)
            if not sync_state_result.get('success'):
                return {"success": False, "error": "Sync state not found"}
            
            sync_state = sync_state_result['sync_state']
            access_token = sync_state.get('access_token')
            
            if not access_token:
                return {"success": False, "error": "No access token found"}
            
            # Clear the cursor to force full sync
            self.supabase_service.update_sync_cursor(user_id, item_id, None)
            
            # Perform sync
            return self._sync_single_item(user_id, item_id, access_token)
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_sync_status(self, user_id: str) -> Dict:
        """
        Get sync status for all user's accounts
        """
        try:
            sync_states_result = self.supabase_service.get_user_sync_states(user_id)
            
            if not sync_states_result.get('success'):
                return {"success": False, "error": "Failed to get sync states"}
            
            sync_states = sync_states_result.get('sync_states', [])
            
            # Add additional info for each sync state
            for sync_state in sync_states:
                # Get account count for this item
                accounts_response = self.supabase_service.client.table('accounts').select('id').eq('item_id', sync_state['item_id']).execute()
                sync_state['account_count'] = len(accounts_response.data) if accounts_response.data else 0
                
                # Get last transaction count
                if sync_state.get('last_transaction_sync'):
                    transactions_response = self.supabase_service.client.table('transactions').select('id').eq('accounts.item_id', sync_state['item_id']).execute()
                    sync_state['transaction_count'] = len(transactions_response.data) if transactions_response.data else 0
                else:
                    sync_state['transaction_count'] = 0
            
            return {
                "success": True,
                "sync_states": sync_states,
                "total_items": len(sync_states),
                "items_syncing": len([s for s in sync_states if s.get('sync_status') == 'syncing']),
                "items_with_errors": len([s for s in sync_states if s.get('sync_status') == 'error'])
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global instance
_sync_service = None

def get_sync_service(environment: str = 'sandbox') -> SyncService:
    """Get the global sync service instance"""
    global _sync_service
    if _sync_service is None or _sync_service.environment != environment:
        _sync_service = SyncService(environment)
    return _sync_service 