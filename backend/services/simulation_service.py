from backend.models.schema import SimulationRequest
from backend.utils.data_fetcher import load_bulk_scoring_data
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from math import isfinite
import time
import pandas as pd

class SimulationService:
    def __init__(self, params: SimulationRequest):
        self.params = params
        self.price_cache = []  # <-- List of {"name": ticker, "price_data": [{date, value}]}
        self.bulk_price_data = {}  # {ticker: DataFrame}
        self.used_tickers = set()
        self.holdings = {}
        self.purchase_prices = {}  # Store purchase prices for return calculations
        self.portfolio_value = params.starting_value
        self.benchmark_value = params.starting_value
        self.benchmark_shares = 0
        self.monthly_returns = []
        self.daily_values = []
        self.daily_benchmark_values = []
        self.monthly_orders = []

    def preload_price_data(self):
        self.download_bulk_data()
        self.identify_used_tickers()
        self.build_price_cache()

    def download_bulk_data(self):
        start_dt = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        lookback_start = start_dt - relativedelta(months=self.params.lookback_months + self.params.skip_recent_months)
        end_dt = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        print(f"[INFO] Preloading bulk price data for momentum scoring")
        self.bulk_price_data = load_bulk_scoring_data(lookback_start, end_dt, benchmark=self.params.benchmark)

    def identify_used_tickers(self):
        print(f"[INFO] Calculating rebalance dates to identify used tickers...")
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        while current < end:
            top_n = self.get_top_momentum_stocks(current)
            self.used_tickers.update([ticker for ticker, _ in top_n])
            current += relativedelta(months=self.params.hold_months)

        self.used_tickers.add(self.params.benchmark)

        print(f"[SUMMARY] Total unique tickers used: {len(self.used_tickers)}")
        print(f"[SUMMARY] Tickers: {sorted(self.used_tickers)}")

    def build_price_cache(self):
        print(f"[INFO] Building in-memory cache for used tickers...")
        self.price_cache = []

        for ticker in self.used_tickers:
            df = self.bulk_price_data.get(ticker)
            if df is None or df.empty:
                continue
            self.price_cache.append({
                "name": ticker,
                "price_data": [
                    {"date": row["date"], "value": row["adj_close"]}
                    for _, row in df.iterrows()
                ]
            })

        benchmark_df = self.bulk_price_data.get(self.params.benchmark)
        if benchmark_df is not None:
            benchmark_df = benchmark_df.set_index("date")
            start_price = benchmark_df.loc[self.params.start_date]['adj_close'] \
                if self.params.start_date in benchmark_df.index \
                else benchmark_df['adj_close'].asof(self.params.start_date)
            self.benchmark_shares = self.params.starting_value / start_price
        else:
            print(f"[WARN] Benchmark data for {self.params.benchmark} missing!")

    def get_top_momentum_stocks(self, rebalance_date: datetime):
        lookback_end = pd.to_datetime(rebalance_date - relativedelta(months=self.params.skip_recent_months))
        lookback_start = pd.to_datetime(lookback_end - relativedelta(months=self.params.lookback_months))

        momentum_scores = []

        for ticker, df in self.bulk_price_data.items():
            if ticker == self.params.benchmark:
                continue
            try:
                price_slice = df.loc[(df["date"] >= lookback_start) & (df["date"] <= lookback_end)]["adj_close"]
                if len(price_slice) < 2:
                    continue
                momentum = (price_slice.iloc[-1] / price_slice.iloc[0]) - 1
                if isfinite(momentum):
                    momentum_scores.append((ticker, momentum))
            except:
                continue

        top = sorted(momentum_scores, key=lambda x: x[1], reverse=True)[:self.params.top_n]
        return top

    def get_price(self, ticker, date_str):
        target_date = pd.to_datetime(date_str)

        for entry in self.price_cache:
            if entry["name"] == ticker:
                for price_point in reversed(entry["price_data"]):
                    price_date = pd.to_datetime(price_point["date"])
                    if price_date <= target_date:
                        return price_point["value"]
        raise ValueError(f"No price for {ticker} on or before {date_str}")

    def sell_portfolio(self, date):
        print("[SELLING] Closing all current positions:")
        total = 0.0
        for ticker, shares in self.holdings.items():
            try:
                price = self.get_price(ticker, date.strftime("%Y-%m-%d"))
                value = shares * price
                total += value
                cost_basis = self.purchase_prices.get(ticker, price)
                return_pct = ((price - cost_basis) / cost_basis) * 100 if cost_basis else 0
                self.monthly_orders.append({
                    "ticker": ticker,
                    "action": "Sell",
                    "price": round(price, 2),
                    "shares": round(shares, 4),
                    "amount": round(value, 2),
                    "return_pct": round(return_pct, 2)
                })
                print(f"  - {ticker}: {shares:.4f} shares @ ${price:.2f} = ${value:,.2f}")
            except Exception as e:
                print(f"[WARN] Could not sell {ticker} on {date.date()}: {e}")
        self.holdings.clear()
        self.purchase_prices.clear()
        self.portfolio_value = total

    def buy_stocks(self, date, top_tickers):
        if not top_tickers:
            print("[BUYING] No top tickers to buy.")
            return

        print("[BUYING] Allocating funds to top tickers:")
        allocation = self.portfolio_value / len(top_tickers)
        new_holdings = {}
        new_purchase_prices = {}

        for ticker, _ in top_tickers:
            try:
                price = self.get_price(ticker, date.strftime("%Y-%m-%d"))
                shares = allocation / price
                new_holdings[ticker] = shares
                new_purchase_prices[ticker] = price
                self.monthly_orders.append({
                    "ticker": ticker,
                    "action": "Buy",
                    "price": round(price, 2),
                    "shares": round(shares, 4),
                    "amount": round(allocation, 2),
                    "return_pct": None
                })
                print(f"  - {ticker}: ${allocation:,.2f} @ ${price:.2f} = {shares:.4f} shares")
            except Exception as e:
                print(f"[WARN] Could not buy {ticker} on {date.date()}: {e}")

        self.holdings = new_holdings
        self.purchase_prices = new_purchase_prices

    def calculate_portfolio_value_on(self, date):
        total = 0.0
        for ticker, shares in self.holdings.items():
            try:
                price = self.get_price(ticker, date.strftime("%Y-%m-%d"))
                total += shares * price
            except:
                continue
        return round(total, 2)

    def get_benchmark_value(self, date):
        try:
            price = self.get_price(self.params.benchmark, date.strftime("%Y-%m-%d"))
            return round(self.benchmark_shares * price, 2)
        except:
            return None

    def simulate_over_time(self):
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        while current < end:
            print("\n" + "=" * 50)
            print(f"[REBALANCE] {current.strftime('%Y-%m-%d')}")
            print("=" * 50)

            self.monthly_orders = []

            if self.holdings:
                self.sell_portfolio(current)

            top_n = self.get_top_momentum_stocks(current)
            self.buy_stocks(current, top_n)

            print(f"[SUMMARY] Portfolio Value After Rebalance: ${round(self.portfolio_value, 2):,.2f}")

            self.monthly_returns.append({
                "date": current.strftime("%Y-%m-%d"),
                "portfolio_value": round(self.portfolio_value, 2),
                "benchmark_value": self.get_benchmark_value(current),
                "orders": self.monthly_orders.copy()
            })

            next_rebalance = current + relativedelta(months=self.params.hold_months)
            while current < next_rebalance and current < end:
                self.daily_values.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "portfolio_value": self.calculate_portfolio_value_on(current)
                })
                self.daily_benchmark_values.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "benchmark_value": self.get_benchmark_value(current)
                })
                current += timedelta(days=1)

        self.sell_portfolio(end)
        self.monthly_returns.append({
            "date": end.strftime("%Y-%m-%d"),
            "portfolio_value": round(self.portfolio_value, 2),
            "benchmark_value": self.get_benchmark_value(end),
            "orders": self.monthly_orders.copy()
        })

    def run(self):
        start = time.time()
        self.preload_price_data()
        self.simulate_over_time()
        duration = round(time.time() - start, 2)
        final = self.monthly_returns[-1]["benchmark_value"] if self.monthly_returns else None

        return {
            "start_date": self.params.start_date,
            "end_date": self.params.end_date,
            "benchmark": self.params.benchmark,
            "starting_value": self.params.starting_value,
            "lookback_months": self.params.lookback_months,
            "skip_recent_months": self.params.skip_recent_months,
            "top_n": self.params.top_n,
            "final_portfolio_value": round(self.portfolio_value, 2),
            "final_benchmark_value": final,
            "total_return_pct": round(((self.portfolio_value - self.params.starting_value) / self.params.starting_value) * 100, 2),
            "monthly_returns": self.monthly_returns,
            "daily_values": self.daily_values,
            "daily_benchmark_values": self.daily_benchmark_values,
            "duration_sec": duration
        }
