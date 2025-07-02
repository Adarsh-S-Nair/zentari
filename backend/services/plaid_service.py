from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.accounts_get_request_options import AccountsGetRequestOptions
from plaid.model.item_get_request import ItemGetRequest
from plaid.model.institutions_get_by_id_request import InstitutionsGetByIdRequest
from services.plaid_config import get_plaid_client
import json

class PlaidService:
    def __init__(self, environment='sandbox'):
        self.environment = environment
        self.client = get_plaid_client(environment)
    
    def create_link_token(self, user_id: str, client_name: str = "Trading API"):
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