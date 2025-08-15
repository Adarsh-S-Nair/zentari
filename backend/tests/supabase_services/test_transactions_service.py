import pytest

from backend.supabase_services.transactions import TransactionService
from backend.tests.helpers.factories import seed_pending_transaction, build_posted_from_pending, summarize_transactions


def test_pending_to_posted_should_switch_to_posted_id(fake_client_with_account):
	# Arrange
	client = fake_client_with_account
	account_uuid = client.db['accounts'][0]['id']
	seed_pending_transaction(client, account_uuid, pending_id='pending123')
	service = TransactionService(client)

	# Act
	posted_txn = build_posted_from_pending(
		plaid_account_id='plaid-acct-1', posted_id='posted456', pending_id='pending123'
	)
	result = service.store([posted_txn])
	assert result.get('success') is True

	# Assert: expected behavior after fix (should currently fail)
	ids = [row['plaid_transaction_id'] for row in client.db['transactions']]
	summary = summarize_transactions(client)
	assert 'posted456' in ids, f"Expected posted id to exist after merge. Current txns: {summary}"
	assert 'pending123' not in ids, f"Expected pending id to be removed after merge. Current txns: {summary}" 