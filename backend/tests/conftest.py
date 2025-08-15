import os
import sys
import uuid
import pytest

# Ensure project root is on sys.path so `backend` package is importable
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "../.."))
if PROJECT_ROOT not in sys.path:
	sys.path.insert(0, PROJECT_ROOT)

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