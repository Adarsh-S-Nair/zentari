from abc import ABC, abstractmethod

class BaseStrategy(ABC):
    def __init__(self, portfolio, price_data, params):
        self.portfolio = portfolio
        self.price_data = price_data
        self.params = params

    @abstractmethod
    async def run(self, websocket, get_benchmark_value, send_daily, send_rebalance):
        pass
