from typing import Dict, Any, List, Optional
from .client import SupabaseClient

class CategoryService:
    """Service for category-related database operations"""
    
    def __init__(self, client: SupabaseClient):
        self.client = client
    
    def get_id(self, category_name: str) -> Optional[str]:
        """Get category ID by name"""
        try:
            formatted_name = self._format_name(category_name)
            
            # Check if category exists in system_categories table
            result = self.client.select('system_categories', 'id', {'label': formatted_name}, limit=1)
            
            if result.get('success') and result.get('data'):
                return result['data'][0]['id']
            
            # If not found, return None (categories should be pre-populated)
            print(f"Category '{formatted_name}' not found in system_categories table")
            return None
            
        except Exception as e:
            print(f"Error getting category: {e}")
            return None
    
    def get_all(self) -> Dict[str, Any]:
        """Get all system categories with their colors and group info"""
        try:
            print("[CATEGORIES] Starting get_all() method")
            
            # Complex query with joins
            query = self.client.client.table('system_categories').select(
                'id, group_id, label, description, hex_color, '
                'category_groups:group_id(id, name, icon_lib, icon_name)'
            ).order('label')
            
            print("[CATEGORIES] Executing query...")
            response = query.execute()
            print(f"[CATEGORIES] Query response: {len(response.data) if response.data else 0} categories found")
            
            if response.data:
                categories = []
                for i, category in enumerate(response.data):
                    print(f"[CATEGORIES] Processing category {i+1}: {category.get('label', 'No label')}")
                    
                    category_data = {
                        'id': category['id'],
                        'name': category['label'],  # Keep 'name' for frontend compatibility
                        'group_id': category.get('group_id'),
                        'description': category['description'],
                        'color': category['hex_color']  # Keep 'color' for frontend compatibility
                    }
                    
                    # Add group info if present
                    if category.get('category_groups'):
                        group = category['category_groups']
                        category_data['group_name'] = group.get('name')
                        category_data['icon_lib'] = group.get('icon_lib')
                        category_data['icon_name'] = group.get('icon_name')
                        print(f"[CATEGORIES] Category {category['label']} has group: {group.get('name')}")
                    else:
                        print(f"[CATEGORIES] Category {category['label']} has NO group info")
                    
                    categories.append(category_data)
                
                print(f"[CATEGORIES] Final result: {len(categories)} categories processed")
                print(f"[CATEGORIES] Sample category: {categories[0] if categories else 'None'}")
                
                return {"success": True, "categories": categories}
            else:
                print("[CATEGORIES] No categories found in database")
                return {"success": True, "categories": []}
        except Exception as e:
            print(f"[CATEGORIES] Error in get_all(): {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    def get_by_group(self, group_id: str) -> Dict[str, Any]:
        """Get categories by group ID"""
        return self.client.select('system_categories', filters={'group_id': group_id}, order_by='label')
    
    def _format_name(self, category_name: str) -> str:
        """Format category name for consistency using proper title case"""
        from utils.category_utils import format_category_name
        return format_category_name(category_name) 