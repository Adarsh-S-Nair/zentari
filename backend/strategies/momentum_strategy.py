import pandas as pd
from math import isfinite
from dateutil.relativedelta import relativedelta
from .base_strategy import BaseStrategy


class MomentumStrategy(BaseStrategy):
    def should_rebalance(self, current_date, last_rebalance_date):
      if last_rebalance_date is None:
          return True
      value_now = self.portfolio.value_on(current_date.strftime("%Y-%m-%d"))
      value_then = self.portfolio.value_on(last_rebalance_date.strftime("%Y-%m-%d"))
      if value_then == 0:
          return False
      change_pct = ((value_now - value_then) / value_then) * 100
      return (
          current_date >= last_rebalance_date + relativedelta(months=1)
          or change_pct >= self.portfolio.rebalance_on_gain_pct
          or change_pct <= -self.portfolio.rebalance_on_loss_pct
      )
    
    def rebalance(self, date_str):
      orders = []
      top_n_tickers = self.get_top_momentum_stocks(pd.to_datetime(date_str))
      top_ticker_set = {ticker for ticker, _ in top_n_tickers}
      current_tickers = set(self.portfolio.holdings.keys())

      to_sell = current_tickers - top_ticker_set
      to_buy = top_ticker_set - current_tickers

      # Sell dropped tickers
      for ticker in to_sell:
          order = self.portfolio.sell(ticker, date_str)
          if order:
              orders.append(order)

      # Equal allocation of cash
      if to_buy:
          allocation = self.portfolio.value / len(to_buy)
          for ticker in to_buy:
              order = self.portfolio.buy(ticker, allocation, date_str)
              if order:
                  orders.append(order)

      return orders

    def get_top_momentum_stocks(self, rebalance_date):
      lookback_end = rebalance_date - pd.DateOffset(months=self.params.skip_recent_months)
      lookback_start = lookback_end - pd.DateOffset(months=self.params.lookback_months)
      scores = []

      for ticker, df in self.price_data.items():
          if ticker == self.params.benchmark:
              continue
          try:
              prices = df[(df.index >= lookback_start) & (df.index <= lookback_end)]["adj_close"].dropna()
              if len(prices) < 2:
                  continue
              momentum = (prices.iloc[-1] / prices.iloc[0]) - 1
              if isfinite(momentum):
                  scores.append((ticker, momentum))
          except:
              continue

      return sorted(scores, key=lambda x: x[1], reverse=True)[:self.params.top_n]

    def rebalance(self, date_str):
      orders = []
      top_n_tickers = self.get_top_momentum_stocks(pd.to_datetime(date_str))
      top_ticker_set = {ticker for ticker, _ in top_n_tickers}
      current_tickers = set(self.portfolio.holdings.keys())

      to_sell = current_tickers - top_ticker_set
      to_buy = top_ticker_set - current_tickers

      # Sell dropped tickers
      for ticker in to_sell:
          order = self.portfolio.sell(ticker, date_str)
          if order:
              orders.append(order)

      # Equal allocation of cash
      if to_buy:
          allocation = self.portfolio.value / len(to_buy)
          for ticker in to_buy:
              order = self.portfolio.buy(ticker, allocation, date_str)
              if order:
                  orders.append(order)

      return orders

    async def run(self, websocket, get_benchmark_value, send_daily):
      from datetime import datetime, timedelta
      import time

      await websocket.send_text('{"type": "status", "payload": "Starting Simulation..."}')
      start_time = time.time()

      current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
      end = datetime.strptime(self.params.end_date, "%Y-%m-%d")
      last_rebalance = None
      daily_values = []
      daily_benchmark_values = []

      while current <= end:
          try:
              if self.should_rebalance(current, last_rebalance):
                  await websocket.send_text(f'{{"type": "status", "payload": "Rebalancing on {current.strftime("%Y-%m-%d")}"}}')
                  self.rebalance(current.strftime("%Y-%m-%d"))
                  value = self.portfolio.value_on(current.strftime("%Y-%m-%d"))
                  benchmark = await get_benchmark_value(current)
                  last_rebalance = current

              value = self.portfolio.value_on(current.strftime("%Y-%m-%d"))
              benchmark = await get_benchmark_value(current)
              await send_daily(current, value, benchmark)
              daily_values.append({"date": current.strftime("%Y-%m-%d"), "portfolio_value": value})
              daily_benchmark_values.append({"date": current.strftime("%Y-%m-%d"), "benchmark_value": benchmark})
              current += timedelta(days=1)

          except Exception as e:
              await websocket.send_text(f'{{"type": "error", "payload": "Error on {current.strftime("%Y-%m-%d")}: {str(e)}"}}')
              break

      # Final sell
      final_orders = []
      for ticker in list(self.portfolio.holdings.keys()):
          order = self.portfolio.sell(ticker, end.strftime("%Y-%m-%d"))
          if order:
              final_orders.append(order)

      return {
          "final_orders": final_orders,
          "final_value": self.portfolio.value,
          "daily_values": daily_values,
          "daily_benchmark_values": daily_benchmark_values,
          "duration": round(time.time() - start_time, 2)
      }
