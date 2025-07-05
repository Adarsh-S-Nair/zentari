import os
from supabase import create_client, Client
from typing import Optional, Dict, Any

class SupabaseService:
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
            
        # Remove proxy vars that might interfere
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy']
        original_proxy_vars = {var: os.environ.get(var) for var in proxy_vars if var in os.environ}
        
        for var in proxy_vars:
            os.environ.pop(var, None)
        
        try:
            self.client: Client = create_client(supabase_url, supabase_key)
        finally:
            # Restore proxy vars
            for var, value in original_proxy_vars.items():
                os.environ[var] = value
    
    def get_user_environment(self, user_id: str) -> Optional[str]:
        """Get the environment for a specific user"""
        try:
            # Since user_profiles table was dropped, we'll use a default environment
            # You can modify this logic based on your needs
            return 'sandbox'  # Default to sandbox environment
        except Exception as e:
            print(f"Error getting user environment: {e}")
            return None
    
    def store_plaid_accounts(self, user_id: str, item_id: str, accounts: list, environment: str, access_token: str = None):
        """Store Plaid accounts in the database with sync state and balance snapshots"""
        try:
            updated_count = 0
            inserted_count = 0
            
            # Get institution data and create/update accounts
            institution_uuid = self._get_or_create_institution(item_id, environment, access_token)
            
            for account in accounts:
                account_key = self._create_account_key(account)
                account_data = self._prepare_account_data(user_id, item_id, account, account_key, institution_uuid)
                
                if self._account_exists(user_id, account_key):
                    self._update_account(account_data)
                    updated_count += 1
                else:
                    insert_result = self._insert_account(account_data)
                    inserted_count += 1
                    
                    # Store initial balance snapshot for new accounts
                    if insert_result and account.get('balances'):
                        self._store_initial_balance_snapshot(insert_result, account['balances'])
            
            # Initialize sync state
            token = access_token or (accounts[0].get('access_token') if accounts else None)
            if token:
                self._initialize_sync_state(user_id, item_id, token)
            
            return {
                "success": True, 
                "message": f"Processed {len(accounts)} accounts",
                "updated": updated_count,
                "inserted": inserted_count
            }
        except Exception as e:
            print(f"Error storing Plaid accounts: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_or_create_institution(self, item_id: str, environment: str, access_token: str = None):
        """Get or create institution record for an item"""
        try:
            if not access_token:
                return None
            
            from .plaid_service import PlaidService
            plaid_service = PlaidService(environment)
            
            # Get item info
            item_response = plaid_service.get_item(access_token)
            if not item_response.get('success'):
                return None
            
            institution_id = item_response['item'].get('institution_id')
            if not institution_id:
                return None
            
            # Check if institution exists
            existing = self.client.table('institutions').select('id').eq('institution_id', institution_id).execute()
            if existing.data:
                return existing.data[0]['id']
            
            # Get institution details and create
            institution_response = plaid_service.get_institution(institution_id)
            if institution_response.get('success'):
                institution = institution_response['institution']
                new_institution = {
                    'institution_id': institution_id,
                    'name': institution.get('name'),
                    'logo': institution.get('logo'),
                    'primary_color': institution.get('primary_color'),
                    'url': institution.get('url')
                }
            else:
                # Create basic record
                new_institution = {
                    'institution_id': institution_id,
                    'name': f'Institution {institution_id}',
                    'logo': None,
                    'primary_color': None,
                    'url': None
                }
            
            response = self.client.table('institutions').insert(new_institution).execute()
            return response.data[0]['id'] if response.data else None
            
        except Exception as e:
            print(f"Error getting/creating institution: {e}")
            return None
    
    def _create_account_key(self, account):
        """Create unique key for account identification"""
        key_parts = [
            account.get('name', '').lower().strip(),
            account.get('mask', '').lower().strip(),
            account.get('type', '').lower().strip(),
            account.get('subtype', '').lower().strip()
        ]
        return '|'.join([part for part in key_parts if part])
    
    def _prepare_account_data(self, user_id: str, item_id: str, account: dict, account_key: str, institution_uuid: str = None):
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
            'account_key': account_key
        }
        
        if institution_uuid:
            account_data['institution_id'] = institution_uuid
        
        return account_data
    
    def _account_exists(self, user_id: str, account_key: str):
        """Check if account already exists"""
        existing = self.client.table('accounts').select('account_id').eq('user_id', user_id).eq('account_key', account_key).execute()
        return bool(existing.data)
    
    def _update_account(self, account_data: dict):
        """Update existing account and store balance snapshot if changed"""
        existing = self.client.table('accounts').select('id, balances').eq('user_id', account_data['user_id']).eq('account_key', account_data['account_key']).execute()
        
        if not existing.data:
            return None
            
        existing_account = existing.data[0]
        existing_account_id = existing_account['id']
        old_balances = existing_account.get('balances', {})
        
        # Update account
        update_data = {
            'name': account_data['name'],
            'mask': account_data['mask'],
            'type': account_data['type'],
            'subtype': account_data['subtype'],
            'balances': account_data['balances'],
            'access_token': account_data['access_token'],
            'account_key': account_data['account_key'],
            'updated_at': 'now()'
        }
        
        if 'institution_id' in account_data:
            update_data['institution_id'] = account_data['institution_id']
        
        self.client.table('accounts').update(update_data).eq('account_id', existing_account_id).execute()
        
        # Store balance snapshot if balances changed
        if account_data.get('balances') and self._balances_changed(old_balances, account_data['balances']):
            self._store_balance_snapshot_on_update(existing_account_id, account_data['balances'])
        
        return existing_account_id
    
    def _insert_account(self, account_data: dict):
        """Insert new account and return account UUID"""
        try:
            response = self.client.table('accounts').insert(account_data).execute()
            return response.data[0]['id'] if response.data else None
        except Exception as e:
            print(f"Error inserting account: {e}")
            return None
    
    def _initialize_sync_state(self, user_id: str, item_id: str, access_token: str):
        """Initialize or update sync state for a Plaid Item"""
        try:
            existing = self.client.table('account_sync_states').select('id').eq('user_id', user_id).eq('item_id', item_id).execute()
            
            if existing.data:
                # Update existing sync state
                self.client.table('account_sync_states').update({
                    'access_token': access_token,
                    'updated_at': 'now()'
                }).eq('user_id', user_id).eq('item_id', item_id).execute()
            else:
                # Create new sync state
                sync_state_data = {
                    'user_id': user_id,
                    'item_id': item_id,
                    'access_token': access_token,
                    'sync_status': 'idle'
                }
                self.client.table('account_sync_states').insert(sync_state_data).execute()
                
        except Exception as e:
            print(f"Error initializing sync state: {e}")
    
    def _store_initial_balance_snapshot(self, account_uuid: str, balances: dict):
        """Store initial balance snapshot for new account"""
        try:
            from datetime import date
            
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
                'account_id': account_uuid,
                'available_balance': snapshot_balances['available'],
                'current_balance': snapshot_balances['current'],
                'limit_balance': snapshot_balances['limit'],
                'currency_code': snapshot_balances['iso_currency_code'],
                'snapshot_date': date.today().isoformat()
            }
            
            self.client.table('account_snapshots').insert(snapshot_data).execute()
            
        except Exception as e:
            print(f"Error storing initial balance snapshot: {e}")
    
    def _balances_changed(self, old_balances: dict, new_balances: dict) -> bool:
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
    
    def _store_balance_snapshot_on_update(self, account_uuid: str, balances: dict):
        """Store balance snapshot when account is updated"""
        try:
            from datetime import date
            self.store_account_snapshot(account_uuid, balances, date.today().isoformat())
        except Exception as e:
            print(f"Error storing balance snapshot: {e}")
    
    # Sync State Management Methods
    def get_sync_state(self, user_id: str, item_id: str):
        """Get sync state for a user-item combination"""
        try:
            response = self.client.table('account_sync_states').select('*').eq('user_id', user_id).eq('item_id', item_id).execute()
            if response.data:
                return {"success": True, "sync_state": response.data[0]}
            return {"success": False, "error": "Sync state not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update_sync_cursor(self, user_id: str, item_id: str, cursor: str):
        """Update transaction cursor for sync state"""
        try:
            self.client.table('account_sync_states').update({
                'transaction_cursor': cursor,
                'last_transaction_sync': 'now()',
                'sync_status': 'idle',
                'last_error': None
            }).eq('user_id', user_id).eq('item_id', item_id).execute()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update_sync_status(self, user_id: str, item_id: str, status: str, error: str = None):
        """Update sync status and error message"""
        try:
            update_data = {'sync_status': status, 'updated_at': 'now()'}
            if error:
                update_data['last_error'] = error
            
            self.client.table('account_sync_states').update(update_data).eq('user_id', user_id).eq('item_id', item_id).execute()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_user_sync_states(self, user_id: str):
        """Get all sync states for a user"""
        try:
            response = self.client.table('account_sync_states').select('*').eq('user_id', user_id).execute()
            return {"success": True, "sync_states": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Account Snapshot Methods
    def store_account_snapshot(self, account_id: str, balances: dict, snapshot_date: str = None):
        """Store balance snapshot for an account"""
        try:
            from datetime import date
            
            balance_date = date.fromisoformat(snapshot_date) if snapshot_date else date.today()
            
            # Check if snapshot exists
            existing = self.client.table('account_snapshots').select('id').eq('account_id', account_id).eq('snapshot_date', balance_date.isoformat()).execute()
            
            snapshot_data = {
                'account_id': account_id,
                'available_balance': balances.get('available'),
                'current_balance': balances.get('current'),
                'limit_balance': balances.get('limit'),
                'currency_code': balances.get('iso_currency_code', 'USD'),
                'snapshot_date': balance_date.isoformat()
            }
            
            if existing.data:
                # Update existing
                self.client.table('account_snapshots').update({
                    'available_balance': snapshot_data['available_balance'],
                    'current_balance': snapshot_data['current_balance'],
                    'limit_balance': snapshot_data['limit_balance'],
                    'currency_code': snapshot_data['currency_code'],
                    'recorded_at': 'now()'
                }).eq('account_id', account_id).eq('snapshot_date', balance_date.isoformat()).execute()
            else:
                # Create new
                self.client.table('account_snapshots').insert(snapshot_data).execute()
            
            return {"success": True}
        except Exception as e:
            print(f"Error storing account snapshot: {e}")
            return {"success": False, "error": str(e)}
    
    def get_account_snapshots(self, account_id: str, start_date: str = None, end_date: str = None, limit: int = 100):
        """Get balance snapshots for an account within date range"""
        try:
            query = self.client.table('account_snapshots').select('*').eq('account_id', account_id)
            
            if start_date:
                query = query.gte('snapshot_date', start_date)
            if end_date:
                query = query.lte('snapshot_date', end_date)
            
            response = query.order('snapshot_date', desc=True).limit(limit).execute()
            return {"success": True, "snapshots": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Account Retrieval Methods
    def get_user_plaid_accounts(self, user_id: str, environment: str):
        """Get all Plaid accounts for a user with institution data"""
        try:
            response = self.client.table('accounts').select('*, institutions(id, name, logo, primary_color, url)').eq('user_id', user_id).execute()
            
            accounts = []
            for account in response.data:
                account_data = account.copy()
                if account.get('institutions'):
                    institution = account['institutions']
                    account_data['institution_name'] = institution.get('name')
                    account_data['institution_logo'] = institution.get('logo')
                    account_data['institution_primary_color'] = institution.get('primary_color')
                    account_data['institution_url'] = institution.get('url')
                account_data.pop('institutions', None)
                accounts.append(account_data)
            
            return {"success": True, "accounts": accounts}
        except Exception as e:
            print(f"Error getting user Plaid accounts: {e}")
            return {"success": False, "error": str(e)}
    
    # Transaction Methods (simplified)
    def store_transactions(self, transactions: list):
        """Store transactions in the database"""
        try:
            if not transactions:
                return {"success": True, "message": "No transactions to store"}
            
            transaction_data = []
            for transaction in transactions:
                # Get account UUID from plaid account_id
                account_response = self.client.table('accounts').select('id').eq('account_id', transaction['account_id']).execute()
                
                if account_response.data:
                    account_uuid = account_response.data[0]['id']
                    
                    # Get or create category
                    category_uuid = None
                    if transaction.get('category'):
                        category_uuid = self.get_or_create_category(transaction['category'])
                    
                    transaction_data.append({
                        'account_id': account_uuid,
                        'plaid_transaction_id': transaction['plaid_transaction_id'],
                        'date': transaction['date'],
                        'description': transaction['description'],
                        'category_id': category_uuid,
                        'merchant_name': transaction.get('merchant_name'),
                        'icon_url': transaction.get('icon_url'),
                        'personal_finance_category': transaction.get('personal_finance_category'),
                        'amount': transaction['amount'],
                        'currency_code': transaction['currency_code'],
                        'pending': transaction['pending']
                    })
            
            if transaction_data:
                response = self.client.table('transactions').upsert(
                    transaction_data,
                    on_conflict='plaid_transaction_id'
                ).execute()
                
                return {
                    "success": True,
                    "message": f"Stored {len(transaction_data)} transactions",
                    "stored_count": len(transaction_data)
                }
            else:
                return {"success": True, "message": "No valid transactions to store"}
                
        except Exception as e:
            print(f"Error storing transactions: {e}")
            return {"success": False, "error": str(e)}
    
    def get_user_transactions(self, user_id: str, limit: int = 100, offset: int = 0):
        """Get transactions for a user"""
        try:
            response = self.client.table('transactions').select(
                'id, plaid_transaction_id, date, description, category_id, merchant_name, icon_url, personal_finance_category, amount, currency_code, pending, created_at, updated_at, accounts:account_id(account_id, name, mask, type, subtype, user_id), categories:category_id(id, name, color)'
            ).eq('accounts.user_id', user_id).order('date', desc=True).range(offset, offset + limit - 1).execute()
            
            if response.data:
                transactions = []
                for transaction in response.data:
                    transaction_data = transaction.copy()
                    if transaction.get('categories'):
                        category = transaction['categories']
                        transaction_data['category_name'] = category.get('name')
                        transaction_data['category_color'] = category.get('color')
                    transaction_data.pop('categories', None)
                    transactions.append(transaction_data)
                
                return {"success": True, "transactions": transactions}
            else:
                return {"success": True, "transactions": []}
        except Exception as e:
            print(f"Error getting user transactions: {e}")
            return {"success": False, "error": str(e)}

    # Category Methods (simplified)
    def get_or_create_category(self, category_name: str, color: str = None):
        """Get or create category"""
        try:
            formatted_name = self._format_category_name(category_name)
            
            # Check if category exists
            existing = self.client.table('categories').select('id').eq('name', formatted_name).execute()
            if existing.data:
                return existing.data[0]['id']
            
            # Create new category with auto-generated color if none provided
            if not color:
                color = self._generate_category_color(formatted_name)
            
            new_category = {
                'name': formatted_name,
                'color': color
            }
            
            response = self.client.table('categories').insert(new_category).execute()
            return response.data[0]['id'] if response.data else None
            
        except Exception as e:
            print(f"Error getting/creating category: {e}")
            return None

    def _format_category_name(self, category_name: str) -> str:
        """Format category name for consistency using proper title case"""
        if not category_name:
            return "Uncategorized"
        
        # Clean up the name
        name = category_name.strip()
        
        # Words that should not be capitalized (unless they're the first or last word)
        minor_words = {
            'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
        }
        
        # Split into words and apply proper title case
        words = name.split()
        if not words:
            return "Uncategorized"
        
        formatted_words = []
        for i, word in enumerate(words):
            # Always capitalize first and last word
            if i == 0 or i == len(words) - 1:
                formatted_words.append(word.capitalize())
            # For middle words, only capitalize if not a minor word
            elif word.lower() not in minor_words:
                formatted_words.append(word.capitalize())
            else:
                formatted_words.append(word.lower())
        
        return ' '.join(formatted_words)

    def _generate_category_color(self, category_name: str) -> str:
        """Generate a light, less saturated color based on category name"""
        import hashlib
        
        # Create a hash of the category name for consistent color generation
        hash_object = hashlib.md5(category_name.lower().encode())
        hash_hex = hash_object.hexdigest()
        
        # Use the first 6 characters of the hash to generate RGB values
        r = int(hash_hex[0:2], 16)
        g = int(hash_hex[2:4], 16)
        b = int(hash_hex[4:6], 16)
        
        # Make the color lighter and less saturated by:
        # 1. Increasing lightness by mixing with white (70% original, 30% white)
        # 2. Reducing saturation by mixing with gray
        r = int(r * 0.7 + 255 * 0.3)
        g = int(g * 0.7 + 255 * 0.3)
        b = int(b * 0.7 + 255 * 0.3)
        
        # Ensure values are within valid range
        r = min(255, max(0, r))
        g = min(255, max(0, g))
        b = min(255, max(0, b))
        
        return f"#{r:02x}{g:02x}{b:02x}"

    def get_categories(self):
        """Get all categories"""
        try:
            response = self.client.table('categories').select('*').order('name').execute()
            return {"success": True, "categories": response.data}
        except Exception as e:
            print(f"Error getting categories: {e}")
            return {"success": False, "error": str(e)}

# Global instance
_supabase_service = None

def get_supabase_service() -> SupabaseService:
    """Get the global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service 