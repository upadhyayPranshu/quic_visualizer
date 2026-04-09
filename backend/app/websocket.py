from typing import List
from fastapi import WebSocket
import json
import asyncio


class ConnectionManager:
    """
    Manages all active WebSocket connections and simulation control state.
    Thread-safe broadcast with automatic dead-connection cleanup.
    """

    def __init__(self):
        self.active_connections: List[WebSocket] = []

        # Simulation control state
        self.simulation_running: bool = True
        self.speed: float = 1.0
        self.loss_rate: float = 0.1
        self.window_size: int = 16        # Max congestion window (sliding window size)
        self.timeout: float = 1.0         # ACK timeout in seconds
        self.protocol_mode: str = "selective_repeat"  # "go_back_n" or "selective_repeat"

        # Counters (informational, broadcast to frontend)
        self.total_sent: int = 0
        self.total_received: int = 0
        self.total_lost: int = 0
        self.total_retransmits: int = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

        # Send current configuration to newly connected client
        await websocket.send_json({
            "type": "config",
            "window_size": self.window_size,
            "timeout": self.timeout,
            "protocol_mode": self.protocol_mode,
            "speed": self.speed,
            "loss": self.loss_rate,
            "running": self.simulation_running,
        })

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def send_data(self, data: dict):
        """
        Broadcast JSON data to all active connections.
        Automatically removes any dead connections.
        """
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                dead.append(connection)

        for conn in dead:
            self.disconnect(conn)

    async def send_log(self, message: str):
        """Send a transmission log entry to the frontend."""
        import time
        await self.send_data({
            "type": "log",
            "timestamp": time.time(),
            "message": message,
        })

    async def handle_control(self, raw_data: str):
        """Parse and apply a control message from the frontend."""
        try:
            msg = json.loads(raw_data)

            if msg.get("type") == "control":
                self.simulation_running = bool(msg.get("running", self.simulation_running))
                self.speed = float(msg.get("speed", self.speed))
                self.loss_rate = float(msg.get("loss", self.loss_rate))
                self.window_size = int(msg.get("window_size", self.window_size))
                self.timeout = float(msg.get("timeout", self.timeout))
                self.protocol_mode = msg.get("protocol_mode", self.protocol_mode)

                # Clamp values to valid ranges
                self.speed = max(0.1, min(5.0, self.speed))
                self.loss_rate = max(0.0, min(1.0, self.loss_rate))
                self.window_size = max(1, min(64, self.window_size))
                self.timeout = max(0.2, min(10.0, self.timeout))

                if self.protocol_mode not in ("go_back_n", "selective_repeat"):
                    self.protocol_mode = "selective_repeat"

                print(
                    f"[CTRL] running={self.simulation_running} "
                    f"speed={self.speed} loss={self.loss_rate:.2f} "
                    f"window={self.window_size} timeout={self.timeout:.1f}s "
                    f"mode={self.protocol_mode}"
                )

                # Acknowledge the control update to all clients
                await self.send_data({
                    "type": "control_ack",
                    "running": self.simulation_running,
                    "speed": self.speed,
                    "loss": self.loss_rate,
                    "window_size": self.window_size,
                    "timeout": self.timeout,
                    "protocol_mode": self.protocol_mode,
                })

            elif msg.get("type") == "reset":
                self.total_sent = 0
                self.total_received = 0
                self.total_lost = 0
                self.total_retransmits = 0
                print("[CTRL] Stats reset")

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            print(f"[WS] Control parse error: {e}")


manager = ConnectionManager()