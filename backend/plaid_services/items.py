from typing import Dict, Any
from plaid.model.item_get_request import ItemGetRequest
from .client import PlaidClient

class ItemService:
    """Service for Plaid item operations"""
    
    def __init__(self, client: PlaidClient):
        self.client = client
    
    def get(self, access_token: str) -> Dict[str, Any]:
        """Get item information including institution_id"""
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
    
    def remove(self, access_token: str) -> Dict[str, Any]:
        """Remove a Plaid item"""
        try:
            response = self.client.item_remove({'access_token': access_token})
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)} 