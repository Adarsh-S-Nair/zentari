from services.plaid_config import get_plaid_client
from typing import Any

class PlaidClient:
    """Base Plaid client for API operations"""
    
    def __init__(self):
        self.client = get_plaid_client()
    
    def link_token_create(self, request):
        """Create a link token"""
        return self.client.link_token_create(request)
    
    def item_public_token_exchange(self, request):
        """Exchange public token for access token"""
        return self.client.item_public_token_exchange(request)
    
    def item_get(self, request):
        """Get item information"""
        return self.client.item_get(request)
    
    def institutions_get_by_id(self, request):
        """Get institution information"""
        return self.client.institutions_get_by_id(request)
    
    def institutions_get(self, request):
        """Get institutions with optional metadata"""
        return self.client.institutions_get(request)
    
    def accounts_get(self, request):
        """Get accounts"""
        return self.client.accounts_get(request)
    
    def transactions_get(self, request):
        """Get transactions"""
        return self.client.transactions_get(request)
    
    def transactions_sync(self, request):
        """Sync transactions"""
        return self.client.transactions_sync(request)
    
    def item_remove(self, request):
        """Remove item"""
        return self.client.item_remove(request) 