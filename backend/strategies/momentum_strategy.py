import pandas as pd
from math import isfinite
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from .base_strategy import BaseStrategy
from services.portfolio import Portfolio
from utils.data_fetcher import preload_price_data, get_sp500_tickers_as_of
from utils.price_utils import PriceUtils
import numpy as np

class MomentumStrategy(BaseStrategy):
    def __init__(self, params):
        self.params = params
        self.price_data = {}
        self.portfolio = None
        self.current_tickers = set()
        self.loaded_dates = set()

    async def initialize(self):
        start_date = self.params.start_date
        self.current_tickers = set(get_sp500_tickers_as_of(start_date))
        self.price_data = preload_price_data(
            start_date, self.params.end_date,
            self.params.lookback_months, self.params.skip_recent_months,
            self.params.benchmark, self.current_tickers
        )
        self.portfolio = Portfolio(self.params.starting_value, self.price_data)

    def should_rebalance(self, date, last_date):
        if not last_date:
            return True
        now = self.portfolio.value_on(date.strftime("%Y-%m-%d"))
        then = self.portfolio.value_on(last_date.strftime("%Y-%m-%d"))
        if then == 0:
            return False
        change = ((now - then) / then) * 100
        return (
            date >= last_date + relativedelta(months=1) or
            change >= self.params.tp_threshold or
            change <= -self.params.sl_threshold
        )

    def calculate_momentum_score(self, prices: pd.Series):
        if len(prices) < 2:
            return None
        start_price = prices.iloc[0]
        end_price = prices.iloc[-1]
        if start_price == 0:
            return None
        return (end_price - start_price) / start_price

    def get_top_momentum_stocks(self, date):
        end = date - pd.DateOffset(months=self.params.skip_recent_months)
        start = end - pd.DateOffset(months=self.params.lookback_months)
        scores = []

        for t, df in self.price_data.items():
            if t == self.params.benchmark:
                continue
            try:
                prices = df[(df.index >= start) & (df.index <= end)]["adj_close"].dropna()
                score = self.calculate_momentum_score(prices)
                if score is not None and np.isfinite(score):
                    scores.append((t, score))
            except:
                continue

        return sorted(scores, key=lambda x: x[1], reverse=True)[:self.params.top_n]

    def rebalance(self, date_str):
        if date_str != self.params.start_date:
            self.current_tickers, self.loaded_dates, self.price_data = PriceUtils.update_universe(
                self.current_tickers,
                self.loaded_dates,
                self.price_data,
                self.portfolio,
                date_str,
                self.params.end_date,
                self.params.lookback_months,
                self.params.skip_recent_months
            )

        print(f"\n📆 \033[1mRebalancing on {date_str}\033[0m")
        top_n = self.get_top_momentum_stocks(pd.to_datetime(date_str))
        top_set = {t for t, _ in top_n}
        current = set(self.portfolio.holdings.keys())
        orders = []

        for t in current - top_set:
            o = self.portfolio.sell(t, date_str)
            if o: orders.append(o)

        if top_set - current:
            alloc = self.portfolio.cash / len(top_set - current)
            for t in top_set - current:
                o = self.portfolio.buy(t, alloc, date_str)
                if o: orders.append(o)

        return orders

    async def run(self, websocket, get_benchmark_value, send_daily):
        await websocket.send_text('{"type":"status","payload":"Starting Simulation..."}')
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        last_rebalance = None
        daily_values, daily_benchmarks = [], []

        while current <= end:
            try:
                date_str = current.strftime("%Y-%m-%d")
                if self.should_rebalance(current, last_rebalance):
                    await websocket.send_text(f'{{"type":"status","payload":"Rebalancing on {date_str}"}}')
                    self.rebalance(date_str)
                    last_rebalance = current

                value = self.portfolio.value_on(date_str)
                benchmark = await get_benchmark_value(current)
                await send_daily(current, value, benchmark)

                if self.portfolio.cash > 0:
                    top_n = self.get_top_momentum_stocks(current)
                    non_held = [t for t, _ in top_n if t not in self.portfolio.holdings]
                    if non_held:
                        alloc = self.portfolio.cash / len(non_held)
                        for t in non_held:
                            self.portfolio.buy(t, alloc, date_str)

                daily_values.append({"date": date_str, "portfolio_value": value})
                daily_benchmarks.append({"date": date_str, "benchmark_value": benchmark})
                current += timedelta(days=1)

            except Exception as e:
                import traceback
                traceback.print_exc()
                await websocket.send_text(f'{{"type":"error","payload":"Error on {date_str}: {str(e)}"}}')
                break

        final_orders = [self.portfolio.sell(t, end.strftime("%Y-%m-%d")) for t in list(self.portfolio.holdings.keys())]
        return {
            "final_orders": [o for o in final_orders if o],
            "final_value": self.portfolio.cash,
            "daily_values": daily_values,
            "daily_benchmark_values": daily_benchmarks
        }
