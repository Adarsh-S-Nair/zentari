from dateutil.relativedelta import relativedelta
import pandas as pd


class Portfolio:
    def __init__(self, starting_value, price_data, rebalance_on_gain_pct=10, rebalance_on_loss_pct=5):
        self.value = starting_value
        self.price_data = price_data
        self.holdings = {}  # {ticker: shares}
        self.purchase_prices = {}  # {ticker: price}
        self.rebalance_on_gain_pct = rebalance_on_gain_pct
        self.rebalance_on_loss_pct = rebalance_on_loss_pct
        self.trade_history_by_date = {}  # { "YYYY-MM-DD": [orders] }

    def _get_price(self, ticker, date_str):
        df = self.price_data.get(ticker)
        if df is None or df.empty:
            raise ValueError(f"No price data for ticker {ticker}")
        target = pd.to_datetime(date_str)
        price = df["adj_close"].asof(target)
        if pd.isna(price):
            raise ValueError(f"No price available for {ticker} as of {date_str}")
        return price

    def buy(self, ticker, amount, date_str):
        try:
            price = self._get_price(ticker, date_str)
            shares = amount / price
            self.holdings[ticker] = self.holdings.get(ticker, 0) + shares
            self.purchase_prices[ticker] = price  # overwrite each time (simple)
            self.value -= amount

            order = {
                "ticker": ticker,
                "action": "Buy",
                "price": round(price, 2),
                "shares": round(shares, 4),
                "amount": round(amount, 2),
                "return_pct": None
            }
            self.trade_history_by_date.setdefault(date_str, []).append(order)
            return order
        except Exception as e:
            print(f"[ERROR] Buy failed for {ticker} on {date_str}: {e}")
            return None

    def sell(self, ticker, date_str):
        try:
            shares = self.holdings.get(ticker)
            if not shares:
                return None
            price = self._get_price(ticker, date_str)
            value = shares * price
            cost_basis = self.purchase_prices.get(ticker, price)
            return_pct = ((price - cost_basis) / cost_basis) * 100 if cost_basis else 0

            order = {
                "ticker": ticker,
                "action": "Sell",
                "price": round(price, 2),
                "shares": round(shares, 4),
                "amount": round(value, 2),
                "return_pct": round(return_pct, 2)
            }

            self.value += value
            self.holdings.pop(ticker)
            self.purchase_prices.pop(ticker, None)
            self.trade_history_by_date.setdefault(date_str, []).append(order)
            return order
        except Exception as e:
            print(f"[ERROR] Sell failed for {ticker} on {date_str}: {e}")
            return None

    def rebalance(self, top_n_tickers, date_str):
        orders = []

        current_tickers = set(self.holdings.keys())
        top_ticker_set = set([ticker for ticker, _ in top_n_tickers])

        to_sell = current_tickers - top_ticker_set
        to_buy = top_ticker_set - current_tickers

        # Sell tickers that dropped out of top N
        for ticker in to_sell:
            order = self.sell(ticker, date_str)
            if order:
                orders.append(order)

        # Equal allocation of current cash
        if to_buy:
            allocation = self.value / len(to_buy)
            for ticker in to_buy:
                order = self.buy(ticker, allocation, date_str)
                if order:
                    orders.append(order)

        return orders

    def value_on(self, date_str):
        total = self.value
        for ticker, shares in self.holdings.items():
            try:
                price = self._get_price(ticker, date_str)
                total += shares * price
            except:
                continue
        return round(total, 2)

    def should_rebalance(self, current_date, last_rebalance_date):
        if last_rebalance_date is None:
            return True
        date_str = current_date.strftime("%Y-%m-%d")
        last_str = last_rebalance_date.strftime("%Y-%m-%d")
        value_now = self.value_on(date_str)
        value_then = self.value_on(last_str)
        if value_then == 0:
            return False
        change_pct = ((value_now - value_then) / value_then) * 100
        if current_date >= last_rebalance_date + relativedelta(months=1):
            return True
        if change_pct >= self.rebalance_on_gain_pct or change_pct <= -self.rebalance_on_loss_pct:
            return True
        return False
