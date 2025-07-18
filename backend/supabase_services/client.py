import os
from supabase import create_client, Client
from typing import Dict, Any, Optional

class SupabaseClient:
    """Base Supabase client for database operations"""
    
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not supabase_url or not supabase_key:
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
            response = self.client.table(table).insert(data).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def update(self, table: str, data: Dict[str, Any], filters: Dict[str, Any]) -> Dict[str, Any]:
        """Update data in table with filters"""
        try:
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
            response = self.client.table(table).upsert(data, on_conflict=conflict_column).execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def exists(self, table: str, filters: Dict[str, Any]) -> bool:
        """Check if record exists in table"""
        try:
            query = self.client.table(table).select("id")
            for key, value in filters.items():
                query = query.eq(key, value)
            response = query.limit(1).execute()
            return bool(response.data)
        except Exception:
            return False 