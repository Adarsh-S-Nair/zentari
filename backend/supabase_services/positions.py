from typing import Dict, Any
from .client import SupabaseClient


class PositionService:
    """Service for position-related database operations"""

    def __init__(self, client: SupabaseClient):
        self.client = client

    def get_by_portfolio(self, portfolio_id: str) -> Dict[str, Any]:
        try:
            # Join companies table if present to get logo_url by domain or ticker
            try:
                # Base fetch
                base = self.client.select('positions', filters={'portfolio_id': portfolio_id})
                if not base.get('success'):
                    return base
                rows = base.get('data') or []

                # Gather identifiers
                tickers = list({ (r.get('ticker') or '').upper() for r in rows if r.get('ticker') })
                company_ids = list({ r.get('company_id') for r in rows if r.get('company_id') })

                comp_by_ticker = {}
                comp_by_id = {}

                # Fetch companies by ticker
                if tickers:
                    try:
                        comp_resp = self.client.client.table('companies').select('id, ticker, name, logo_url, sector').in_('ticker', tickers).execute()
                        for c in (comp_resp.data or []):
                            comp_by_ticker[(c.get('ticker') or '').upper()] = c
                    except Exception:
                        pass

                # Fetch companies by id (company_id FK path)
                if company_ids:
                    try:
                        comp_resp2 = self.client.client.table('companies').select('id, ticker, name, logo_url, sector').in_('id', company_ids).execute()
                        for c in (comp_resp2.data or []):
                            comp_by_id[c.get('id')] = c
                    except Exception:
                        pass

                # Enrich rows
                for r in rows:
                    enriched = None
                    if r.get('company_id') and r.get('company_id') in comp_by_id:
                        enriched = comp_by_id[r.get('company_id')]
                    elif (r.get('ticker') or '').upper() in comp_by_ticker:
                        enriched = comp_by_ticker[(r.get('ticker') or '').upper()]
                    if enriched:
                        r['company_name'] = enriched.get('name')
                        r['logo_url'] = enriched.get('logo_url')
                        r['sector'] = enriched.get('sector')
                        # If ticker missing (company_id schema), populate it for UI
                        if not r.get('ticker') and enriched.get('ticker'):
                            r['ticker'] = enriched.get('ticker')
                return { 'success': True, 'data': rows }
            except Exception:
                # Fallback: fetch positions then enrich from companies by ticker in two queries
                base = self.client.select('positions', filters={'portfolio_id': portfolio_id})
                if not base.get('success'):
                    return base
                rows = base.get('data') or []
                tickers = list({ (r.get('ticker') or '').upper() for r in rows if r.get('ticker') })
                if tickers:
                    try:
                        comp_resp = self.client.client.table('companies').select('ticker, name, logo_url, sector').in_('ticker', tickers).execute()
                        comp_map = { (c.get('ticker') or '').upper(): c for c in (comp_resp.data or []) }
                        for r in rows:
                            key = (r.get('ticker') or '').upper()
                            c = comp_map.get(key)
                            if c:
                                r['company_name'] = c.get('name')
                                r['logo_url'] = c.get('logo_url')
                                r['sector'] = c.get('sector')
                    except Exception:
                        pass
                return { 'success': True, 'data': rows }
        except Exception as e:
            return {"success": False, "error": str(e)}


