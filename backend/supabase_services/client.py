import os
from supabase import create_client, Client
from typing import Dict, Any, Optional


class _InMemoryTableQuery:
	def __init__(self, outer, table_name: str):
		self._outer = outer
		self._table = table_name
		self._filters: Dict[str, Any] = {}
		self._limit: Optional[int] = None
		self.data = None
	def select(self, _cols: str = "*"):
		return self
	def eq(self, key: str, value: Any):
		self._filters[key] = value
		return self
	def limit(self, n: int):
		self._limit = n
		return self
	def execute(self):
		rows = [r for r in self._outer._db.setdefault(self._table, []) if all(r.get(k) == v for k, v in (self._filters or {}).items())]
		if self._limit is not None:
			rows = rows[: self._limit]
		self.data = [dict(r) for r in rows]
		return self


class _InMemoryClient:
	"""Lightweight in-memory supabase-like client for tests."""
	def __init__(self):
		self._db: Dict[str, list] = {
			'accounts': [], 'transactions': [], 'portfolios': [], 'positions': [], 'orders': [], 'companies': []
		}
		self._is_fake = True
	def table(self, name: str):
		return _InMemoryTableQuery(self, name)

class SupabaseClient:
    """Base Supabase client for database operations"""
    
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
            # Fallback to in-memory client during tests
            if os.getenv('PYTEST_CURRENT_TEST') is not None:
                self.client = _InMemoryClient()
                return
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        # Remove proxy vars that might interfere
        proxy_vars = ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NO_PROXY', 'no_proxy']
        original_proxy_vars = {var: os.environ.get(var) for var in proxy_vars if var in os.environ}
        
        for var in proxy_vars:
            os.environ.pop(var, None)
        
        try:
            self.client: Client = create_client(supabase_url, supabase_key)
        finally:
            # Restore proxy vars
            for var, value in original_proxy_vars.items():
                os.environ[var] = value
    
    def insert(self, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Insert data into table"""
        try:
            if getattr(self.client, '_is_fake', False):
                # Minimal insert behavior: append dict(s)
                rows = data if isinstance(data, list) else [data]
                self.client._db.setdefault(table, []).extend([dict(r) for r in rows])
                return {"success": True, "data": rows}
            response = self.client.table(table).insert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
        """Update data in table with filters"""
        try:
            if getattr(self.client, '_is_fake', False):
                updated = []
                items = self.client._db.setdefault(table, [])
                for row in items:
                    if all(row.get(k) == v for k, v in (filters or {}).items()):
                        row.update(dict(data))
                        updated.append(dict(row))
                return {"success": True, "data": updated}
            query = self.client.table(table).update(data)
            for key, value in filters.items():
                query = query.eq(key, value)
            response = query.execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def delete(self, table: str, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Delete data from table with filters"""
        try:
            if getattr(self.client, '_is_fake', False):
                remaining = []
                deleted = []
                for row in self.client._db.setdefault(table, []):
                    if all(row.get(k) == v for k, v in (filters or {}).items()):
                        deleted.append(row)
                    else:
                        remaining.append(row)
                self.client._db[table] = remaining
                return {"success": True, "data": deleted}
            query = self.client.table(table).delete()
            for key, value in filters.items():
                query = query.eq(key, value)
            response = query.execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def select(self, table: str, columns: str = "*", filters: Optional[Dict[str, Any]] = None, 
               order_by: Optional[str] = None, limit: Optional[int] = None) -> Dict[str, Any]:
        """Select data from table with optional filters"""
        try:
            if getattr(self.client, '_is_fake', False):
                rows = [r for r in self.client._db.setdefault(table, []) if all(r.get(k) == v for k, v in (filters or {}).items())]
                if limit:
                    rows = rows[:limit]
                return {"success": True, "data": [dict(r) for r in rows]}
            query = self.client.table(table).select(columns)
            if filters:
                for key, value in filters.items():
                    query = query.eq(key, value)
            if order_by:
                query = query.order(order_by, desc=True)
            if limit:
                query = query.limit(limit)
            response = query.execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def upsert(self, table: str, data: Dict[str, Any], conflict_column: str) -> Dict[str, Any]:
        """Upsert data into table"""
        try:
            if getattr(self.client, '_is_fake', False):
                items = data if isinstance(data, list) else [data]
                for item in items:
                    conflict_value = item.get(conflict_column)
                    found = None
                    for idx, row in enumerate(self.client._db.setdefault(table, [])):
                        if row.get(conflict_column) == conflict_value:
                            found = idx
                            break
                    if found is not None:
                        new_row = dict(self.client._db[table][found])
                        new_row.update(dict(item))
                        self.client._db[table][found] = new_row
                    else:
                        self.client._db[table].append(dict(item))
                return {"success": True, "data": items}
            response = self.client.table(table).upsert(data, on_conflict=conflict_column).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def exists(self, table: str, filters: Dict[str, Any]) -> bool:
        """Check if record exists in table"""
        try:
            if getattr(self.client, '_is_fake', False):
                rows = [r for r in self.client._db.setdefault(table, []) if all(r.get(k) == v for k, v in (filters or {}).items())]
                return bool(rows[:1])
            query = self.client.table(table).select("id")
            for key, value in filters.items():
                query = query.eq(key, value)
            response = query.limit(1).execute()
            return bool(response.data)
        except Exception:
            return False 