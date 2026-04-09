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


async def _try_udp_simulation():
    """Attempt to start real UDP simulation. Returns True if successful."""
    import socket
    try:
        # Quick test: can we create and bind a UDP socket?
        test_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        test_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        test_sock.bind(("127.0.0.1", 9999))
        test_sock.close()

        from app.protocol.udp_server import start_server
        from app.protocol.udp_client import start_client
        asyncio.create_task(start_server())
        await asyncio.sleep(0.2)
        asyncio.create_task(start_client())
        print("[MAIN] Real UDP simulation started ✅")
        return True
    except Exception as e:
        print(f"[MAIN] UDP not available: {e}")
        return False


async def _start_virtual_simulation():
    """Start the in-memory virtual simulation (no UDP needed)."""
    from app.protocol.virtual_sim import start_virtual_simulation
    asyncio.create_task(start_virtual_simulation())
    print("[MAIN] Virtual (in-memory) simulation started ✅")


@app.on_event("startup")
async def startup_event():
    """
    Try real UDP simulation first. If UDP sockets don't work
    (e.g. on Railway), fall back to virtual in-memory simulation.
    """
    udp_ok = await _try_udp_simulation()
    if not udp_ok:
        await _start_virtual_simulation()
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