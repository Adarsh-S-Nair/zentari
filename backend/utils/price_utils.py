import pandas as pd
from utils.data_fetcher import DataFetcher

class PriceUtils:
    _data_fetcher = DataFetcher()

    @staticmethod
    def get_price(price_data, ticker, date_str):
        df = price_data.get(ticker)
        if df is None or df.empty:
            raise ValueError(f"No data for ticker {ticker}")
        target = pd.to_datetime(date_str)
        price = df["adj_close"].asof(target)
        if pd.isna(price):
            raise ValueError(f"No available price for {ticker} as of {date_str}")
        return price

    @staticmethod
    def get_benchmark_shares(price_data, benchmark, starting_value, start_date_str):
        df = price_data.get(benchmark)
        if df is None or df.empty:
            raise ValueError(f"No benchmark data for {benchmark}")
        start_ts = pd.to_datetime(start_date_str)
        price = df["adj_close"].asof(start_ts)
        return starting_value / price

    @staticmethod
    def update_universe(current_tickers, loaded_dates, price_data, portfolio, date_str, end_date_str, lookback_months, skip_recent_months):
        if date_str in loaded_dates:
            return current_tickers, loaded_dates, price_data

        new = set(PriceUtils._data_fetcher.get_sp500_tickers_as_of(date_str))
        removed = current_tickers - new
        added = new - current_tickers

        if added or removed:
            print(f"\n📊 S&P 500 Update on {date_str}")
            if removed:
                print(f"➖ Removed: {sorted(removed)}")
            if added:
                print(f"➕ Added: {sorted(added)}")

        for t in removed:
            price_data.pop(t, None)

        if added:
            lookback_start = pd.to_datetime(date_str) - pd.DateOffset(
                months=lookback_months + skip_recent_months
            )
            new_data = PriceUtils._data_fetcher.download_price_data_batch(
                list(added), lookback_start.strftime("%Y-%m-%d"), end_date_str
            )
            for t, df in new_data.items():
                df = df.copy()
                df.set_index("date", inplace=True)
                df.sort_index(inplace=True)
                price_data[t] = df

        current_tickers = new
        loaded_dates.add(date_str)
        portfolio.update_price_data(price_data)

        return current_tickers, loaded_dates, price_data
