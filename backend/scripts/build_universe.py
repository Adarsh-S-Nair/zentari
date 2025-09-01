#!/usr/bin/env python
import os
import sys
from datetime import datetime
from typing import Dict, Any, List

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if PROJECT_ROOT not in sys.path:
	sys.path.insert(0, PROJECT_ROOT)

import yfinance as yf

try:
	from supabase_services import get_universe, get_client
except Exception:
	from backend.supabase_services import get_universe, get_client


def fetch_metrics(tickers: List[str]) -> List[Dict[str, Any]]:
	rows: List[Dict[str, Any]] = []
	for t in tickers:
		try:
			sym = t.strip().upper()
			fi = yf.Ticker(sym).fast_info
			price = float(fi.get('last_price') or fi.get('regularMarketPrice') or 0)
			if price == 0:
				hist = yf.Ticker(sym).history(period='1d')
				if not hist.empty:
					price = float(hist['Close'].iloc[-1])
			# yfinance doesn't directly expose market cap in fast_info consistently
			try:
				cap = float(getattr(yf.Ticker(sym).info, 'marketCap', None) or 0)
			except Exception:
				cap = 0.0
			vol = int(fi.get('ten_day_average_volume') or fi.get('regularMarketVolume') or 0)
			rows.append({
				'ticker': sym,
				'price': price,
				'market_cap': cap,
				'avg_volume': vol,
			})
		except Exception:
			continue
	return rows


def main():
	# Pull tickers from companies table; enrich and store into universe_candidates
	client = get_client().client
	res = client.table('companies').select('ticker').execute()
	tickers = [r.get('ticker') for r in (res.data or []) if r.get('ticker')]
	if not tickers:
		print("No tickers found in companies; nothing to build.")
		return
	rows = fetch_metrics(tickers[:500])
	uni = get_universe()
	print(f"Upserting {len(rows)} universe rows...")
	resp = uni.upsert_batch(rows)
	print(f"Result: {resp}")


if __name__ == '__main__':
	main()








