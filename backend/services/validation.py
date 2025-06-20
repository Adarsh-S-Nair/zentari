from datetime import datetime
from models.schema import SimulationRequest

def validate_simulation_params(params: SimulationRequest):
    try:
        start = datetime.strptime(params.start_date, "%Y-%m-%d")
        end = datetime.strptime(params.end_date, "%Y-%m-%d")
    except ValueError:
        return False, "Invalid date format. Use YYYY-MM-DD."

    if start > end:
        return False, "Start date must be before or equal to end date."

    if (end - start).days > 365 * 10:
        return False, "Date range must be 10 years or less."

    if params.starting_value <= 0 or params.starting_value > 1_000_000_000:
        return False, "Starting value must be between $1 and $1,000,000,000."

    if params.lookback_months < 1 or params.lookback_months > 12:
        return False, "Lookback months must be between 1 and 12."

    if params.skip_recent_months < 0 or params.skip_recent_months > 6:
        return False, "Skip recent months must be between 0 and 6."

    if params.hold_months < 1 or params.hold_months > 3:
        return False, "Hold months must be between 1 and 3."

    if params.top_n < 1 or params.top_n > 20:
        return False, "Top N must be between 1 and 20."

    return True, ""