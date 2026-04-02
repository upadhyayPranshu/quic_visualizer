from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.websocket import manager
import asyncio
from app.protocol.udp_server import start_server
from app.protocol.udp_client import start_client

app = FastAPI(title="QUIC Visualizer API", version="1.0.0")

# Allow the React dev server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Start server FIRST (binds to port 9999), then client after a short delay
    asyncio.create_task(start_server())
    await asyncio.sleep(0.2)          # Give the server time to bind
    asyncio.create_task(start_client())
    print("[MAIN] Simulation tasks started")

@app.get("/")
def home():
    return {
        "message": "QUIC Visualizer Backend Running",
        "websocket": "ws://127.0.0.1:8000/ws",
    }

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