from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.websocket import manager
import asyncio
import os

app = FastAPI(title="QUIC Visualizer API", version="1.0.0")

# Allow the React dev server and Netlify frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _is_cloud_environment():
    """Detect if running on Railway or other cloud platforms where UDP won't work."""
    return any(os.environ.get(var) for var in [
        "RAILWAY_ENVIRONMENT",
        "RAILWAY_PROJECT_ID",
        "RAILWAY_SERVICE_ID",
        "RENDER_SERVICE_ID",
        "DYNO",  # Heroku
    ])


@app.on_event("startup")
async def startup_event():
    """
    On cloud (Railway etc.) use virtual in-memory simulation.
    Locally, use real UDP client/server simulation.
    """
    if _is_cloud_environment():
        print("[MAIN] Cloud environment detected — using virtual simulation")
        from app.protocol.virtual_sim import start_virtual_simulation
        asyncio.create_task(start_virtual_simulation())
        print("[MAIN] Virtual (in-memory) simulation started ✅")
    else:
        print("[MAIN] Local environment — using real UDP simulation")
        from app.protocol.udp_server import start_server
        from app.protocol.udp_client import start_client
        asyncio.create_task(start_server())
        await asyncio.sleep(0.2)
        asyncio.create_task(start_client())
        print("[MAIN] Real UDP simulation started ✅")

    print("[MAIN] Simulation tasks started")


@app.get("/")
def home():
    return {
        "status": "ok",
        "message": "QUIC Visualizer Backend Running",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.handle_control(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Unexpected error: {e}")
        manager.disconnect(websocket)