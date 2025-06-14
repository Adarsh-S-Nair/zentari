import pandas as pd
import yfinance as yf

def load_bulk_scoring_data(start_dt, end_dt, benchmark="SPY"):
    sp500 = pd.read_csv("https://datahub.io/core/s-and-p-500-companies/r/constituents.csv")
    tickers = [t.replace('.', '-') for t in sp500['Symbol'].tolist()]
    if benchmark not in tickers:
        tickers.append(benchmark)

    print(f"[INFO] Bulk downloading OHLC data for {len(tickers)} tickers")
    all_data = yf.download(
        tickers=tickers,
        start=start_dt,
        end=end_dt + pd.Timedelta(days=1),
        group_by="ticker",
        auto_adjust=False,
        progress=False
    )

    result = {}
    for ticker in tickers:
        try:
            ticker_df = all_data[ticker] if isinstance(all_data.columns, pd.MultiIndex) else all_data
            df = ticker_df[["Adj Close"]].reset_index()
            df.columns = ["date", "adj_close"]
            df["ticker"] = ticker
            result[ticker] = df
        except Exception as e:
            print(f"[WARN] Skipping {ticker}: {e}")
    return result
