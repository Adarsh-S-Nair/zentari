from models.schema import SimulationRequest
from services.portfolio import Portfolio
from utils.data_fetcher import preload_price_data
from utils.price_utils import get_price, get_benchmark_shares
from utils.momentum import get_top_momentum_stocks
from datetime import datetime, timedelta
import pandas as pd
import time
import json


class WebSocketSimulationService:
    def __init__(self, websocket, params: SimulationRequest):
        self.websocket = websocket
        self.params = params
        self.portfolio = Portfolio(params.starting_value)
        self.price_data = preload_price_data(
            params.start_date,
            params.end_date,
            params.lookback_months,
            params.skip_recent_months,
            params.benchmark
        )
        self.benchmark_shares = get_benchmark_shares(
            self.price_data, params.benchmark, params.starting_value, params.start_date
        )

        self.daily_values = []
        self.daily_benchmark_values = []
        self.monthly_returns = []

    async def send(self, event_type, payload):
        await self.websocket.send_text(json.dumps({"type": event_type, "payload": payload}))

    async def get_benchmark_value(self, date):
        try:
            price = get_price(self.price_data, self.params.benchmark, date.strftime("%Y-%m-%d"))
            return round(self.benchmark_shares * price, 2)
        except:
            return None

    async def rebalance(self, date):
        await self.send("status", f"Rebalancing on {date.strftime('%Y-%m-%d')}")

        sell_orders = self.portfolio.sell_all(
            lambda t, d: get_price(self.price_data, t, d), date.strftime("%Y-%m-%d")
        )

        top = get_top_momentum_stocks(
            self.price_data,
            self.params.benchmark,
            pd.to_datetime(date),
            self.params.lookback_months,
            self.params.skip_recent_months,
            self.params.top_n
        )

        buy_orders = self.portfolio.buy(
            top, lambda t, d: get_price(self.price_data, t, d), date.strftime("%Y-%m-%d")
        )

        current_value = self.portfolio.value_on(
            lambda t, d: get_price(self.price_data, t, d), date.strftime("%Y-%m-%d")
        )

        benchmark_value = await self.get_benchmark_value(date)

        self.monthly_returns.append({
            "date": date.strftime("%Y-%m-%d"),
            "portfolio_value": current_value,
            "benchmark_value": benchmark_value,
            "orders": sell_orders + buy_orders
        })

        await self.send("rebalance", {
            "date": date.strftime("%Y-%m-%d"),
            "portfolio_value": current_value,
            "benchmark_value": benchmark_value,
            "orders": sell_orders + buy_orders
        })

    async def run(self):
        await self.send("status", "Loading price data...")
        start_time = time.time()

        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        last_rebalance = None

        await self.send("status", f"Starting simulation from {self.params.start_date} to {self.params.end_date}")

        while current <= end:
            try:
                if self.portfolio.should_rebalance(current, last_rebalance, lambda t, d: get_price(self.price_data, t, d)):
                    await self.rebalance(current)
                    last_rebalance = current

                portfolio_value = self.portfolio.value_on(
                    lambda t, d: get_price(self.price_data, t, d), current.strftime("%Y-%m-%d")
                )
                benchmark_value = await self.get_benchmark_value(current)

                self.daily_values.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "portfolio_value": portfolio_value
                })
                self.daily_benchmark_values.append({
                    "date": current.strftime("%Y-%m-%d"),
                    "benchmark_value": benchmark_value
                })

                await self.send("daily", {
                    "date": current.strftime("%Y-%m-%d"),
                    "portfolio_value": portfolio_value,
                    "benchmark_value": benchmark_value
                })

                current += timedelta(days=1)

            except Exception as e:
                await self.send("error", f"Error on {current.strftime('%Y-%m-%d')}: {str(e)}")
                break

        # Final sell
        final_orders = self.portfolio.sell_all(
            lambda t, d: get_price(self.price_data, t, d), end.strftime("%Y-%m-%d")
        )
        final_portfolio_value = round(self.portfolio.value, 2)
        final_benchmark_value = await self.get_benchmark_value(end)
        duration = round(time.time() - start_time, 2)

        self.monthly_returns.append({
            "date": end.strftime("%Y-%m-%d"),
            "portfolio_value": final_portfolio_value,
            "benchmark_value": final_benchmark_value,
            "orders": final_orders
        })

        await self.send("done", {
            "start_date": self.params.start_date,
            "end_date": self.params.end_date,
            "benchmark": self.params.benchmark,
            "starting_value": self.params.starting_value,
            "lookback_months": self.params.lookback_months,
            "skip_recent_months": self.params.skip_recent_months,
            "top_n": self.params.top_n,
            "final_portfolio_value": final_portfolio_value,
            "final_benchmark_value": final_benchmark_value,
            "total_return_pct": round(((final_portfolio_value - self.params.starting_value) / self.params.starting_value) * 100, 2),
            "monthly_returns": self.monthly_returns,
            "daily_values": self.daily_values,
            "daily_benchmark_values": self.daily_benchmark_values,
            "duration_sec": duration
        })

        await self.websocket.close()
