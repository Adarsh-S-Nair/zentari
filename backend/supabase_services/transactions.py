from typing import Dict, Any, List, Optional
from .client import SupabaseClient

class TransactionService:
    """Service for transaction-related database operations"""
    
    def __init__(self, client: SupabaseClient):
        self.client = client
    
    def store(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Store new transactions using upsert"""
        try:
            if not transactions:
                return {"success": True, "message": "No transactions to store"}
            
            transaction_data = []
            for transaction in transactions:
                # Get account UUID from plaid account_id
                from .accounts import AccountService
                account_service = AccountService(self.client)
                account_result = account_service.get_by_plaid_id(transaction['account_id'])
                
                if not account_result.get('success') or not account_result.get('data'):
                    continue
                
                account_uuid = account_result['data'][0]['id']
                
                # Get category UUID
                category_uuid = self._get_category_id(transaction)
                
                transaction_data.append({
                    'account_id': account_uuid,
                    'plaid_transaction_id': transaction['plaid_transaction_id'],
                    'datetime': transaction['datetime'],
                    'description': transaction['description'],
                    'category_id': category_uuid,
                    'merchant_name': transaction.get('merchant_name'),
                    'icon_url': transaction.get('icon_url'),
                    'personal_finance_category': transaction.get('personal_finance_category'),
                    'amount': -transaction['amount'],  # Negate amount for consistency
                    'currency_code': transaction['currency_code'],
                    'pending': transaction['pending'],
                    'location': transaction.get('location'),
                    'payment_channel': transaction.get('payment_channel'),
                    'website': transaction.get('website')
                })
            
            if transaction_data:
                result = self.client.upsert('transactions', transaction_data, 'plaid_transaction_id')
                return {
                    "success": True,
                    "message": f"Stored {len(transaction_data)} transactions",
                    "stored_count": len(transaction_data)
                }
            else:
                return {"success": True, "message": "No valid transactions to store"}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Update existing transactions"""
        try:
            if not transactions:
                return {"success": True, "message": "No transactions to update"}
            
            updated_count = 0
            for transaction in transactions:
                # Get account UUID
                from .accounts import AccountService
                account_service = AccountService(self.client)
                account_result = account_service.get_by_plaid_id(transaction['account_id'])
                
                if not account_result.get('success') or not account_result.get('data'):
                    continue
                
                account_uuid = account_result['data'][0]['id']
                
                # Get category UUID
                category_uuid = self._get_category_id(transaction)
                
                transaction_data = {
                    'account_id': account_uuid,
                    'plaid_transaction_id': transaction['plaid_transaction_id'],
                    'datetime': transaction['datetime'],
                    'description': transaction['description'],
                    'category_id': category_uuid,
                    'merchant_name': transaction.get('merchant_name'),
                    'icon_url': transaction.get('icon_url'),
                    'personal_finance_category': transaction.get('personal_finance_category'),
                    'amount': -transaction['amount'],
                    'currency_code': transaction['currency_code'],
                    'pending': transaction['pending'],
                    'location': transaction.get('location'),
                    'payment_channel': transaction.get('payment_channel'),
                    'website': transaction.get('website')
                }
                
                result = self.client.update('transactions', transaction_data, 
                                          {'plaid_transaction_id': transaction['plaid_transaction_id']})
                if result.get('success'):
                    updated_count += 1
            
            return {
                "success": True,
                "message": f"Updated {updated_count} transactions",
                "updated_count": updated_count
            }
                
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_by_user(self, user_id: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get transactions for user with category info"""
        try:
            print(f"[TRANSACTIONS] Getting transactions for user {user_id}, limit={limit}, offset={offset}")
            
            # Complex query with joins
            query = self.client.client.table('transactions').select(
                'id, plaid_transaction_id, datetime, description, category_id, merchant_name, icon_url, '
                'personal_finance_category, amount, currency_code, pending, location, payment_channel, '
                'website, created_at, updated_at, '
                'accounts:account_id(account_id, name, mask, type, subtype, user_id), '
                'system_categories:category_id(id, group_id, label, description, hex_color, '
                'category_groups:group_id(id, name, icon_lib, icon_name))'
            ).eq('accounts.user_id', user_id).order('datetime', desc=True).range(offset, offset + limit - 1)
            
            response = query.execute()
            print(f"[TRANSACTIONS] Query executed, found {len(response.data)} transactions")
            
            if response.data:
                print(f"[TRANSACTIONS] Processing {len(response.data)} transactions...")
                transactions = []
                for i, transaction in enumerate(response.data):
                    transaction_data = transaction.copy()
                    if transaction.get('system_categories'):
                        category = transaction['system_categories']
                        transaction_data['category_name'] = category.get('label')
                        transaction_data['category_color'] = category.get('hex_color')
                        # Add group info if present
                        if category.get('category_groups'):
                            group = category['category_groups']
                            transaction_data['category_group_id'] = group.get('id')
                            transaction_data['category_group_name'] = group.get('name')
                            transaction_data['category_icon_lib'] = group.get('icon_lib')
                            transaction_data['category_icon_name'] = group.get('icon_name')
                    transaction_data.pop('system_categories', None)
                    transactions.append(transaction_data)
                
                print(f"[TRANSACTIONS] Returning {len(transactions)} processed transactions")
                return {"success": True, "data": transactions}
            else:
                print(f"[TRANSACTIONS] No transactions found in response")
                return {"success": True, "data": []}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete_by_plaid_ids(self, plaid_transaction_ids: List[str]) -> Dict[str, Any]:
        """Delete transactions by Plaid transaction IDs"""
        try:
            if not plaid_transaction_ids:
                return {"success": True, "deleted_count": 0}
            
            # Delete transactions that match the provided Plaid transaction IDs
            response = self.client.client.table('transactions').delete().in_('plaid_transaction_id', plaid_transaction_ids).execute()
            
            deleted_count = len(response.data) if response.data else 0
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "message": f"Deleted {deleted_count} transactions"
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update_category(self, transaction_id: str, category_id: str) -> Dict[str, Any]:
        """Update category for transaction"""
        return self.client.update('transactions', {'category_id': category_id}, {'id': transaction_id})
    
    def _get_category_id(self, transaction: Dict[str, Any]) -> Optional[str]:
        """Get category ID from transaction data"""
        from .categories import CategoryService
        category_service = CategoryService(self.client)
        
        if transaction.get('personal_finance_category'):
            # Use the detailed category from personal_finance_category
            personal_finance_category = transaction['personal_finance_category']
            if isinstance(personal_finance_category, dict) and personal_finance_category.get('detailed'):
                # Extract the label by removing the primary category prefix
                detailed = personal_finance_category['detailed']
                primary = personal_finance_category.get('primary', '')
                if primary and detailed.startswith(primary + '_'):
                    # Remove the primary prefix and underscore
                    label = detailed[len(primary) + 1:]  # +1 for the underscore
                    return category_service.get_id(label)
                else:
                    # Fallback: use the detailed as-is
                    return category_service.get_id(detailed)
        elif transaction.get('category'):
            # Fallback to old category field
            return category_service.get_id(transaction['category'])
        
        return None 