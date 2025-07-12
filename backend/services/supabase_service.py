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
    
    def store_plaid_accounts(self, user_id: str, item_id: str, accounts: list, access_token: str = None):
        """Store Plaid accounts in the database with sync state and balance snapshots"""
        try:
            updated_count = 0
            inserted_count = 0
            
            # Get institution data and create/update accounts
            institution_uuid = self._get_or_create_institution(item_id, access_token)
            
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
                self.create_or_update_plaid_item(user_id, item_id, token)
            
            return {
                "success": True, 
                "message": f"Processed {len(accounts)} accounts",
                "updated": updated_count,
                "inserted": inserted_count
            }
        except Exception as e:
            print(f"Error storing Plaid accounts: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_or_create_institution(self, item_id: str, access_token: str = None):
        """Get or create institution record for an item"""
        try:
            if not access_token:
                return None
            
            from .plaid_service import PlaidService
            plaid_service = PlaidService()
            
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
            'account_key': account_key,
            'auto_sync': True,
            'update_success': True
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
        
        self.client.table('accounts').update(update_data).eq('id', existing_account_id).execute()
        
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
    
    def create_or_update_plaid_item(self, user_id: str, item_id: str, access_token: str, transaction_cursor: str = None, last_transaction_sync: str = None):
        # Check if a sync state already exists for this user and item
        try:
            existing = self.client.table('plaid_items').select('id').eq('user_id', user_id).eq('item_id', item_id).execute()

            # Prepare the sync state data to update or insert
            sync_state_data = {
                'access_token': access_token,
                'updated_at': 'now()'
            }
            if transaction_cursor is not None:
                sync_state_data['transaction_cursor'] = transaction_cursor
            if last_transaction_sync is not None:
                sync_state_data['last_transaction_sync'] = last_transaction_sync

            if existing.data:
                # Update the existing sync state
                self.client.table('plaid_items').update(sync_state_data).eq('user_id', user_id).eq('item_id', item_id).execute()
            else:
                # Insert a new sync state for this user and item
                sync_state_data.update({
                    'user_id': user_id,
                    'item_id': item_id,
                    'sync_status': 'idle'
                })
                self.client.table('plaid_items').insert(sync_state_data).execute()
        except Exception as e:
            # Log any errors that occur during the sync state update/insert
            print(f"Error creating or updating plaid item: {e}")
    
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
                'recorded_at': date.today().isoformat()
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
            response = self.client.table('plaid_items').select('*').eq('user_id', user_id).eq('item_id', item_id).execute()
            if response.data:
                return {"success": True, "sync_state": response.data[0]}
            return {"success": False, "error": "Sync state not found"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update_sync_cursor(self, user_id: str, item_id: str, cursor: str):
        """Update transaction cursor for sync state"""
        try:
            self.client.table('plaid_items').update({
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
            
            self.client.table('plaid_items').update(update_data).eq('user_id', user_id).eq('item_id', item_id).execute()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def get_user_sync_states(self, user_id: str):
        """Get all sync states for a user"""
        try:
            response = self.client.table('plaid_items').select('*').eq('user_id', user_id).execute()
            return {"success": True, "sync_states": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Account Snapshot Methods
    def store_account_snapshot(self, account_id: str, balances: dict):
        """Store a balance snapshot for an account (no snapshot_date, just recorded_at)"""
        from datetime import datetime
        now = datetime.utcnow().isoformat()
        snapshot_data = {
            'account_id': account_id,
            'available_balance': balances.get('available'),
            'current_balance': balances.get('current'),
            'limit_balance': balances.get('limit'),
            'currency_code': balances.get('iso_currency_code', 'USD'),
            'recorded_at': now
        }
        self.client.table('account_snapshots').insert(snapshot_data).execute()

    def get_account_snapshots(self, account_id: str, start_date: str = None, end_date: str = None, limit: int = 100):
        """Get account snapshots for an account, optionally filtered by recorded_at date range"""
        query = self.client.table('account_snapshots').select('*').eq('account_id', account_id)
        if start_date:
            query = query.gte('recorded_at', start_date)
        if end_date:
            query = query.lte('recorded_at', end_date)
        response = query.order('recorded_at', desc=True).limit(limit).execute()
        return response.data if response.data else []
    
    # Account Retrieval Methods
    def get_user_accounts(self, user_id: str):
        """Get all accounts for a user (no institution join)"""
        try:
            response = self.client.table('accounts').select('*').eq('user_id', user_id).execute()
            return {"success": True, "accounts": response.data}
        except Exception as e:
            print(f"Error getting user accounts: {e}")
            return {"success": False, "error": str(e)}

    def get_institution_data(self, institution_ids):
        """Fetch institution info for a list of institution_ids. Returns a dict mapping id to info."""
        if not institution_ids:
            return {}
        try:
            # Remove duplicates and nulls
            ids = [iid for iid in set(institution_ids) if iid]
            if not ids:
                return {}
            response = self.client.table('institutions').select('id, name, logo, primary_color, url').in_('id', ids).execute()
            if not response.data:
                return {}
            return {inst['id']: inst for inst in response.data}
        except Exception as e:
            print(f"Error getting institution data for ids {institution_ids}: {e}")
            return {}
    
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
                    
                    # Get or create category from personal_finance_category
                    category_uuid = None
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
                                category_uuid = self.get_or_create_category(label)
                            else:
                                # Fallback: use the detailed as-is
                                category_uuid = self.get_or_create_category(detailed)
                    elif transaction.get('category'):
                        # Fallback to old category field if personal_finance_category is not available
                        category_uuid = self.get_or_create_category(transaction['category'])
                    
                    transaction_data.append({
                        'account_id': account_uuid,
                        'plaid_transaction_id': transaction['plaid_transaction_id'],
                        'datetime': transaction['datetime'],
                        'description': transaction['description'],
                        'category_id': category_uuid,
                        'merchant_name': transaction.get('merchant_name'),
                        'icon_url': transaction.get('icon_url'),
                        'personal_finance_category': transaction.get('personal_finance_category'),
                        'amount': transaction['amount'],
                        'currency_code': transaction['currency_code'],
                        'pending': transaction['pending'],
                        'location': transaction.get('location'),
                        'payment_channel': transaction.get('payment_channel'),
                        'website': transaction.get('website')
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
                'id, plaid_transaction_id, datetime, description, category_id, merchant_name, icon_url, personal_finance_category, amount, currency_code, pending, location, payment_channel, website, created_at, updated_at, accounts:account_id(account_id, name, mask, type, subtype, user_id), system_categories:category_id(id, primary_group, label, description, hex_color)'
            ).eq('accounts.user_id', user_id).order('datetime', desc=True).range(offset, offset + limit - 1).execute()
            
            if response.data:
                transactions = []
                for transaction in response.data:
                    transaction_data = transaction.copy()
                    if transaction.get('system_categories'):
                        category = transaction['system_categories']
                        transaction_data['category_name'] = category.get('label')
                        transaction_data['category_color'] = category.get('hex_color')
                    transaction_data.pop('system_categories', None)
                    transactions.append(transaction_data)
                
                return {"success": True, "transactions": transactions}
            else:
                return {"success": True, "transactions": []}
        except Exception as e:
            print(f"Error getting user transactions: {e}")
            return {"success": False, "error": str(e)}

    # Category Methods (simplified)
    def get_or_create_category(self, category_name: str):
        """Get or create a system category from the system_categories table"""
        try:
            formatted_name = self._format_category_name(category_name)

            # Check if category exists in system_categories table
            existing = (
                self.client.table('system_categories')
                .select('id')
                .eq('label', formatted_name)
                .limit(1)
                .execute()
            )
            if existing.data:
                return existing.data[0]['id']

            # If not found, return None (categories should be pre-populated)
            print(f"Category '{formatted_name}' not found in system_categories table")
            return None

        except Exception as e:
            print(f"Error getting category: {e}")
            return None

    def _format_category_name(self, category_name: str) -> str:
        """Format category name for consistency using proper title case"""
        from utils.category_utils import format_category_name
        return format_category_name(category_name)

    def _generate_category_color(self, category_name: str) -> str:
        """Generate a clean, muted rainbow color for category names"""
        import hashlib
        import colorsys

        # Hash the name to get a consistent seed
        hash_digest = hashlib.md5(category_name.lower().encode()).hexdigest()
        hue_seed = int(hash_digest[:6], 16)

        # Convert to hue (0–360°) and normalize
        hue = (hue_seed % 300) / 360.0  # Avoid brownish/yellow hues (skip 300–360°)

        # Set pleasant, muted values
        saturation = 0.6    # Moderate saturation
        lightness = 0.55    # Clean and not too light on white background

        # Convert HLS → RGB
        r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
        r, g, b = [int(x * 255) for x in (r, g, b)]

        return f"#{r:02x}{g:02x}{b:02x}"

    def get_categories(self):
        """Get all system categories with their colors"""
        try:
            response = self.client.table('system_categories').select(
                'id, primary_group, label, description, hex_color'
            ).order('primary_group, label').execute()
            
            if response.data:
                categories = []
                for category in response.data:
                    category_data = {
                        'id': category['id'],
                        'name': category['label'],  # Keep 'name' for frontend compatibility
                        'primary_group': category['primary_group'],
                        'description': category['description'],
                        'color': category['hex_color']  # Keep 'color' for frontend compatibility
                    }
                    categories.append(category_data)
                
                return {"success": True, "categories": categories}
            else:
                return {"success": True, "categories": []}
        except Exception as e:
            print(f"Error getting categories: {e}")
            return {"success": False, "error": str(e)}

    def update_balances_and_snapshots(self, user_id: str, balances: list):
        """
        For each account in balances (dict with account_id, balances, item_id, etc.):
        - Update accounts.balances and accounts.updated_at
        - Update plaid_items.last_balance_sync
        - Insert into account_snapshots
        """
        from datetime import datetime, date
        now = datetime.utcnow().isoformat()
        today = date.today().isoformat()
        updated_items = set()
        for acct in balances:
            plaid_account_id = acct.get('account_id')
            item_id = acct.get('item_id')
            bal = acct.get('balances', {})
            # Look up internal UUID for this account
            response = self.client.table('accounts').select('id').eq('account_id', plaid_account_id).eq('user_id', user_id).single().execute()
            if not response.data or 'id' not in response.data:
                print(f"[update_balances_and_snapshots] No internal account found for Plaid account_id {plaid_account_id} and user_id {user_id}")
                continue
            account_uuid = response.data['id']
            # Update accounts table using internal UUID
            self.client.table('accounts').update({
                'balances': bal,
                'updated_at': now
            }).eq('id', account_uuid).execute()
            # Insert into account_snapshots (no snapshot_date)
            snapshot_data = {
                'account_id': account_uuid,
                'available_balance': bal.get('available'),
                'current_balance': bal.get('current'),
                'limit_balance': bal.get('limit'),
                'currency_code': bal.get('iso_currency_code', 'USD'),
                'recorded_at': now
            }
            self.client.table('account_snapshots').insert(snapshot_data).execute()
            # Track which items to update
            if item_id:
                updated_items.add(item_id)
        # Update last_balance_sync for each item
        for item_id in updated_items:
            self.client.table('plaid_items').update({
                'last_balance_sync': now
            }).eq('user_id', user_id).eq('item_id', item_id).execute()

    def get_account_by_id(self, id: str):
        # Fetch a single account by its internal UUID
        try:
            response = self.client.table('accounts').select('*').eq('id', id).single().execute()
            if response.data:
                return {'success': True, 'account': response.data}
            return {'success': False, 'error': 'Account not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def delete_account(self, id: str):
        # Delete a single account by its internal UUID
        try:
            self.client.table('accounts').delete().eq('id', id).execute()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def count_accounts_for_item(self, item_id: str):
        # Return the number of accounts associated with a given item_id
        try:
            response = self.client.table('accounts').select('account_id', count='exact').eq('item_id', item_id).execute()
            return response.count if hasattr(response, 'count') else 0
        except Exception as e:
            print(f"Error counting accounts for item: {e}")
            return 0

    def delete_plaid_item(self, user_id: str, item_id: str):
        # Delete a plaid_item row
        try:
            self.client.table('plaid_items').delete().eq('user_id', user_id).eq('item_id', item_id).execute()
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def remove_plaid_item_by_access_token(self, access_token: str):
        # Find and delete a plaid_item row by access_token
        try:
            # First find the item by access_token
            response = self.client.table('plaid_items').select('user_id, item_id').eq('access_token', access_token).execute()
            
            if not response.data:
                return {'success': False, 'error': 'No plaid_item found with this access_token'}
            
            item_data = response.data[0]
            user_id = item_data['user_id']
            item_id = item_data['item_id']
            
            # Delete the plaid_item
            self.client.table('plaid_items').delete().eq('user_id', user_id).eq('item_id', item_id).execute()
            
            return {'success': True, 'message': f'Removed plaid_item {item_id} for user {user_id}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_accounts_for_item_with_auto_sync(self, user_id: str, item_id: str):
        """Return all accounts for a plaid item with auto_sync = True"""
        try:
            response = self.client.table('accounts').select('*').eq('user_id', user_id).eq('item_id', item_id).eq('auto_sync', True).execute()
            return response.data if response.data else []
        except Exception as e:
            print(f"Error getting accounts for item {item_id} with auto_sync: {e}")
            return []

# Global instance
_supabase_service = None

def get_supabase_service() -> SupabaseService:
    """Get the global Supabase service instance"""
    global _supabase_service
    if _supabase_service is None:
        _supabase_service = SupabaseService()
    return _supabase_service 