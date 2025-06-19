from dateutil.relativedelta import relativedelta

class Portfolio:
    def __init__(self, starting_value, rebalance_on_gain_pct=10, rebalance_on_loss_pct=5):
        self.value = starting_value
        self.holdings = {}
        self.purchase_prices = {}
        self.rebalance_on_gain_pct = rebalance_on_gain_pct
        self.rebalance_on_loss_pct = rebalance_on_loss_pct
        self.trade_history_by_date = {}  # { "YYYY-MM-DD": [order, order, ...] }

    def buy(self, tickers, price_lookup, date_str):
        print(f"[BUYING] Allocating ${self.value:,.2f} across {len(tickers)} tickers on {date_str}")
        orders = []
        if not tickers:
            print("[BUYING] No tickers to buy.")
            return orders

        allocation = self.value / len(tickers)
        total_spent = 0

        for ticker, _ in tickers:
            try:
                price = price_lookup(ticker, date_str)
                if price <= 0:
                    raise ValueError(f"Invalid price: {price}")
                shares = allocation / price
                self.holdings[ticker] = shares
                self.purchase_prices[ticker] = price
                orders.append({
                    "ticker": ticker,
                    "action": "Buy",
                    "price": round(price, 2),
                    "shares": round(shares, 4),
                    "amount": round(allocation, 2),
                    "return_pct": None
                })
                print(f"  - BUY {ticker}: ${allocation:,.2f} @ ${price:.2f} = {shares:.4f} shares")
                total_spent += allocation
            except Exception as e:
                print(f"[ERROR] Failed to buy {ticker} on {date_str}: {e}")

        self.value -= total_spent
        print(f"[BUYING] Remaining portfolio cash after buys: ${self.value:,.2f}")
        self.trade_history_by_date.setdefault(date_str, []).extend(orders)
        return orders

    def sell_all(self, price_lookup, date_str):
        print(f"[SELLING] Closing all positions on {date_str}")
        orders = []
        total = 0.0

        if not self.holdings:
            print("[SELLING] No holdings to sell.")
            return orders

        for ticker, shares in self.holdings.items():
            try:
                price = price_lookup(ticker, date_str)
                if price <= 0:
                    raise ValueError(f"Invalid price: {price}")
                value = shares * price
                cost_basis = self.purchase_prices.get(ticker, price)
                return_pct = ((price - cost_basis) / cost_basis) * 100 if cost_basis else 0
                orders.append({
                    "ticker": ticker,
                    "action": "Sell",
                    "price": round(price, 2),
                    "shares": round(shares, 4),
                    "amount": round(value, 2),
                    "return_pct": round(return_pct, 2)
                })
                print(f"  - SELL {ticker}: {shares:.4f} shares @ ${price:.2f} = ${value:,.2f} (Return: {return_pct:.2f}%)")
                total += value
            except Exception as e:
                print(f"[ERROR] Failed to sell {ticker} on {date_str}: {e}")

        self.holdings.clear()
        self.purchase_prices.clear()
        self.value = total
        print(f"[SELLING] New portfolio cash after sells: ${self.value:,.2f}")
        self.trade_history_by_date.setdefault(date_str, []).extend(orders)
        return orders

    def value_on(self, price_lookup, date_str):
        total = 0.0
        for ticker, shares in self.holdings.items():
            try:
                price = price_lookup(ticker, date_str)
                total += shares * price
            except:
                continue
        return round(total, 2)

    def should_rebalance(self, current_date, last_rebalance_date, price_lookup):
        if last_rebalance_date is None:
            return True
        value_now = self.value_on(price_lookup, current_date.strftime("%Y-%m-%d"))
        value_then = self.value_on(price_lookup, last_rebalance_date.strftime("%Y-%m-%d"))
        if value_then == 0:
            return False
        change_pct = ((value_now - value_then) / value_then) * 100
        if current_date >= last_rebalance_date + relativedelta(months=1):
            return True
        if change_pct >= self.rebalance_on_gain_pct or change_pct <= -self.rebalance_on_loss_pct:
            return True
        return False
