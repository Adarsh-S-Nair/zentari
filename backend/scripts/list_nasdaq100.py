import json
import time
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, Dict, List

import os
import requests
try:
    from dotenv import load_dotenv  # type: ignore
except Exception:
    load_dotenv = None


# -----------------------------
# Shared HTTP session & headers
# -----------------------------
SESSION = requests.Session()
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"
COMMON_HEADERS = {
    "User-Agent": UA,
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
}


def init_env() -> None:
    """Load environment variables from backend/.env and project .env if present."""
    if load_dotenv is None:
        return
    try:
        project_root = Path(__file__).resolve().parents[2]
        backend_env = project_root / "backend" / ".env"
        root_env = project_root / ".env"
        if backend_env.exists():
            load_dotenv(backend_env)
        if root_env.exists():
            load_dotenv(root_env)
    except Exception:
        pass


# -----------------------------
# NASDAQ-100 seed tickers
# -----------------------------
def get_nasdaq100_tickers_from_nasdaq() -> List[str]:
    """
    Pull the NASDAQ-100 tickers from nasdaq.com API.
    Returns [] on failure.
    """
    url = "https://api.nasdaq.com/api/quote/list-type/nasdaq100"
    try:
        r = SESSION.get(url, headers=COMMON_HEADERS, timeout=15)
        r.raise_for_status()
        js = r.json() or {}
        data = ((js.get("data") or {}).get("data") or {})
        rows = data.get("rows") or []
        tickers: List[str] = []
        for row in rows:
            sym = (row.get("symbol") or "").strip().upper()
            if sym:
                tickers.append(sym)
        if not tickers:
            # older shape fallback
            rows2 = (js.get("data") or {}).get("rows") or []
            for row in rows2:
                sym = (row.get("symbol") or "").strip().upper()
                if sym:
                    tickers.append(sym)
        # Deduplicate while preserving order
        seen = set()
        out = []
        for t in tickers:
            if t not in seen:
                out.append(t)
                seen.add(t)
        print(f"[UNIVERSE] NASDAQ-100 tickers fetched: {len(out)}")
        return out
    except Exception:
        print("[UNIVERSE] Failed to fetch NASDAQ-100 tickers")
        return []


# -----------------------------
# Yahoo Finance fetchers
# -----------------------------
def fetch_yahoo_quote_batch(symbols: List[str], tries: int = 2) -> Dict[str, dict]:
    """
    Batch quote fetch for price, market cap, and avg volume fields.
    Uses smaller batches and retries to reduce flakiness.
    """
    url = "https://query2.finance.yahoo.com/v7/finance/quote"
    fields = (
        "symbol,regularMarketPrice,marketCap,"
        "averageDailyVolume3Month,averageDailyVolume10Day"
    )
    out: Dict[str, dict] = {}
    for i in range(0, len(symbols), 20):  # smaller chunks are more reliable
        batch = symbols[i : i + 20]
        params = {"symbols": ",".join(batch), "fields": fields, "lang": "en-US", "region": "US"}
        for attempt in range(tries):
            try:
                r = SESSION.get(url, params=params, headers=COMMON_HEADERS, timeout=15)
                if not r.ok:
                    time.sleep(0.3 * (attempt + 1))
                    continue
                js = r.json() or {}
                for it in (js.get("quoteResponse") or {}).get("result") or []:
                    sym = (it.get("symbol") or "").upper()
                    if not sym:
                        continue
                    out[sym] = {
                        "p": it.get("regularMarketPrice"),
                        "mc": it.get("marketCap"),
                        "_av3": it.get("averageDailyVolume3Month"),
                        "_av10": it.get("averageDailyVolume10Day"),
                    }
                print(f"[YF] Quotes batch {i+1}-{i+len(batch)}: accumulated {len(out)}")
                break
            except Exception:
                time.sleep(0.4 * (attempt + 1))
        time.sleep(0.15)
    return out


def fetch_yahoo_chart(symbol: str) -> dict:
    """
    Fetch 2y daily chart for last close, volumes, and timestamps.
    More reliable for last valid close than the quote endpoint.
    """
    url = f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"range": "2y", "interval": "1d"}
    try:
        r = SESSION.get(url, params=params, headers=COMMON_HEADERS, timeout=15)
        if not r.ok:
            return {}
        js = r.json() or {}
        res = ((js.get("chart") or {}).get("result") or [None])[0]
        if not res:
            return {}
        ts = res.get("timestamp") or []
        ind = ((res.get("indicators") or {}).get("quote") or [None])[0] or {}
        closes = ind.get("close") or []
        vols = ind.get("volume") or []
        return {"t": ts, "c": closes, "v": vols}
    except Exception:
        return {}


