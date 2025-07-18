import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

from supabase_services import get_client

def test_categories_in_db():
    """Simple test to check if categories exist in the database"""
    try:
        client = get_client()
        
        # Check system_categories table
        print("[TEST] Checking system_categories table...")
        categories_response = client.client.table('system_categories').select('*').limit(5).execute()
        print(f"[TEST] Found {len(categories_response.data)} categories in system_categories")
        
        if categories_response.data:
            print("[TEST] Sample category:", categories_response.data[0])
        
        # Check category_groups table
        print("\n[TEST] Checking category_groups table...")
        groups_response = client.client.table('category_groups').select('*').limit(5).execute()
        print(f"[TEST] Found {len(groups_response.data)} groups in category_groups")
        
        if groups_response.data:
            print("[TEST] Sample group:", groups_response.data[0])
        
        # Check join query
        print("\n[TEST] Testing join query...")
        join_response = client.client.table('system_categories').select(
            'id, label, group_id, category_groups:group_id(id, name)'
        ).limit(3).execute()
        
        print(f"[TEST] Join query found {len(join_response.data)} results")
        if join_response.data:
            print("[TEST] Sample join result:", join_response.data[0])
            
    except Exception as e:
        print(f"[TEST] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_categories_in_db() 