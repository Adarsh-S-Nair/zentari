from typing import Dict, Any, Optional
from .client import SupabaseClient


class PortfolioService:
    """Service for portfolio-related database operations"""

    def __init__(self, client: SupabaseClient):
        self.client = client

    def create(
        self,
        user_id: str,
        name: str,
        starting_balance: int,
        is_paper: bool = True,
        rebalance_cadence: Optional[str] = None,
        schedule_tz: Optional[str] = None,
        next_rebalance_due: Optional[str] = None,
        last_rebalanced_at: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            payload = {
                'user_id': user_id,
                'name': name,
                'is_paper': is_paper,
                'starting_balance': starting_balance,
                'cash_balance': starting_balance,
            }
            if rebalance_cadence is not None:
                payload['rebalance_cadence'] = rebalance_cadence
            if schedule_tz is not None:
                payload['schedule_tz'] = schedule_tz
            if next_rebalance_due is not None:
                payload['next_rebalance_due'] = next_rebalance_due
            if last_rebalanced_at is not None:
                payload['last_rebalanced_at'] = last_rebalanced_at
            return self.client.insert('portfolios', payload)
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_by_user(self, user_id: str, is_paper: bool = True) -> Dict[str, Any]:
        try:
            return self.client.select('portfolios', filters={'user_id': user_id, 'is_paper': is_paper})
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_by_id(self, portfolio_id: str) -> Dict[str, Any]:
        try:
            return self.client.select('portfolios', filters={'id': portfolio_id})
        except Exception as e:
            return {"success": False, "error": str(e)}

    def update_cash(self, portfolio_id: str, new_cash_balance: float) -> Dict[str, Any]:
        try:
            return self.client.update('portfolios', {'cash_balance': new_cash_balance}, {'id': portfolio_id})
        except Exception as e:
            return {"success": False, "error": str(e)}

    def delete(self, portfolio_id: str) -> Dict[str, Any]:
        try:
            return self.client.delete('portfolios', {'id': portfolio_id})
        except Exception as e:
            return {"success": False, "error": str(e)}


