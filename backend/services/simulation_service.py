from backend.models.schema import SimulationRequest
from backend.utils.data_fetcher import download_bulk_momentum_prices
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from math import isfinite
import time
import pandas as pd

class SimulationService:
    def __init__(self, params: SimulationRequest):
        self.params = params
        self.price_cache = {}
        self.holdings = {}
        self.portfolio_value = params.starting_value
        self.benchmark_value = params.starting_value
        self.benchmark_shares = 0
        self.monthly_returns = []
        self.sell_counter = 0
        self.daily_values = []
        self.daily_benchmark_values = []

    def preload_price_data(self):
        start_dt = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        lookback_start = start_dt - relativedelta(
            months=self.params.lookback_months + self.params.skip_recent_months
        )

        print(f"[INFO] Preloading price data for momentum scoring")
        print(f"[INFO] Full price range needed: {lookback_start.date()} to {end_dt.date()}")

        self.price_cache = download_bulk_momentum_prices(
            lookback_start,
            end_dt,
            benchmark=self.params.benchmark
        )

        print(f"[INFO] Finished loading historical prices for {len(self.price_cache)} tickers")

        # Benchmark shares purchased at start
        benchmark_df = self.price_cache.get(self.params.benchmark)
        if benchmark_df is not None:
            start_price = benchmark_df.loc[self.params.start_date]['adj_close'] \
                if self.params.start_date in benchmark_df.index \
                else benchmark_df['adj_close'].asof(self.params.start_date)
            self.benchmark_shares = self.params.starting_value / start_price
        else:
            print(f"[WARN] Benchmark data for {self.params.benchmark} missing!")

    def get_top_momentum_stocks(self, rebalance_date: datetime):
        lookback_end = pd.to_datetime(rebalance_date - relativedelta(months=self.params.skip_recent_months))
        lookback_start = pd.to_datetime(lookback_end - relativedelta(months=self.params.lookback_months))

        print(f"[INFO] Calculating momentum scores for rebalance date: {rebalance_date.date()}")
        print(f"[INFO] Lookback range: {lookback_start.date()} to {lookback_end.date()}")

        momentum_scores = []

        for ticker, df in self.price_cache.items():
            if ticker == self.params.benchmark:
                continue  # skip benchmark from ranking

            try:
                price_slice = df.loc[lookback_start:lookback_end]['adj_close']
                if len(price_slice) < 2:
                    print(f"[SKIP] {ticker}: only {len(price_slice)} rows between {lookback_start.date()} and {lookback_end.date()}")
                    continue

                start_price = price_slice.iloc[0]
                end_price = price_slice.iloc[-1]
                momentum = (end_price / start_price) - 1

                if isfinite(momentum):
                    momentum_scores.append((ticker, momentum))
            except Exception as e:
                print(f"[WARN] Skipping {ticker}: {e}")
                continue

        top = sorted(momentum_scores, key=lambda x: x[1], reverse=True)[:self.params.top_n]
        summary = ", ".join([f"{ticker} ({round(score * 100, 2)}%)" for ticker, score in top])
        print(f"[INFO] Top {self.params.top_n} tickers on {rebalance_date.date()}: {summary}")

        return top

    def sell_portfolio(self, date: datetime):
        self.sell_counter += 1
        print(f"[DEBUG] sell_portfolio() called {self.sell_counter} time(s)")
        print(f"[INFO] Selling holdings on {date.date()}")
        total = 0.0

        for ticker, shares in self.holdings.items():
            try:
                df = self.price_cache.get(ticker)
                price = df.loc[date]['adj_close'] if date in df.index else df['adj_close'].asof(date)
                value = shares * price
                total += value
                print(f"  {ticker}: {shares:.4f} shares × ${price:.2f} = ${value:.2f}")
            except Exception as e:
                print(f"[WARN] Could not fetch price for {ticker} on {date.date()}: {e}")
                continue

        print(f"[INFO] Portfolio value after selling: ${total:.2f}")
        self.holdings.clear()
        self.portfolio_value = total

    def buy_stocks(self, date: datetime, top_tickers):
        if not top_tickers:
            print(f"[WARN] No top tickers to buy on {date.date()}, skipping buy.")
            return
        
        print(f"[INFO] Buying new holdings on {date.date()}")
        allocation = self.portfolio_value / len(top_tickers)

        new_holdings = {}
        for ticker, _ in top_tickers:
            try:
                df = self.price_cache.get(ticker)
                price = df.loc[date]['adj_close'] if date in df.index else df['adj_close'].asof(date)
                shares = allocation / price
                new_holdings[ticker] = shares
                print(f"  {ticker}: ${allocation:.2f} / ${price:.2f} = {shares:.4f} shares")
            except Exception as e:
                print(f"[WARN] Could not buy {ticker} on {date.date()}: {e}")
                continue

        self.holdings = new_holdings

    def get_benchmark_value(self, date: datetime):
        df = self.price_cache.get(self.params.benchmark)
        if df is None:
            return None
        price = df.loc[date]['adj_close'] if date in df.index else df['adj_close'].asof(date)
        return round(self.benchmark_shares * price, 2)
    

    def calculate_portfolio_value_on(self, date: datetime) -> float:
        total = 0.0
        for ticker, shares in self.holdings.items():
            df = self.price_cache.get(ticker)
            if df is None or df.empty:
                continue
            try:
                price = df.loc[date]['adj_close'] if date in df.index else df['adj_close'].asof(date)
                total += shares * price
            except Exception as e:
                print(f"[WARN] Could not calculate value for {ticker} on {date.date()}: {e}")
        return round(total, 2)
    
    def calculate_benchmark_value_on(self, date: datetime) -> float:
        df = self.price_cache.get(self.params.benchmark)
        if df is None or df.empty:
            return None
        try:
            price = df.loc[date]['adj_close'] if date in df.index else df['adj_close'].asof(date)
            return round(self.benchmark_shares * price, 2)
        except Exception as e:
            print(f"[WARN] Could not calculate benchmark on {date.date()}: {e}")
            return None

    def simulate_over_time(self):
        current_date = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end_date = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        while current_date < end_date:
            print(f"\n{'-' * 50}")
            print(f"[SIM] REBALANCE — {current_date.date()}")
            print(f"{'-' * 50}")
            if self.holdings:
                self.sell_portfolio(current_date)

            top_n = self.get_top_momentum_stocks(current_date)
            self.buy_stocks(current_date, top_n)

            benchmark_value = self.get_benchmark_value(current_date)

            self.monthly_returns.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "portfolio_value": round(self.portfolio_value, 2),
                "benchmark_value": benchmark_value,
                "tickers": [t[0] for t in top_n]
            })

            next_rebalance_date = current_date + relativedelta(months=self.params.hold_months)
            while current_date < next_rebalance_date and current_date < end_date:
                value = self.calculate_portfolio_value_on(current_date)
                benchmark_val = self.calculate_benchmark_value_on(current_date)

                self.daily_values.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "portfolio_value": value
                })

                self.daily_benchmark_values.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "benchmark_value": benchmark_val
                })
                current_date += timedelta(days=1)

        print(f"\n{'=' * 50}")
        print(f"[SIM] FINAL SELL — {end_date.date()}")
        print(f"{'=' * 50}")
        self.sell_portfolio(end_date)
        final_benchmark = self.get_benchmark_value(end_date)

        self.monthly_returns.append({
            "date": end_date.strftime("%Y-%m-%d"),
            "portfolio_value": round(self.portfolio_value, 2),
            "benchmark_value": final_benchmark,
            "tickers": []
        })

    def run(self):
        start_time = time.time()

        self.preload_price_data()
        self.simulate_over_time()

        duration_sec = round(time.time() - start_time, 2)
        final_benchmark = self.monthly_returns[-1]['benchmark_value'] if self.monthly_returns else None

        return {
            "start_date": self.params.start_date,
            "end_date": self.params.end_date,
            "benchmark": self.params.benchmark,
            "starting_value": self.params.starting_value,
            "lookback_months": self.params.lookback_months,
            "skip_recent_months": self.params.skip_recent_months,
            "top_n": self.params.top_n,
            "final_portfolio_value": round(self.portfolio_value, 2),
            "final_benchmark_value": final_benchmark,
            "total_return_pct": round(((self.portfolio_value - self.params.starting_value) / self.params.starting_value) * 100, 2),
            "monthly_returns": self.monthly_returns,
            "daily_values": self.daily_values,
            "daily_benchmark_values": self.daily_benchmark_values,
            "duration_sec": duration_sec
        }
