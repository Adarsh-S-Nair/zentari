import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from .base_strategy import BaseStrategy
from services.portfolio import Portfolio
from utils.data_fetcher import DataFetcher

class LeveragedETFSwingStrategy(BaseStrategy):
    def __init__(self, params):
        self.params = params
        self.price_data = {}
        self.portfolio = None
        self.data_fetcher = DataFetcher()
        # More conservative ETF selection - mix of 2x and 3x
        self.etfs = ["TQQQ", "SPXL", "QLD", "SSO"]  # TQQQ, SPXL (3x), QLD, SSO (2x)
        self.hold_period_days = 10  # Longer hold period
        self.trailing_stop_pct = 0.12  # Wider stop loss for leveraged ETFs
        self.max_position_size = 0.25  # Max 25% in any single ETF
        self.last_entry_dates = {}  # Track when we entered each ETF
        self.entry_prices = {}  # Track entry prices for better risk management

    async def initialize(self):
        self.price_data = self.data_fetcher.preload_price_data(
            self.params.start_date,
            self.params.end_date,
            self.params.lookback_months,
            self.params.skip_recent_months,
            self.params.benchmark,
            self.etfs
        )
        self.portfolio = Portfolio(self.params.starting_value, self.price_data)

    def calculate_volatility(self, prices, window=20):
        """Calculate rolling volatility"""
        returns = prices.pct_change().dropna()
        if len(returns) < window:
            return None
        return returns.rolling(window=window).std().iloc[-1]

    def calculate_rsi(self, prices, window=14):
        """Calculate RSI indicator"""
        if len(prices) < window + 1:
            return None
        
        delta = prices.diff().dropna()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.iloc[-1]

    def calculate_macd(self, prices, fast=12, slow=26, signal=9):
        """Calculate MACD indicator"""
        if len(prices) < slow + signal:
            return None
        
        ema_fast = prices.ewm(span=fast).mean()
        ema_slow = prices.ewm(span=slow).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal).mean()
        histogram = macd_line - signal_line
        
        return {
            'macd': macd_line.iloc[-1],
            'signal': signal_line.iloc[-1],
            'histogram': histogram.iloc[-1]
        }

    def should_enter(self, ticker, date):
        df = self.price_data[ticker]
        if date not in df.index:
            return False

        # Get price data up to current date
        prices = df[df.index <= date]["adj_close"].dropna()
        if len(prices) < 30:
            return False

        # Calculate technical indicators
        volatility = self.calculate_volatility(prices)
        rsi = self.calculate_rsi(prices)
        macd_data = self.calculate_macd(prices)
        
        if volatility is None or rsi is None or macd_data is None:
            return False

        # More sophisticated entry criteria
        recent_prices = prices.tail(10)
        price_trend = recent_prices.iloc[-1] > recent_prices.mean()
        
        # Volatility filter - avoid extremely volatile periods
        if volatility > 0.05:  # 5% daily volatility threshold
            return False
        
        # RSI filter - avoid overbought conditions
        if rsi > 70:
            return False
        
        # MACD filter - look for bullish crossover
        macd_bullish = macd_data['macd'] > macd_data['signal'] and macd_data['histogram'] > 0
        
        # Price momentum filter
        momentum_positive = price_trend and prices.iloc[-1] > prices.iloc[-5]
        
        # Volume confirmation (if available)
        volume_ok = True  # Placeholder for volume analysis
        
        return price_trend and macd_bullish and momentum_positive and volume_ok

    def should_exit(self, ticker, date):
        entry_date = self.last_entry_dates.get(ticker)
        entry_price = self.entry_prices.get(ticker)
        
        if not entry_date or not entry_price:
            return False

        df = self.price_data[ticker]
        if date not in df.index:
            return False

        current_price = df.loc[date]["adj_close"]
        prices_since_entry = df[(df.index >= entry_date) & (df.index <= date)]["adj_close"]

        if len(prices_since_entry) < 2:
            return False

        # Calculate drawdown from peak
        peak = prices_since_entry.max()
        drawdown = (peak - current_price) / peak
        
        # Calculate total return
        total_return = (current_price - entry_price) / entry_price
        
        # Exit conditions
        stop_loss_hit = drawdown >= self.trailing_stop_pct
        hold_period_expired = (date - entry_date).days >= self.hold_period_days
        profit_taking = total_return >= 0.15  # Take profit at 15% gain
        
        # Technical exit signals
        prices = df[df.index <= date]["adj_close"].dropna()
        rsi = self.calculate_rsi(prices)
        macd_data = self.calculate_macd(prices)
        
        technical_exit = False
        if rsi and macd_data:
            # Exit if RSI becomes overbought or MACD turns bearish
            technical_exit = (rsi > 75) or (macd_data['macd'] < macd_data['signal'] and macd_data['histogram'] < 0)
        
        return stop_loss_hit or hold_period_expired or profit_taking or technical_exit

    def calculate_position_size(self, ticker, available_cash):
        """Calculate position size based on volatility and current holdings"""
        # Get current volatility
        df = self.price_data[ticker]
        prices = df["adj_close"].dropna().tail(30)
        volatility = self.calculate_volatility(prices)
        
        if volatility is None:
            volatility = 0.03  # Default 3% volatility
        
        # Inverse volatility weighting - less volatile ETFs get larger positions
        volatility_factor = max(0.1, 1 - (volatility * 10))  # Scale volatility impact
        
        # Check current portfolio concentration
        current_holdings_value = sum(self.portfolio.holdings.values())
        max_position_value = self.portfolio.value_on(self.params.start_date) * self.max_position_size
        
        # Calculate base allocation
        base_allocation = available_cash * volatility_factor * 0.4  # 40% of available cash
        
        # Ensure we don't exceed max position size
        final_allocation = min(base_allocation, max_position_value)
        
        return max(0, final_allocation)

    async def run(self, websocket, get_benchmark_value, send_daily):
        await websocket.send_text('{"type":"status","payload":"Starting Leveraged ETF Swing Simulation..."}')
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        daily_values, daily_benchmarks = [], []

        while current <= end:
            try:
                date_str = current.strftime("%Y-%m-%d")

                # Check exits first
                for ticker in self.etfs:
                    if ticker in self.portfolio.holdings and self.portfolio.holdings[ticker] > 0:
                        if self.should_exit(ticker, current):
                            trade = self.portfolio.close_long_position(ticker, date_str)
                            if trade:
                                entry_price = self.entry_prices.get(ticker, 0)
                                current_price = self.price_data[ticker].loc[current]["adj_close"]
                                pnl = ((current_price - entry_price) / entry_price) * 100 if entry_price > 0 else 0
                                print(f"📉 [{date_str}] Exited {ticker} (PnL: {pnl:.1f}%)")
                                self.last_entry_dates.pop(ticker, None)
                                self.entry_prices.pop(ticker, None)

                # Check entries
                available_cash = self.portfolio.cash
                if available_cash > 0:
                    for ticker in self.etfs:
                        if ticker not in self.portfolio.holdings and self.should_enter(ticker, current):
                            allocation = self.calculate_position_size(ticker, available_cash)
                            if allocation > 0:
                                trade = self.portfolio.open_long_position(ticker, allocation, date_str)
                                if trade:
                                    self.last_entry_dates[ticker] = current
                                    self.entry_prices[ticker] = self.price_data[ticker].loc[current]["adj_close"]
                                    print(f"📈 [{date_str}] Entered {ticker} with ${allocation:.2f}")

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

        # Close all positions at the end
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
