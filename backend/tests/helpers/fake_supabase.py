import uuid
from typing import Any, Dict, List


class FakeSupabaseClient:
	"""A minimal in-memory Supabase client to simulate transactions/accounts behavior for tests."""

	def __init__(self):
		self.db: Dict[str, List[Dict[str, Any]]] = {
			'accounts': [],
			'transactions': [],
			'portfolios': [],
			'positions': [],
			'orders': [],
			'companies': [],
		}

	# --- Basic helpers ---
	def _match_filters(self, row: Dict[str, Any], filters: Dict[str, Any]) -> bool:
		if not filters:
			return True
		for key, value in filters.items():
			if row.get(key) != value:
				return False
		return True

	def _find_rows(self, table: str, filters: Dict[str, Any]):
		return [row for row in self.db[table] if self._match_filters(row, filters)]

	# --- API surface used by AccountService/TransactionService ---
	def insert(self, table: str, data):
		if isinstance(data, list):
			for item in data:
				self._insert_one(table, item)
			return {"success": True, "data": data}
		else:
			self._insert_one(table, data)
			return {"success": True, "data": [data]}

	def _insert_one(self, table: str, data: Dict[str, Any]):
		# Simulate primary keys for common tables
		if table in ('accounts', 'positions', 'orders', 'portfolios') and 'id' not in data:
			data = {**data, 'id': str(uuid.uuid4())}
		# Upsert-like behavior should be separate; here just append
		self.db[table].append(dict(data))

	def update(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]):
		updated = []
		for row in self.db[table]:
			if self._match_filters(row, filters):
				row.update(dict(data))
				updated.append(dict(row))
		return {"success": True, "data": updated}

	def delete(self, table: str, filters: Dict[str, Any]):
		remaining = []
		deleted = []
		for row in self.db[table]:
			if self._match_filters(row, filters):
				deleted.append(row)
			else:
				remaining.append(row)
		self.db[table] = remaining
		return {"success": True, "data": deleted}

	def select(self, table: str, columns: str = "*", filters=None, order_by=None, limit=None):
		rows = self._find_rows(table, filters or {})
		if limit is not None:
			rows = rows[:limit]
		return {"success": True, "data": [dict(r) for r in rows]}

	def upsert(self, table: str, data, conflict_column: str):
		# Support list or single dict
		items = data if isinstance(data, list) else [data]
		for item in items:
			conflict_value = item.get(conflict_column)
			# Try to find conflict row
			found_index = None
			for idx, row in enumerate(self.db[table]):
				if row.get(conflict_column) == conflict_value:
					found_index = idx
					break
			if found_index is not None:
				# Replace/merge
				new_row = dict(self.db[table][found_index])
				new_row.update(dict(item))
				self.db[table][found_index] = new_row
			else:
				# Insert new
				self.db[table].append(dict(item))
		# Return something similar to Supabase
		return {"success": True, "data": items}

	def exists(self, table: str, filters: Dict[str, Any]) -> bool:
		return len(self._find_rows(table, filters)) > 0 

	# --- Minimal Supabase-style query builder used by some routes ---
	class _TableQuery:
		def __init__(self, outer, table_name: str):
			self._outer = outer
			self._table = table_name
			self._filters: Dict[str, Any] = {}
			self._limit: int | None = None
			self.data = None
		def select(self, _cols: str = "*"):
			return self
		def eq(self, key: str, value: Any):
			self._filters[key] = value
			return self
		def in_(self, key: str, values):
			# store a callable filter for inclusion
			vals = set([v for v in values])
			self._filters[f"__in__{key}"] = vals
			return self
		def limit(self, n: int):
			self._limit = n
			return self
		def execute(self):
			# apply simple equality filters
			eq_filters = {k: v for k, v in self._filters.items() if not str(k).startswith("__in__")}
			rows = self._outer._find_rows(self._table, eq_filters)
			# apply inclusion filters
			for k, v in self._filters.items():
				if str(k).startswith("__in__"):
					col = str(k).split("__in__", 1)[1]
					rows = [r for r in rows if r.get(col) in v]
			if self._limit is not None:
				rows = rows[: self._limit]
			self.data = [dict(r) for r in rows]
			return self

	def table(self, name: str):
		return FakeSupabaseClient._TableQuery(self, name)