def fetch_yahoo_profile_price(symbol: str) -> dict:
    """
    Consolidated fallback: sector (assetProfile.sector) and market cap.
    Tries price.marketCap.raw, then defaultKeyStatistics.sharesOutstanding.raw * price.
    Returns {} on failure.
    """
    url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}"
    params = {"modules": "assetProfile,price,defaultKeyStatistics"}
    try:
        r = SESSION.get(url, params=params, headers=COMMON_HEADERS, timeout=12)
        if not r.ok:
            return {}
        js = r.json() or {}
        res = ((js.get("quoteSummary") or {}).get("result") or [None])[0] or {}
        prof = res.get("assetProfile") or {}
        price_mod = res.get("price") or {}
        stats = res.get("defaultKeyStatistics") or {}
        sector = prof.get("sector")
        mc_raw = (price_mod.get("marketCap") or {}).get("raw")
        market_cap = float(mc_raw) if mc_raw is not None else None
        if market_cap is None:
            try:
                shares = (stats.get("sharesOutstanding") or {}).get("raw")
                price = (price_mod.get("regularMarketPrice") or {}).get("raw")
                if shares is not None and price is not None:
                    market_cap = float(shares) * float(price)
            except Exception:
                market_cap = None
        return {"sector": sector, "market_cap": market_cap}
    except Exception:
        return {}


# -----------------------------
# Finnhub fallback (sector, market cap)
# -----------------------------
def fetch_finnhub_profile(symbol: str) -> dict:
    """
    Use Finnhub profile2 to fetch industry/sector-like field and market cap.
    marketCapitalization from Finnhub is in USD billions. Convert to dollars.
    Returns {} on failure or if API key missing.
    """
    api_key = os.getenv("FINNHUB_API_KEY")
    if not api_key:
        return {}
    url = "https://finnhub.io/api/v1/stock/profile2"
    try:
        r = SESSION.get(url, params={"symbol": symbol, "token": api_key}, headers=COMMON_HEADERS, timeout=10)
        if not r.ok:
            return {}
        js = r.json() or {}
        mc_b = js.get("marketCapitalization")
        sector = js.get("finnhubIndustry") or js.get("gicsSector") or None
        mc = None
        try:
            if mc_b is not None:
                mc = float(mc_b) * 1e9
        except Exception:
            mc = None
        print(f"[FH] {symbol} sector:{sector or '-'} mc_b:{mc_b if mc_b is not None else '-'}")
        return {"sector": sector, "market_cap": mc}
    except Exception:
        return {}


# -----------------------------
# Feature computation
# -----------------------------
def compute_adv_momentum(chart: dict) -> Tuple[Optional[float], Optional[float], Optional[float], Optional[float]]:
    """
    Returns (adv, m6, m12, last_close)
      adv  = average dollar volume over last ~30 valid days
      m6   = 6-month return
      m12  = 12-month return
      last_close = most recent valid close from chart
    """
    t = chart.get("t") or []
    c = chart.get("c") or []
    v = chart.get("v") or []
    if not t or not c:
        return (None, None, None, None)

    # Last valid close
    last_close = None
    for x in reversed(c):
        if x is not None:
            last_close = float(x)
            break

    # Average dollar volume over last ~30 days
    dollars: List[float] = []
    for i in range(len(c) - 1, -1, -1):
        if c[i] is None or i >= len(v) or v[i] is None:
            continue
        try:
            dollars.append(float(c[i]) * float(v[i]))
            if len(dollars) >= 30:
                break
        except Exception:
            continue
    adv = float(sum(dollars) / len(dollars)) if dollars else None

    # Helper: price on/before target timestamp
    def price_on_or_before(target_ts: int) -> Optional[float]:
        lo, hi = 0, len(t) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if t[mid] < target_ts:
                lo = mid + 1
            else:
                hi = mid - 1
        idx = max(0, min(hi, len(t) - 1))
        for j in range(idx, -1, -1):
            if c[j] is not None:
                return float(c[j])
        return None

    try:
        now = datetime.now(timezone.utc).timestamp()
        ts6 = int(now - 182 * 24 * 3600)   # ~6 months
        ts12 = int(now - 365 * 24 * 3600)  # ~12 months
        p6 = price_on_or_before(ts6)
        p12 = price_on_or_before(ts12)
        m6 = (last_close / p6 - 1.0) if (last_close and p6) else None
        m12 = (last_close / p12 - 1.0) if (last_close and p12) else None
    except Exception:
        m6 = None
        m12 = None

    return (adv, m6, m12, last_close)


