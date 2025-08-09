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

                # Use logo_url instead of icon_url (Plaid API field name)
                logo_url = getattr(transaction, 'logo_url', None)

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
                    "icon_url": logo_url,
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
                # Debug logging for recent transactions
                print(f"[SYNC] Processing transaction: {transaction.name} (ID: {transaction.transaction_id})")
                print(f"[SYNC] - Has logo_url: {hasattr(transaction, 'logo_url')}")
                print(f"[SYNC] - Logo URL value: {getattr(transaction, 'logo_url', None)}")
                print(f"[SYNC] - Has personal_finance_category: {hasattr(transaction, 'personal_finance_category')}")
                print(f"[SYNC] - Has merchant_name: {hasattr(transaction, 'merchant_name')}")
                print(f"[SYNC] - Merchant name: {getattr(transaction, 'merchant_name', None)}")
                
                # Convert PersonalFinanceCategory object to dict if it exists
                personal_finance_category = getattr(transaction, 'personal_finance_category', None)
                if personal_finance_category:
                    try:
                        personal_finance_category = {
                            'confidence_level': str(personal_finance_category.confidence_level) if hasattr(personal_finance_category, 'confidence_level') else None,
                            'detailed': str(personal_finance_category.detailed) if hasattr(personal_finance_category, 'detailed') else None,
                            'primary': str(personal_finance_category.primary) if hasattr(personal_finance_category, 'primary') else None
                        }
                        print(f"[SYNC] - Personal finance category: {personal_finance_category}")
                    except Exception as e:
                        print(f"Error converting personal_finance_category: {e}")
                        personal_finance_category = None
                else:
                    print(f"[SYNC] - No personal_finance_category found")
                
                # Use logo_url instead of icon_url (Plaid API field name)
                logo_url = getattr(transaction, 'logo_url', None)
                print(f"[SYNC] - Logo URL: {logo_url}")
                
                primary_category = None
                if personal_finance_category and isinstance(personal_finance_category, dict):
                    primary_category = personal_finance_category.get('primary')
                    print(f"[SYNC] - Primary category: {primary_category}")
                
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
                    "icon_url": logo_url,  # Store logo_url as icon_url in our database
                    "personal_finance_category": personal_finance_category,
                    "amount": float(transaction.amount),
                    "currency_code": transaction.iso_currency_code or "USD",
                    "pending": transaction.pending,
                    "account_id": transaction.account_id,
                    "location": location,
                    "payment_channel": getattr(transaction, 'payment_channel', None),
                    "website": getattr(transaction, 'website', None),
                    "pending_plaid_transaction_id": getattr(transaction, 'pending_transaction_id', None)
                }
                transactions.append(transaction_data)
            
            # Build modified transactions in our normalized shape
            modified_transactions = []
            for transaction in response.modified or []:
                # Convert PersonalFinanceCategory object to dict if it exists
                personal_finance_category = getattr(transaction, 'personal_finance_category', None)
                if personal_finance_category:
                    try:
                        personal_finance_category = {
                            'confidence_level': str(personal_finance_category.confidence_level) if hasattr(personal_finance_category, 'confidence_level') else None,
                            'detailed': str(personal_finance_category.detailed) if hasattr(personal_finance_category, 'detailed') else None,
                            'primary': str(personal_finance_category.primary) if hasattr(personal_finance_category, 'primary') else None
                        }
                    except Exception:
                        personal_finance_category = None
                logo_url = getattr(transaction, 'logo_url', None)
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
                    except Exception:
                        location = None
                primary_category = None
                if personal_finance_category and isinstance(personal_finance_category, dict):
                    primary_category = personal_finance_category.get('primary')
                modified_transactions.append({
                    "plaid_transaction_id": transaction.transaction_id,
                    "datetime": transaction.datetime.isoformat() if hasattr(transaction, 'datetime') and transaction.datetime else (transaction.date.isoformat() if transaction.date else None),
                    "description": transaction.name,
                    "category": primary_category,
                    "category_id": getattr(transaction, 'category_id', None),
                    "merchant_name": getattr(transaction, 'merchant_name', None),
                    "icon_url": logo_url,
                    "personal_finance_category": personal_finance_category,
                    "amount": float(transaction.amount),
                    "currency_code": transaction.iso_currency_code or "USD",
                    "pending": transaction.pending,
                    "account_id": transaction.account_id,
                    "location": location,
                    "payment_channel": getattr(transaction, 'payment_channel', None),
                    "website": getattr(transaction, 'website', None),
                    "pending_plaid_transaction_id": getattr(transaction, 'pending_transaction_id', None)
                })

            # Map removed transactions to IDs
            removed_ids = []
            for rem in response.removed or []:
                try:
                    removed_ids.append(getattr(rem, 'transaction_id', None) or rem.get('transaction_id'))
                except Exception:
                    pass
            removed_ids = [rid for rid in removed_ids if rid]

            # Get response dict for accounts data
            response_dict = response.to_dict()
            result = {
                "success": True,
                "added": transactions,
                "modified": modified_transactions,
                "removed": removed_ids,
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
            
            print(f"[PLAID] Getting {len(transaction_ids)} specific transactions by IDs")
            
            # For modified transactions, we need to get the full transaction data
            # Since Plaid doesn't have a direct "get by IDs" endpoint, we'll use
            # a wider date range but more targeted approach
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=90)  # Last 90 days should be sufficient for modified transactions
            
            request = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date
            )
            
            response = self.client.transactions_get(request)
            
            # Process transactions and filter to only the requested IDs
            transactions = []
            for transaction in response.transactions:
                if transaction.transaction_id in transaction_ids:
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
                    
                    # Get logo URL if available (Plaid API field name)
                    logo_url = getattr(transaction, 'logo_url', None)
                    print(f"[PLAID] Transaction {transaction.transaction_id} logo_url: {logo_url}")
                    
                    # Get primary category from personal finance category (consistent with other methods)
                    primary_category = None
                    if personal_finance_category and isinstance(personal_finance_category, dict):
                        primary_category = personal_finance_category.get('primary')
                    
                    # Convert location object to dict if it exists
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
                        "icon_url": logo_url,  # Store logo_url as icon_url in our database
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
            
            print(f"[PLAID] Found {len(transactions)} out of {len(transaction_ids)} requested transactions")
            
            return {
                "success": True,
                "transactions": transactions,
                "request_id": response.request_id
            }
        except Exception as e:
            print(f"[PLAID] Error getting transactions by IDs: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            } 