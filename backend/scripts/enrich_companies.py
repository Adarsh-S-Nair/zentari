#!/usr/bin/env python
import os
import sys
from statistics import median
from datetime import datetime, timedelta
from typing import Dict, Any, List

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
	sys.path.insert(0, PROJECT_ROOT)

import yfinance as yf
from dotenv import load_dotenv

try:
	from supabase_services import get_client, get_universe
except Exception:
	from backend.supabase_services import get_client, get_universe


ALLOWED_EXCHANGES = { 'NASDAQ', 'NYSE', 'AMEX' }


def infer_flags(sym: str, info: Dict[str, Any]) -> Dict[str, Any]:
	name = (info.get('shortName') or info.get('longName') or info.get('displayName') or '')
	quote_type = (info.get('quoteType') or '').upper()
	is_etf = bool('ETF' in name.upper() or quote_type == 'ETF')
	is_warrant = bool(sym.endswith('W') or sym.endswith('WS') or 'WARRANT' in name.upper())
	return { 'is_etf': is_etf, 'is_warrant': is_warrant, 'asset_type': quote_type or 'EQUITY' }


def enrich_one(sym: str) -> Dict[str, Any]:
	try:
		t = yf.Ticker(sym)
		info = {}
		try:
			info = t.info or {}
		except Exception:
			info = {}
		fi = {}
		try:
			fi = t.fast_info or {}
		except Exception:
			fi = {}

		# Price
		price = float(fi.get('last_price') or fi.get('regularMarketPrice') or 0)
		if price == 0:
			hist = t.history(period='5d')
			if not hist.empty:
				price = float(hist['Close'].iloc[-1])

		# Market cap
		try:
			market_cap = float(info.get('marketCap') or 0)
		except Exception:
			market_cap = 0.0

		# Volume series for 60 calendar days (≈ 30 trading days)
		h = t.history(period='60d')
		avg_volume_30d = 0
		median_dollar_volume_30d = 0.0
		if not h.empty:
			vol_series = h['Volume'].tail(30)
			close_series = h['Close'].tail(30)
			if len(vol_series) > 0:
				avg_volume_30d = int(vol_series.mean())
				dollar_vol = [float(close_series.iloc[i]) * float(vol_series.iloc[i]) for i in range(len(vol_series))]
				if dollar_vol:
					median_dollar_volume_30d = float(median(dollar_vol))

		# Exchange and OTC flag
		exchange = (info.get('exchange') or '').upper()
		is_otc = exchange not in ALLOWED_EXCHANGES if exchange else True

		flags = infer_flags(sym, info)

		return {
			'price': price,
			'market_cap': market_cap,
			'avg_volume_30d': avg_volume_30d,
			'median_dollar_volume_30d': median_dollar_volume_30d,
			'exchange': exchange or None,
			'is_otc': is_otc,
			'asset_type': flags['asset_type'],
			'is_etf': flags['is_etf'],
			'is_warrant': flags['is_warrant'],
			'last_enriched_at': datetime.utcnow().isoformat() + 'Z',
		}
	except Exception as e:
		return {}


def main():
	# Load backend/.env if present
	try:
		load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
	except Exception:
		pass
	client = get_client().client
	res = client.table('companies').select('id, ticker').execute()
	rows = res.data or []
	if not rows:
		print('No companies.ticker rows found to enrich.')
		return
	print(f"Enriching {len(rows)} companies...")
	enriched_universe: List[Dict[str, Any]] = []
	for r in rows:
		sym = (r.get('ticker') or '').strip().upper()
		if not sym:
			continue
		metrics = enrich_one(sym)
		if not metrics:
			continue
		# Update companies
		upd = metrics.copy()
		try:
			resp = client.table('companies').update(upd).eq('ticker', sym).execute()
			print(f"Updated {sym}: ok")
		except Exception as e:
			print(f"Update {sym} failed: {e}")
		# Collect potential universe candidate (we'll filter later server-side)
		cand = {
			'ticker': sym,
			'price': metrics['price'],
			'market_cap': metrics['market_cap'],
			'avg_volume': metrics['avg_volume_30d'],
			'exchange': metrics['exchange'],
		}
		enriched_universe.append(cand)

	# No separate snapshot table; universe served from companies
	print("Universe candidates available via /market/universe from companies filters")


if __name__ == '__main__':
	main()


