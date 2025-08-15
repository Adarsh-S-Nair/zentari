from typing import Any, Dict
from .fake_supabase import FakeSupabaseClient


def seed_account(client: FakeSupabaseClient, plaid_account_id: str, user_id: str, item_id: str, name: str) -> Dict[str, Any]:
	account = {
		'user_id': user_id,
		'item_id': item_id,
		'account_id': plaid_account_id,
		'name': name,
		'auto_sync': True,
	}
	client.insert('accounts', account)
	return client.db['accounts'][-1]


def seed_pending_transaction(client: FakeSupabaseClient, account_uuid: str, pending_id: str) -> Dict[str, Any]:
	txn = {
		'account_id': account_uuid,
		'plaid_transaction_id': pending_id,
		'datetime': '2024-01-01T00:00:00Z',
		'description': 'Test Pending Txn',
		'category_id': None,
		'merchant_name': 'Merchant',
		'icon_url': None,
		'personal_finance_category': None,
		'amount': -10.0,
		'currency_code': 'USD',
		'pending': True,
		'location': None,
		'payment_channel': None,
		'website': None,
	}
	client.insert('transactions', txn)
	return client.db['transactions'][-1]


def build_posted_from_pending(plaid_account_id: str, posted_id: str, pending_id: str) -> Dict[str, Any]:
	return {
		'plaid_transaction_id': posted_id,
		'datetime': '2024-01-02T00:00:00Z',
		'description': 'Test Pending Txn',
		'category': None,
		'category_id': None,
		'merchant_name': 'Merchant',
		'icon_url': None,
		'personal_finance_category': None,
		'amount': 10.0,
		'currency_code': 'USD',
		'pending': False,
		'account_id': plaid_account_id,
		'location': None,
		'payment_channel': None,
		'website': None,
		'pending_plaid_transaction_id': pending_id,
	}


def summarize_transactions(client: FakeSupabaseClient):
	# Return a lightweight summary for readable failure messages
	return [
		{
			'id': tx.get('plaid_transaction_id'),
			'pending': tx.get('pending'),
			'desc': tx.get('description'),
		}
		for tx in client.db['transactions']
	] 