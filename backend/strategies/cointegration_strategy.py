import pandas as pd
from datetime import datetime, timedelta
from .base_strategy import BaseStrategy
from services.portfolio import Portfolio
from utils.data_fetcher import DataFetcher
import numpy as np
import statsmodels.api as sm

class CointegrationStrategy(BaseStrategy):
    def __init__(self, params):
        self.params = params
        self.price_data = {}
        self.portfolio = None
        self.data_fetcher = DataFetcher()

        # Hardcoded pair list; use only the first for now
        self.pairs = [
            ("KO", "PEP"),
            ("XOM", "CVX"),
            ("MA", "V"),
            ("JPM", "BAC"),
        ]
        self.pair = self.pairs[0]

    async def initialize(self):
        start_date = self.params.start_date
        end_date = self.params.end_date
        tickers = list(self.pair)
        
        # Add benchmark to tickers if not already present
        if self.params.benchmark not in tickers:
            tickers.append(self.params.benchmark)

        self.price_data = self.data_fetcher.preload_price_data_cointegration(
            start_date, end_date,
            self.params.lookback_months,
            self.params.benchmark,
            tickers
        )
        self.portfolio = Portfolio(self.params.starting_value, self.price_data)

    def calculate_spread_zscore(self, x, y):
        """Calculate spread and z-score using numpy arrays to avoid pandas issues"""
        try:
            # Convert to numpy arrays
            x_array = np.array(x, dtype=float)
            y_array = np.array(y, dtype=float)
            
            # Remove any NaN values
            mask = ~(np.isnan(x_array) | np.isnan(y_array))
            x_clean = x_array[mask]
            y_clean = y_array[mask]
            
            if len(x_clean) < 20:  # Need minimum data points
                return None
            
            # Simple linear regression using numpy
            # y = alpha + beta * x
            beta = np.cov(x_clean, y_clean)[0, 1] / np.var(x_clean)
            alpha = np.mean(y_clean) - beta * np.mean(x_clean)
            
            # Calculate spread
            spread = y_clean - (alpha + beta * x_clean)
            
            # Calculate z-score
            z_score = (spread[-1] - np.mean(spread)) / np.std(spread)
            
            return z_score
            
        except Exception as e:
            print(f"[Error in calculate_spread_zscore]: {e}")
            return None

    def check_trade_signal(self, date):
        try:
            df1 = self.price_data[self.pair[0]]
            df2 = self.price_data[self.pair[1]]
            window_days = self.params.lookback_months * 21  # ~21 trading days per month

            # Check if we have enough data up to the current date
            current_date = pd.to_datetime(date)
            df1_filtered = df1[df1.index <= current_date]
            df2_filtered = df2[df2.index <= current_date]
            
            x = df1_filtered["adj_close"].dropna().iloc[-window_days:]
            y = df2_filtered["adj_close"].dropna().iloc[-window_days:]

            if len(x) != len(y) or len(x) < window_days:
                return None

            z_score = self.calculate_spread_zscore(x, y)
            
            if z_score is None:
                return None

            # Very lenient thresholds for demonstration
            if z_score > 1.0:
                return {"action": "short_spread", "z": z_score}
            elif z_score < -1.0:
                return {"action": "long_spread", "z": z_score}
            elif abs(z_score) < 0.2:
                return {"action": "close", "z": z_score}
            return None
            
        except Exception as e:
            print(f"[Error in check_trade_signal]: {e}")
            return None

    async def run(self, websocket, get_benchmark_value, send_daily):
        await websocket.send_text('{"type":"status","payload":"Starting Cointegration Simulation..."}')
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        print(f"[DEBUG] Starting cointegration simulation from {current} to {end}")
        print(f"[DEBUG] Using pair: {self.pair}")
        print(f"[DEBUG] Available tickers in price_data: {list(self.price_data.keys())}")
        
        # Test initial data
        try:
            df1 = self.price_data[self.pair[0]]
            df2 = self.price_data[self.pair[1]]
            print(f"[DEBUG] {self.pair[0]} data points: {len(df1)}")
            print(f"[DEBUG] {self.pair[1]} data points: {len(df2)}")
            print(f"[DEBUG] {self.pair[0]} date range: {df1.index.min()} to {df1.index.max()}")
            print(f"[DEBUG] {self.pair[1]} date range: {df2.index.min()} to {df2.index.max()}")
        except Exception as e:
            print(f"[DEBUG] Error checking initial data: {e}")

        daily_values, daily_benchmarks = [], []
        holding_spread = False
        days_processed = 0

        while current <= end:
            try:
                date_str = current.strftime("%Y-%m-%d")
                days_processed += 1
                
                # Log z-score every 90 days for debugging
                if days_processed % 90 == 0:
                    try:
                        df1 = self.price_data[self.pair[0]]
                        df2 = self.price_data[self.pair[1]]
                        window_days = self.params.lookback_months * 21
                        current_date = pd.to_datetime(current)
                        df1_filtered = df1[df1.index <= current_date]
                        df2_filtered = df2[df2.index <= current_date]
                        x = df1_filtered["adj_close"].dropna().iloc[-window_days:]
                        y = df2_filtered["adj_close"].dropna().iloc[-window_days:]
                        if len(x) >= window_days and len(y) >= window_days:
                            z_score = self.calculate_spread_zscore(x, y)
                            if z_score is not None:
                                print(f"[DEBUG] Day {days_processed} ({date_str}): Z-score = {z_score:.2f}")
                    except Exception as e:
                        print(f"[DEBUG] Could not calculate z-score on day {days_processed}: {e}")
                
                signal = self.check_trade_signal(current)

                if signal:
                    action = signal["action"]
                    z = signal["z"]
                    print(f"📉 [{date_str}] Cointegration z-score: {z:.2f}, action: {action}")

                    if action == "long_spread" and not holding_spread:
                        buy = self.pair[0]
                        alloc = self.portfolio.cash
                        self.portfolio.buy(buy, alloc, date_str)
                        holding_spread = True

                    elif action == "short_spread" and not holding_spread:
                        buy = self.pair[1]
                        alloc = self.portfolio.cash
                        self.portfolio.buy(buy, alloc, date_str)
                        holding_spread = True

                    elif action == "close" and holding_spread:
                        for t in [self.pair[0], self.pair[1]]:
                            self.portfolio.sell(t, date_str)
                        holding_spread = False

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
