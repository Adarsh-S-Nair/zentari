import os
import pandas as pd
from datetime import datetime
from dateutil.rrule import rrule, MONTHLY

CACHE_DIR = "backend/data/price_cache"

class PriceCache:
    def __init__(self):
        os.makedirs(CACHE_DIR, exist_ok=True)

    def _get_chunk_path(self, ticker, year, month):
        return os.path.join(CACHE_DIR, ticker, f"{year:04d}-{month:02d}.parquet")

    def _ensure_ticker_dir(self, ticker):
        path = os.path.join(CACHE_DIR, ticker)
        os.makedirs(path, exist_ok=True)

    def _fetch_and_cache_chunk(self, ticker, year, month):
        # UNUSED NOW in batch flow, but still supports fallback if needed
        self._ensure_ticker_dir(ticker)
        start = pd.Timestamp(f"{year:04d}-{month:02d}-01")
        end = (start + pd.offsets.MonthEnd(1)).normalize()

        print(f"[FETCH] {ticker} {start.date()} to {end.date()}")
        df = yf.download(ticker, start=start, end=end + pd.Timedelta(days=1), progress=False, auto_adjust=False)
        if df.empty or "Adj Close" not in df.columns:
            print(f"[INFO] No data returned for {ticker} {year}-{month}")
            return None

        df = df[["Adj Close"]].reset_index().rename(columns={"Date": "date", "Adj Close": "adj_close"})
        df.columns = [col if not isinstance(col, tuple) else col[0] for col in df.columns]
        df["ticker"] = ticker
        df.to_parquet(self._get_chunk_path(ticker, year, month), index=False)
        return df

    def save_bulk_data(self, ticker, df):
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]

        df = df[["Adj Close"]].reset_index().rename(columns={"Date": "date", "Adj Close": "adj_close"})
        df["ticker"] = ticker
        df["date"] = pd.to_datetime(df["date"])

        self._ensure_ticker_dir(ticker)

        for dt in df["date"].dt.to_period("M").unique():
            month_start = dt.to_timestamp()
            month_end = (month_start + pd.offsets.MonthEnd(0))

            chunk = df[(df["date"] >= month_start) & (df["date"] <= month_end)]
            if chunk.empty:
                continue

            chunk_path = self._get_chunk_path(ticker, month_start.year, month_start.month)
            chunk.to_parquet(chunk_path, index=False)
            print(f"[CACHE] Saved {ticker} {month_start.strftime('%Y-%m')} ({len(chunk)} rows)")

    def get_or_fetch(self, ticker, start_date, end_date):
        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)

        all_chunks = []

        for dt in rrule(MONTHLY, dtstart=start, until=end):
            year, month = dt.year, dt.month
            path = self._get_chunk_path(ticker, year, month)

            if os.path.exists(path):
                df = pd.read_parquet(path)
                print(f"[CACHE] Found {ticker} {year}-{month} ({len(df)} rows)")
                all_chunks.append(df)

        if not all_chunks:
            print(f"[WARN] No cached data found for {ticker} from {start_date} to {end_date}")
            return pd.DataFrame()

        combined = pd.concat(all_chunks)
        combined["date"] = pd.to_datetime(combined["date"])
        return combined[(combined["date"] >= start) & (combined["date"] <= end)].sort_values("date")
