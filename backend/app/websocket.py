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

        # Counters (informational, broadcast to frontend)
        self.total_sent: int = 0
        self.total_received: int = 0
        self.total_lost: int = 0
        self.total_retransmits: int = 0

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

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

    async def handle_control(self, raw_data: str):
        """Parse and apply a control message from the frontend."""
        try:
            msg = json.loads(raw_data)

            if msg.get("type") == "control":
                self.simulation_running = bool(msg.get("running", self.simulation_running))
                self.speed = float(msg.get("speed", self.speed))
                self.loss_rate = float(msg.get("loss", self.loss_rate))

                # Clamp values to valid ranges
                self.speed = max(0.1, min(5.0, self.speed))
                self.loss_rate = max(0.0, min(1.0, self.loss_rate))

                print(
                    f"[CTRL] running={self.simulation_running} "
                    f"speed={self.speed} loss={self.loss_rate:.2f}"
                )

                # Acknowledge the control update to all clients
                await self.send_data({
                    "type": "control_ack",
                    "running": self.simulation_running,
                    "speed": self.speed,
                    "loss": self.loss_rate,
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