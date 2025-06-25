import pandas as pd
from models.trade import Trade, Order, OrderType, PositionType
import uuid

class Portfolio:
    def __init__(self, starting_value, price_data):
        self.cash = starting_value
        self.price_data = price_data  # { ticker: DataFrame }
        self.holdings = {}  # { ticker: shares }
        self.purchase_prices = {}  # { ticker: price at buy time }
        self.trade_history_by_date = {}  # { date_str: [order dicts] }
        
        # New trade tracking
        self.trades = {}  # { trade_id: Trade }
        self.open_trades = {}  # { ticker: trade_id } for quick lookup
        self.trade_counter = 0

    # update internal price data when universe changes
    def update_price_data(self, new_price_data):
        self.price_data = new_price_data

    # helper to get the price of a stock as of a date
    def _get_price(self, ticker, date_str):
        df = self.price_data.get(ticker)
        if df is None or df.empty:
            raise ValueError(f"Missing price data for {ticker}")
        price = df["adj_close"].asof(pd.to_datetime(date_str))
        if pd.isna(price):
            raise ValueError(f"No price available for {ticker} on {date_str}")
        return price

    def _generate_trade_id(self):
        """Generate a unique trade ID"""
        self.trade_counter += 1
        return f"T{self.trade_counter:04d}"

    def open_long_position(self, ticker, amount, date_str):
        """Open a long position (buy to open)"""
        try:
            price = self._get_price(ticker, date_str)
            shares = amount / price
            
            # Create entry order
            entry_order = Order(
                order_type=OrderType.BUY,
                ticker=ticker,
                quantity=shares,
                price=price,
                date=date_str,
                amount=amount
            )
            
            # Create trade
            trade_id = self._generate_trade_id()
            trade = Trade(trade_id, ticker, PositionType.LONG, entry_order)
            
            # Update portfolio
            self.cash -= amount
            self.holdings[ticker] = self.holdings.get(ticker, 0) + shares
            self.purchase_prices[ticker] = price

            # Track trade
            self.trades[trade_id] = trade
            self.open_trades[ticker] = trade_id
            
            # Legacy order tracking (for backward compatibility)
            order_dict = {
                "ticker": ticker, "action": "Buy",
                "price": round(price, 2), "shares": round(shares, 4),
                "amount": round(amount, 2), "return_pct": None,
                "trade_id": trade_id
            }
            self.trade_history_by_date.setdefault(date_str, []).append(order_dict)

            print(f"   🟢 {date_str} → Opened LONG position: {round(shares, 4)} shares of {ticker} @ ${round(price, 2)} | Cash: ${round(self.cash, 2)}")
            return trade

        except Exception as e:
            print(f"[ERROR] Failed to open long position for {ticker} on {date_str}: {e}")
            return None

    def close_long_position(self, ticker, date_str):
        """Close a long position (sell to close)"""
        try:
            if ticker not in self.open_trades:
                print(f"[WARNING] No open long position for {ticker}")
                return None
                
            trade_id = self.open_trades[ticker]
            trade = self.trades[trade_id]
            
            if trade.position_type != PositionType.LONG:
                print(f"[ERROR] Position type mismatch for {ticker}")
                return None
            
            shares = self.holdings.get(ticker, 0)
            if shares <= 0:
                print(f"[WARNING] No shares to sell for {ticker}")
                return None

            price = self._get_price(ticker, date_str)
            value = shares * price
            
            # Create exit order
            exit_order = Order(
                order_type=OrderType.SELL,
                ticker=ticker,
                quantity=shares,
                price=price,
                date=date_str,
                amount=value
            )
            
            # Close the trade
            trade.close(exit_order)
            
            # Update portfolio
            self.cash += value
            self.holdings.pop(ticker, None)
            self.purchase_prices.pop(ticker, None)
            self.open_trades.pop(ticker, None)

            # Legacy order tracking (for backward compatibility)
            order_dict = {
                "ticker": ticker, "action": "Sell",
                "price": round(price, 2), "shares": round(shares, 4),
                "amount": round(value, 2), "return_pct": round(trade.pnl_pct, 2),
                "trade_id": trade_id
            }
            self.trade_history_by_date.setdefault(date_str, []).append(order_dict)

            print(f"   🔴 {date_str} → Closed LONG position: {round(shares, 4)} shares of {ticker} @ ${round(price, 2)} | P&L: ${round(trade.pnl, 2)} ({round(trade.pnl_pct, 2)}%)")
            return trade

        except Exception as e:
            print(f"[ERROR] Failed to close long position for {ticker} on {date_str}: {e}")
            return None

    # Legacy methods for backward compatibility
    def buy(self, ticker, amount, date_str):
        """Legacy buy method - opens a long position"""
        return self.open_long_position(ticker, amount, date_str)

    def sell(self, ticker, date_str):
        """Legacy sell method - closes a long position"""
        return self.close_long_position(ticker, date_str)

    # compute portfolio value (cash + all holdings) on a given date
    def value_on(self, date_str):
        total = self.cash
        for ticker, shares in self.holdings.items():
            try:
                total += shares * self._get_price(ticker, date_str)
            except:
                continue
        return round(total, 2)

    def get_all_trades(self):
        """Get all trades (open and closed) as dictionaries"""
        return [trade.to_dict() for trade in self.trades.values()]

    def get_open_trades(self):
        """Get only open trades as dictionaries"""
        return [trade.to_dict() for trade in self.trades.values() if trade.status == "open"]

    def get_closed_trades(self):
        """Get only closed trades as dictionaries"""
        return [trade.to_dict() for trade in self.trades.values() if trade.status == "closed"]
