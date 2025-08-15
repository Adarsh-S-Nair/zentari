import uuid
from typing import Any, Dict, List


class FakeSupabaseClient:
	"""A minimal in-memory Supabase client to simulate transactions/accounts behavior for tests."""

	def __init__(self):
		self.db: Dict[str, List[Dict[str, Any]]] = {
			'accounts': [],
			'transactions': [],
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
		# Simulate primary keys for accounts
		if table == 'accounts' and 'id' not in data:
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