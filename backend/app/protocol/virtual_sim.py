"""
Virtual (in-memory) QUIC simulation that replaces real UDP sockets.
Used when running on cloud platforms like Railway where UDP doesn't work.
The simulation produces the same WebSocket events as the real UDP
client/server pair so the frontend dashboard works identically.
"""

import asyncio
import random
import time
from app.protocol.packet import Packet
from app.websocket import manager
from app.utils.metrics import Metrics
from app.protocol.congestion import CongestionControl

ACK_TIMEOUT = 1.0


async def start_virtual_simulation():
    """
    Runs a fully in-memory QUIC-like packet simulation.
    Produces send, receive, loss, retransmit, and metrics events
    for the WebSocket dashboard without using any UDP sockets.
    """
    seq = 1
    metrics = Metrics()
    congestion = CongestionControl()
    unacked: dict[int, float] = {}  # seq -> send_time

    print("[VIRTUAL SIM] Starting in-memory QUIC simulation")

    while True:
        # ──────────────────────────────────────────
        # PAUSE: if simulation is stopped, idle
        # ──────────────────────────────────────────
        if not manager.simulation_running:
            await asyncio.sleep(0.2)
            continue

        cwnd_int = max(1, int(congestion.cwnd))
        now = time.monotonic()

        # ──────────────────────────────────────────
        # RETRANSMIT timed-out packets
        # ──────────────────────────────────────────
        timed_out = [s for s, t in list(unacked.items()) if now - t > ACK_TIMEOUT]
        for tseq in timed_out:
            congestion.on_loss()
            metrics.packet_lost()
            metrics.packet_retransmitted()

            # Retransmit — reset timer
            unacked[tseq] = time.monotonic()

            await manager.send_data({
                "type": "retransmit",
                "seq": tseq,
            })

            # Simulate: retransmitted packet might succeed now
            if random.random() > manager.loss_rate:
                rtt_ms = random.uniform(10, 80)
                await asyncio.sleep(rtt_ms / 1000.0)

                if tseq in unacked:
                    del unacked[tseq]
                    metrics.packet_acked(tseq)
                    congestion.on_ack()

                    await manager.send_data({
                        "type": "receive",
                        "seq": tseq,
                    })

        # ──────────────────────────────────────────
        # SEND new packets to fill the window
        # ──────────────────────────────────────────
        packets_to_send = cwnd_int - len(unacked)
        for _ in range(max(0, packets_to_send)):
            if not manager.simulation_running:
                break

            metrics.packet_sent(seq)
            unacked[seq] = time.monotonic()

            await manager.send_data({
                "type": "send",
                "seq": seq,
            })

            # Simulate network transit
            if random.random() < manager.loss_rate:
                # Packet lost — will be retransmitted on timeout
                await manager.send_data({
                    "type": "loss",
                    "seq": seq,
                })
            else:
                # Packet delivered — simulate RTT delay then ACK
                rtt_ms = random.uniform(15, 100)
                await asyncio.sleep(rtt_ms / 1000.0)

                if seq in unacked:
                    del unacked[seq]
                    metrics.packet_acked(seq)
                    congestion.on_ack()

                    await manager.send_data({
                        "type": "receive",
                        "seq": seq,
                    })

            seq += 1

        # ──────────────────────────────────────────
        # BROADCAST metrics to dashboard
        # ──────────────────────────────────────────
        await manager.send_data({
            "type": "metrics",
            "rtt": metrics.rtt,
            "cwnd": round(congestion.cwnd, 2),
            "throughput": metrics.get_throughput(),
            "loss_rate": metrics.get_loss_rate(),
            "total_sent": metrics.total_sent,
            "total_acked": metrics.total_acked,
            "total_lost": metrics.total_lost,
            "total_retransmits": metrics.total_retransmits,
        })

        # ──────────────────────────────────────────
        # PACE: sleep based on speed control
        # ──────────────────────────────────────────
        await asyncio.sleep(max(0.05, 0.5 / manager.speed))
