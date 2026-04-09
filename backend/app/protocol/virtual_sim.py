"""
Virtual (in-memory) QUIC simulation that replaces real UDP sockets.
Used when running on cloud platforms like Railway where UDP doesn't work.

Supports:
- Selective Repeat and Go-Back-N protocol modes
- CRC32 checksum verification
- Configurable window size and ACK timeout
- Transmission log events for the dashboard
"""

import asyncio
import random
import time
import zlib
from app.protocol.packet import Packet
from app.websocket import manager
from app.utils.metrics import Metrics
from app.protocol.congestion import CongestionControl


def compute_checksum(seq, data):
    """Compute CRC32 checksum for packet verification."""
    payload = f"{seq}:{data}"
    return zlib.crc32(payload.encode()) & 0xFFFFFFFF


def simulate_checksum_corruption():
    """Randomly corrupt a checksum (2% chance) to demonstrate error detection."""
    return random.random() < 0.02


async def start_virtual_simulation():
    """
    Runs a fully in-memory reliable-data-transfer protocol simulation.
    Supports Go-Back-N and Selective Repeat modes.
    Produces send, receive, loss, retransmit, checksum, log, and metrics events.
    """
    seq = 1
    metrics = Metrics()
    congestion = CongestionControl()
    unacked: dict[int, float] = {}  # seq -> send_time

    print("[VIRTUAL SIM] Starting in-memory protocol simulation")
    await manager.send_log("Simulation started")

    while True:
        # ──────────────────────────────────────────
        # PAUSE: if simulation is stopped, idle
        # ──────────────────────────────────────────
        if not manager.simulation_running:
            await asyncio.sleep(0.2)
            continue

        # Read current config from manager
        max_window = manager.window_size
        ack_timeout = manager.timeout
        protocol = manager.protocol_mode

        # Cap cwnd by configurable window size
        cwnd_int = max(1, min(int(congestion.cwnd), max_window))
        now = time.monotonic()

        # ──────────────────────────────────────────
        # RETRANSMIT timed-out packets
        # ──────────────────────────────────────────
        timed_out = [s for s, t in list(unacked.items()) if now - t > ack_timeout]

        if timed_out and protocol == "go_back_n":
            # Go-Back-N: retransmit ALL packets from the lowest unacked seq
            min_seq = min(unacked.keys())
            retransmit_seqs = sorted([s for s in unacked.keys() if s >= min_seq])

            await manager.send_log(
                f"[Go-Back-N] Timeout! Retransmitting {len(retransmit_seqs)} packets from seq #{min_seq}"
            )

            for tseq in retransmit_seqs:
                congestion.on_loss()
                metrics.packet_lost()
                metrics.packet_retransmitted()

                unacked[tseq] = time.monotonic()

                checksum = compute_checksum(tseq, f"Data-{tseq}")
                await manager.send_data({
                    "type": "retransmit",
                    "seq": tseq,
                    "checksum": checksum,
                    "checksum_ok": True,
                    "protocol": "go_back_n",
                })

                # Simulate retransmitted packet delivery
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
                            "checksum_ok": True,
                        })
                        await manager.send_log(f"Packet #{tseq} retransmit ACK received ✅")

        elif timed_out and protocol == "selective_repeat":
            # Selective Repeat: retransmit ONLY the timed-out packets
            await manager.send_log(
                f"[Selective Repeat] Timeout! Retransmitting {len(timed_out)} specific packets"
            )

            for tseq in timed_out:
                congestion.on_loss()
                metrics.packet_lost()
                metrics.packet_retransmitted()

                unacked[tseq] = time.monotonic()

                checksum = compute_checksum(tseq, f"Data-{tseq}")
                await manager.send_data({
                    "type": "retransmit",
                    "seq": tseq,
                    "checksum": checksum,
                    "checksum_ok": True,
                    "protocol": "selective_repeat",
                })

                # Simulate retransmitted packet delivery
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
                            "checksum_ok": True,
                        })
                        await manager.send_log(f"Packet #{tseq} retransmit ACK received ✅")

        # ──────────────────────────────────────────
        # SEND new packets to fill the window
        # ──────────────────────────────────────────
        packets_to_send = cwnd_int - len(unacked)
        for _ in range(max(0, packets_to_send)):
            if not manager.simulation_running:
                break

            packet = Packet(seq, f"Data-{seq}")
            checksum = packet.checksum
            checksum_ok = True

            # Simulate rare checksum corruption (error detection demo)
            if simulate_checksum_corruption():
                checksum_ok = False
                await manager.send_log(f"⚠ Packet #{seq} checksum CORRUPTED — detected by receiver")

            metrics.packet_sent(seq)
            unacked[seq] = time.monotonic()

            await manager.send_data({
                "type": "send",
                "seq": seq,
                "checksum": checksum,
                "checksum_ok": checksum_ok,
            })

            # Handle corrupted packet (treated as loss)
            if not checksum_ok:
                await manager.send_data({
                    "type": "loss",
                    "seq": seq,
                    "reason": "checksum_fail",
                })
                seq += 1
                continue

            # Simulate network transit
            if random.random() < manager.loss_rate:
                # Packet lost in transit
                await manager.send_data({
                    "type": "loss",
                    "seq": seq,
                    "reason": "network_loss",
                })
                await manager.send_log(f"Packet #{seq} LOST in transit ❌")
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
                        "checksum_ok": True,
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
            "window_size": max_window,
            "timeout": ack_timeout,
            "protocol_mode": protocol,
        })

        # ──────────────────────────────────────────
        # PACE: sleep based on speed control
        # ──────────────────────────────────────────
        await asyncio.sleep(max(0.05, 0.5 / manager.speed))
