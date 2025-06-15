import duckdb
import pandas as pd
import yfinance as yf
import os

def load_bulk_scoring_data(start_dt, end_dt, benchmark="SPY", db_path="data/sp500_prices.duckdb"):
    abs_path = os.path.abspath(db_path)
    start_str = pd.to_datetime(start_dt).strftime("%Y-%m-%d")
    end_str = pd.to_datetime(end_dt).strftime("%Y-%m-%d")

    con = duckdb.connect(abs_path)

    tickers_df = pd.read_csv("https://datahub.io/core/s-and-p-500-companies/r/constituents.csv")
    tickers = [t.replace('.', '-') for t in tickers_df['Symbol'].tolist()]
    if benchmark not in tickers:
        tickers.append(benchmark)
    if "AAPL" not in tickers:
        tickers.append("AAPL")

    tickers_str = ",".join(f"'{t}'" for t in tickers)
    query = f"""
        SELECT date, ticker, adj_close 
        FROM prices
        WHERE date BETWEEN '{start_str}' AND '{end_str}'
        AND ticker IN ({tickers_str})
        ORDER BY date
    """
    df = con.execute(query).fetchdf()

    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    result = {
        ticker: group[["date", "adj_close"]].sort_values("date").reset_index(drop=True)
        for ticker, group in df.groupby("ticker")
    }

    if benchmark not in result or result[benchmark].empty:
        print(f"[INFO] Benchmark data missing in DuckDB. Downloading {benchmark} from yfinance...")
        benchmark_df = yf.download(benchmark, start=start_str, end=end_str, auto_adjust=False)
        if not benchmark_df.empty:
            benchmark_df = benchmark_df.reset_index()[["Date", "Adj Close"]]
            benchmark_df.columns = ["date", "adj_close"]
            benchmark_df["date"] = benchmark_df["date"].dt.strftime("%Y-%m-%d")
            result[benchmark] = benchmark_df
        else:
            print(f"[WARN] Failed to download benchmark data for {benchmark} from yfinance.")

    return result
