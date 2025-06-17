from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.schema import SimulationRequest
from services.simulation_service import SimulationService
from services.websocket_simulation import WebSocketSimulationService
import json
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

@router.websocket("/simulate/ws")
async def simulate_websocket(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_text()
    payload = json.loads(data)

    params = SimulationRequest(**payload)
    service = WebSocketSimulationService(websocket, params)
    await service.run()