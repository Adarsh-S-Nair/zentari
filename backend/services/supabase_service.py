import os
from supabase import create_client, Client
from typing import Optional, Dict, Any

class SupabaseService:
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
        
        try:
            print(f"Creating Supabase client with URL: {supabase_url}")
            
            # Temporarily remove proxy environment variables that might interfere
            import os
            original_proxy_vars = {}
            proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy']
            
            for var in proxy_vars:
                if var in os.environ:
                    original_proxy_vars[var] = os.environ[var]
                    del os.environ[var]
            
            try:
                self.client: Client = create_client(supabase_url, supabase_key)
                print("Supabase client created successfully")
            finally:
                # Restore original proxy environment variables
                for var, value in original_proxy_vars.items():
                    os.environ[var] = value
                    
        except Exception as e:
            print(f"Error creating Supabase client: {e}")
            raise
    
    def get_user_environment(self, user_id: str) -> Optional[str]:
        """
        Get the environment for a specific user
        """
        try:
            response = self.client.table('user_profiles').select('environment').eq('id', user_id).single().execute()
            return response.data.get('environment') if response.data else None
        except Exception as e:
            print(f"Error getting user environment: {e}")
            return None
    
    def store_plaid_access_token(self, user_id: str, access_token: str, item_id: str, environment: str):
        """
        Store Plaid access token in the database (now handled in store_plaid_accounts)
        """
        # This method is kept for compatibility but the token is now stored with accounts
        return {"success": True}
    
    def store_plaid_accounts(self, user_id: str, item_id: str, accounts: list, environment: str, access_token: str = None):
        """Store Plaid accounts in the database with access token and institution data"""
        try:
            updated_count = 0
            inserted_count = 0
            
            # Get institution data for this item
            institution_data = self._get_institution_data(item_id, environment, access_token)
            
            # Get or create institution record
            institution_uuid = None
            if institution_data:
                institution_uuid = self._get_or_create_institution(institution_data)
            
            for account in accounts:
                account_key = self._create_account_key(account)
                account_data = self._prepare_account_data(user_id, item_id, account, account_key, institution_uuid)
                
                if self._account_exists(user_id, account_key):
                    self._update_account(account_data)
                    updated_count += 1
                else:
                    self._insert_account(account_data)
                    inserted_count += 1
            
            self._log_results(user_id, item_id, len(accounts), updated_count, inserted_count)
            
            return {
                "success": True, 
                "message": f"Processed {len(accounts)} accounts",
                "updated": updated_count,
                "inserted": inserted_count
            }
        except Exception as e:
            print(f"Error storing Plaid accounts: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_institution_data(self, item_id: str, environment: str, access_token: str = None):
        """Get institution data for an item"""
        try:
            from .plaid_service import PlaidService
            
            plaid_service = PlaidService(environment)
            
            # Use the provided access token if available
            if access_token:
                # Get item info
                item_response = plaid_service.get_item(access_token)
                
                if item_response.get('success') and 'item' in item_response:
                    institution_id = item_response['item'].get('institution_id')
                    
                    if institution_id:
                        # Get institution details
                        institution_response = plaid_service.get_institution(institution_id)
                        
                        if institution_response.get('success') and 'institution' in institution_response:
                            institution = institution_response['institution']
                            institution_data = {
                                'institution_id': institution.get('institution_id'),
                                'institution_name': institution.get('name'),
                                'institution_logo': institution.get('logo'),
                                'primary_color': institution.get('primary_color'),
                                'url': institution.get('url')
                            }
                            return institution_data
                        else:
                            # Create basic institution record with what we have
                            return {
                                'institution_id': institution_id,
                                'institution_name': f'Institution {institution_id}',  # Placeholder name
                                'institution_logo': None,
                                'primary_color': None,
                                'url': None
                            }
            else:
                # Fallback: try to get access token from existing accounts
                existing_accounts = self.client.table('accounts').select('access_token').eq('item_id', item_id).limit(1).execute()
                
                if existing_accounts.data:
                    access_token = existing_accounts.data[0].get('access_token')
                    if access_token:
                        return self._get_institution_data(item_id, environment, access_token)
            
            return None
        except Exception as e:
            print(f"Error getting institution data: {e}")
            return None
    
    def _get_or_create_institution(self, institution_data: dict):
        """Get existing institution or create new one, returns institution UUID"""
        try:
            plaid_institution_id = institution_data.get('institution_id')
            
            if not plaid_institution_id:
                return None
            
            # Check if institution already exists
            existing = self.client.table('institutions').select('id').eq('institution_id', plaid_institution_id).execute()
            
            if existing.data:
                # Institution exists, return its UUID
                institution_uuid = existing.data[0]['id']
                return institution_uuid
            else:
                # Create new institution
                new_institution = {
                    'institution_id': plaid_institution_id,
                    'name': institution_data.get('institution_name'),
                    'logo': institution_data.get('institution_logo'),
                    'primary_color': institution_data.get('primary_color'),
                    'url': institution_data.get('url')
                }
                
                response = self.client.table('institutions').insert(new_institution).execute()
                
                if response.data:
                    institution_uuid = response.data[0]['id']
                    return institution_uuid
            
            return None
        except Exception as e:
            print(f"Error getting or creating institution: {e}")
            return None
    
    def _create_account_key(self, account):
        """
        Create a unique key for an account based on its characteristics
        """
        key_parts = [
            account.get('name', '').lower().strip(),
            account.get('mask', '').lower().strip(),
            account.get('type', '').lower().strip(),
            account.get('subtype', '').lower().strip()
        ]
        
        # Filter out empty parts and join with a separator
        key_parts = [part for part in key_parts if part]
        return '|'.join(key_parts)
    
    def _prepare_account_data(self, user_id: str, item_id: str, account: dict, account_key: str, institution_uuid: str = None):
        """Prepare account data for storage with institution reference"""
        # Get account type and determine if balances should be negated
        account_type = account.get('type', '').lower()
        should_negate = account_type in ['credit', 'loan']
        
        # Prepare balances with negation for credit/loan accounts
        balances = account.get('balances')
        if balances and should_negate:
            balances = {
                'available': -balances.get('available', 0) if balances.get('available') is not None else None,
                'current': -balances.get('current', 0) if balances.get('current') is not None else None,
                'limit': balances.get('limit'),  # Keep limit as positive
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
        
        # Add institution reference if available
        if institution_uuid:
            account_data['institution_id'] = institution_uuid
        
        return account_data
    
    def _account_exists(self, user_id: str, account_key: str):
        """
        Check if account already exists by account_key
        """
        existing = self.client.table('accounts').select('account_id').eq('user_id', user_id).eq('account_key', account_key).execute()
        return bool(existing.data)
    
    def _update_account(self, account_data: dict):
        """Update existing account in database"""
        existing = self.client.table('accounts').select('account_id').eq('user_id', account_data['user_id']).eq('account_key', account_data['account_key']).execute()
        existing_account_id = existing.data[0]['account_id']
        
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
        
        # Add institution data if available
        if 'institution_id' in account_data:
            update_data['institution_id'] = account_data['institution_id']
        
        self.client.table('accounts').update(update_data).eq('account_id', existing_account_id).execute()
    
    def _insert_account(self, account_data: dict):
        """
        Insert new account into database
        """
        self.client.table('accounts').insert(account_data).execute()
    
    def _log_results(self, user_id: str, item_id: str, total: int, updated: int, inserted: int):
        """
        Log processing results
        """
        print(f"Processed {total} accounts for user {user_id}, item {item_id} (updated: {updated}, inserted: {inserted})")
    
    def get_user_plaid_accounts(self, user_id: str, environment: str):
        """Get all Plaid accounts for a user with institution data"""
        try:
            # Join accounts with institutions table to get institution data
            response = self.client.table('accounts').select('*, institutions(id, name, logo, primary_color, url)').eq('user_id', user_id).execute()
            
            # Transform the response to flatten institution data
            accounts = []
            for account in response.data:
                account_data = account.copy()
                if account.get('institutions'):
                    institution = account['institutions']
                    account_data['institution_name'] = institution.get('name')
                    account_data['institution_logo'] = institution.get('logo')
                    account_data['institution_primary_color'] = institution.get('primary_color')
                    account_data['institution_url'] = institution.get('url')
                # Remove the nested institutions object
                account_data.pop('institutions', None)
                accounts.append(account_data)
            
            return {"success": True, "accounts": accounts}
        except Exception as e:
            print(f"Error getting user Plaid accounts: {e}")
            return {"success": False, "error": str(e)}

# Global instance
_supabase_service = None

def get_supabase_service() -> SupabaseService:
    """Get the global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service 