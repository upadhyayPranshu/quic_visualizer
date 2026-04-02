import time

class ReliabilityTracker:
    """
    Tracks unacked packets and identifies which ones have timed out
    so they can be retransmitted.
    """

    def __init__(self, timeout_seconds: float = 1.0):
        self.unacked: dict[int, float] = {}  # seq -> send_time
        self.timeout_seconds = timeout_seconds
        self.total_retransmits = 0

    def on_sent(self, seq: int):
        """Record that a packet was sent."""
        self.unacked[seq] = time.monotonic()

    def on_acked(self, seq: int):
        """Mark a packet as acknowledged — remove from unacked."""
        self.unacked.pop(seq, None)

    def get_timed_out(self) -> list[int]:
        """Return a list of seq numbers that have exceeded the timeout."""
        now = time.monotonic()
        timed_out = [
            seq for seq, sent_at in self.unacked.items()
            if now - sent_at > self.timeout_seconds
        ]
        return timed_out

    def on_retransmit(self, seq: int):
        """Reset the send time for a retransmitted packet."""
        self.unacked[seq] = time.monotonic()
        self.total_retransmits += 1

    def clear(self):
        """Clear all state (e.g. on simulation reset)."""
        self.unacked.clear()
        self.total_retransmits = 0
