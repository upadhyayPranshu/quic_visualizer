import React from "react";
import "./PacketFlow.css";

/**
 * PacketFlow — shows a pipeline of packets travelling from Sender to Receiver.
 * Includes checksum verification indicator on each packet.
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
                className={`packet-chip status-${p.status}${p.checksum_ok === false ? " checksum-fail" : ""}`}
                title={`Seq #${p.seq} — ${p.status}${p.checksum_ok === false ? " [CHECKSUM FAIL]" : " [CRC32 ✓]"}${p.protocol ? ` (${p.protocol})` : ""}`}
              >
                <span className="chip-seq">{p.seq}</span>
                <span className="chip-icon">{STATUS_LABELS[p.status] ?? "?"}</span>
                {p.checksum_ok === false && (
                  <span className="chip-checksum-fail" title="Checksum Error">⚠</span>
                )}
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
        <span className="legend-item checksum">⚠ Checksum Fail</span>
      </div>
    </div>
  );
}

export default PacketFlow;