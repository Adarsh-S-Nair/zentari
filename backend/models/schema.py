from pydantic import BaseModel
from typing import Optional

class SimulationRequest(BaseModel):
    start_date: str = "2025-01-01"
    end_date: str = "2025-06-01"
    lookback_months: int = 12
    skip_recent_months: int = 1
    hold_months: Optional[int] = 1
    top_n: Optional[int] = 10
    starting_value: float = 10000.0
    benchmark: str = "SPY"
    strategy: str = "momentum"
    tp_threshold: Optional[int] = 10
    sl_threshold: Optional[int] = 5