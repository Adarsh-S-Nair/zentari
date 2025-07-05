from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.accounts_get_request_options import AccountsGetRequestOptions
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
from services.plaid_config import get_plaid_client
from datetime import datetime, timedelta
import json

class PlaidService:
    def __init__(self, environment='sandbox'):
        self.environment = environment
        self.client = get_plaid_client(environment)
    
    def create_link_token(self, user_id: str, client_name: str = "Zentari"):
        """
        Create a link token for the Plaid Link flow
        """
        try:
            request = LinkTokenCreateRequest(
                products=[Products("transactions")],
                client_name=client_name,
                country_codes=[CountryCode("US")],
                language="en",
                user=LinkTokenCreateRequestUser(
                    client_user_id=user_id
                )
            )
            
            response = self.client.link_token_create(request)
            return {
                "success": True,
                "link_token": response.link_token,
                "expiration": response.expiration.isoformat() if response.expiration else None
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def exchange_public_token(self, public_token: str):
        """
        Exchange a public token for an access token
        """
        try:
            request = ItemPublicTokenExchangeRequest(
                public_token=public_token
            )
            
            response = self.client.item_public_token_exchange(request)
            return {
                "success": True,
                "access_token": response.access_token,
                "item_id": response.item_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_item(self, access_token: str):
        """
        Get item information including institution_id
        """
        try:
            request = ItemGetRequest(
                access_token=access_token
            )
            
            response = self.client.item_get(request)
            return {
                "success": True,
                "item": {
                    "item_id": response.item.item_id,
                    "institution_id": response.item.institution_id,
                    "available_products": [product.value for product in response.item.available_products] if response.item.available_products else [],
                    "billed_products": [product.value for product in response.item.billed_products] if response.item.billed_products else []
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_institution(self, institution_id: str):
        """
        Get institution information including logo
        """
        try:
            request = InstitutionsGetByIdRequest(
                institution_id=institution_id,
                country_codes=[CountryCode("US")]
            )
            
            response = self.client.institutions_get_by_id(request)
            institution = response.institution
            
            return {
                "success": True,
                "institution": {
                    "institution_id": institution.institution_id,
                    "name": institution.name,
                    "logo": getattr(institution, 'logo', None),
                    "primary_color": getattr(institution, 'primary_color', None),
                    "url": getattr(institution, 'url', None)
                }
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_accounts(self, access_token: str):
        """
        Get accounts for a given access token
        """
        try:
            request = AccountsGetRequest(
                access_token=access_token,
                options=AccountsGetRequestOptions()
            )
            
            response = self.client.accounts_get(request)
            
            accounts = []
            for account in response.accounts:
                accounts.append({
                    "account_id": account.account_id,
                    "name": account.name,
                    "mask": account.mask,
                    "type": account.type.value if account.type else None,
                    "subtype": account.subtype.value if account.subtype else None,
                    "balances": {
                        "available": account.balances.available,
                        "current": account.balances.current,
                        "limit": account.balances.limit,
                        "iso_currency_code": account.balances.iso_currency_code,
                        "unofficial_currency_code": account.balances.unofficial_currency_code
                    } if account.balances else None
                })
            
            return {
                "success": True,
                "accounts": accounts,
                "item_id": response.item.item_id,
                "institution_id": response.item.institution_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_sandbox_test_credentials(self):
        """
        Get test credentials for sandbox mode
        """
        if self.environment != 'sandbox':
            return {
                "success": False,
                "error": "Sandbox credentials are only available in sandbox environment"
            }
        
        return {
            "success": True,
            "username": "user_good",
            "password": "pass_good"
        }
    
    def get_transactions(self, access_token: str, account_ids: list = None, days_back: int = 730):
        """
        Get transactions for given account IDs over the specified period
        """
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
                        # Convert the PersonalFinanceCategory object to a dictionary
                        personal_finance_category = {
                            'confidence_level': str(personal_finance_category.confidence_level) if hasattr(personal_finance_category, 'confidence_level') else None,
                            'detailed': str(personal_finance_category.detailed) if hasattr(personal_finance_category, 'detailed') else None,
                            'primary': str(personal_finance_category.primary) if hasattr(personal_finance_category, 'primary') else None
                        }
                    except Exception as e:
                        print(f"Error converting personal_finance_category: {e}")
                        personal_finance_category = None

                # Determine the best icon URL: merchant logo first, then category icon as fallback
                merchant_logo = getattr(transaction, 'logo_url', None)
                category_icon = getattr(transaction, 'personal_finance_category_icon_url', None)
                icon_url = merchant_logo if merchant_logo else category_icon

                # Get the primary category from personal finance category
                primary_category = None
                if personal_finance_category and isinstance(personal_finance_category, dict):
                    primary_category = personal_finance_category.get('primary')

                transaction_data = {
                    "plaid_transaction_id": transaction.transaction_id,
                    "date": transaction.date.isoformat() if transaction.date else None,
                    "description": transaction.name,
                    "category": primary_category,  # Use personal finance category primary
                    "category_id": getattr(transaction, 'category_id', None),
                    "merchant_name": getattr(transaction, 'merchant_name', None),
                    "icon_url": icon_url,  # Use merchant logo with fallback to category icon
                    "personal_finance_category": personal_finance_category,
                    "amount": float(transaction.amount),
                    "currency_code": transaction.iso_currency_code or "USD",
                    "pending": transaction.pending,
                    "account_id": transaction.account_id
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
    
    def sync_transactions(self, access_token: str, cursor: str = None):
        """
        Sync transactions using Plaid's incremental sync API
        This is more efficient than get_transactions for regular updates
        """
        try:
            request = TransactionsSyncRequest(
                access_token=access_token,
                cursor=cursor
            )
            
            response = self.client.transactions_sync(request)
            
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

                # Determine the best icon URL
                merchant_logo = getattr(transaction, 'logo_url', None)
                category_icon = getattr(transaction, 'personal_finance_category_icon_url', None)
                icon_url = merchant_logo if merchant_logo else category_icon

                # Get the primary category
                primary_category = None
                if personal_finance_category and isinstance(personal_finance_category, dict):
                    primary_category = personal_finance_category.get('primary')

                transaction_data = {
                    "plaid_transaction_id": transaction.transaction_id,
                    "date": transaction.date.isoformat() if transaction.date else None,
                    "description": transaction.name,
                    "category": primary_category,
                    "category_id": getattr(transaction, 'category_id', None),
                    "merchant_name": getattr(transaction, 'merchant_name', None),
                    "icon_url": icon_url,
                    "personal_finance_category": personal_finance_category,
                    "amount": float(transaction.amount),
                    "currency_code": transaction.iso_currency_code or "USD",
                    "pending": transaction.pending,
                    "account_id": transaction.account_id
                }
                transactions.append(transaction_data)
            
            return {
                "success": True,
                "added": transactions,
                "modified": response.modified,  # List of modified transaction IDs
                "removed": response.removed,    # List of removed transaction IDs
                "has_more": response.has_more,
                "next_cursor": response.next_cursor,
                "request_id": response.request_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_account_balances(self, access_token: str, account_ids: list = None):
        """
        Get current balances for accounts
        This is more efficient than get_accounts when you only need balances
        """
        try:
            request = AccountsBalanceGetRequest(
                access_token=access_token,
                options=AccountsGetRequestOptions(
                    account_ids=account_ids
                ) if account_ids else None
            )
            
            response = self.client.accounts_balance_get(request)
            
            accounts = []
            for account in response.accounts:
                accounts.append({
                    "account_id": account.account_id,
                    "balances": {
                        "available": account.balances.available,
                        "current": account.balances.current,
                        "limit": account.balances.limit,
                        "iso_currency_code": account.balances.iso_currency_code,
                        "unofficial_currency_code": account.balances.unofficial_currency_code
                    } if account.balances else None
                })
            
            return {
                "success": True,
                "accounts": accounts,
                "item_id": response.item.item_id,
                "institution_id": response.item.institution_id
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }