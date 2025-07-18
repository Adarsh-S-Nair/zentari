from typing import Dict, Any, List, Optional
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.accounts_get_request_options import AccountsGetRequestOptions
from .client import PlaidClient

class AccountService:
    """Service for Plaid account operations"""
    
    def __init__(self, client: PlaidClient):
        self.client = client
    
    def get(self, access_token: str) -> Dict[str, Any]:
        """Get accounts for a given access token"""
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