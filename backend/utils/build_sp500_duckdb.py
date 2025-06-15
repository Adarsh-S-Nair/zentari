import duckdb
import pandas as pd
import yfinance as yf
from datetime import datetime

# Load S&P 500 ticker symbols
sp500_url = "https://datahub.io/core/s-and-p-500-companies/r/constituents.csv"
sp500 = pd.read_csv(sp500_url)
tickers = [symbol.replace('.', '-') for symbol in sp500['Symbol'].tolist()]

# Define date range
start_date = "2000-01-01"
end_date = datetime.today().strftime('%Y-%m-%d')

# Download all data
all_data = []
for ticker in tickers:
    try:
        print(f"[INFO] Downloading {ticker}")
        df = yf.download(ticker, start=start_date, end=end_date, progress=False, auto_adjust=False)
        if df.empty:
            continue
        df = df.reset_index()
        df["ticker"] = ticker
        df = df[["Date", "ticker", "Open", "High", "Low", "Close", "Adj Close", "Volume"]]
        df.columns = ["date", "ticker", "open", "high", "low", "close", "adj_close", "volume"]
        all_data.append(df)
    except Exception as e:
        print(f"[WARN] Failed for {ticker}: {e}")

# Combine into single DataFrame
combined_df = pd.concat(all_data, ignore_index=True)

# Save to DuckDB
print("[INFO] Writing to DuckDB...")
con = duckdb.connect("sp500_prices.duckdb")
con.execute("DROP TABLE IF EXISTS prices")
con.execute("CREATE TABLE prices AS SELECT * FROM combined_df")

# Test a sample query
print("[INFO] Sample query (AAPL 2020):")
result = con.execute("""
    SELECT * FROM prices
    WHERE ticker = 'AAPL' AND date BETWEEN '2020-01-01' AND '2020-12-31'
    ORDER BY date
    LIMIT 5
""").fetchdf()
print(result)
