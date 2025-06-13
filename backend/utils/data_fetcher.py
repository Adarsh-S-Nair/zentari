import pandas as pd
from backend.services.price_cache import PriceCache

price_cache = PriceCache()

def download_bulk_momentum_prices(start_dt, end_dt, benchmark="SPY"):
    sp500 = pd.read_csv("https://datahub.io/core/s-and-p-500-companies/r/constituents.csv")
    tickers = [t.replace('.', '-') for t in sp500['Symbol'].tolist()]
    if benchmark not in tickers:
        tickers.append(benchmark)

    result = {}
    for ticker in tickers:
        try:
            df = price_cache.get_or_fetch(ticker, start_dt.date(), end_dt.date())
            if not df.empty:
                df.set_index("date", inplace=True)
                result[ticker] = df
        except Exception as e:
            print(f"[ERROR] Failed {ticker}: {e}")
    return result