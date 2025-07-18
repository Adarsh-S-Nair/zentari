from typing import Dict, Any, List, Optional
from datetime import datetime
from .client import SupabaseClient

class AccountService:
    """Service for account-related database operations"""
    
    def __init__(self, client: SupabaseClient):
        self.client = client
    
    def store_plaid_accounts(self, user_id: str, item_id: str, accounts: List[Dict], access_token: str = None) -> Dict[str, Any]:
        """Store Plaid accounts with sync state and balance snapshots"""
        try:
            updated_count = 0
            inserted_count = 0
            
            # Get institution data
            from .institutions import InstitutionService
            institution_service = InstitutionService(self.client)
            institution_uuid = institution_service.get_or_create(item_id, access_token)
            
            for account in accounts:
                account_key = self._create_key(account)
                account_data = self._prepare_data(user_id, item_id, account, account_key, institution_uuid)
                
                if self.exists(user_id, account_key):
                    self.update(account_data)
                    updated_count += 1
                else:
                    result = self.insert(account_data)
                    inserted_count += 1
                    
                    # Store initial balance snapshot for new accounts
                    if result.get('success') and account.get('balances'):
                        from .snapshots import SnapshotService
                        snapshot_service = SnapshotService(self.client)
                        snapshot_service.store_initial(result['data'][0]['id'], account['balances'])
            
            # Initialize sync state
            token = access_token or (accounts[0].get('access_token') if accounts else None)
            if token:
                from .sync import SyncService
                sync_service = SyncService(self.client)
                sync_service.create_or_update(user_id, item_id, token)
            
            return {
                "success": True, 
                "message": f"Processed {len(accounts)} accounts",
                "updated": updated_count,
                "inserted": inserted_count
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def insert(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert new account"""
        return self.client.insert('accounts', data)
    
    def update(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Update existing account"""
        filters = {'user_id': data['user_id'], 'account_key': data['account_key']}
        return self.client.update('accounts', data, filters)
    
    def exists(self, user_id: str, account_key: str) -> bool:
        """Check if account exists"""
        filters = {'user_id': user_id, 'account_key': account_key}
        return self.client.exists('accounts', filters)
    
    def get_by_user(self, user_id: str) -> Dict[str, Any]:
        """Get all accounts for user"""
        return self.client.select('accounts', filters={'user_id': user_id})
    
    def get_by_id(self, account_id: str) -> Dict[str, Any]:
        """Get account by ID"""
        return self.client.select('accounts', filters={'id': account_id})
    
    def get_by_plaid_id(self, plaid_account_id: str) -> Dict[str, Any]:
        """Get account by Plaid account ID"""
        return self.client.select('accounts', filters={'account_id': plaid_account_id})
    
    def get_by_item(self, item_id: str) -> Dict[str, Any]:
        """Get all accounts for a specific Plaid item"""
        return self.client.select('accounts', filters={'item_id': item_id})
    
    def get_auto_sync(self, user_id: str, item_id: str) -> List[Dict[str, Any]]:
        """Get accounts with auto_sync=True for item"""
        result = self.client.select('accounts', filters={
            'user_id': user_id, 
            'item_id': item_id, 
            'auto_sync': True
        })
        return result.get('data', []) if result.get('success') else []
    
    def get_accounts_needing_sync(self, user_id: str, item_id: str) -> List[Dict[str, Any]]:
        """Get accounts that need transaction syncing (auto_sync=True and update_success=True)"""
        result = self.client.select('accounts', filters={
            'user_id': user_id, 
            'item_id': item_id, 
            'auto_sync': True,
            'update_success': True
        })
        return result.get('data', []) if result.get('success') else []
    
    def update_balances(self, user_id: str, balances: List[Dict[str, Any]]) -> None:
        """Update account balances and create snapshots only when balances change"""
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        
        for balance_data in balances:
            plaid_account_id = balance_data.get('account_id')
            new_balances = balance_data.get('balances', {})
            
            # Get internal account ID
            account_result = self.get_by_plaid_id(plaid_account_id)
            if not account_result.get('success') or not account_result.get('data'):
                continue
            
            account_id = account_result['data'][0]['id']
            old_balances = account_result['data'][0].get('balances', {})
            
            # Check if balances have changed
            from .snapshots import SnapshotService
            snapshot_service = SnapshotService(self.client)
            
            if snapshot_service.balances_changed(old_balances, new_balances):
                # Update account balances
                update_data = {
                    'balances': new_balances,
                    'updated_at': now
                }
                self.client.update('accounts', update_data, {'id': account_id})
                
                # Store balance snapshot only when balances changed
                snapshot_service.store(account_id, new_balances)
                print(f"[BALANCE] Balance changed for account {plaid_account_id}, snapshot created")
            else:
                print(f"[BALANCE] No balance change for account {plaid_account_id}, skipping snapshot")
    
    def delete(self, account_id: str) -> Dict[str, Any]:
        """Delete account by ID"""
        return self.client.delete('accounts', {'id': account_id})
    
    def count_by_item(self, item_id: str) -> int:
        """Count accounts for item"""
        try:
            result = self.client.select('accounts', 'account_id', {'item_id': item_id})
            return len(result.get('data', [])) if result.get('success') else 0
        except Exception:
            return 0
    
    def update_auto_sync(self, account_id: str, auto_sync: bool) -> Dict[str, Any]:
        """Update auto_sync for account"""
        return self.client.update('accounts', {'auto_sync': auto_sync}, {'id': account_id})
    
    def update_name(self, account_id: str, name: str) -> Dict[str, Any]:
        """Update name for account"""
        return self.client.update('accounts', {'name': name}, {'id': account_id})
    
    def create_key(self, account: Dict[str, Any]) -> str:
        """Create unique key for account identification"""
        key_parts = [
            account.get('name', '').lower().strip(),
            account.get('mask', '').lower().strip(),
            account.get('type', '').lower().strip(),
            account.get('subtype', '').lower().strip()
        ]
        return '|'.join([part for part in key_parts if part])
    
    def _create_key(self, account: Dict[str, Any]) -> str:
        """Create unique key for account identification (private alias for backward compatibility)"""
        return self.create_key(account)
    
    def _prepare_data(self, user_id: str, item_id: str, account: Dict[str, Any], 
                     account_key: str, institution_uuid: Optional[str] = None) -> Dict[str, Any]:
        """Prepare account data for storage"""
        account_type = account.get('type', '').lower()
        should_negate = account_type in ['credit', 'loan']
        
        # Handle balance negation for credit/loan accounts
        balances = account.get('balances')
        if balances and should_negate:
            balances = {
                'available': -balances.get('available', 0) if balances.get('available') is not None else None,
                'current': -balances.get('current', 0) if balances.get('current') is not None else None,
                'limit': balances.get('limit'),
                'iso_currency_code': balances.get('iso_currency_code'),
                'unofficial_currency_code': balances.get('unofficial_currency_code')
            }
        
        account_data = {
            'user_id': user_id,
            'item_id': item_id,
            'account_id': account['account_id'],
            'name': account['name'],
            'mask': account.get('mask'),
            'type': account.get('type'),
            'subtype': account.get('subtype'),
            'balances': balances,
            'access_token': account.get('access_token'),
            'account_key': account_key,
            'auto_sync': True,
            'update_success': True
        }
        
        if institution_uuid:
            account_data['institution_id'] = institution_uuid
        
        return account_data 