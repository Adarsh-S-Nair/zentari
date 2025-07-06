import os
import requests
from supabase import create_client, Client

API_URL = os.environ.get("API_URL")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not API_URL or not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("API_URL, SUPABASE_URL, and SUPABASE_KEY must be set in environment variables.")

# Initialize Supabase client
db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_all_user_ids():
    # Query accounts table for all distinct user_ids where auto_sync is True
    resp = db.table('accounts').select('user_id', count='exact').eq('auto_sync', True).execute()
    if not resp.data:
        print("No users with auto_sync accounts found in accounts table.")
        return []
    # Use set to ensure uniqueness
    user_ids = set()
    for row in resp.data:
        user_id = row.get('user_id')
        if user_id:
            user_ids.add(user_id)
    return list(user_ids)

def sync_transactions_for_user(user_id):
    headers = {"Authorization": f"Bearer {user_id}"}
    try:
        response = requests.post(f"{API_URL}/sync/transactions", headers=headers, timeout=60)
        print(f"User {user_id}: {response.status_code} {response.text}")
    except Exception as e:
        print(f"User {user_id}: Error - {e}")

if __name__ == "__main__":
    user_ids = get_all_user_ids()
    print(f"Found {len(user_ids)} users.")
    for user_id in user_ids:
        sync_transactions_for_user(user_id)
    print(f"Sync job complete. Processed {len(user_ids)} users.") 