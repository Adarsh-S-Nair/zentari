from models.schema import SimulationRequest
from services.portfolio import Portfolio
from utils.data_fetcher import preload_price_data
from utils.price_utils import get_price, get_benchmark_shares
from strategies.momentum_strategy import MomentumStrategy
import json
from datetime import datetime
import pandas as pd


class WebSocketSimulationService:
    def __init__(self, websocket, params: SimulationRequest):
        self.websocket = websocket
        self.params = params
        self.price_data = preload_price_data(
            params.start_date,
            params.end_date,
            params.lookback_months,
            params.skip_recent_months,
            params.benchmark
        )
        if params.benchmark not in self.price_data:
            raise ValueError(f"Benchmark ticker '{params.benchmark}' not found in price data.")
        self.benchmark_shares = get_benchmark_shares(
            self.price_data, params.benchmark, params.starting_value, params.start_date
        )
        self.portfolio = Portfolio(params.starting_value, self.price_data)

    async def send(self, event_type, payload):
        await self.websocket.send_text(json.dumps({"type": event_type, "payload": payload}))

    async def get_benchmark_value(self, date):
        try:
            df = self.price_data[self.params.benchmark]
            ts = pd.to_datetime(date)
            price = df["adj_close"].asof(ts)
            if pd.isna(price):
                return None
            return round(self.benchmark_shares * price, 2)
        except Exception as e:
            print(f"[ERROR] Failed to get benchmark value on {date}: {e}")
            return None
    
    async def run(self):
        strategy = MomentumStrategy(self.portfolio, self.price_data, self.params)

        async def send_daily(date, portfolio_value, benchmark_value):
            await self.send("daily", {
                "date": date.strftime("%Y-%m-%d"),
                "portfolio_value": portfolio_value,
                "benchmark_value": benchmark_value
            })

        result = await strategy.run(self.websocket, self.get_benchmark_value, send_daily)

        await self.send("done", {
            "start_date": self.params.start_date,
            "end_date": self.params.end_date,
            "benchmark": self.params.benchmark,
            "starting_value": self.params.starting_value,
            "lookback_months": self.params.lookback_months,
            "skip_recent_months": self.params.skip_recent_months,
            "top_n": self.params.top_n,
            "final_portfolio_value": round(result["final_value"], 2),
            "final_benchmark_value": await self.get_benchmark_value(
                result["daily_values"][-1]["date"] if result["daily_values"] else self.params.end_date
            ),
            "total_return_pct": round(((result["final_value"] - self.params.starting_value) / self.params.starting_value) * 100, 2),
            "trade_history_by_date": self.portfolio.trade_history_by_date,
            "daily_values": result["daily_values"],
            "daily_benchmark_values": result["daily_benchmark_values"],
            "duration_sec": result["duration"]
        })

        await self.websocket.close()
