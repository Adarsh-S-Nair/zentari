from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from .client import PlaidClient

class TransactionService:
    """Service for Plaid transaction operations"""
    
    def __init__(self, client: PlaidClient):
        self.client = client
    
    def get(self, access_token: str, account_ids: List[str] = None, days_back: int = 730) -> Dict[str, Any]:
        """Get transactions for given account IDs over the specified period"""
        try:
            # Calculate date range (default to 2 years back)
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=days_back)
            
            request = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(
                    account_ids=account_ids
                ) if account_ids else None
            )
            
            response = self.client.transactions_get(request)
            
            transactions = []
            for transaction in response.transactions:
                # Convert PersonalFinanceCategory object to dict if it exists
                personal_finance_category = getattr(transaction, 'personal_finance_category', None)
                if personal_finance_category:
                    try:
                        personal_finance_category = {
                            'confidence_level': str(personal_finance_category.confidence_level) if hasattr(personal_finance_category, 'confidence_level') else None,
                            'detailed': str(personal_finance_category.detailed) if hasattr(personal_finance_category, 'detailed') else None,
                            'primary': str(personal_finance_category.primary) if hasattr(personal_finance_category, 'primary') else None
                        }
                    except Exception as e:
                        print(f"Error converting personal_finance_category: {e}")
                        personal_finance_category = None

                # Only use merchant logo for icon_url
                icon_url = getattr(transaction, 'logo_url', None)

                # Get the primary category from personal finance category
                primary_category = None
                if personal_finance_category and isinstance(personal_finance_category, dict):
                    primary_category = personal_finance_category.get('primary')

                # Convert Location object to dict if it exists
                location = getattr(transaction, 'location', None)
                if location:
                    try:
                        location = {
                            'address': getattr(location, 'address', None),
                            'city': getattr(location, 'city', None),
                            'region': getattr(location, 'region', None),
                            'postal_code': getattr(location, 'postal_code', None),
                            'country': getattr(location, 'country', None),
                            'lat': getattr(location, 'lat', None),
                            'lon': getattr(location, 'lon', None),
                            'store_number': getattr(location, 'store_number', None)
                        }
                    except Exception as e:
                        print(f"Error converting location: {e}")
                        location = None

                transaction_data = {
                    "plaid_transaction_id": transaction.transaction_id,
                    "datetime": transaction.datetime.isoformat() if hasattr(transaction, 'datetime') and transaction.datetime else (transaction.date.isoformat() if transaction.date else None),
                    "description": transaction.name,
                    "category": primary_category,
                    "category_id": getattr(transaction, 'category_id', None),
                    "merchant_name": getattr(transaction, 'merchant_name', None),
                    "icon_url": icon_url,
                    "personal_finance_category": personal_finance_category,
                    "amount": float(transaction.amount),
                    "currency_code": transaction.iso_currency_code or "USD",
                    "pending": transaction.pending,
                    "account_id": transaction.account_id,
                    "location": location,
                    "payment_channel": getattr(transaction, 'payment_channel', None),
                    "website": getattr(transaction, 'website', None)
                }
                transactions.append(transaction_data)
            
            return {
                "success": True,
                "transactions": transactions,
                "total_transactions": response.total_transactions,
                "request_id": response.request_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def sync(self, access_token: str, cursor: str = None) -> Dict[str, Any]:
        """Sync transactions using Plaid's incremental sync API"""
        try:
            # Simple request logging
            print(f"\n=== PLaid /transactions/sync ===")
            print(f"access_token: {access_token[:20]}..." if access_token else "None")
            print(f"cursor: {cursor}")
            
            # Handle cursor according to Plaid docs: empty string for initial sync, omit for subsequent
            if cursor is not None and cursor.strip() != '':
                request = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor=cursor,
                    count=250
                )
            else:
                # For initial sync, use empty cursor as recommended by Plaid
                request = TransactionsSyncRequest(
                    access_token=access_token,
                    cursor='',  # Empty cursor for initial sync
                    count=250
                )
            
            # Log request body
            request_dict = request.to_dict()
            print(f"Request: {request_dict}")
            
            response = self.client.transactions_sync(request)
            
            # Simple response logging
            print(f"Response: has_more={response.has_more}, next_cursor='{response.next_cursor}', added={len(response.added)}, request_id={response.request_id}")
            
            # Check if this is a new account with no transactions
            if len(response.added) == 0 and response.next_cursor == '':
                print(f"NOTE: No transactions found - this might be a new account or account with no transaction history")
                print(f"NOTE: In production, new accounts often have no transactions until they have activity")
            
            print(f"=== END ===\n")
            
            transactions = []
            for transaction in response.added:
                # Convert PersonalFinanceCategory object to dict if it exists
                personal_finance_category = getattr(transaction, 'personal_finance_category', None)
                if personal_finance_category:
                    try:
                        personal_finance_category = {
                            'confidence_level': str(personal_finance_category.confidence_level) if hasattr(personal_finance_category, 'confidence_level') else None,
                            'detailed': str(personal_finance_category.detailed) if hasattr(personal_finance_category, 'detailed') else None,
                            'primary': str(personal_finance_category.primary) if hasattr(personal_finance_category, 'primary') else None
                        }
                    except Exception as e:
                        print(f"Error converting personal_finance_category: {e}")
                        personal_finance_category = None
                icon_url = getattr(transaction, 'logo_url', None)
                primary_category = None
                if personal_finance_category and isinstance(personal_finance_category, dict):
                    primary_category = personal_finance_category.get('primary')
                
                # Convert Location object to dict if it exists
                location = getattr(transaction, 'location', None)
                if location:
                    try:
                        location = {
                            'address': getattr(location, 'address', None),
                            'city': getattr(location, 'city', None),
                            'region': getattr(location, 'region', None),
                            'postal_code': getattr(location, 'postal_code', None),
                            'country': getattr(location, 'country', None),
                            'lat': getattr(location, 'lat', None),
                            'lon': getattr(location, 'lon', None),
                            'store_number': getattr(location, 'store_number', None)
                        }
                    except Exception as e:
                        print(f"Error converting location: {e}")
                        location = None

                transaction_data = {
                    "plaid_transaction_id": transaction.transaction_id,
                    "datetime": transaction.datetime.isoformat() if hasattr(transaction, 'datetime') and transaction.datetime else (transaction.date.isoformat() if transaction.date else None),
                    "description": transaction.name,
                    "category": primary_category,
                    "category_id": getattr(transaction, 'category_id', None),
                    "merchant_name": getattr(transaction, 'merchant_name', None),
                    "icon_url": icon_url,
                    "personal_finance_category": personal_finance_category,
                    "amount": float(transaction.amount),
                    "currency_code": transaction.iso_currency_code or "USD",
                    "pending": transaction.pending,
                    "account_id": transaction.account_id,
                    "location": location,
                    "payment_channel": getattr(transaction, 'payment_channel', None),
                    "website": getattr(transaction, 'website', None)
                }
                transactions.append(transaction_data)
            
            # Get response dict for accounts data
            response_dict = response.to_dict()
            result = {
                "success": True,
                "added": transactions,
                "modified": response.modified,  # List of modified transaction IDs
                "removed": response.removed,    # List of removed transaction IDs
                "has_more": response.has_more,
                "next_cursor": response.next_cursor,
                "request_id": response.request_id,
                "accounts": response_dict.get('accounts', [])  # Include accounts with balances
            }
            return result
        except Exception as e:
            print(f"\n=== PLaid /transactions/sync ERROR ===")
            print(f"Error: {str(e)}")
            print(f"Error Type: {type(e)}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            print(f"=== END ERROR ===\n")
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_by_ids(self, access_token: str, transaction_ids: List[str]) -> Dict[str, Any]:
        """Get full transaction data for specific transaction IDs"""
        try:
            if not transaction_ids:
                return {"success": True, "transactions": []}
            
            # Use the regular get_transactions method with a wide date range
            # and then filter by the specific transaction IDs
            transactions_result = self.get(access_token, days_back=730)
            
            if not transactions_result.get('success'):
                return transactions_result
            
            all_transactions = transactions_result.get('transactions', [])
            
            # Filter to only include the requested transaction IDs
            filtered_transactions = [
                txn for txn in all_transactions 
                if txn.get('plaid_transaction_id') in transaction_ids
            ]
            
            return {
                "success": True,
                "transactions": filtered_transactions,
                "request_id": transactions_result.get('request_id')
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 