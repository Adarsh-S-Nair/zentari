from fastapi import APIRouter
from models.schema import SimulationRequest
from services.simulation_service import SimulationService
from datetime import datetime

router = APIRouter()

@router.get("/")
def root():
    return {"message": "Momentum Backtest API"}

@router.post("/simulate")
def run_simulation(params: SimulationRequest):
    try:
        start = datetime.strptime(params.start_date, "%Y-%m-%d")
        end = datetime.strptime(params.end_date, "%Y-%m-%d")
        if start > end:
            return {"error": "Start date must be before end date."}
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}

    sim = SimulationService(params)
    return sim.run()