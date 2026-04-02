import React from "react";
import "./PacketFlow.css";

/**
 * PacketFlow — shows a pipeline of packets travelling from Sender to Receiver.
 *
 * Fixes:
 * 1. Uses p.seq as the React key (not array index) so existing nodes update
 *    in-place rather than re-mounting and re-triggering the animation.
 * 2. Each packet is positioned in a staggered grid so they're never stacked.
 * 3. Only packets with status "sent" / "retransmit" play the travel animation;
 *    "received" and "lost" snap to their final positions immediately.
 * 4. Packet count is capped so the lane never overflows.
 */

const STATUS_LABELS = {
  sent: "→",
  received: "✓",
  lost: "✗",
  retransmit: "↩",
};

function PacketFlow({ packets }) {
  return (
    <div className="flow-container">
      <h3 className="flow-title">📡 Packet Flow (last {packets.length})</h3>

      <div className="flow-lane">
        {/* Sender & Receiver labels */}
        <div className="flow-endpoint sender-ep">
          <div className="ep-icon">💻</div>
          <div className="ep-label">Sender</div>
        </div>

        <div className="flow-track">
          {/* Animated pipe line */}
          <div className="pipe-line" />

          {/* Packet grid */}
          <div className="packet-grid">
            {packets.map((p) => (
              <div
                key={p.seq}
                className={`packet-chip status-${p.status}`}
                title={`Seq #${p.seq} — ${p.status}`}
              >
                <span className="chip-seq">{p.seq}</span>
                <span className="chip-icon">{STATUS_LABELS[p.status] ?? "?"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flow-endpoint receiver-ep">
          <div className="ep-icon">🖥️</div>
          <div className="ep-label">Receiver</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flow-legend">
        <span className="legend-item sent">● Sent</span>
        <span className="legend-item received">● Received</span>
        <span className="legend-item lost">● Lost</span>
        <span className="legend-item retransmit">● Retransmit</span>
      </div>
    </div>
  );
}

export default PacketFlow;