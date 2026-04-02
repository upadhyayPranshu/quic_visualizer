import socket
import asyncio
from app.protocol.packet import Packet
from app.websocket import manager
from app.protocol.simulator import is_packet_lost

HOST = "127.0.0.1"
PORT = 9999

async def start_server():
    """
    UDP Receiver (Server).

    Listens on PORT for incoming packets. Simulates in-transit packet loss:
    packets that are "lost" never generate an ACK, causing the client-side
    timeout to trigger retransmission. Received packets are ACK'd and
    broadcast to the WebSocket dashboard.
    """
    loop = asyncio.get_event_loop()

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((HOST, PORT))
    sock.setblocking(False)

    print(f"[SERVER] UDP Receiver listening on {HOST}:{PORT}")

    while True:
        try:
            data, addr = await loop.sock_recvfrom(sock, 4096)
            raw = data.decode("utf-8", errors="ignore")

            try:
                packet = Packet.from_json(raw)
            except Exception:
                # Not a valid packet, skip
                await asyncio.sleep(0.001)
                continue

            # Simulate in-transit packet loss (packet never reaches receiver)
            if is_packet_lost():
                print(f"[SERVER] Packet #{packet.seq} LOST in transit ❌")

                await manager.send_data({
                    "type": "loss",
                    "seq": packet.seq,
                })
                # No ACK sent — client will time out and retransmit
                continue

            # Packet received successfully — send ACK
            print(f"[SERVER] Packet #{packet.seq} received ✅")

            ack_msg = f"ACK:{packet.seq}".encode()
            try:
                await loop.sock_sendto(sock, ack_msg, addr)
            except Exception as e:
                print(f"[SERVER] ACK send failed for #{packet.seq}: {e}")

            await manager.send_data({
                "type": "receive",
                "seq": packet.seq,
            })

        except Exception:
            # No data available yet — yield and retry
            await asyncio.sleep(0.005)