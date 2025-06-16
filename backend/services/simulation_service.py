from models.schema import SimulationRequest
from utils.data_fetcher import load_bulk_scoring_data
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from math import isfinite
import time
import pandas as pd

class SimulationService:
    def __init__(self, params: SimulationRequest):
        self.params = params
        self.holdings = {}
        self.purchase_prices = {}
        self.portfolio_value = params.starting_value
        self.benchmark_value = params.starting_value
        self.benchmark_shares = 0
        self.monthly_returns = []
        self.daily_values = []
        self.daily_benchmark_values = []
        self.monthly_orders = []
        self.price_data = {}

        self.rebalance_on_gain_pct = 10
        self.rebalance_on_loss_pct = 5

    def validate_inputs(self):
        errors = []

        try:
            start_date = datetime.strptime(self.params.start_date, "%Y-%m-%d")
            end_date = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD.")

        if start_date > end_date:
            errors.append("Start date cannot be after end date.")
        if start_date.year < 2000:
            errors.append("Start date cannot be before the year 2000.")
        if not (1 <= self.params.lookback_months <= 12):
            errors.append("Lookback months must be between 1 and 12.")
        if not (0 < self.params.skip_recent_months < 3):
            errors.append("Skip recent months must be greater than 0 and less than 3.")
        if not (1 <= self.params.hold_months <= 3):
            errors.append("Hold months must be between 1 and 3.")
        if not (1 <= self.params.top_n <= 20):
            errors.append("Top N must be between 1 and 20.")
        if not (0 < self.params.starting_value <= 1_000_000_000):
            errors.append("Starting value must be greater than 0 and at most 1,000,000,000.")

        # Check if benchmark exists in price data (after preload)
        benchmark_data = self.price_data.get(self.params.benchmark)
        if benchmark_data is None or benchmark_data.empty:
            errors.append(f"Benchmark ticker '{self.params.benchmark}' is invalid or has no data.")

        if errors:
            raise ValueError("\n".join(errors))

    def preload_price_data(self):
        start_dt = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        lookback_start = start_dt - relativedelta(months=self.params.lookback_months + self.params.skip_recent_months)

        # Load all required price data (including benchmark) from DuckDB or fallback
        self.price_data = load_bulk_scoring_data(lookback_start, end_dt, benchmark=self.params.benchmark)

        # Ensure all DataFrames are properly indexed and sorted
        for ticker in self.price_data:
            df = self.price_data[ticker].copy()
            df["date"] = pd.to_datetime(df["date"])
            df.set_index("date", inplace=True)
            df.sort_index(inplace=True)  # Required for .asof() to work reliably
            self.price_data[ticker] = df

        # Set up benchmark shares using price on the official start date
        benchmark_df = self.price_data.get(self.params.benchmark)
        if benchmark_df is not None and not benchmark_df.empty:
            start_date_ts = pd.to_datetime(self.params.start_date)

            if start_date_ts in benchmark_df.index:
                start_price = benchmark_df.loc[start_date_ts]['adj_close']
            else:
                start_price = benchmark_df['adj_close'].asof(start_date_ts)

            self.benchmark_shares = self.params.starting_value / start_price
        else:
            print(f"[WARN] Benchmark data for {self.params.benchmark} missing!")

    def get_price(self, ticker, date_str):
        df = self.price_data.get(ticker)
        if df is None or df.empty:
            raise ValueError(f"No data for ticker {ticker}")
        target = pd.to_datetime(date_str)
        return df["adj_close"].asof(target)

    def get_top_momentum_stocks(self, rebalance_date):
        lookback_end = pd.to_datetime(rebalance_date - relativedelta(months=self.params.skip_recent_months))
        lookback_start = pd.to_datetime(lookback_end - relativedelta(months=self.params.lookback_months))
        momentum_scores = []

        for ticker, df in self.price_data.items():
            if ticker == self.params.benchmark:
                continue
            try:
                prices = df[(df.index >= lookback_start) & (df.index <= lookback_end)]["adj_close"]
                if len(prices) < 2:
                    continue
                momentum = (prices.iloc[-1] / prices.iloc[0]) - 1
                if isfinite(momentum):
                    momentum_scores.append((ticker, momentum))
            except Exception as e:
                print(f"[WARN] Error computing momentum for {ticker}: {e}")
                continue

        top = sorted(momentum_scores, key=lambda x: x[1], reverse=True)[:self.params.top_n]
        return top

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
                print(f"[WARN] Could not sell {ticker}: {e}")
        self.holdings.clear()
        self.purchase_prices.clear()
        self.portfolio_value = total

    def buy_stocks(self, date, top_tickers):
        if not top_tickers:
            print("[BUYING] No top tickers to buy.")
            return

        print("[BUYING] Allocating funds to top tickers:")
        allocation = self.portfolio_value / len(top_tickers)
        for ticker, _ in top_tickers:
            try:
                price = self.get_price(ticker, date.strftime("%Y-%m-%d"))
                shares = allocation / price
                self.holdings[ticker] = shares
                self.purchase_prices[ticker] = price
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
                print(f"[WARN] Could not buy {ticker}: {e}")

    def get_benchmark_value(self, date):
        try:
            price = self.get_price(self.params.benchmark, date.strftime("%Y-%m-%d"))
            value = round(self.benchmark_shares * price, 2)
            return value
        except Exception as e:
            print(f"[WARN] Failed to get benchmark value on {date}: {e}")
            return None

    def calculate_portfolio_value_on(self, date):
        total = 0.0
        for ticker, shares in self.holdings.items():
            try:
                price = self.get_price(ticker, date.strftime("%Y-%m-%d"))
                total += shares * price
            except:
                continue
        return round(total, 2)

    def should_rebalance_today(self, current, last_rebalance):
        if last_rebalance is None:
            return True

        value_now = self.calculate_portfolio_value_on(current)
        value_then = self.calculate_portfolio_value_on(last_rebalance)
        if value_then == 0:
            return False

        change_pct = ((value_now - value_then) / value_then) * 100

        if current >= last_rebalance + relativedelta(months=self.params.hold_months):
            print(f"[REBALANCE] Scheduled time-based rebalance reached.")
            return True
        if change_pct >= self.rebalance_on_gain_pct:
            print(f"[REBALANCE] Triggered by gain of {change_pct:.2f}% since last rebalance.")
            return True
        if change_pct <= -self.rebalance_on_loss_pct:
            print(f"[REBALANCE] Triggered by loss of {change_pct:.2f}% since last rebalance.")
            return True

        return False

    def rebalance_portfolio(self, date):
        print("\n" + "=" * 50)
        print(f"[REBALANCE] {date.strftime('%Y-%m-%d')}")
        print("=" * 50)
        self.monthly_orders = []

        if self.holdings:
            self.sell_portfolio(date)

        top_n = self.get_top_momentum_stocks(date)
        self.buy_stocks(date, top_n)

        self.monthly_returns.append({
            "date": date.strftime("%Y-%m-%d"),
            "portfolio_value": round(self.portfolio_value, 2),
            "benchmark_value": self.get_benchmark_value(date),
            "orders": self.monthly_orders.copy()
        })

    def simulate_over_time(self):
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        last_rebalance = None

        while current <= end:
            if self.should_rebalance_today(current, last_rebalance):
                self.rebalance_portfolio(current)
                last_rebalance = current

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
        self.validate_inputs()
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
