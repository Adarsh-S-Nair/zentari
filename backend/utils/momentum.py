from math import isfinite
import pandas as pd

def get_top_momentum_stocks(price_data, benchmark, rebalance_date, lookback_months, skip_recent_months, top_n):
    lookback_end = rebalance_date - pd.DateOffset(months=skip_recent_months)
    lookback_start = lookback_end - pd.DateOffset(months=lookback_months)
    scores = []

    for ticker, df in price_data.items():
        if ticker == benchmark:
            continue
        try:
            prices = df[(df.index >= lookback_start) & (df.index <= lookback_end)]["adj_close"]
            if len(prices) < 2:
                continue
            momentum = (prices.iloc[-1] / prices.iloc[0]) - 1
            if isfinite(momentum):
                scores.append((ticker, momentum))
        except:
            continue

    return sorted(scores, key=lambda x: x[1], reverse=True)[:top_n]
