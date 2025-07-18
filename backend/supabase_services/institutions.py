from typing import Dict, Any, List, Optional
from .client import SupabaseClient

class InstitutionService:
    """Service for institution-related database operations"""
    
    def __init__(self, client: SupabaseClient):
        self.client = client
    
    def get_or_create(self, item_id: str, access_token: str = None) -> Optional[str]:
        """Get or create institution record for an item"""
        try:
            if not access_token:
                return None
            
            from plaid_services import get_items, get_institutions as get_plaid_institutions
            items_service = get_items()
            plaid_institutions = get_plaid_institutions()
            
            # Get item info
            item_response = items_service.get(access_token)
            if not item_response.get('success'):
                return None
            
            institution_id = item_response['item'].get('institution_id')
            if not institution_id:
                return None
            
            # Check if institution exists
            existing = self.client.select('institutions', 'id', {'institution_id': institution_id})
            if existing.get('success') and existing.get('data'):
                return existing['data'][0]['id']
            
            # Get institution details and create
            institution_response = plaid_institutions.get(institution_id)
            if institution_response.get('success'):
                institution = institution_response['institution']
                new_institution = {
                    'institution_id': institution_id,
                    'name': institution.get('name'),
                    'logo': institution.get('logo'),
                    'primary_color': institution.get('primary_color'),
                    'url': institution.get('url')
                }
            else:
                # Create basic record
                new_institution = {
                    'institution_id': institution_id,
                    'name': f'Institution {institution_id}',
                    'logo': None,
                    'primary_color': None,
                    'url': None
                }
            
            result = self.client.insert('institutions', new_institution)
            if result.get('success') and result.get('data'):
                return result['data'][0]['id']
            else:
                return None
            
        except Exception as e:
            print(f"Error getting/creating institution: {e}")
            return None
    
    def get_by_ids(self, institution_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch institution info for a list of institution_ids"""
        if not institution_ids:
            return {}
        
        try:
            # Remove duplicates and nulls
            ids = [iid for iid in set(institution_ids) if iid]
            if not ids:
                return {}
            
            # Use the Supabase client's in_ operator to query by multiple IDs
            response = self.client.client.table('institutions').select('id, name, logo, primary_color, url').in_('id', ids).execute()
            
            if not response.data:
                return {}
            
            return {inst['id']: inst for inst in response.data}
        except Exception as e:
            print(f"Error getting institution data for ids {institution_ids}: {e}")
            return {}
    
    def get_by_id(self, institution_id: str) -> Dict[str, Any]:
        """Get institution by ID"""
        return self.client.select('institutions', filters={'id': institution_id})
    
    def get_by_plaid_id(self, plaid_institution_id: str) -> Dict[str, Any]:
        """Get institution by Plaid institution ID"""
        return self.client.select('institutions', filters={'institution_id': plaid_institution_id})
    
    def get_all(self) -> Dict[str, Any]:
        """Get all institutions for debugging"""
        try:
            response = self.client.client.table('institutions').select('*').execute()
            return {"success": True, "data": response.data}
        except Exception as e:
            return {"success": False, "error": str(e)} 