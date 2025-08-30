from typing import Dict, Any
from .client import SupabaseClient


class OrderService:
    """Service for order-related database operations"""

    def __init__(self, client: SupabaseClient):
        self.client = client

    def get_by_portfolio(self, portfolio_id: str) -> Dict[str, Any]:
        try:
            return self.client.select('orders', filters={'portfolio_id': portfolio_id})
        except Exception as e:
            return {"success": False, "error": str(e)}


