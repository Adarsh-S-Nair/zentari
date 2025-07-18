from typing import Dict, Any
from plaid.model.institutions_get_request import InstitutionsGetRequest
from plaid.model.country_code import CountryCode
from .client import PlaidClient

class InstitutionService:
    """Service for Plaid institution operations"""
    
    def __init__(self, client: PlaidClient):
        self.client = client
    
    def get(self, institution_id: str) -> Dict[str, Any]:
        """Get institution information including logo using /institutions/get"""
        try:
            # Use /institutions/get with include_optional_metadata to get logo, color, and URL
            request = InstitutionsGetRequest(
                count=500,  # Get all institutions
                offset=0,
                country_codes=[CountryCode("US")],
                options={
                    "include_optional_metadata": True
                }
            )
            
            response = self.client.institutions_get(request)
            
            # Find the specific institution by ID
            target_institution = None
            for institution in response.institutions:
                if institution.institution_id == institution_id:
                    target_institution = institution
                    break
            
            if not target_institution:
                return {
                    "success": False,
                    "error": f"Institution {institution_id} not found"
                }
            
            institution_data = {
                "institution_id": target_institution.institution_id,
                "name": target_institution.name,
                "logo": getattr(target_institution, 'logo', None),
                "primary_color": getattr(target_institution, 'primary_color', None),
                "url": getattr(target_institution, 'url', None)
            }
            
            return {
                "success": True,
                "institution": institution_data
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 