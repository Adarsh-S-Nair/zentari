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
			
			print(f"[TRANSACTIONS] Storing {len(transactions)} transactions using upsert")
			
			transaction_data = []
			for transaction in transactions:
				# Get account UUID from plaid account_id
				from .accounts import AccountService
				account_service = AccountService(self.client)
				account_result = account_service.get_by_plaid_id(transaction['account_id'])
				
				if not account_result.get('success') or not account_result.get('data'):
					print(f"[TRANSACTIONS] Could not find account for plaid_id: {transaction['account_id']}")
					continue
				
				account_uuid = account_result['data'][0]['id']
				
				# Get category UUID
				category_uuid = self._get_category_id(transaction)
				
				# Merge posted into existing pending row when pending_plaid_transaction_id is present
				pending_ref = transaction.get('pending_plaid_transaction_id')
				if pending_ref:
					# Try to update existing pending row directly and skip insert path
					merge_result = self.client.update('transactions', {
						'plaid_transaction_id': transaction['plaid_transaction_id'],
						'account_id': account_uuid,
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
					}, {'plaid_transaction_id': pending_ref})
					if merge_result.get('success') and merge_result.get('data'):
						print(f"[TRANSACTIONS] Merged posted txn into pending row: {pending_ref}")
						continue

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
				
				print(f"[TRANSACTIONS] Prepared transaction: {transaction['description']} (ID: {transaction['plaid_transaction_id']}) - Pending: {transaction['pending']}")
			
			if transaction_data:
				result = self.client.upsert('transactions', transaction_data, 'plaid_transaction_id')
				if result.get('success'):
					print(f"[TRANSACTIONS] Successfully stored {len(transaction_data)} transactions")
				else:
					print(f"[TRANSACTIONS] Error storing transactions: {result.get('error')}")
				
				return {
					"success": True,
					"message": f"Stored {len(transaction_data)} transactions",
					"stored_count": len(transaction_data)
				}
			else:
				print(f"[TRANSACTIONS] No valid transactions to store")
				return {"success": True, "message": "No valid transactions to store"}
				
		except Exception as e:
			print(f"[TRANSACTIONS] Error storing transactions: {str(e)}")
			return {"success": False, "error": str(e)}
	
	def update(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
		"""Update existing transactions using upsert to handle both new and modified transactions"""
		try:
			if not transactions:
				return {"success": True, "message": "No transactions to update"}
			
			print(f"[TRANSACTIONS] Updating {len(transactions)} transactions")
			updated_count = 0
			
			for transaction in transactions:
				# Get account UUID
				from .accounts import AccountService
				account_service = AccountService(self.client)
				account_result = account_service.get_by_plaid_id(transaction['account_id'])
				
				if not account_result.get('success') or not account_result.get('data'):
					print(f"[TRANSACTIONS] Could not find account for plaid_id: {transaction['account_id']}")
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
				
				# If this posted transaction references a pending transaction, merge onto the pending row
				pending_ref = transaction.get('pending_plaid_transaction_id')
				if pending_ref:
					try:
						# Try to update the row whose plaid_transaction_id == pending_ref, switching its id to the posted id
						result = self.client.update('transactions', {
							**transaction_data,
							'plaid_transaction_id': transaction['plaid_transaction_id']
						}, {'plaid_transaction_id': pending_ref})
						if result.get('success') and result.get('data'):
							updated_count += 1
							print(f"[TRANSACTIONS] Merged posted txn into pending row: {pending_ref}")
							continue
					except Exception as e:
						print(f"[TRANSACTIONS] Pending merge failed for {pending_ref}: {e}")

				# Fallback: upsert by current plaid_transaction_id
				result = self.client.upsert('transactions', transaction_data, 'plaid_transaction_id')
				if result.get('success'):
					updated_count += 1
					print(f"[TRANSACTIONS] Successfully upserted transaction: {transaction['description']} (ID: {transaction['plaid_transaction_id']})")
				else:
					print(f"[TRANSACTIONS] Failed to upsert transaction: {transaction['description']} - {result.get('error')}")
			
			print(f"[TRANSACTIONS] Successfully updated {updated_count} out of {len(transactions)} transactions")
			
			return {
				"success": True,
				"message": f"Updated {updated_count} transactions",
				"updated_count": updated_count
			}
				
		except Exception as e:
			print(f"[TRANSACTIONS] Error updating transactions: {str(e)}")
			return {"success": False, "error": str(e)}
	
	def get_by_user(self, user_id: str, limit: int = 100, offset: int = 0, category_filter: List[str] = None) -> Dict[str, Any]:
		"""Get transactions for user with category info"""
		try:
			print(f"[TRANSACTIONS] Getting transactions for user {user_id}, limit={limit}, offset={offset}")
			if category_filter:
				print(f"[TRANSACTIONS] Filtering by categories: {category_filter}")
			
			# First get all account IDs for this user
			from .accounts import AccountService
			accounts_service = AccountService(self.client)
			accounts_result = accounts_service.get_by_user(user_id)
			
			if not accounts_result.get('success') or not accounts_result.get('data'):
				print(f"[TRANSACTIONS] No accounts found for user {user_id}")
				return {"success": True, "data": []}
			
			user_account_ids = [account['id'] for account in accounts_result['data']]
			print(f"[TRANSACTIONS] Found {len(user_account_ids)} accounts for user {user_id}: {user_account_ids}")
			
			if not user_account_ids:
				print(f"[TRANSACTIONS] No account IDs found for user {user_id}")
				return {"success": True, "data": []}
			
			# Build the base query
			query = self.client.client.table('transactions').select(
				'id, plaid_transaction_id, datetime, description, category_id, merchant_name, icon_url, '
				'personal_finance_category, amount, currency_code, pending, location, payment_channel, '
				'website, created_at, updated_at, '
				'accounts:account_id(account_id, name, mask, type, subtype, user_id), '
				'system_categories:category_id(id, group_id, label, description, hex_color, '
				'category_groups:group_id(id, name, icon_lib, icon_name))'
			).in_('account_id', user_account_ids)
			
			# Apply category filter if provided
			if category_filter:
				query = query.in_('category_id', category_filter)
			
			# Apply ordering and pagination
			query = query.order('datetime', desc=True).range(offset, offset + limit - 1)
			
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
			print(f"[TRANSACTIONS] Error in get_by_user: {str(e)}")
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
	
	def reprocess_incomplete_transactions(self, user_id: str) -> Dict[str, Any]:
		"""Reprocess transactions that might have incomplete data (missing icons, categories, etc.)"""
		try:
			# Get transactions for user that might be missing key data
			from .accounts import AccountService
			accounts_service = AccountService(self.client)
			accounts_result = accounts_service.get_by_user(user_id)
			
			if not accounts_result.get('success') or not accounts_result.get('data'):
				return {"success": True, "message": "No accounts found for user"}
			
			user_account_ids = [account['id'] for account in accounts_result['data']]
			
			# Find transactions missing key data
			query = self.client.client.table('transactions').select(
				'id, plaid_transaction_id, account_id, description, merchant_name, icon_url, personal_finance_category'
			).in_('account_id', user_account_ids).or_(
				'icon_url.is.null,merchant_name.is.null,personal_finance_category.is.null'
			).limit(100)  # Process in batches
			
			response = query.execute()
			
			if not response.data:
				return {"success": True, "message": "No incomplete transactions found"}
			
			print(f"[REPROCESS] Found {len(response.data)} transactions with incomplete data")
			
			# For now, just log the incomplete transactions
			# In a full implementation, you would re-fetch these from Plaid
			for txn in response.data:
				print(f"[REPROCESS] Incomplete transaction: {txn.get('description')} (ID: {txn.get('id')})")
				print(f"  - Has icon_url: {txn.get('icon_url') is not None}")
				print(f"  - Has merchant_name: {txn.get('merchant_name') is not None}")
				print(f"  - Has personal_finance_category: {txn.get('personal_finance_category') is not None}")
			
			return {
				"success": True, 
				"message": f"Found {len(response.data)} incomplete transactions",
				"incomplete_count": len(response.data)
			}
			
		except Exception as e:
			return {"success": False, "error": str(e)}
	
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
					category_id = category_service.get_id(label)
					if category_id is not None:
						return category_id
					else:
						# Try using the primary category as fallback
						print(f"[CATEGORY] Could not find category for '{label}', trying primary '{primary}'")
						category_id = category_service.get_id(primary)
						if category_id is not None:
							return category_id
				else:
					# Fallback: use the detailed as-is
					category_id = category_service.get_id(detailed)
					if category_id is not None:
						return category_id
					else:
						# Try using the primary category as fallback
						primary = personal_finance_category.get('primary')
						if primary:
							print(f"[CATEGORY] Could not find category for '{detailed}', trying primary '{primary}'")
							category_id = category_service.get_id(primary)
							if category_id is not None:
								return category_id
			elif isinstance(personal_finance_category, dict) and personal_finance_category.get('primary'):
				# Only primary category available
				primary = personal_finance_category['primary']
				category_id = category_service.get_id(primary)
				if category_id is not None:
					return category_id
		elif transaction.get('category'):
			# Fallback to old category field
			category_id = category_service.get_id(transaction['category'])
			if category_id is not None:
				return category_id
		
		# If we still can't find a category, try to infer from merchant name or description
		merchant_name = transaction.get('merchant_name')
		description = transaction.get('description', '')
		
		if merchant_name:
			print(f"[CATEGORY] Trying to infer category from merchant: {merchant_name}")
			# You could add merchant-to-category mapping logic here
			# For now, we'll return None and let it default to "Other"
		
		print(f"[CATEGORY] No category found for transaction: {description}")
		return None 