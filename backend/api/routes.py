from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.schema import SimulationRequest
from services.websocket_simulation import WebSocketSimulationService
import json
from services.validation import validate_simulation_params
from api.plaid_routes import router as plaid_router
from api.database_routes import router as database_router

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

# Include Plaid routes
router.include_router(plaid_router)

# Include Database routes
router.include_router(database_router)