from models.schema import SimulationRequest
from utils.price_utils import PriceUtils
from strategies.momentum_strategy import MomentumStrategy
from strategies.sma_crossover_strategy import SMACrossoverStrategy
from strategies.cointegration_strategy import CointegrationStrategy
from strategies.leveraged_etf_strategy import LeveragedETFSwingStrategy
import json
import pandas as pd

STRATEGY_MAP = {
    "momentum": MomentumStrategy,
    "sma_crossover": SMACrossoverStrategy,
    "cointegration": CointegrationStrategy,
    "leveraged_etf": LeveragedETFSwingStrategy
}

class WebSocketSimulationService:
    def __init__(self, websocket, params: SimulationRequest):
        self.websocket = websocket
        self.params = params
        self.strategy = None
        self.benchmark_shares = None

    async def send(self, event_type, payload):
        await self.websocket.send_text(json.dumps({"type": event_type, "payload": payload}))

    async def get_benchmark_value(self, date):
        try:
            df = self.strategy.price_data[self.params.benchmark]
            ts = pd.to_datetime(date)
            price = df["adj_close"].asof(ts)
            if pd.isna(price):
                return None
            return round(self.benchmark_shares * price, 2)
        except Exception as e:
            print(f"[ERROR] Failed to get benchmark value on {date}: {e}")
            return None

    async def run(self):
        # Start the timer
        import time
        start_time = time.time()
        
        # Step 1: Initialize the selected strategy class
        strategy_cls = STRATEGY_MAP.get(self.params.strategy)
        if not strategy_cls:
            await self.send("error", f"Unknown strategy: {self.params.strategy}")
            await self.websocket.close()
            return

        self.strategy = strategy_cls(self.params)
        await self.strategy.initialize()

        # Step 2: Calculate benchmark shares based on initial price data
        self.benchmark_shares = PriceUtils.get_benchmark_shares(
            self.strategy.price_data,
            self.params.benchmark,
            self.params.starting_value,
            self.params.start_date
        )

        async def send_daily(date, portfolio_value, benchmark_value):
            await self.send("daily", {
                "date": date.strftime("%Y-%m-%d"),
                "portfolio_value": portfolio_value,
                "benchmark_value": benchmark_value
            })

        result = await self.strategy.run(self.websocket, self.get_benchmark_value, send_daily)

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
            "trade_history_by_date": self.strategy.portfolio.trade_history_by_date,
            "daily_values": result["daily_values"],
            "daily_benchmark_values": result["daily_benchmark_values"],
            "all_trades": result.get("all_trades", []),
            "duration_sec": round(time.time() - start_time, 2)
        })

        await self.websocket.close()