# -----------------------------
# Build the universe
# -----------------------------
def build_universe_preview(symbols: List[str]) -> List[dict]:
    preview: List[dict] = []

    # 1) Batch quotes for price, market cap, avg volumes
    quotes = fetch_yahoo_quote_batch(symbols)

    # 2) Per-symbol fallbacks + features
    for sym in symbols:
        q = quotes.get(sym, {}) or {}

        # Chart for last close + momentum + ADV
        chart = fetch_yahoo_chart(sym)
        adv, m6, m12, last_close = compute_adv_momentum(chart)

        # Price: prefer quote; fallback to chart close
        price = q.get("p")
        if price is None and last_close is not None:
            price = last_close

        # Market cap: prefer quote; fallback to price module
        mc = q.get("mc")
        prof = {}
        if mc is None:
            prof = fetch_yahoo_profile_price(sym)
            mc = prof.get("market_cap")

        # Sector: from consolidated profile fetch (or None)
        sector = prof.get("sector") if prof else None
        if sector is None:
            # Try once more only if we didn't already fetch profile in MC fallback
            prof2 = fetch_yahoo_profile_price(sym)
            sector = prof2.get("sector")

        # Finnhub fallback for sector/mc
        if (sector is None) or (mc is None):
            fh = fetch_finnhub_profile(sym)
            if sector is None and fh.get("sector"):
                sector = fh.get("sector")
            if mc is None and fh.get("market_cap") is not None:
                mc = fh.get("market_cap")

        # ADV: prefer computed; else compute from (quote_p * avg vol)
        if adv is None and price is not None:
            av = q.get("_av3") if q.get("_av3") is not None else q.get("_av10")
            if av is not None:
                try:
                    adv = float(price) * float(av)
                except Exception:
                    adv = None

        obj = {
            "t": sym,
            "p": float(price) if price is not None else None,
            "adv": float(adv) if adv is not None else None,
            "m6": float(m6) if m6 is not None else None,
            "m12": float(m12) if m12 is not None else None,
        }
        preview.append(obj)

        # polite pacing against Yahoo endpoints
        time.sleep(0.06)

        # Per-symbol logging
        def _f(v):
            return "ok" if v is not None else "-"
        print(
            f"[SYM] {sym} p:{_f(obj['p'])} adv:{_f(obj['adv'])} m6:{_f(obj['m6'])} m12:{_f(obj['m12'])}"
        )

    return preview


# -----------------------------
# Main
# -----------------------------
def main() -> None:
    # Initialize env so FINNHUB_API_KEY from backend/.env is loaded if present
    init_env()
    print(f"[ENV] FINNHUB_API_KEY present: {bool(os.getenv('FINNHUB_API_KEY'))}")
    symbols = get_nasdaq100_tickers_from_nasdaq()
    if not symbols:
        print("Failed to fetch NASDAQ-100 tickers from nasdaq.com API.")
        return

    print("[BUILD] Fetching quotes and charts to build universe preview...")
    preview = build_universe_preview(symbols)

    # Write to backend/data/universe_preview.json (two levels up from this file)
    out_path = Path(__file__).resolve().parents[2] / "backend" / "data" / "universe_preview.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Replace old file if exists
    try:
        if out_path.exists():
            out_path.unlink()
    except Exception:
        pass

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(preview, f, indent=2)

    # Final summary logging
    filled_p = sum(1 for x in preview if x.get("p") is not None)
    filled_mc = sum(1 for x in preview if x.get("mc") is not None)
    filled_adv = sum(1 for x in preview if x.get("adv") is not None)
    filled_s = sum(1 for x in preview if x.get("s") is not None)
    filled_m6 = sum(1 for x in preview if x.get("m6") is not None)
    filled_m12 = sum(1 for x in preview if x.get("m12") is not None)
    print(
        f"[DONE] Wrote {len(preview)} rows to {out_path}\n"
        f"       p:{filled_p} mc:{filled_mc} adv:{filled_adv} s:{filled_s} m6:{filled_m6} m12:{filled_m12}"
    )


if __name__ == "__main__":
    main()
