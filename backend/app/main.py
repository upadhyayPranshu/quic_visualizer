from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.websocket import manager
import asyncio
import traceback

app = FastAPI(title="QUIC Visualizer API", version="1.0.0")

# Allow the React dev server and Netlify frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Start internal UDP simulation tasks with error handling.
    If UDP sockets fail (e.g. on Railway), the WebSocket API still works."""
    try:
        from app.protocol.udp_server import start_server
        from app.protocol.udp_client import start_client
        asyncio.create_task(start_server())
        await asyncio.sleep(0.2)
        asyncio.create_task(start_client())
        print("[MAIN] Simulation tasks started")
    except Exception as e:
        print(f"[MAIN] WARNING: UDP simulation failed to start: {e}")
        traceback.print_exc()
        print("[MAIN] WebSocket API is still available")

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