import pandas as pd
from math import isfinite
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from .base_strategy import BaseStrategy
from services.portfolio import Portfolio
from utils.data_fetcher import DataFetcher
from utils.price_utils import PriceUtils
import numpy as np

class MomentumStrategy(BaseStrategy):
    def __init__(self, params):
        self.params = params
        self.price_data = {}
        self.portfolio = None
        self.current_tickers = set()
        self.loaded_dates = set()
        self.data_fetcher = DataFetcher()

    async def initialize(self):
        start_date = self.params.start_date
        self.current_tickers = set(self.data_fetcher.get_sp500_tickers_as_of(start_date))
        self.price_data = self.data_fetcher.preload_price_data(
            start_date, self.params.end_date,
            self.params.lookback_months, self.params.skip_recent_months,
            self.params.benchmark, self.current_tickers
        )
        self.portfolio = Portfolio(self.params.starting_value, self.price_data)

    def should_rebalance(self, date, last_date):
        if not last_date:
            return True
        # Rebalance on a fixed monthly schedule
        return date >= last_date + relativedelta(months=1)

    def calculate_momentum_score(self, prices: pd.Series):
        """Calculate momentum using multiple factors for better stock selection"""
        if len(prices) < 20:  # Need minimum data
            return None
        
        # 1. Price momentum (current vs historical)
        current_price = prices.iloc[-1]
        lookback_price = prices.iloc[0]
        if lookback_price == 0:
            return None
        price_momentum = (current_price - lookback_price) / lookback_price
        
        # 2. Volatility (we want volatility in momentum trading!)
        returns = prices.pct_change().dropna()
        if len(returns) < 10:
            return None
        
        volatility = returns.std()
        if volatility == 0:
            return None
        
        # 3. Recent momentum (last 20% of period)
        recent_prices = prices.iloc[-int(len(prices) * 0.2):]
        if len(recent_prices) < 2:
            recent_momentum = 0
        else:
            recent_momentum = (recent_prices.iloc[-1] - recent_prices.iloc[0]) / recent_prices.iloc[0]
        
        # 4. Combined score - reward momentum AND volatility
        momentum_score = (
            0.5 * price_momentum +      # Overall momentum (50% weight)
            0.3 * volatility +          # Volatility (30% weight) - we want this!
            0.2 * recent_momentum       # Recent momentum (20% weight)
        )
        
        return momentum_score if np.isfinite(momentum_score) else None

    def get_top_momentum_stocks(self, date):
        end = date - pd.DateOffset(months=self.params.skip_recent_months)
        start = end - pd.DateOffset(months=self.params.lookback_months)
        scores = []

        for t in sorted(self.price_data.keys()):
            if t == self.params.benchmark:
                continue
            try:
                prices = self.price_data[t][(self.price_data[t].index >= start) & (self.price_data[t].index <= end)]["adj_close"].dropna()
                
                # Filter: Minimum data points (ensure we have enough data for reliable calculation)
                if len(prices) < 20:
                    continue
                
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

        # Close positions for tickers not in top momentum
        for t in sorted(current - top_set):
            trade = self.portfolio.close_long_position(t, date_str)
            if trade:
                orders.append(trade)

        # Open positions for tickers not already held with volatility-based sizing
        to_buy = sorted(top_set - current)
        if to_buy:
            # Calculate position sizes based on volatility (inverse volatility weighting)
            position_sizes = {}
            total_weight = 0
            
            for ticker in to_buy:
                try:
                    prices = self.price_data[ticker]
                    returns = prices.pct_change().dropna()
                    volatility = returns.std()
                    
                    # Inverse volatility weighting (less volatile stocks get more allocation)
                    if volatility > 0:
                        position_sizes[ticker] = 1 / volatility
                        total_weight += position_sizes[ticker]
                    else:
                        position_sizes[ticker] = 1
                        total_weight += 1
                except:
                    # Fallback to equal weighting if we can't calculate volatility
                    position_sizes[ticker] = 1
                    total_weight += 1
            
            # Normalize position sizes to total available cash
            total_allocation = self.portfolio.cash
            for ticker in position_sizes:
                if total_weight > 0:
                    allocation = (position_sizes[ticker] / total_weight) * total_allocation
                    trade = self.portfolio.open_long_position(ticker, allocation, date_str)
                    if trade:
                        orders.append(trade)
                        print(f"   📈 Allocated ${allocation:.2f} to {ticker} (volatility-based sizing)")

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

                daily_values.append({"date": date_str, "portfolio_value": value})
                daily_benchmarks.append({"date": date_str, "benchmark_value": benchmark})
                current += timedelta(days=1)

            except Exception as e:
                import traceback
                traceback.print_exc()
                await websocket.send_text(f'{{"type":"error","payload":"Error on {date_str}: {str(e)}"}}')
                break

        # Close all remaining positions at the end
        final_trades = []
        for ticker in list(self.portfolio.holdings.keys()):
            trade = self.portfolio.close_long_position(ticker, end.strftime("%Y-%m-%d"))
            if trade:
                final_trades.append(trade.to_dict())
        
        return {
            "final_orders": final_trades,
            "final_value": self.portfolio.cash,
            "daily_values": daily_values,
            "daily_benchmark_values": daily_benchmarks,
            "all_trades": self.portfolio.get_all_trades()
        }
