import json
import pytest

from backend.openai_services.prompts import PromptTemplates


def test_portfolio_strategy_includes_context_and_variables():
	# Arrange
	prompts = PromptTemplates()
	portfolio_context = """Cash: $40.50
Positions:
- 5 shares of ABCD @ $3.10 avg cost"""
	available_universe = json.dumps([
		{"ticker": "EFGH", "price": 2.25, "market_cap": 210, "avg_volume": 500000},
		{"ticker": "WXYZ", "price": 4.75, "market_cap": 150, "avg_volume": 750000},
		{"ticker": "ABCD", "price": 3.90, "market_cap": 280, "avg_volume": 600000},
	])

	# Act
	data = prompts.portfolio_strategy(
		starting_balance=100,
		timeframe_months=6,
		market_cap_constraint="micro-cap stocks (market cap under $300M)",
		rebalancing_frequency="daily",
		portfolio_context=portfolio_context,
		available_universe=available_universe,
	)

	# Assert
	assert data is not None
	assert 'system' in data and 'user' in data
	assert 'micro-cap stocks (market cap under $300M)' in data['user']
	assert 'Cash: $40.50' in data['user']
	assert '5 shares of ABCD' in data['user']
	assert 'EFGH' in data['user'] and 'WXYZ' in data['user'] and 'ABCD' in data['user']
	# JSON-only enforcement present
	assert data.get('response_format') == 'json_object'
	# Reasonable defaults merged
	assert data.get('model') is not None
	assert isinstance(data.get('max_tokens'), int)








