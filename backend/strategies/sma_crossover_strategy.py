import pandas as pd
from datetime import datetime, timedelta
from .base_strategy import BaseStrategy
from services.portfolio import Portfolio
from utils.data_fetcher import preload_price_data, get_sp500_tickers_as_of
from utils.price_utils import PriceUtils


class SMACrossoverStrategy(BaseStrategy):
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
            16, 0,  # load more history for SMA200
            self.params.benchmark, self.current_tickers
        )
        self.portfolio = Portfolio(self.params.starting_value, self.price_data)

    def check_signals(self, ticker, date_str):
      df = self.price_data.get(ticker)
      if df is None or df.empty:
          return None

      target_date = pd.to_datetime(date_str)
      df = df[df.index <= target_date].copy()

      if len(df) < 200:
          return None

      prices = df["adj_close"].ffill().dropna()
      if len(prices) < 200:
          return None

      sma50 = prices.rolling(window=50).mean()
      sma200 = prices.rolling(window=200).mean()

      prev_50 = sma50.iloc[-2]
      curr_50 = sma50.iloc[-1]
      prev_200 = sma200.iloc[-2]
      curr_200 = sma200.iloc[-1]

      if pd.isna(prev_50) or pd.isna(curr_50) or pd.isna(prev_200) or pd.isna(curr_200):
          return None

      # Golden cross
      if prev_50 < prev_200 and curr_50 >= curr_200:
          return "buy"

      # Death cross
      if prev_50 > prev_200 and curr_50 <= curr_200:
          return "sell"

      return None
    
    def rebalance(self, date_str):
        self.current_tickers, self.loaded_dates, self.price_data = PriceUtils.update_universe(
            self.current_tickers,
            self.loaded_dates,
            self.price_data,
            self.portfolio,
            date_str,
            self.params.end_date,
            lookback_months=16,
            skip_recent_months=0
        )

        print(f"\n📆 \033[1mRebalancing on {date_str}\033[0m")
        orders = []

        buy_signals = []
        sell_signals = []

        for ticker in self.current_tickers:
            signal = self.check_signals(ticker, date_str)
            if signal == "buy":
                buy_signals.append(ticker)
            elif signal == "sell":
                sell_signals.append(ticker)

        for ticker in sell_signals:
            if ticker in self.portfolio.holdings:
                o = self.portfolio.sell(ticker, date_str)
                if o:
                    print(f"📤 SELL executed: {ticker}")
                    orders.append(o)

        if buy_signals and self.portfolio.cash > 0:
            alloc = self.portfolio.cash / len(buy_signals)
            for ticker in buy_signals:
                if ticker not in self.portfolio.holdings:
                    o = self.portfolio.buy(ticker, alloc, date_str)
                    if o:
                        print(f"📥 BUY executed: {ticker} for ${alloc:.2f}")
                        orders.append(o)
        else:
            if not buy_signals:
                print("⚠️ No buy signals to execute.")
            if self.portfolio.cash <= 0:
                print("⚠️ No cash available to buy.")

        return orders

    async def run(self, websocket, get_benchmark_value, send_daily):
        await websocket.send_text('{"type":"status","payload":"Starting Simulation..."}')
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")
        daily_values, daily_benchmarks = [], []

        rebalance_interval = 7
        next_rebalance_date = current
        while current <= end:
            try:
                date_str = current.strftime("%Y-%m-%d")
                await websocket.send_text(f'{{"type":"status","payload":"Rebalancing on {date_str}"}}')
                if current >= next_rebalance_date:
                    self.rebalance(date_str)
                    next_rebalance_date += timedelta(days=rebalance_interval)

                value = self.portfolio.value_on(date_str)
                benchmark = await get_benchmark_value(current)
                await send_daily(current, value, benchmark)

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
