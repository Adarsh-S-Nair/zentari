from pydantic import BaseModel

class SimulationRequest(BaseModel):
    start_date: str = "2025-01-01"
    end_date: str = "2025-06-01"
    lookback_months: int = 12
    skip_recent_months: int = 1
    hold_months: int = 1
    top_n: int = 10
    starting_value: float = 10000.0
    benchmark: str = "SPY"
    strategy: str = "momentum",
    tp_threshold: int = 10,
    sl_threshold: int = 5