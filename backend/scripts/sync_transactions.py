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
        print(f"\n=== Syncing transactions for user {user_id} ===")
        response = requests.post(f"{API_URL}/sync/transactions", headers=headers, timeout=60)
        
        if response.status_code == 200:
            try:
                result = response.json()
                if result.get("success"):
                    results = result.get("results", [])
                    total_added = 0
                    total_modified = 0
                    total_removed = 0
                    total_errors = 0
                    
                    print(f"✅ Sync successful for user {user_id}")
                    print(f"📊 Processing {len(results)} items:")
                    
                    for item_result in results:
                        item_id = item_result.get("item_id", "unknown")
                        success = item_result.get("success", False)
                        added_count = item_result.get("added_count", 0)
                        modified_count = item_result.get("modified_count", 0)
                        removed_count = item_result.get("removed_count", 0)
                        balance_updates = item_result.get("balance_updates", 0)
                        error = item_result.get("error")
                        skipped = item_result.get("skipped", False)
                        
                        if skipped:
                            reason = item_result.get("reason", "unknown")
                            print(f"   ⏭️  Item {item_id}: Skipped - {reason}")
                        elif success:
                            total_added += added_count
                            total_modified += modified_count
                            total_removed += removed_count
                            print(f"   ✅ Item {item_id}: {added_count} transactions added, {modified_count} modified, {removed_count} removed, {balance_updates} balance updates")
                        else:
                            total_errors += 1
                            print(f"   ❌ Item {item_id}: Failed - {error}")
                    
                    print(f"📈 Summary: {total_added} total transactions added, {total_modified} modified, {total_removed} removed, {total_errors} errors")
                else:
                    print(f"❌ Sync failed for user {user_id}: {result.get('error', 'Unknown error')}")
            except ValueError:
                print(f"⚠️  User {user_id}: Invalid JSON response - {response.text}")
        else:
            print(f"❌ User {user_id}: HTTP {response.status_code} - {response.text}")
            
    except requests.exceptions.Timeout:
        print(f"⏰ User {user_id}: Request timed out after 60 seconds")
    except requests.exceptions.ConnectionError:
        print(f"🔌 User {user_id}: Connection error - unable to reach API")
    except Exception as e:
        print(f"💥 User {user_id}: Unexpected error - {e}")
    
    print(f"=== End sync for user {user_id} ===\n")

def cleanup_orphaned_plaid_items():
    """Remove Plaid items that no longer have associated accounts"""
    print("\n🧹 Starting cleanup of orphaned Plaid items...")
    
    try:
        # Get all plaid_items with their access tokens
        plaid_items_response = db.table('plaid_items').select('item_id, access_token, user_id').execute()
        
        if not plaid_items_response.data:
            print("ℹ️  No Plaid items found in database")
            return
        
        print(f"🔍 Found {len(plaid_items_response.data)} Plaid items to check")
        
        removed_count = 0
        error_count = 0
        
        for item in plaid_items_response.data:
            item_id = item.get('item_id')
            access_token = item.get('access_token')
            user_id = item.get('user_id')
            
            if not access_token:
                print(f"⚠️  Item {item_id}: No access token found, skipping")
                continue
            
            # Check if there are any accounts with this access_token
            accounts_response = db.table('accounts').select('id').eq('access_token', access_token).execute()
            
            if not accounts_response.data:
                print(f"🗑️  Item {item_id}: No accounts found, removing from Plaid...")
                
                try:
                    # Call the API to remove the item from Plaid and clean up database
                    headers = {"Authorization": f"Bearer {user_id}", "Content-Type": "application/json"}
                    response = requests.post(f"{API_URL}/plaid/remove-item", 
                                           headers=headers, 
                                           json={"access_token": access_token}, 
                                           timeout=30)
                    
                    if response.status_code == 200:
                        print(f"✅ Item {item_id}: Successfully removed from Plaid and database")
                        removed_count += 1
                    else:
                        print(f"❌ Item {item_id}: Failed to remove from Plaid (HTTP {response.status_code})")
                        print(f"   Response: {response.text}")
                        error_count += 1  # Count as error since we couldn't remove it
                        
                except Exception as e:
                    print(f"❌ Item {item_id}: Error during Plaid removal ({e})")
                    error_count += 1  # Count as error since we couldn't remove it
            else:
                print(f"✅ Item {item_id}: Has {len(accounts_response.data)} associated accounts, keeping")
        
        print(f"\n📊 Cleanup Summary:")
        print(f"   🗑️  Items removed: {removed_count}")
        print(f"   ❌ Errors: {error_count}")
        print(f"   ✅ Items kept: {len(plaid_items_response.data) - removed_count - error_count}")
        
    except Exception as e:
        print(f"💥 Error during cleanup process: {e}")

if __name__ == "__main__":
    print("🔄 Starting transaction sync job...")
    print(f"⏰ Started at: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    user_ids = get_all_user_ids()
    print(f"👥 Found {len(user_ids)} users with auto_sync enabled")
    
    if not user_ids:
        print("ℹ️  No users found with auto_sync enabled. Exiting.")
        exit(0)
    
    successful_users = 0
    failed_users = 0
    
    for user_id in user_ids:
        try:
            sync_transactions_for_user(user_id)
            successful_users += 1
        except Exception as e:
            print(f"💥 Failed to sync user {user_id}: {e}")
            failed_users += 1
    
    print("=" * 50)
    print("📊 SYNC JOB SUMMARY")
    print("=" * 50)
    print(f"✅ Successful users: {successful_users}")
    print(f"❌ Failed users: {failed_users}")
    print(f"📈 Total users processed: {len(user_ids)}")
    print(f"⏰ Completed at: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    # Run cleanup process
    cleanup_orphaned_plaid_items() 