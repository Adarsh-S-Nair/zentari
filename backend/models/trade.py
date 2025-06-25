from datetime import datetime
from enum import Enum
from typing import Optional, List

class PositionType(Enum):
    LONG = "long"
    SHORT = "short"

class OrderType(Enum):
    BUY = "buy"
    SELL = "sell"

class Order:
    def __init__(self, order_type: OrderType, ticker: str, quantity: float, price: float, date: str, amount: float):
        self.order_type = order_type
        self.ticker = ticker
        self.quantity = quantity
        self.price = price
        self.date = date
        self.amount = amount
        self.timestamp = datetime.now()

    def to_dict(self):
        return {
            "order_type": self.order_type.value,
            "ticker": self.ticker,
            "quantity": self.quantity,
            "price": self.price,
            "date": self.date,
            "amount": self.amount
        }

class Trade:
    def __init__(self, trade_id: str, ticker: str, position_type: PositionType, entry_order: Order):
        self.trade_id = trade_id
        self.ticker = ticker
        self.position_type = position_type
        self.entry_order = entry_order
        self.exit_order: Optional[Order] = None
        self.status = "open"  # "open" or "closed"
        self.pnl: Optional[float] = None
        self.pnl_pct: Optional[float] = None
        self.duration_days: Optional[int] = None

    def close(self, exit_order: Order):
        """Close the trade with an exit order"""
        self.exit_order = exit_order
        self.status = "closed"
        
        # Calculate P&L
        if self.position_type == PositionType.LONG:
            # For long positions: (exit_price - entry_price) * quantity
            self.pnl = (exit_order.price - self.entry_order.price) * exit_order.quantity
        else:
            # For short positions: (entry_price - exit_price) * quantity
            self.pnl = (self.entry_order.price - exit_order.price) * exit_order.quantity
        
        self.pnl_pct = (self.pnl / self.entry_order.amount) * 100
        
        # Calculate duration
        entry_date = datetime.strptime(self.entry_order.date, "%Y-%m-%d")
        exit_date = datetime.strptime(exit_order.date, "%Y-%m-%d")
        self.duration_days = (exit_date - entry_date).days

    def get_current_pnl(self, current_price: float) -> float:
        """Calculate current P&L for open positions"""
        if self.status == "closed":
            return self.pnl
        
        if self.position_type == PositionType.LONG:
            return (current_price - self.entry_order.price) * self.entry_order.quantity
        else:
            return (self.entry_order.price - current_price) * self.entry_order.quantity

    def get_current_pnl_pct(self, current_price: float) -> float:
        """Calculate current P&L percentage for open positions"""
        current_pnl = self.get_current_pnl(current_price)
        return (current_pnl / self.entry_order.amount) * 100

    def to_dict(self):
        """Convert trade to dictionary for JSON serialization"""
        trade_dict = {
            "trade_id": self.trade_id,
            "ticker": self.ticker,
            "position_type": self.position_type.value,
            "entry_order": self.entry_order.to_dict(),
            "status": self.status,
            "pnl": self.pnl,
            "pnl_pct": self.pnl_pct,
            "duration_days": self.duration_days
        }
        
        if self.exit_order:
            trade_dict["exit_order"] = self.exit_order.to_dict()
        
        return trade_dict 