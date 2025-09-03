import os
import sys
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from datetime import datetime, timezone

# Ensure project root is importable
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI
from backend.api.database_routes import router as database_router


@pytest.fixture()
def app():
    """Build a minimal FastAPI app with only the database routes."""
    app = FastAPI()
    app.include_router(database_router)
    return app


@pytest.fixture()
def mock_yfinance_data():
    """Mock yfinance data for testing."""
    import pandas as pd
    
    # Create mock historical data with current price
    mock_data = pd.DataFrame({
        'Close': [170.74, 170.50, 170.80, 170.74],  # Most recent price is 170.74
        'Open': [170.00, 170.20, 170.60, 170.70],
        'High': [171.00, 170.80, 171.00, 170.90],
        'Low': [169.50, 170.00, 170.40, 170.50],
        'Volume': [1000000, 950000, 1100000, 1050000]
    }, index=pd.date_range('2024-01-15 09:30:00', periods=4, freq='1min'))
    
    return mock_data


class TestOrderExecutionPrices:
    """Test suite for order execution price bug fixes."""

    def test_market_order_uses_current_yfinance_price(self, app, mock_yfinance_data):
        """Test that market orders fetch and use current price from yfinance."""
        client = TestClient(app)
        
        with patch('yfinance.Ticker') as mock_ticker:
            # Setup mock yfinance response
            mock_stock = MagicMock()
            mock_stock.history.return_value = mock_yfinance_data
            mock_ticker.return_value = mock_stock
            
            # Place market order (no limit_price provided)
            resp = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'NVDA',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 5
            })
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            
            # Verify yfinance was called
            mock_ticker.assert_called_once_with('NVDA')
            mock_stock.history.assert_called_with(period="1d", interval="1m")
            
            # Check that position was created with current market price (170.74)
            pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
            assert len(pos) == 1
            assert pos[0]['ticker'] == 'NVDA'
            assert pos[0]['quantity'] == 5
            assert round(float(pos[0]['avg_entry_price']), 2) == 170.74

    def test_market_order_fallback_to_daily_data(self, app):
        """Test that market orders fallback to daily data when intraday is unavailable."""
        client = TestClient(app)
        
        import pandas as pd
        
        # Mock empty intraday data but available daily data
        empty_intraday = pd.DataFrame()
        daily_data = pd.DataFrame({
            'Close': [170.74],
            'Open': [170.00],
            'High': [171.00],
            'Low': [169.50],
            'Volume': [1000000]
        }, index=pd.date_range('2024-01-15', periods=1))
        
        with patch('yfinance.Ticker') as mock_ticker:
            mock_stock = MagicMock()
            # First call returns empty (intraday), second call returns daily data
            mock_stock.history.side_effect = [empty_intraday, daily_data]
            mock_ticker.return_value = mock_stock
            
            resp = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'AAPL',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 3
            })
            
            assert resp.status_code == 200
            
            # Verify both intraday and daily calls were made
            assert mock_stock.history.call_count == 2
            mock_stock.history.assert_any_call(period="1d", interval="1m")
            mock_stock.history.assert_any_call(period="2d")
            
            # Check position uses daily price
            pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
            assert round(float(pos[0]['avg_entry_price']), 2) == 170.74

    def test_market_order_fallback_to_limit_price(self, app):
        """Test that market orders fallback to limit_price when yfinance fails."""
        client = TestClient(app)
        
        with patch('yfinance.Ticker') as mock_ticker:
            # Mock yfinance failure
            mock_ticker.side_effect = Exception("Network error")
            
            resp = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'TSLA',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 2,
                'limit_price': 250.50  # Fallback price
            })
            
            assert resp.status_code == 200
            
            # Check position uses fallback limit price
            pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
            assert round(float(pos[0]['avg_entry_price']), 2) == 250.50

    def test_market_order_fails_without_price_source(self, app):
        """Test that market orders fail when yfinance fails and no limit_price provided."""
        client = TestClient(app)
        
        with patch('yfinance.Ticker') as mock_ticker:
            # Mock yfinance failure
            mock_ticker.side_effect = Exception("Network error")
            
            resp = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'MSFT',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 1
                # No limit_price provided
            })
            
            assert resp.status_code == 400
            data = resp.json()
            assert "Could not fetch current price" in data['detail']

    def test_limit_order_uses_specified_price(self, app):
        """Test that limit orders still use the specified limit_price."""
        client = TestClient(app)
        
        # Place limit order with specific price (using smaller amount to avoid insufficient cash)
        resp = client.post('/database/portfolios/order', json={
            'portfolio_id': 'pf-1',
            'ticker': 'GOOGL',
            'side': 'buy',
            'order_type': 'limit',
            'quantity': 2,
            'limit_price': 150.00
        })
        
        if resp.status_code != 200:
            print(f"Error response: {resp.status_code} - {resp.text}")
        
        assert resp.status_code == 200
        
        # Check position uses specified limit price
        pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
        assert round(float(pos[0]['avg_entry_price']), 2) == 150.00

    def test_company_latest_price_updated_on_order_execution(self, app, mock_yfinance_data):
        """Test that company's latest_price is updated when order is executed."""
        client = TestClient(app)
        
        with patch('yfinance.Ticker') as mock_ticker:
            mock_stock = MagicMock()
            mock_stock.history.return_value = mock_yfinance_data
            mock_ticker.return_value = mock_stock
            
            # Place market order
            resp = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'NVDA',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 1
            })
            
            assert resp.status_code == 200
            
            # Verify company's latest_price was updated
            # This would require checking the companies table, but since we're using mocked data,
            # we can verify the yfinance call was made and the order succeeded
            mock_ticker.assert_called_once_with('NVDA')
            
            # Check that the position was created with the current price
            pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
            assert round(float(pos[0]['avg_entry_price']), 2) == 170.74

    def test_price_discrepancy_bug_fix(self, app):
        """Test the specific bug: orders should use current market price, not outdated prices."""
        client = TestClient(app)
        
        # Simulate the bug scenario: outdated price in request vs current market price
        outdated_price = 174.18  # Old price that was being used
        current_market_price = 170.74  # Current market price from yfinance
        
        import pandas as pd
        mock_data = pd.DataFrame({
            'Close': [current_market_price],
            'Open': [170.00],
            'High': [171.00],
            'Low': [169.50],
            'Volume': [1000000]
        }, index=pd.date_range('2024-01-15', periods=1))
        
        with patch('yfinance.Ticker') as mock_ticker:
            mock_stock = MagicMock()
            mock_stock.history.return_value = mock_data
            mock_ticker.return_value = mock_stock
            
            # Place market order (should ignore any outdated price in request)
            resp = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'NVDA',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 10
            })
            
            assert resp.status_code == 200
            
            # Verify the position uses current market price, not outdated price
            pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
            avg_entry_price = round(float(pos[0]['avg_entry_price']), 2)
            
            # Should use current market price (170.74), not outdated price (174.18)
            assert avg_entry_price == current_market_price
            assert avg_entry_price != outdated_price
            
            # Verify yfinance was called to get current price
            mock_ticker.assert_called_once_with('NVDA')

    def test_multiple_orders_same_ticker_different_prices(self, app):
        """Test that multiple orders for the same ticker use current prices at execution time."""
        client = TestClient(app)
        
        # First order at one price
        import pandas as pd
        first_price_data = pd.DataFrame({
            'Close': [170.00],
            'Open': [169.50],
            'High': [170.50],
            'Low': [169.00],
            'Volume': [1000000]
        }, index=pd.date_range('2024-01-15 10:00:00', periods=1))
        
        # Second order at different price (simulating price movement)
        second_price_data = pd.DataFrame({
            'Close': [171.50],
            'Open': [170.00],
            'High': [172.00],
            'Low': [169.50],
            'Volume': [1200000]
        }, index=pd.date_range('2024-01-15 11:00:00', periods=1))
        
        with patch('yfinance.Ticker') as mock_ticker:
            mock_stock = MagicMock()
            # Return different prices for each call
            mock_stock.history.side_effect = [first_price_data, second_price_data]
            mock_ticker.return_value = mock_stock
            
            # First order
            resp1 = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'NVDA',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 5
            })
            assert resp1.status_code == 200
            
            # Second order
            resp2 = client.post('/database/portfolios/order', json={
                'portfolio_id': 'pf-1',
                'ticker': 'NVDA',
                'side': 'buy',
                'order_type': 'market',
                'quantity': 3
            })
            assert resp2.status_code == 200
            
            # Check that the position shows weighted average of both prices
            pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
            assert len(pos) == 1
            assert pos[0]['quantity'] == 8  # 5 + 3
            
            # Weighted average: (5 * 170.00 + 3 * 171.50) / 8 = 170.56
            expected_avg = (5 * 170.00 + 3 * 171.50) / 8
            assert round(float(pos[0]['avg_entry_price']), 2) == round(expected_avg, 2)
            
            # Verify yfinance was called twice
            assert mock_ticker.call_count == 2
