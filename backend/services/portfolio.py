import pandas as pd

class Portfolio:
    def __init__(self, starting_value, price_data):
        self.cash = starting_value
        self.price_data = price_data  # { ticker: DataFrame }
        self.holdings = {}  # { ticker: shares }
        self.purchase_prices = {}  # { ticker: price at buy time }
        self.trade_history_by_date = {}  # { date_str: [order dicts] }

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

    # buy stock with given amount
    def buy(self, ticker, amount, date_str):
        try:
            price = self._get_price(ticker, date_str)
            shares = amount / price
            self.cash -= amount
            self.holdings[ticker] = self.holdings.get(ticker, 0) + shares
            self.purchase_prices[ticker] = price

            order = {
                "ticker": ticker, "action": "Buy",
                "price": round(price, 2), "shares": round(shares, 4),
                "amount": round(amount, 2), "return_pct": None
            }
            self.trade_history_by_date.setdefault(date_str, []).append(order)

            print(f"   🟢 {date_str} → Bought {order['shares']} of {ticker} @ ${order['price']} | Cash: ${round(self.cash, 2)}")
            return order
        except Exception as e:
            print(f"[ERROR] Buy failed for {ticker} on {date_str}: {e}")
            return None

    # sell all shares of a stock
    def sell(self, ticker, date_str):
        try:
            shares = self.holdings.get(ticker)
            if not shares:
                return None

            price = self._get_price(ticker, date_str)
            value = shares * price
            cost_basis = self.purchase_prices.get(ticker, price)
            return_pct = ((price - cost_basis) / cost_basis) * 100 if cost_basis else 0

            self.cash += value
            self.holdings.pop(ticker)
            self.purchase_prices.pop(ticker, None)

            order = {
                "ticker": ticker, "action": "Sell",
                "price": round(price, 2), "shares": round(shares, 4),
                "amount": round(value, 2), "return_pct": round(return_pct, 2)
            }
            self.trade_history_by_date.setdefault(date_str, []).append(order)

            print(f"   🔴 {date_str} → Sold {order['shares']} of {ticker} @ ${order['price']} | Cash: ${round(self.cash, 2)}")
            return order
        except Exception as e:
            print(f"[ERROR] Sell failed for {ticker} on {date_str}: {e}")
            return None

    # compute portfolio value (cash + all holdings) on a given date
    def value_on(self, date_str):
        total = self.cash
        for ticker, shares in self.holdings.items():
            try:
                total += shares * self._get_price(ticker, date_str)
            except:
                continue
        return round(total, 2)
