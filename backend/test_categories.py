import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

from supabase_services import get_categories

def test_categories():
    """Test the categories endpoint to see what structure is returned"""
    try:
        categories_service = get_categories()
        result = categories_service.get_all()
        
        if result.get('success'):
            categories = result.get('categories', [])
            print(f"✅ Found {len(categories)} categories")
            
            if categories:
                print("\n📋 First category structure:")
                first_category = categories[0]
                for key, value in first_category.items():
                    print(f"  {key}: {value}")
                
                print("\n📋 Sample categories:")
                for i, category in enumerate(categories[:5]):
                    print(f"  {i+1}. {category.get('name', 'No name')} (Group: {category.get('group_name', 'No group')})")
                
                # Check if we have group information
                categories_with_groups = [c for c in categories if c.get('group_name')]
                print(f"\n📊 Categories with group info: {len(categories_with_groups)}/{len(categories)}")
                
                # Check unique groups
                unique_groups = set(c.get('group_name') for c in categories if c.get('group_name'))
                print(f"📊 Unique groups: {len(unique_groups)}")
                print("Groups:", list(unique_groups)[:5], "..." if len(unique_groups) > 5 else "")
                
            else:
                print("❌ No categories found")
        else:
            print(f"❌ Error getting categories: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Error testing categories: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_categories() 