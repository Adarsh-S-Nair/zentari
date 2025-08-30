from typing import Any, Dict, List, Optional
from .client import SupabaseClient


class UniverseService:
	"""Service to manage daily universe candidates for LLM selection."""

	def __init__(self, client: SupabaseClient):
		self.client = client

	def upsert_batch(self, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
		try:
			# Expect rows with keys: date, ticker, price, market_cap, avg_volume, exchange (optional)
			return self.client.upsert('universe_candidates', rows, conflict_column='ticker')
		except Exception as e:
			return {"success": False, "error": str(e)}

	def get_top(self, date: Optional[str] = None, cap: str = 'micro', limit: int = 50) -> Dict[str, Any]:
		try:
			filters: Dict[str, Any] = {}
			# server-side filter by market cap bucket if your table stores a bucket; fallback handled client-side in API
			res = self.client.select('universe_candidates', columns='ticker, price, market_cap, avg_volume, exchange', filters=filters, order_by=None, limit=None)
			if not res.get('success'):
				return {"success": False, "error": res.get('error')}
			rows = res.get('data') or []
			# client-side filter by cap
			def is_micro(r: Dict[str, Any]) -> bool:
				try:
					return float(r.get('market_cap') or 0) < 300_000_000
				except Exception:
					return False
			candidates = [r for r in rows if is_micro(r)] if cap == 'micro' else rows
			# rank by liquidity
			candidates.sort(key=lambda r: int(r.get('avg_volume') or 0), reverse=True)
			return {"success": True, "data": candidates[:limit]}
		except Exception as e:
			return {"success": False, "error": str(e)}


