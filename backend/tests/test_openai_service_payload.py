import json
import pytest

from backend.openai_services import OpenAIService


class _Capture:
	def __init__(self):
		self.last_payload = None

	def post(self, url, headers=None, json=None, timeout=None):
		# Capture the outgoing JSON payload and simulate a 200 OK response
		self.last_payload = json
		class _Resp:
			status_code = 200
			def json(self_inner):
				return {"choices": [{"message": {"content": "{}"}}]}
		return _Resp()


def test_send_template_message_builds_expected_payload(monkeypatch):
	# Arrange: inject fake API key so service is configured
	monkeypatch.setenv('OPENAI_API_KEY', 'test-key-1234')
	svc = OpenAIService()
	capture = _Capture()

	# Patch requests.post used by the service
	import backend.openai_services.client as client_mod
	client_mod.requests.post = capture.post

	# Act
	portfolio_context = "Cash: $40.50\nPositions:\n- 5 shares of ABCD @ $3.10 avg cost"
	available_universe = json.dumps([
		{"ticker": "EFGH", "price": 2.25, "market_cap": 210, "avg_volume": 500000},
		{"ticker": "WXYZ", "price": 4.75, "market_cap": 150, "avg_volume": 750000},
		{"ticker": "ABCD", "price": 3.90, "market_cap": 280, "avg_volume": 600000},
	])
	resp = svc.send_portfolio_strategy_message(
		starting_balance=100,
		timeframe_months=6,
		market_cap_constraint="micro-cap stocks (market cap under $300M)",
		rebalancing_frequency="daily",
		portfolio_context=portfolio_context,
		available_universe=available_universe,
	)

	# Assert: service call successful
	assert resp.get('success') is True

	# Inspect constructed payload
	payload = capture.last_payload
	assert payload is not None
	assert payload.get('messages') is not None
	messages = payload['messages']
	assert any(m['role'] == 'system' for m in messages)
	user_content = next(m['content'] for m in messages if m['role'] == 'user')

	# Context present
	assert 'Cash: $40.50' in user_content
	assert '5 shares of ABCD @ $3.10' in user_content
	assert 'EFGH' in user_content and 'WXYZ' in user_content and 'ABCD' in user_content

	# JSON-only response format specified
	assert payload.get('response_format') == { 'type': 'json_object' }

	# Basic knobs present
	assert isinstance(payload.get('max_tokens'), int)
	assert 'model' in payload



