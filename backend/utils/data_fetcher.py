import pandas as pd
import yfinance as yf
from dateutil.relativedelta import relativedelta
import ast

class DataFetcher:
    def __init__(self):
        pass

    def get_sp500_tickers_as_of(self, target_date_str, csv_path="data/sp500_snapshot_history.csv"):
        df = pd.read_csv(csv_path)
        df["date"] = pd.to_datetime(df["date"])
        target_date = pd.to_datetime(target_date_str)

        df = df[df["date"] <= target_date]
        if df.empty:
            raise ValueError(f"No S&P 500 snapshot found on or before {target_date_str}")

        latest_snapshot = df.iloc[-1]
        try:
            tickers = ast.literal_eval(latest_snapshot["tickers"])
        except Exception as e:
            raise ValueError(f"Failed to parse tickers list: {e}")

        tickers = [t.strip().replace('.', '-') for t in tickers if t.strip()]
        return tickers

    def download_price_data_batch(self, tickers, start_str, end_str):
        print(f"\n📥 Downloading {len(tickers)} tickers from {start_str} to {end_str}...")
        try:
            data = yf.download(
                tickers=tickers,
                start=start_str,
                end=end_str,
                auto_adjust=False,
                progress=False,
                group_by='ticker',
                threads=True
            )
        except Exception as e:
            print(f"[ERROR] Batch download failed: {e}")
            return {}

        result = {}
        failed = []

        if isinstance(data.columns, pd.MultiIndex):
            for ticker in tickers:
                if (ticker, 'Adj Close') in data:
                    df = data[ticker][['Adj Close']].copy().reset_index()
                    df.columns = ['date', 'adj_close']
                    df["date"] = pd.to_datetime(df["date"])
                    result[ticker] = df
                else:
                    print(f"[WARN] No data returned for {ticker}")
                    failed.append(ticker)
        else:
            if 'Adj Close' in data:
                df = data[['Adj Close']].copy().reset_index()
                df.columns = ['date', 'adj_close']
                df["date"] = pd.to_datetime(df["date"])
                result[tickers[0]] = df
            else:
                print(f"[WARN] No data returned for {tickers[0]}")
                failed.append(tickers[0])

        truly_failed = []

        if failed:
            print(f"\n🔁 Retrying {len(failed)} failed tickers individually...")
            for ticker in failed:
                try:
                    df = yf.download(
                        tickers=ticker,
                        start=start_str,
                        end=end_str,
                        auto_adjust=False,
                        progress=False
                    )
                    if 'Adj Close' in df and not df.empty:
                        df = df[['Adj Close']].copy().reset_index()
                        df.columns = ['date', 'adj_close']
                        df["date"] = pd.to_datetime(df["date"])
                        result[ticker] = df
                        print(f"✅ Recovered {ticker}")
                    else:
                        print(f"🚫 {ticker}: still missing data after retry")
                        truly_failed.append(ticker)
                except Exception as e:
                    print(f"[ERROR] Retry failed for {ticker}: {e}")
                    truly_failed.append(ticker)

        if truly_failed:
            print(f"\n❌ Final failed downloads ({len(truly_failed)}): {truly_failed}")

        return result

    def load_bulk_scoring_data(self, start_dt, end_dt, benchmark="SPY", tickers=None):
        if tickers is None:
            raise ValueError("Must provide a list of tickers for loading historical price data.")

        start_str = pd.to_datetime(start_dt).strftime("%Y-%m-%d")
        end_str = pd.to_datetime(end_dt).strftime("%Y-%m-%d")

        tickers = list(set(t.replace('.', '-') for t in tickers))
        if benchmark not in tickers:
            tickers.append(benchmark)
        if "AAPL" not in tickers:
            tickers.append("AAPL")  # safety fallback

        print(f"✅ Preparing to download {len(tickers)} tickers (including benchmark: {benchmark})")

        return self.download_price_data_batch(tickers, start_str, end_str)

    def preload_price_data(self, start_date_str, end_date_str, lookback_months, skip_recent_months, benchmark, tickers):
        """
        Loads price data for all tickers (and benchmark) in the range:
        from (start_date - lookback_months - skip_recent_months) to end_date
        """
        start_dt = pd.to_datetime(start_date_str)
        end_dt = pd.to_datetime(end_date_str)
        lookback_start = start_dt - relativedelta(months=lookback_months + skip_recent_months)

        raw_data = self.load_bulk_scoring_data(lookback_start, end_dt, benchmark=benchmark, tickers=tickers)

        # Convert each DataFrame into indexed form
        price_data = {}
        for ticker, df in raw_data.items():
            df = df.copy()
            df.set_index("date", inplace=True)
            df.sort_index(inplace=True)
            price_data[ticker] = df

        print(f"✅ Finished downloading price data for {len(price_data)} tickers.\n")
        return price_data

    def preload_price_data_cointegration(self, start_date_str, end_date_str, lookback_months, benchmark, tickers):
        """
        Loads price data for cointegration strategies without skip_recent_months parameter.
        Data range: from (start_date - lookback_months) to end_date
        """
        start_dt = pd.to_datetime(start_date_str)
        end_dt = pd.to_datetime(end_date_str)
        lookback_start = start_dt - relativedelta(months=lookback_months)

        raw_data = self.load_bulk_scoring_data(lookback_start, end_dt, benchmark=benchmark, tickers=tickers)

        # Convert each DataFrame into indexed form
        price_data = {}
        for ticker, df in raw_data.items():
            df = df.copy()
            df.set_index("date", inplace=True)
            df.sort_index(inplace=True)
            price_data[ticker] = df

        print(f"✅ Finished downloading price data for {len(price_data)} tickers (cointegration).\n")
        return price_data


# Create a global instance for backward compatibility
data_fetcher = DataFetcher()

# Backward compatibility functions
def get_sp500_tickers_as_of(target_date_str, csv_path="data/sp500_snapshot_history.csv"):
    return data_fetcher.get_sp500_tickers_as_of(target_date_str, csv_path)

def download_price_data_batch(tickers, start_str, end_str):
    return data_fetcher.download_price_data_batch(tickers, start_str, end_str)

def load_bulk_scoring_data(start_dt, end_dt, benchmark="SPY", tickers=None):
    return data_fetcher.load_bulk_scoring_data(start_dt, end_dt, benchmark, tickers)

def preload_price_data(start_date_str, end_date_str, lookback_months, skip_recent_months, benchmark, tickers):
    return data_fetcher.preload_price_data(start_date_str, end_date_str, lookback_months, skip_recent_months, benchmark, tickers)

def preload_price_data_cointegration(start_date_str, end_date_str, lookback_months, benchmark, tickers):
    return data_fetcher.preload_price_data_cointegration(start_date_str, end_date_str, lookback_months, benchmark, tickers)
