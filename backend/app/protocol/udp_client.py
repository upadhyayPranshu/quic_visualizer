import socket
import asyncio
from app.protocol.packet import Packet
from app.websocket import manager
from app.utils.metrics import Metrics
from app.protocol.congestion import CongestionControl
from app.protocol.reliability import ReliabilityTracker

HOST = "127.0.0.1"
PORT = 9999

# How long to wait for an ACK before considering the packet lost (seconds)
ACK_TIMEOUT = 1.0

# Maximum consecutive send failures before backing off
MAX_CONSECUTIVE_FAILURES = 5
FAILURE_BACKOFF_SECONDS = 5.0

async def start_client():
    """
    UDP Sender (Client).

    Sends packets to the server using a sliding window controlled by the
    congestion window (cwnd). Implements:
      - Window-based sending: fills window up to cwnd packets in-flight
      - Timeout-based retransmission: re-sends timed-out unacked packets
      - Congestion control: TCP Reno slow-start + congestion avoidance
      - Broadcast: sends send/retransmit/metrics events to WebSocket dashboard
      - Graceful degradation: backs off when UDP is unavailable (e.g. on Railway)
    """
    loop = asyncio.get_event_loop()

    # Client socket — unbound, OS assigns an ephemeral port
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setblocking(False)
    except Exception as e:
        print(f"[CLIENT] Failed to create UDP socket: {e}")
        print("[CLIENT] UDP simulation disabled — WebSocket API still works")
        return

    seq = 1
    unacked: dict[int, Packet] = {}   # seq -> Packet (window buffer)
    consecutive_failures = 0

    metrics = Metrics()
    congestion = CongestionControl()
    reliability = ReliabilityTracker(timeout_seconds=ACK_TIMEOUT)

    print("[CLIENT] UDP Sender started")

    while True:
        # ──────────────────────────────────────────
        # PAUSE: if simulation is stopped, idle
        # ──────────────────────────────────────────
        if not manager.simulation_running:
            await asyncio.sleep(0.2)
            continue

        # ──────────────────────────────────────────
        # BACKOFF: if UDP is consistently failing, slow down
        # ──────────────────────────────────────────
        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            await asyncio.sleep(FAILURE_BACKOFF_SECONDS)
            consecutive_failures = 0  # Reset and retry

        cwnd_int = max(1, int(congestion.cwnd))

        # ──────────────────────────────────────────
        # RETRANSMIT timed-out packets first
        # ──────────────────────────────────────────
        timed_out_seqs = reliability.get_timed_out()
        for tseq in timed_out_seqs:
            if tseq in unacked:
                packet = unacked[tseq]

                try:
                    await loop.sock_sendto(
                        sock, packet.to_json().encode(), (HOST, PORT)
                    )
                    consecutive_failures = 0
                    print(f"[CLIENT] Retransmitting packet #{tseq} 🔄")
                except Exception as e:
                    consecutive_failures += 1
                    if consecutive_failures <= 3:
                        print(f"[CLIENT] Retransmit send error #{tseq}: {e}")
                    elif consecutive_failures == MAX_CONSECUTIVE_FAILURES:
                        print(f"[CLIENT] UDP sends failing repeatedly, backing off...")
                    continue

                reliability.on_retransmit(tseq)
                metrics.packet_retransmitted()

                await manager.send_data({
                    "type": "retransmit",
                    "seq": tseq,
                })

            # Trigger congestion control loss response (once per timeout event)
            congestion.on_loss()
            metrics.packet_lost()

        # ──────────────────────────────────────────
        # SEND new packets to fill the window
        # ──────────────────────────────────────────
        packets_to_send = cwnd_int - len(unacked)
        for _ in range(max(0, packets_to_send)):
            if not manager.simulation_running:
                break

            packet = Packet(seq, f"Data-{seq}")
            unacked[seq] = packet

            metrics.packet_sent(seq)
            reliability.on_sent(seq)

            try:
                await loop.sock_sendto(
                    sock, packet.to_json().encode(), (HOST, PORT)
                )
                consecutive_failures = 0
            except Exception as e:
                consecutive_failures += 1
                if consecutive_failures <= 3:
                    print(f"[CLIENT] Send error #{seq}: {e}")
                elif consecutive_failures == MAX_CONSECUTIVE_FAILURES:
                    print(f"[CLIENT] UDP sends failing repeatedly, backing off...")
                seq += 1
                continue

            print(f"[CLIENT] Sent packet #{seq}")

            await manager.send_data({
                "type": "send",
                "seq": seq,
            })

            seq += 1

        # ──────────────────────────────────────────
        # RECEIVE ACKs (non-blocking, drain queue)
        # ──────────────────────────────────────────
        for _ in range(cwnd_int + 4):   # drain up to cwnd+4 ACKs per tick
            try:
                data, _ = await asyncio.wait_for(
                    loop.sock_recvfrom(sock, 1024),
                    timeout=0.05
                )
                raw = data.decode("utf-8", errors="ignore")

                if raw.startswith("ACK:"):
                    ack_seq = int(raw.split(":")[1])

                    if ack_seq in unacked:
                        del unacked[ack_seq]
                        reliability.on_acked(ack_seq)
                        metrics.packet_acked(ack_seq)
                        congestion.on_ack()
                        print(f"[CLIENT] ACK #{ack_seq} ✅  cwnd={congestion.cwnd:.2f}")

            except asyncio.TimeoutError:
                break   # No more ACKs in the queue right now
            except Exception:
                break

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