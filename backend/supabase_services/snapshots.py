from typing import Dict, Any, List, Optional
from datetime import datetime, date
from .client import SupabaseClient

class SnapshotService:
    """Service for balance snapshot operations"""
    
    def __init__(self, client: SupabaseClient):
        self.client = client
    
    def store(self, account_id: str, balances: Dict[str, Any]) -> Dict[str, Any]:
        """Store a balance snapshot for an account"""
        try:
            now = datetime.utcnow().isoformat()
            snapshot_data = {
                'account_id': account_id,
                'available_balance': balances.get('available'),
                'current_balance': balances.get('current'),
                'limit_balance': balances.get('limit'),
                'currency_code': balances.get('iso_currency_code', 'USD'),
                'recorded_at': now
            }
            return self.client.insert('account_snapshots', snapshot_data)
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def store_initial(self, account_id: str, balances: Dict[str, Any]) -> Dict[str, Any]:
        """Store initial balance snapshot for new account"""
        try:
            # Handle balance negation for credit/loan accounts
            account_type = balances.get('type', '').lower()
            should_negate = account_type in ['credit', 'loan']
            
            snapshot_balances = {
                'available': balances.get('available'),
                'current': balances.get('current'),
                'limit': balances.get('limit'),
                'iso_currency_code': balances.get('iso_currency_code', 'USD')
            }
            
            if should_negate:
                if snapshot_balances['available'] is not None:
                    snapshot_balances['available'] = -snapshot_balances['available']
                if snapshot_balances['current'] is not None:
                    snapshot_balances['current'] = -snapshot_balances['current']
            
            snapshot_data = {
                'account_id': account_id,
                'available_balance': snapshot_balances['available'],
                'current_balance': snapshot_balances['current'],
                'limit_balance': snapshot_balances['limit'],
                'currency_code': snapshot_balances['iso_currency_code'],
                'recorded_at': date.today().isoformat()
            }
            
            return self.client.insert('account_snapshots', snapshot_data)
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_by_account(self, account_id: str, start_date: str = None, end_date: str = None, 
                      limit: int = 100) -> List[Dict[str, Any]]:
        """Get account snapshots for an account, optionally filtered by date range"""
        try:
            query = self.client.client.table('account_snapshots').select('*').eq('account_id', account_id)
            
            if start_date:
                query = query.gte('recorded_at', start_date)
            if end_date:
                query = query.lte('recorded_at', end_date)
            
            response = query.order('recorded_at', desc=True).limit(limit).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting account snapshots: {e}")
            return []
    
    def get_latest(self, account_id: str) -> Optional[Dict[str, Any]]:
        """Get the latest snapshot for an account"""
        try:
            result = self.client.select('account_snapshots', filters={'account_id': account_id}, 
                                      order_by='recorded_at', limit=1)
            if result.get('success') and result.get('data'):
                return result['data'][0]
            return None
        except Exception:
            return None
    
    def balances_changed(self, old_balances: Dict[str, Any], new_balances: Dict[str, Any]) -> bool:
        """Check if balances have changed"""
        if not old_balances or not new_balances:
            return True
        
        fields_to_compare = ['available', 'current', 'limit']
        
        for field in fields_to_compare:
            old_value = old_balances.get(field)
            new_value = new_balances.get(field)
            
            if old_value is None and new_value is None:
                continue
            if old_value is None or new_value is None:
                return True
            
            if abs(float(old_value) - float(new_value)) > 0.01:
                return True
        
        return False 