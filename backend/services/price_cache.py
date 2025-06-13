import os
import pandas as pd
import yfinance as yf
from datetime import datetime

CACHE_DIR = "backend/data/price_cache"
os.makedirs(CACHE_DIR, exist_ok=True)

class PriceCache:
    def __init__(self):
        pass

    def _get_file_path(self, ticker):
        return os.path.join(CACHE_DIR, f"{ticker}.parquet")

    def get_cached_data(self, ticker, start_date, end_date):
        path = self._get_file_path(ticker)

        if not os.path.exists(path):
            return pd.DataFrame()

        df = pd.read_parquet(path)
        df["date"] = pd.to_datetime(df["date"])

        return df[(df["date"] >= pd.to_datetime(start_date)) & (df["date"] <= pd.to_datetime(end_date))]

    def cache_data(self, ticker, df):
        # Flatten MultiIndex columns if needed
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]

        if "Adj Close" not in df.columns:
            print(f"[ERROR] 'Adj Close' column missing for {ticker} after flattening")
            return

        df_to_save = df.copy().reset_index()[["Date", "Adj Close"]].rename(columns={
            "Date": "date",
            "Adj Close": "adj_close"
        })
        df_to_save["ticker"] = ticker

        print(f"[DEBUG] Saving {len(df_to_save)} records to Parquet for {ticker}")
        print(f"[DEBUG] First record to save: {df_to_save.iloc[0].to_dict()}")

        df_to_save.to_parquet(self._get_file_path(ticker), index=False)

    def get_or_fetch(self, ticker, start_date, end_date):
        cached = self.get_cached_data(ticker, start_date, end_date)

        if cached.empty:
            print(f"[INFO] No cache for {ticker}. Fetching from yfinance.")
            df = yf.download(ticker, start=start_date, end=end_date, progress=False, auto_adjust=False)

            print(f"[DEBUG] Raw columns from yfinance for {ticker}: {df.columns.tolist()}")

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
                print(f"[DEBUG] Flattened columns for {ticker}: {df.columns.tolist()}")

            if "Adj Close" in df.columns and not df.empty:
                try:
                    self.cache_data(ticker, df)
                    return self.get_cached_data(ticker, start_date, end_date)
                except Exception as e:
                    print(f"[ERROR] Failed to cache data for {ticker}: {e}")
                    return pd.DataFrame()
            else:
                print(f"[WARN] yfinance returned empty or invalid data for {ticker}")
                return pd.DataFrame()

        return cached
