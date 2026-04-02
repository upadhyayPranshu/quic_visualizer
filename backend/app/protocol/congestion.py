class CongestionControl:
    """
    Implements basic TCP Reno-style congestion control:
    - Slow Start: cwnd doubles each RTT (increments by 1 per ACK)
    - Congestion Avoidance: cwnd increments by 1/cwnd per ACK
    - On loss (timeout): ssthresh = cwnd/2, cwnd = 1
    - On duplicate ACK / fast retransmit: ssthresh = cwnd/2, cwnd = ssthresh
    """

    def __init__(self):
        self.cwnd: float = 1.0        # Congestion window (packets)
        self.ssthresh: float = 16.0   # Slow-start threshold
        self.total_acks: int = 0

    def on_ack(self):
        """Called when an ACK is received for a new packet."""
        self.total_acks += 1
        if self.cwnd < self.ssthresh:
            # Slow Start: exponential growth
            self.cwnd += 1.0
        else:
            # Congestion Avoidance: additive increase (~1 per RTT)
            self.cwnd += 1.0 / self.cwnd

    def on_loss(self):
        """
        Called on a timeout (retransmission timeout).
        TCP Reno behaviour: ssthresh = floor(cwnd/2), cwnd resets to 1.
        """
        self.ssthresh = max(self.cwnd / 2.0, 2.0)
        self.cwnd = 1.0

    def on_duplicate_ack(self):
        """
        Fast retransmit / fast recovery (simplified).
        Cut ssthresh and cwnd to half (TCP Reno fast recovery entry).
        """
        self.ssthresh = max(self.cwnd / 2.0, 2.0)
        self.cwnd = self.ssthresh

    def reset(self):
        """Reset congestion state (e.g. on simulation restart)."""
        self.cwnd = 1.0
        self.ssthresh = 16.0
        self.total_acks = 0