import pandas as pd

def get_price(price_data, ticker, date_str):
    df = price_data.get(ticker)
    if df is None or df.empty:
        raise ValueError(f"No data for ticker {ticker}")
    target = pd.to_datetime(date_str)
    price = df["adj_close"].asof(target)
    if pd.isna(price):
        raise ValueError(f"No available price for {ticker} as of {date_str}")
    return price

def get_benchmark_shares(price_data, benchmark, starting_value, start_date_str):
    df = price_data.get(benchmark)
    if df is None or df.empty:
        raise ValueError(f"No benchmark data for {benchmark}")
    start_ts = pd.to_datetime(start_date_str)
    price = df["adj_close"].asof(start_ts)
    return starting_value / price
