import pandas as pd
from datetime import datetime, timedelta
from .base_strategy import BaseStrategy
from services.portfolio import Portfolio
from utils.data_fetcher import DataFetcher
import numpy as np

class CointegrationStrategy(BaseStrategy):
    def __init__(self, params):
        self.params = params
        self.price_data = {}
        self.portfolio = None
        self.data_fetcher = DataFetcher()

        # Multiple cointegrated pairs for better diversification
        self.pairs = [
            ("KO", "PEP"),   # Coca-Cola vs Pepsi (Consumer Staples)
            ("XOM", "CVX"),  # Exxon vs Chevron (Energy)
            ("MA", "V"),     # Mastercard vs Visa (Financial Services)
            ("JPM", "BAC"),  # JPMorgan vs Bank of America (Banking)
            ("AAPL", "MSFT"), # Apple vs Microsoft (Technology)
            ("HD", "LOW"),   # Home Depot vs Lowe's (Retail)
            ("UNH", "ANTM"), # UnitedHealth vs Anthem (Healthcare)
            ("WMT", "TGT"),  # Walmart vs Target (Retail)
        ]
        
        # Strategy parameters
        self.entry_threshold = 1.2  # Z-score threshold to enter positions
        self.exit_threshold = 0.6   # Z-score threshold to exit positions
        self.position_size_pct = 0.20  # Use 20% of available cash per position
        self.max_positions = 4  # Maximum number of pairs to trade simultaneously
        self.market_exposure_pct = 0.30  # Keep 30% in market exposure (SPY) for upside capture

    async def initialize(self):
        start_date = self.params.start_date
        end_date = self.params.end_date
        
        # Get all unique tickers from pairs
        all_tickers = set()
        for pair in self.pairs:
            all_tickers.update(pair)
        
        # Add benchmark to tickers if not already present
        if self.params.benchmark not in all_tickers:
            all_tickers.add(self.params.benchmark)

        self.price_data = self.data_fetcher.preload_price_data_cointegration(
            start_date, end_date,
            self.params.lookback_months,
            self.params.benchmark,
            list(all_tickers)
        )
        self.portfolio = Portfolio(self.params.starting_value, self.price_data)

    def calculate_spread_zscore(self, x, y):
        """Calculate spread and z-score using numpy arrays"""
        try:
            x_array = np.array(x, dtype=float)
            y_array = np.array(y, dtype=float)
            
            mask = ~(np.isnan(x_array) | np.isnan(y_array))
            x_clean = x_array[mask]
            y_clean = y_array[mask]
            
            if len(x_clean) < 30:
                return None
            
            beta = np.cov(x_clean, y_clean)[0, 1] / np.var(x_clean)
            alpha = np.mean(y_clean) - beta * np.mean(x_clean)
            spread = y_clean - (alpha + beta * x_clean)
            z_score = (spread[-1] - np.mean(spread)) / np.std(spread)
            
            return z_score
            
        except Exception as e:
            print(f"[Error in calculate_spread_zscore]: {e}")
            return None

    def check_trade_signal(self, date):
        """Check for trading signals across all pairs"""
        signals = []
        
        for pair in self.pairs:
            try:
                ticker1, ticker2 = pair
                df1 = self.price_data[ticker1]
                df2 = self.price_data[ticker2]
                window_days = self.params.lookback_months * 21

                current_date = pd.to_datetime(date)
                df1_filtered = df1[df1.index <= current_date]
                df2_filtered = df2[df2.index <= current_date]
                
                x = df1_filtered["adj_close"].dropna().iloc[-window_days:]
                y = df2_filtered["adj_close"].dropna().iloc[-window_days:]

                if len(x) != len(y) or len(x) < window_days:
                    continue

                z_score = self.calculate_spread_zscore(x, y)
                
                if z_score is None:
                    continue

                if z_score > self.entry_threshold:
                    signals.append({
                        "pair": pair,
                        "action": "enter_short_spread",
                        "long_ticker": ticker1,
                        "short_ticker": ticker2,
                        "z_score": z_score
                    })
                elif z_score < -self.entry_threshold:
                    signals.append({
                        "pair": pair,
                        "action": "enter_long_spread",
                        "long_ticker": ticker2,
                        "short_ticker": ticker1,
                        "z_score": z_score
                    })
                elif abs(z_score) < self.exit_threshold:
                    signals.append({
                        "pair": pair,
                        "action": "exit_spread",
                        "z_score": z_score
                    })
                    
            except Exception as e:
                print(f"[Error checking signal for pair {pair}]: {e}")
                continue
                
        return signals

    def get_position_amount(self):
        """Calculate position size based on available cash (excluding market exposure)"""
        available_cash = self.portfolio.get_available_cash()
        pairs_capital = available_cash * (1 - self.market_exposure_pct)
        return pairs_capital * self.position_size_pct

    def count_open_positions(self):
        """Count how many pairs we currently have positions in"""
        open_positions = 0
        for ticker in self.portfolio.holdings:
            if self.portfolio.holdings[ticker] != 0:
                open_positions += 1
        return open_positions // 2

    def has_position_in_pair(self, pair):
        """Check if we have a position in a specific pair"""
        ticker1, ticker2 = pair
        return (ticker1 in self.portfolio.holdings and self.portfolio.holdings[ticker1] != 0) or \
               (ticker2 in self.portfolio.holdings and self.portfolio.holdings[ticker2] != 0)

    async def run(self, websocket, get_benchmark_value, send_daily):
        await websocket.send_text('{"type":"status","payload":"Starting Simulation..."}')
        current = datetime.strptime(self.params.start_date, "%Y-%m-%d")
        end = datetime.strptime(self.params.end_date, "%Y-%m-%d")

        print(f"[DEBUG] Starting multi-pair cointegration simulation from {current} to {end}")
        print(f"[DEBUG] Trading pairs: {self.pairs}")
        print(f"[DEBUG] Entry threshold: {self.entry_threshold}, Exit threshold: {self.exit_threshold}")
        
        daily_values, daily_benchmarks = [], []
        active_pairs = set()
        days_processed = 0
        market_position_established = False

        while current <= end:
            try:
                date_str = current.strftime("%Y-%m-%d")
                days_processed += 1
                
                # Establish market exposure if not already done
                if not market_position_established:
                    market_amount = self.params.starting_value * self.market_exposure_pct
                    market_trade = self.portfolio.open_long_position("SPY", market_amount, date_str)
                    if market_trade:
                        market_position_established = True
                        print(f"📈 [{date_str}] Established market exposure: ${market_amount:.2f} in SPY")
                
                signals = self.check_trade_signal(current)

                # Log z-score every 60 days for diagnostics
                if days_processed % 60 == 0:
                    try:
                        for pair in self.pairs:
                            ticker1, ticker2 = pair
                            df1 = self.price_data[ticker1]
                            df2 = self.price_data[ticker2]
                            window_days = self.params.lookback_months * 21
                            current_date = pd.to_datetime(current)
                            df1_filtered = df1[df1.index <= current_date]
                            df2_filtered = df2[df2.index <= current_date]
                            x = df1_filtered["adj_close"].dropna().iloc[-window_days:]
                            y = df2_filtered["adj_close"].dropna().iloc[-window_days:]
                            if len(x) >= window_days and len(y) >= window_days:
                                z_score = self.calculate_spread_zscore(x, y)
                                if z_score is not None:
                                    has_pos = self.has_position_in_pair(pair)
                                    print(f"[DEBUG] Day {days_processed} ({date_str}): {pair} Z-score = {z_score:.2f} | Has position: {has_pos}")
                    except Exception as e:
                        print(f"[DEBUG] Could not calculate z-score on day {days_processed}: {e}")

                if signals:
                    for signal in signals:
                        action = signal["action"]
                        z_score = signal["z_score"]
                        pair = signal["pair"]

                        if action == "enter_short_spread" and pair not in active_pairs:
                            if self.count_open_positions() >= self.max_positions:
                                continue
                                
                            long_ticker = signal["long_ticker"]
                            short_ticker = signal["short_ticker"]
                            position_amount = self.get_position_amount()
                            
                            long_trade = self.portfolio.open_long_position(long_ticker, position_amount, date_str)
                            short_trade = self.portfolio.open_short_position(short_ticker, position_amount, date_str)
                            
                            if long_trade and short_trade:
                                active_pairs.add(pair)
                                print(f"📊 [{date_str}] Opened spread: Long {long_ticker}, Short {short_ticker} (Z-score: {z_score:.2f})")

                        elif action == "enter_long_spread" and pair not in active_pairs:
                            if self.count_open_positions() >= self.max_positions:
                                continue
                                
                            long_ticker = signal["long_ticker"]
                            short_ticker = signal["short_ticker"]
                            position_amount = self.get_position_amount()
                            
                            long_trade = self.portfolio.open_long_position(long_ticker, position_amount, date_str)
                            short_trade = self.portfolio.open_short_position(short_ticker, position_amount, date_str)
                            
                            if long_trade and short_trade:
                                active_pairs.add(pair)
                                print(f"📊 [{date_str}] Opened spread: Long {long_ticker}, Short {short_ticker} (Z-score: {z_score:.2f})")

                        elif action == "exit_spread" and pair in active_pairs:
                            ticker1, ticker2 = pair
                            
                            if ticker1 in self.portfolio.holdings and self.portfolio.holdings[ticker1] > 0:
                                self.portfolio.close_long_position(ticker1, date_str)
                            elif ticker2 in self.portfolio.holdings and self.portfolio.holdings[ticker2] > 0:
                                self.portfolio.close_long_position(ticker2, date_str)
                            
                            if ticker1 in self.portfolio.holdings and self.portfolio.holdings[ticker1] < 0:
                                self.portfolio.close_short_position(ticker1, date_str)
                            elif ticker2 in self.portfolio.holdings and self.portfolio.holdings[ticker2] < 0:
                                self.portfolio.close_short_position(ticker2, date_str)
                            
                            active_pairs.discard(pair)
                            print(f"📊 [{date_str}] Closed spread: {ticker1}-{ticker2} (Z-score: {z_score:.2f})")

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
            if self.portfolio.holdings[ticker] > 0:
                trade = self.portfolio.close_long_position(ticker, end.strftime("%Y-%m-%d"))
                if trade:
                    final_trades.append(trade.to_dict())
            elif self.portfolio.holdings[ticker] < 0:
                trade = self.portfolio.close_short_position(ticker, end.strftime("%Y-%m-%d"))
                if trade:
                    final_trades.append(trade.to_dict())

        return {
            "final_orders": final_trades,
            "final_value": self.portfolio.cash,
            "daily_values": daily_values,
            "daily_benchmark_values": daily_benchmarks,
            "all_trades": self.portfolio.get_all_trades(),
            "strategy_summary": {
                "total_trades": len(self.portfolio.get_all_trades()),
                "closed_trades": len(self.portfolio.get_closed_trades()),
                "open_trades": len(self.portfolio.get_open_trades()),
                "market_exposure_pct": self.market_exposure_pct,
                "pairs_trading_pct": 1 - self.market_exposure_pct,
                "final_portfolio_summary": self.portfolio.get_portfolio_summary(end.strftime("%Y-%m-%d"))
            }
        }
