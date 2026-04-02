import time

# EWMA smoothing factor for RTT (alpha = 0.125 matches RFC 6298)
RTT_ALPHA = 0.125

class Metrics:
    """
    Tracks simulation metrics:
    - RTT (with EWMA smoothing so graphs are not jagged)
    - Throughput (acknowledged packets / second)
    - Packet loss rate
    - Retransmit count
    """

    def __init__(self):
        self.sent_times: dict[int, float] = {}  # seq -> send timestamp
        self.smoothed_rtt: float = 0.0          # EWMA RTT in ms
        self.total_sent: int = 0
        self.total_acked: int = 0
        self.total_lost: int = 0
        self.total_retransmits: int = 0
        self.start_time: float = time.monotonic()

    def packet_sent(self, seq: int):
        """Record that a packet was transmitted."""
        self.sent_times[seq] = time.monotonic()
        self.total_sent += 1

    def packet_acked(self, seq: int) -> float | None:
        """
        Record that an ACK was received. Returns measured RTT in ms.
        Updates EWMA smoothed RTT.
        """
        if seq in self.sent_times:
            rtt_ms = (time.monotonic() - self.sent_times[seq]) * 1000.0
            del self.sent_times[seq]
            self.total_acked += 1

            # EWMA smoothing (RFC 6298 style)
            if self.smoothed_rtt == 0.0:
                self.smoothed_rtt = rtt_ms
            else:
                self.smoothed_rtt = (
                    (1 - RTT_ALPHA) * self.smoothed_rtt + RTT_ALPHA * rtt_ms
                )
            return rtt_ms
        return None

    def packet_lost(self):
        """Record a detected packet loss."""
        self.total_lost += 1

    def packet_retransmitted(self):
        """Record a retransmission event."""
        self.total_retransmits += 1

    def get_throughput(self) -> float:
        """Return acknowledged packets per second since start."""
        elapsed = time.monotonic() - self.start_time
        if elapsed <= 0:
            return 0.0
        return round(self.total_acked / elapsed, 3)

    def get_loss_rate(self) -> float:
        """Return fraction of sent packets that were lost."""
        if self.total_sent == 0:
            return 0.0
        return round(self.total_lost / self.total_sent, 3)

    @property
    def rtt(self) -> float:
        """Current smoothed RTT in ms."""
        return round(self.smoothed_rtt, 3)

    def reset(self):
        """Reset all metrics (e.g. on simulation restart)."""
        self.sent_times.clear()
        self.smoothed_rtt = 0.0
        self.total_sent = 0
        self.total_acked = 0
        self.total_lost = 0
        self.total_retransmits = 0
        self.start_time = time.monotonic()