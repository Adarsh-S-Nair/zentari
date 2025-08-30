import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure project root is importable
CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi import FastAPI
from backend.api.database_routes import router as database_router
from backend.supabase_services import get_client



@pytest.fixture()
def app():
    # Build a minimal FastAPI app with only the database routes to avoid plaid imports
    app = FastAPI()
    app.include_router(database_router)
    return app


# The Supabase client is now mocked globally in conftest.py
# No need for complex monkeypatching here


def test_buy_creates_position_and_debits_cash(app):
    client = TestClient(app)
    # Place buy order
    resp = client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AAPL', 'side': 'buy', 'order_type': 'limit', 'quantity': 10, 'limit_price': 100
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data['success'] is True

    # Check positions
    pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
    assert len(pos) == 1
    assert pos[0]['ticker'] == 'AAPL'
    assert pos[0]['quantity'] == 10
    assert round(float(pos[0]['avg_entry_price']), 2) == 100.0

    # Check cash
    # Query portfolio back
    pf = client.get('/database/user-accounts/user-1')  # not used for portfolio fetch; fetch via service
    # Instead directly read via service
    from backend.supabase_services import get_portfolios
    pf_service = get_portfolios()
    pf_row = pf_service.get_by_id('pf-1')['data'][0]
    assert round(float(pf_row['cash_balance']), 2) == 9000.0


def test_buy_works_with_company_id_schema(app):
    client = TestClient(app)
    # Seed a company with ticker mapping
    from backend.supabase_services import get_client
    fake_client = get_client().client
    fake_client.insert('companies', { 'id': 'co-TSLA', 'name': 'Tesla Inc.', 'ticker': 'TSLA', 'domain': 'tesla.com', 'logo_url': 'https://logo.clearbit.com/tesla.com' })

    # Place buy order (market path requires limit_price per current demo; pass it)
    resp = client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'TSLA', 'side': 'buy', 'order_type': 'limit', 'quantity': 1, 'limit_price': 330.56
    })
    assert resp.status_code == 200
    assert resp.json()['success'] is True

    # Position should exist; depending on schema, either company_id or ticker set
    pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
    assert len(pos) == 1
    p = pos[0]
    assert p.get('quantity') == 1
    assert round(float(p.get('avg_entry_price') or 0), 2) == 330.56
    # Company metadata should be retrievable via service enrichment path
    from backend.supabase_services import get_positions
    svc = get_positions()
    enriched = svc.get_by_portfolio('pf-1')
    assert enriched.get('success') is True
    erows = enriched.get('data') or []
    assert len(erows) == 1
    assert (erows[0].get('company_name') or '').startswith('Tesla')
def test_buy_fails_if_position_not_persisted(app, monkeypatch):
    client = TestClient(app)

    # Force positions insert to fail
    from backend.supabase_services import get_positions
    svc = get_positions()
    original_insert = svc.client.insert

    def failing_insert(table, data):
        if table == 'positions':
            return { 'success': False, 'error': 'db error' }
        return original_insert(table, data)

    # Build a thin proxy that overrides insert only
    class Proxy:
        def __init__(self, base):
            self._b = base
        def insert(self, table, data):
            return failing_insert(table, data)
        def update(self, table, data, filters):
            return self._b.update(table, data, filters)
        def delete(self, table, filters):
            return self._b.delete(table, filters)
        def select(self, table, columns="*", filters=None, order_by=None, limit=None):
            return self._b.select(table, columns, filters, order_by, limit)
        def upsert(self, table, data, conflict_column):
            return self._b.upsert(table, data, conflict_column)

    monkeypatch.setattr(svc, 'client', Proxy(svc.client))

    r = client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'TSLA', 'side': 'buy', 'order_type': 'limit', 'quantity': 1, 'limit_price': 100
    })
    # Should surface 500 due to failed insert
    assert r.status_code == 500



def test_buy_increments_avg_cost(app):
    client = TestClient(app)
    # First buy 10 @ 100
    client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AAPL', 'side': 'buy', 'order_type': 'limit', 'quantity': 10, 'limit_price': 100
    })
    # Second buy 10 @ 200
    client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AAPL', 'side': 'buy', 'order_type': 'limit', 'quantity': 10, 'limit_price': 200
    })
    pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
    assert len(pos) == 1
    assert pos[0]['quantity'] == 20
    assert round(float(pos[0]['avg_entry_price']), 2) == 150.0


def test_sell_partial_and_close_position(app):
    client = TestClient(app)
    # Buy 10 @ 100
    client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AAPL', 'side': 'buy', 'order_type': 'limit', 'quantity': 10, 'limit_price': 100
    })
    # Partial sell 4 @ 120
    client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AAPL', 'side': 'sell', 'order_type': 'limit', 'quantity': 4, 'limit_price': 120
    })
    pos = client.get('/database/portfolios/pf-1/positions').json()['positions']
    assert len(pos) == 1
    assert pos[0]['quantity'] == 6
    # Close remaining 6 @ 90
    client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AAPL', 'side': 'sell', 'order_type': 'limit', 'quantity': 6, 'limit_price': 90
    })
    pos2 = client.get('/database/portfolios/pf-1/positions').json()['positions']
    assert pos2 == []


def test_errors_insufficient_cash_and_oversell(app):
    client = TestClient(app)
    # Oversized buy -> insufficient cash
    r1 = client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'MSFT', 'side': 'buy', 'order_type': 'limit', 'quantity': 1000000, 'limit_price': 100
    })
    assert r1.status_code == 400
    # Sell without position
    r2 = client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'NVDA', 'side': 'sell', 'order_type': 'limit', 'quantity': 1, 'limit_price': 100
    })
    assert r2.status_code == 400
    # Create small position, then oversell
    client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AMD', 'side': 'buy', 'order_type': 'limit', 'quantity': 5, 'limit_price': 10
    })
    r3 = client.post('/database/portfolios/order', json={
        'portfolio_id': 'pf-1', 'ticker': 'AMD', 'side': 'sell', 'order_type': 'limit', 'quantity': 6, 'limit_price': 10
    })
    assert r3.status_code == 400


