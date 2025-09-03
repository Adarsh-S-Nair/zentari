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


class TestPortfolioSnapshots:
    """Test suite for portfolio snapshots API endpoint."""

    def test_get_portfolio_snapshots_success(self, app):
        """Test successful retrieval of portfolio snapshots."""
        client = TestClient(app)
        
        # Mock the Supabase client response
        mock_snapshots_data = [
            {
                'recorded_at': '2024-01-15T10:00:00Z',
                'total_value': 10000.00
            },
            {
                'recorded_at': '2024-01-16T10:00:00Z',
                'total_value': 10150.50
            },
            {
                'recorded_at': '2024-01-17T10:00:00Z',
                'total_value': 10200.75
            }
        ]
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_query = MagicMock()
            mock_query.eq.return_value = mock_query
            mock_query.order.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.execute.return_value.data = mock_snapshots_data
            mock_client.client.table.return_value.select.return_value = mock_query
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            assert len(data['snapshots']) == 3
            
            # Verify the snapshots are in the correct format
            snapshot = data['snapshots'][0]
            assert 'date' in snapshot
            assert 'value' in snapshot
            assert 'recorded_at' in snapshot
            assert snapshot['date'] == '2024-01-15'
            assert snapshot['value'] == 10000.00

    def test_get_portfolio_snapshots_with_date_filters(self, app):
        """Test portfolio snapshots retrieval with start and end date filters."""
        client = TestClient(app)
        
        mock_snapshots_data = [
            {
                'recorded_at': '2024-01-16T10:00:00Z',
                'total_value': 10150.50
            }
        ]
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_query = MagicMock()
            mock_query.eq.return_value = mock_query
            mock_query.gte.return_value = mock_query
            mock_query.lte.return_value = mock_query
            mock_query.order.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.execute.return_value.data = mock_snapshots_data
            mock_client.client.table.return_value.select.return_value = mock_query
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots?start_date=2024-01-16&end_date=2024-01-16')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            assert len(data['snapshots']) == 1
            
            # Verify date filters were applied
            mock_query.gte.assert_called_once_with('recorded_at', '2024-01-16')
            mock_query.lte.assert_called_once_with('recorded_at', '2024-01-16')

    def test_get_portfolio_snapshots_with_limit(self, app):
        """Test portfolio snapshots retrieval with custom limit."""
        client = TestClient(app)
        
        mock_snapshots_data = [
            {
                'recorded_at': '2024-01-15T10:00:00Z',
                'total_value': 10000.00
            }
        ]
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_query = MagicMock()
            mock_query.eq.return_value = mock_query
            mock_query.order.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.execute.return_value.data = mock_snapshots_data
            mock_client.client.table.return_value.select.return_value = mock_query
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots?limit=10')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            
            # Verify limit was applied
            mock_query.limit.assert_called_once_with(10)

    def test_get_portfolio_snapshots_empty_result(self, app):
        """Test portfolio snapshots retrieval when no snapshots exist."""
        client = TestClient(app)
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_query = MagicMock()
            mock_query.eq.return_value = mock_query
            mock_query.order.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.execute.return_value.data = []
            mock_client.client.table.return_value.select.return_value = mock_query
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            assert data['snapshots'] == []

    def test_get_portfolio_snapshots_database_error(self, app):
        """Test portfolio snapshots retrieval when database error occurs."""
        client = TestClient(app)
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_client.client.table.side_effect = Exception("Database connection error")
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            assert data['snapshots'] == []

    def test_get_portfolio_snapshots_invalid_data_handling(self, app):
        """Test portfolio snapshots retrieval with invalid data in database."""
        client = TestClient(app)
        
        # Mock data with invalid values
        mock_snapshots_data = [
            {
                'recorded_at': '2024-01-15T10:00:00Z',
                'total_value': 10000.00
            },
            {
                'recorded_at': None,  # Invalid recorded_at
                'total_value': 10150.50
            },
            {
                'recorded_at': '2024-01-17T10:00:00Z',
                'total_value': 'invalid_price'  # Invalid total_value
            },
            {
                'recorded_at': '2024-01-18T10:00:00Z',
                'total_value': 0  # Zero value (should be filtered out)
            }
        ]
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_query = MagicMock()
            mock_query.eq.return_value = mock_query
            mock_query.order.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.execute.return_value.data = mock_snapshots_data
            mock_client.client.table.return_value.select.return_value = mock_query
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            
            # Should only include valid snapshots (first one)
            assert len(data['snapshots']) == 1
            assert data['snapshots'][0]['date'] == '2024-01-15'
            assert data['snapshots'][0]['value'] == 10000.00

    def test_get_portfolio_snapshots_date_format(self, app):
        """Test that dates are properly formatted in the response."""
        client = TestClient(app)
        
        mock_snapshots_data = [
            {
                'recorded_at': '2024-01-15T10:30:45.123456Z',
                'total_value': 10000.00
            },
            {
                'recorded_at': '2024-01-16T15:45:30.789012Z',
                'total_value': 10150.50
            }
        ]
        
        with patch('backend.api.database_routes.get_client') as mock_get_client:
            mock_client = MagicMock()
            mock_query = MagicMock()
            mock_query.eq.return_value = mock_query
            mock_query.order.return_value = mock_query
            mock_query.limit.return_value = mock_query
            mock_query.execute.return_value.data = mock_snapshots_data
            mock_client.client.table.return_value.select.return_value = mock_query
            mock_get_client.return_value = mock_client
            
            resp = client.get('/database/portfolios/test-portfolio-id/snapshots')
            
            assert resp.status_code == 200
            data = resp.json()
            assert data['success'] is True
            assert len(data['snapshots']) == 2
            
            # Verify date format is YYYY-MM-DD
            assert data['snapshots'][0]['date'] == '2024-01-15'
            assert data['snapshots'][1]['date'] == '2024-01-16'
            
            # Verify recorded_at is preserved
            assert data['snapshots'][0]['recorded_at'] == '2024-01-15T10:30:45.123456Z'
            assert data['snapshots'][1]['recorded_at'] == '2024-01-16T15:45:30.789012Z'
