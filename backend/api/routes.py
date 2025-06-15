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
        sim = SimulationService(params)
        result = sim.run()
        return result
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}
