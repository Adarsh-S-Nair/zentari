from typing import Dict, Any
from .client import SupabaseClient


class PortfolioService:
    """Service for portfolio-related database operations"""

    def __init__(self, client: SupabaseClient):
        self.client = client

    def create(self, user_id: str, name: str, starting_balance: int, is_paper: bool = True) -> Dict[str, Any]:
        try:
            payload = {
                'user_id': user_id,
                'name': name,
                'is_paper': is_paper,
                'starting_balance': starting_balance,
                'cash_balance': starting_balance,
            }
            return self.client.insert('portfolios', payload)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_by_user(self, user_id: str, is_paper: bool = True) -> Dict[str, Any]:
        try:
            return self.client.select('portfolios', filters={'user_id': user_id, 'is_paper': is_paper})
        except Exception as e:
            return {"success": False, "error": str(e)}


