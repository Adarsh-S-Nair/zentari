from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from models.schema import SimulationRequest
from services.websocket_simulation import WebSocketSimulationService
import json
from services.validation import validate_simulation_params
from api.plaid_routes import router as plaid_router
from api.database_routes import router as database_router
from api.sync_routes import router as sync_router
from api.market_routes import router as market_router
from api.openai_routes import router as openai_router

router = APIRouter()

@router.get("/")
def root():
    return {"message": "Momentum Backtest API"}

@router.get("/health")
def health_check():
    return {"status": "OK"}

@router.head("/ping")
def ping():
    return {"status": "OK"}

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

# Include Sync routes
router.include_router(sync_router)

# Include Market routes
router.include_router(market_router)

# Include OpenAI routes
router.include_router(openai_router)