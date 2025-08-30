#!/usr/bin/env python
import csv
import os
import sys
import time
from typing import List, Dict, Any

import requests
import yfinance as yf

ALLOWED_EXCHANGES = { 'NASDAQ', 'NYSE', 'AMEX' }


def fetch_text(url: str) -> str:
	r = requests.get(url, timeout=20)
	r.raise_for_status()
	return r.text


def parse_nasdaq_listed(txt: str):
	lines = [ln for ln in txt.splitlines() if ln and 'File Creation Time' not in ln]
	reader = csv.DictReader(lines, delimiter='|')
	for row in reader:
		sym = (row.get('Symbol') or '').strip().upper()
		name = (row.get('Security Name') or '').strip()
		etf = (row.get('ETF') or row.get('ETP Flag') or '').strip().upper()
		test = (row.get('Test Issue') or '').strip().upper()
		exch = 'NASDAQ'
		if sym:
			yield { 'ticker': sym, 'name': name, 'exchange': exch, 'etf': etf, 'test': test }


def parse_other_listed(txt: str):
	lines = [ln for ln in txt.splitlines() if ln and 'File Creation Time' not in ln]
	reader = csv.DictReader(lines, delimiter='|')
	for row in reader:
		sym = (row.get('ACT Symbol') or '').strip().upper()
		name = (row.get('Security Name') or '').strip()
		etf = (row.get('ETF') or '').strip().upper()
		test = (row.get('Test Issue') or '').strip().upper()
		ex_raw = (row.get('Exchange') or '').strip().upper()
		ex_map = { 'A': 'AMEX', 'N': 'NYSE', 'P': 'NYSE', 'Z': 'BATS' }
		exch = ex_map.get(ex_raw, ex_raw)
		if sym:
			yield { 'ticker': sym, 'name': name, 'exchange': exch, 'etf': etf, 'test': test }


EXCLUDE_KEYWORDS = (
	'ETF','ETN','FUND','TRUST','PREFERRED','PFD','UNIT','WARRANT','RIGHT','NOTE','ADR','SPAC'
)

# Optional controls
LIMIT = int(os.getenv('LIMIT', '0'))  # 0 = no limit
SLEEP_MS = int(os.getenv('SLEEP_MS', '0'))  # throttle per request
MAX_MARKET_CAP = float(os.getenv('MAX_MARKET_CAP', '300000000'))  # default $300M
MIN_PRICE = float(os.getenv('MIN_PRICE', '1'))  # default $1


def looks_like_common_stock(name: str) -> bool:
	up = name.upper()
	return not any(k in up for k in EXCLUDE_KEYWORDS)


def main():
	print('[INFO] Loading symbol lists...', flush=True)
	nasdaq_txt = fetch_text('https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt')
	other_txt = fetch_text('https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt')

	rows: List[Dict[str, Any]] = []
	for r in parse_nasdaq_listed(nasdaq_txt):
		rows.append(r)
	for r in parse_other_listed(other_txt):
		rows.append(r)

	# filter and dedupe
	seen = set()
	candidates: List[Dict[str, Any]] = []
	for r in rows:
		sym = r['ticker']
		if sym in seen:
			continue
		seen.add(sym)
		if r['exchange'] not in ALLOWED_EXCHANGES:
			continue
		if r['etf'] == 'Y' or r['test'] == 'Y':
			continue
		if not looks_like_common_stock(r['name']):
			continue
		candidates.append(r)
	print(f"[INFO] Candidates after filter: {len(candidates)}", flush=True)

	printed = 0
	for r in candidates:
		if LIMIT and printed >= LIMIT:
			break
		sym = r['ticker']
		try:
			t = yf.Ticker(sym)
			fi = t.fast_info
			mc = getattr(fi, 'market_cap', None)
			if mc is None and hasattr(fi, 'get'):
				mc = fi.get('market_cap')
			price = getattr(fi, 'last_price', None)
			if price is None and hasattr(fi, 'get'):
				price = fi.get('last_price')
			if price is None:
				# fallback to last close if fast_info doesn't have price
				try:
					hist = t.history(period='1d')
					if hasattr(hist, 'empty') and not hist.empty:
						price = float(hist['Close'].iloc[-1])
				except Exception:
					price = None
			# filter by market cap
			if mc is None:
				mc_val = None
			else:
				try:
					mc_val = float(mc)
				except Exception:
					mc_val = None
			# filter by price
			try:
				price_val = float(price) if price is not None else None
			except Exception:
				price_val = None

			if (
				mc_val is not None and mc_val < MAX_MARKET_CAP and
				price_val is not None and price_val >= MIN_PRICE
			):
				printed += 1
				print(f"{printed}. {sym}\t{r['exchange']}\tprice={price_val}\tmarket_cap={mc_val}")
		except Exception as e:
			# skip on error; do not count as printed
			pass
		if SLEEP_MS:
			time.sleep(SLEEP_MS / 1000.0)
	print(f"[INFO] Printed {printed} rows (market_cap < {int(MAX_MARKET_CAP)} and price >= {MIN_PRICE})", flush=True)


if __name__ == '__main__':
	try:
		main()
	except Exception as e:
		print(f"[ERROR] {e}", file=sys.stderr)
		sys.exit(1)


