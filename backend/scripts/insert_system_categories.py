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
import uuid

def populate_system_categories_and_groups():
    """Populate category_groups and system_categories tables from CSV"""
    try:
        supabase = get_supabase_service()
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'transactions-personal-finance-category-taxonomy.csv')

        # Clear existing system categories and category groups
        print("Clearing existing system categories and category groups...")
        supabase.client.table('system_categories').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        supabase.client.table('category_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

        # Read categories from CSV and build group/category data
        group_map = {}  # {group_name: group_id}
        group_inserts = []
        categories_to_insert = []
        with open(csv_path, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                group_name = format_category_name(row['PRIMARY'])
                label = row['DETAILED'].replace(row['PRIMARY'] + '_', '')
                label = format_category_name(label)
                description = row['DESCRIPTION']

                # Generate a consistent hex color based on the group
                hex_color = generate_category_color(group_name)

                # Create group if not already present
                if group_name not in group_map:
                    group_id = str(uuid.uuid4())
                    group_map[group_name] = group_id
                    group_inserts.append({
                        "id": group_id,
                        "name": group_name,
                        "icon_lib": None,
                        "icon_name": None
                    })
                else:
                    group_id = group_map[group_name]

                categories_to_insert.append({
                    "group_id": group_id,
                    "label": label,
                    "description": description,
                    "hex_color": hex_color
                })

        # Insert all category groups in batches
        print(f"Inserting {len(group_inserts)} category groups...")
        batch_size = 50
        for i in range(0, len(group_inserts), batch_size):
            batch = group_inserts[i:i + batch_size]
            response = supabase.client.table('category_groups').insert(batch).execute()
            print(f"✅ Inserted group batch {i//batch_size + 1}: {len(batch)} groups")

        # Insert all categories in batches
        print(f"Inserting {len(categories_to_insert)} categories...")
        for i in range(0, len(categories_to_insert), batch_size):
            batch = categories_to_insert[i:i + batch_size]
            response = supabase.client.table('system_categories').insert(batch).execute()
            print(f"✅ Inserted category batch {i//batch_size + 1}: {len(batch)} categories")

        print(f"🎉 Successfully inserted all {len(categories_to_insert)} categories and {len(group_inserts)} groups!")

    except Exception as e:
        print(f"❌ Error populating categories/groups: {e}")
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
    print("Populating category_groups and system_categories tables with all Plaid categories...")
    populate_system_categories_and_groups()
    print("Done.") 