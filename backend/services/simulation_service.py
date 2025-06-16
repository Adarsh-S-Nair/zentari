from models.schema import SimulationRequest
from services.portfolio import Portfolio
from utils.data_fetcher import preload_price_data
from utils.price_utils import get_price, get_benchmark_shares
from utils.momentum import get_top_momentum_stocks
from datetime import datetime, timedelta
import time
import pandas as pd

class SimulationService:
    def __init__(self, params: SimulationRequest):
        self.params = params
        self.price_data = preload_price_data(
            params.start_date,
            params.end_date,
            params.lookback_months,
            params.skip_recent_months,
            params.benchmark
        )

        self.portfolio = Portfolio(params.starting_value)
        self.benchmark_shares = get_benchmark_shares(self.price_data, params.benchmark, params.starting_value, params.start_date)

        self.monthly_returns = []
        self.daily_values = []
        self.daily_benchmark_values = []

    def rebalance(self, date):
        print(f"[REBALANCE] {date.strftime('%Y-%m-%d')}")
        sell_orders = self.portfolio.sell_all(lambda t, d: get_price(self.price_data, t, d), date.strftime("%Y-%m-%d"))

        top = get_top_momentum_stocks(
            self.price_data,
            self.params.benchmark,
            pd.to_datetime(date),
            self.params.lookback_months,
            self.params.skip_recent_months,
            self.params.top_n
        )
        print(f"[DEBUG] Top momentum tickers: {top}")

        buy_orders = self.portfolio.buy(top, lambda t, d: get_price(self.price_data, t, d), date.strftime("%Y-%m-%d"))

        self.monthly_returns.append({
            "date": date.strftime("%Y-%m-%d"),
            "portfolio_value": round(self.portfolio.value, 2),
            "benchmark_value": self.get_benchmark_value(date),
            "orders": sell_orders + buy_orders
        })

    def get_benchmark_value(self, date):
        try:
            price = get_price(self.price_data, self.params.benchmark, date.strftime("%Y-%m-%d"))
            return round(self.benchmark_shares * price, 2)
        except:
            return None

    def simulate_over_time(self):
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        last_rebalance = None

        while current <= end:
            if self.portfolio.should_rebalance(current, last_rebalance, lambda t, d: get_price(self.price_data, t, d)):
                self.rebalance(current)
                last_rebalance = current

            self.daily_values.append({
                "date": current.strftime("%Y-%m-%d"),
                "portfolio_value": self.portfolio.value_on(lambda t, d: get_price(self.price_data, t, d), current.strftime("%Y-%m-%d"))
            })
            self.daily_benchmark_values.append({
                "date": current.strftime("%Y-%m-%d"),
                "benchmark_value": self.get_benchmark_value(current)
            })

            current += timedelta(days=1)

        final_orders = self.portfolio.sell_all(lambda t, d: get_price(self.price_data, t, d), end.strftime("%Y-%m-%d"))
        self.monthly_returns.append({
            "date": end.strftime("%Y-%m-%d"),
            "portfolio_value": round(self.portfolio.value, 2),
            "benchmark_value": self.get_benchmark_value(end),
            "orders": final_orders
        })

    def run(self):
        start = time.time()
        self.simulate_over_time()
        duration = round(time.time() - start, 2)

        return {
            "start_date": self.params.start_date,
            "end_date": self.params.end_date,
            "benchmark": self.params.benchmark,
            "starting_value": self.params.starting_value,
            "lookback_months": self.params.lookback_months,
            "skip_recent_months": self.params.skip_recent_months,
            "top_n": self.params.top_n,
            "final_portfolio_value": round(self.portfolio.value, 2),
            "final_benchmark_value": self.monthly_returns[-1]["benchmark_value"],
            "total_return_pct": round(((self.portfolio.value - self.params.starting_value) / self.params.starting_value) * 100, 2),
            "monthly_returns": self.monthly_returns,
            "daily_values": self.daily_values,
            "daily_benchmark_values": self.daily_benchmark_values,
            "duration_sec": duration
        }
