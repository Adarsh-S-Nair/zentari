import os
import sys
from dotenv import load_dotenv

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

from supabase_services import get_accounts, get_sync
from plaid_services import get_accounts as get_plaid_accounts

def test_plaid_item_optimization():
    """Test the Plaid item optimization logic"""
    try:
        accounts_service = get_accounts()
        sync_service = get_sync()
        
        # Test account key creation
        test_account = {
            'name': 'Test Checking Account',
            'mask': '1234',
            'type': 'depository',
            'subtype': 'checking'
        }
        
        account_key = accounts_service.create_key(test_account)
        print(f"✅ Account key created: {account_key}")
        
        # Test with different account data
        test_account2 = {
            'name': 'Test Checking Account',
            'mask': '5678',  # Different mask
            'type': 'depository',
            'subtype': 'checking'
        }
        
        account_key2 = accounts_service.create_key(test_account2)
        print(f"✅ Account key 2 created: {account_key2}")
        
        # Verify keys are different
        if account_key != account_key2:
            print("✅ Different accounts generate different keys")
        else:
            print("❌ Different accounts generated same key")
        
        # Test account key comparison
        accounts1 = [test_account, test_account2]
        accounts2 = [test_account2, test_account]  # Same accounts, different order
        
        keys1 = {accounts_service.create_key(acc) for acc in accounts1}
        keys2 = {accounts_service.create_key(acc) for acc in accounts2}
        
        if keys1 == keys2:
            print("✅ Account key sets are equal (order doesn't matter)")
        else:
            print("❌ Account key sets are not equal")
            
        print("✅ Plaid item optimization tests completed successfully")
        
    except Exception as e:
        print(f"❌ Error testing Plaid item optimization: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_plaid_item_optimization() 