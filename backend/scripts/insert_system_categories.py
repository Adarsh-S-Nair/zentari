import os
import sys
import csv
from dotenv import load_dotenv

# Add the parent directory to the Python path so we can import from services and utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env
load_dotenv()

from services.supabase_service import get_supabase_service
from utils.category_utils import format_category_name

def populate_system_categories():
    """Populate system_categories table with all categories from CSV"""
    try:
        supabase = get_supabase_service()
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'transactions-personal-finance-category-taxonomy.csv')
        
        # Clear existing system categories
        print("Clearing existing system categories...")
        supabase.client.table('system_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        
        # Read categories from CSV and insert them
        categories_to_insert = []
        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                primary_group = format_category_name(row['PRIMARY'])
                label = row['DETAILED'].replace(row['PRIMARY'] + '_', '')
                label = format_category_name(label)
                description = row['DESCRIPTION']
                
                # Generate a consistent hex color based on the primary group
                hex_color = generate_category_color(primary_group)
                
                categories_to_insert.append({
                    "primary_group": primary_group,
                    "label": label,
                    "description": description,
                    "hex_color": hex_color
                })
        
        # Insert all categories in batches
        print(f"Inserting {len(categories_to_insert)} categories...")
        batch_size = 50
        for i in range(0, len(categories_to_insert), batch_size):
            batch = categories_to_insert[i:i + batch_size]
            response = supabase.client.table('system_categories').insert(batch).execute()
            print(f"✅ Inserted batch {i//batch_size + 1}: {len(batch)} categories")
        
        print(f"🎉 Successfully inserted all {len(categories_to_insert)} categories!")
        
    except Exception as e:
        print(f"❌ Error populating categories: {e}")
        import traceback
        traceback.print_exc()

def generate_category_color(category_name: str) -> str:
    """Generate a consistent hex color for category names"""
    import hashlib
    import colorsys

    # Hash the name to get a consistent seed
    hash_digest = hashlib.md5(category_name.lower().encode()).hexdigest()
    hue_seed = int(hash_digest[:6], 16)

    # Convert to hue (0–360°) and normalize
    hue = (hue_seed % 300) / 360.0  # Avoid brownish/yellow hues (skip 300–360°)

    # Set pleasant, muted values
    saturation = 0.6    # Moderate saturation
    lightness = 0.55    # Clean and not too light on white background

    # Convert HLS → RGB
    r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
    r, g, b = [int(x * 255) for x in (r, g, b)]

    return f"#{r:02x}{g:02x}{b:02x}"

if __name__ == "__main__":
    print("Populating system_categories table with all Plaid categories...")
    populate_system_categories()
    print("Done.") 