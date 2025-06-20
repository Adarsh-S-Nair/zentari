from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.schema import SimulationRequest
from services.websocket_simulation import WebSocketSimulationService
import json
from services.validation import validate_simulation_params

router = APIRouter()

@router.get("/")
def root():
    return {"message": "Momentum Backtest API"}

@router.websocket("/simulate/ws")
async def simulate_websocket(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_text()
    payload = json.loads(data)

    params = SimulationRequest(**payload)

    # Validate BEFORE loading price data
    is_valid, error_msg = validate_simulation_params(params)
    if not is_valid:
        await websocket.send_text(json.dumps({"type": "error", "payload": error_msg}))
        await websocket.close()
        return

    try:
        service = WebSocketSimulationService(websocket, params)
        await service.run()
    except ValueError as e:
        await websocket.send_text(json.dumps({"type": "error", "payload": str(e)}))
        await websocket.close()
        return