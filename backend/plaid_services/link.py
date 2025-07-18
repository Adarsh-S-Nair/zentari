from typing import Dict, Any
import os
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from .client import PlaidClient

class LinkService:
    """Service for Plaid Link operations"""
    
    def __init__(self, client: PlaidClient):
        self.client = client
    
    def create_token(self, user_id: str, client_name: str = "Zentari") -> Dict[str, Any]:
        """Create a link token for the Plaid Link flow"""
        try:
            # Get webhook URL from environment or construct it
            webhook_url = os.getenv('PLAID_WEBHOOK_URL')
            if not webhook_url:
                # Fallback to constructing from API URL
                api_url = os.getenv('API_URL', 'http://localhost:8000')
                webhook_url = f"{api_url}/plaid/webhook"
            
            request = LinkTokenCreateRequest(
                products=[Products("transactions")],
                client_name=client_name,
                country_codes=[CountryCode("US")],
                language="en",
                webhook=webhook_url,
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
    
    def exchange_token(self, public_token: str) -> Dict[str, Any]:
        """Exchange a public token for an access token"""
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