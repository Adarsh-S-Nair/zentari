import os
import sys
import uuid
import pytest

# Ensure project root is on sys.path so `backend` package is importable
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "../.."))
if PROJECT_ROOT not in sys.path:
	sys.path.insert(0, PROJECT_ROOT)

# Also add the backend dir so imports like `openai_services` work (top-level alias)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
	sys.path.insert(0, BACKEND_DIR)

from backend.tests.helpers.fake_supabase import FakeSupabaseClient
from backend.tests.helpers.factories import seed_account


@pytest.fixture()
def fake_client() -> FakeSupabaseClient:
	return FakeSupabaseClient()


@pytest.fixture()
def fake_client_with_account(fake_client: FakeSupabaseClient) -> FakeSupabaseClient:
	# Seed one account: plaid account_id maps to internal id
	seed_account(fake_client, plaid_account_id='plaid-acct-1', user_id='user-1', item_id='item-1', name='Checking')
	return fake_client 


@pytest.fixture(autouse=True)
def mock_supabase_globally(monkeypatch):
	"""Provide a global FakeSupabaseClient backing backend.supabase_services for tests that don't stub it themselves."""
	from backend.supabase_services import __dict__ as services_dict
	fake = FakeSupabaseClient()
	# Seed a default portfolio used by trading order tests
	fake.insert('portfolios', {
		'id': 'pf-1',
		'user_id': 'user-1',
		'name': 'Test',
		'is_paper': True,
		'starting_balance': 10000,
		'cash_balance': 10000,
	})

	services_dict['_client'] = None
	def _get_client():
		# Tiny wrapper exposing .client and convenience passthroughs
		return type('C', (), {
			'client': fake,
			'insert': fake.insert,
			'update': fake.update,
			'delete': fake.delete,
			'select': fake.select,
			'exists': fake.exists,
			'upsert': fake.upsert,
		})()

	monkeypatch.setattr('backend.supabase_services.get_client', _get_client)
	# Also patch top-level module import path used by routes
	try:
		import supabase_services as top_services
		monkeypatch.setattr('supabase_services.get_client', _get_client, raising=False)
		# Reset singletons on both namespaces
		for name in ['_accounts','_transactions','_categories','_institutions','_sync','_snapshots','_portfolios','_orders','_positions','_client']:
			if name in top_services.__dict__:
				top_services.__dict__[name] = None
	except Exception:
		pass

	# Ensure database_routes uses backend.* singletons even if it imported top-level names
	import backend.api.database_routes as routes
	import backend.supabase_services as be_services
	monkeypatch.setattr(routes, 'get_client', be_services.get_client, raising=False)
	monkeypatch.setattr(routes, 'get_portfolios', be_services.get_portfolios, raising=False)
	monkeypatch.setattr(routes, 'get_positions', be_services.get_positions, raising=False)
	monkeypatch.setattr(routes, 'get_orders', be_services.get_orders, raising=False)
	# Reset service singletons to ensure they bind to the fake
	services_dict['_accounts'] = None
	services_dict['_transactions'] = None
	services_dict['_categories'] = None
	services_dict['_institutions'] = None
	services_dict['_sync'] = None
	services_dict['_snapshots'] = None
	services_dict['_portfolios'] = None
	services_dict['_orders'] = None
	services_dict['_positions'] = None
	yield fake