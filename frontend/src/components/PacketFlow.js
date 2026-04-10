import React, { useState } from "react";
import "./PacketFlow.css";

/**
 * PacketFlow — shows a pipeline of packets travelling from Sender to Receiver.
 * Includes checksum verification indicator and click-to-inspect functionality.
 */

const STATUS_LABELS = {
  sent: "→",
  received: "✓",
  lost: "✗",
  retransmit: "↩",
};

const STATUS_NAMES = {
  sent: "In Transit",
  received: "Delivered & ACK'd",
  lost: "Lost in Network",
  retransmit: "Retransmitted",
};

/**
 * Generates a fake but realistic-looking hex dump of a packet.
 */
function generateHexDump(seq, data) {
  const header = `00 ${seq.toString(16).padStart(4, '0').match(/.{2}/g).join(' ')} 01 00 ${data.length.toString(16).padStart(2, '0')}`;
  const bytes = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i).toString(16).padStart(2, '0'));
  }
  // Pad to 16 bytes per row
  while (bytes.length % 16 !== 0) bytes.push('00');

  const rows = [];
  const headerRow = `0000: ${header.toUpperCase()}`;
  rows.push(headerRow);
  for (let i = 0; i < bytes.length; i += 16) {
    const offset = (i + 8).toString(16).padStart(4, '0');
    const hex = bytes.slice(i, i + 16).join(' ').toUpperCase();
    const ascii = bytes.slice(i, i + 16).map(b => {
      const c = parseInt(b, 16);
      return c >= 32 && c < 127 ? String.fromCharCode(c) : '.';
    }).join('');
    rows.push(`${offset}: ${hex}  |${ascii}|`);
  }
  return rows.join('\n');
}

function PacketInspector({ packet, onClose }) {
  if (!packet) return null;

  const checksumHex = packet.checksum
    ? `0x${packet.checksum.toString(16).toUpperCase().padStart(8, '0')}`
    : "0x" + Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');

  const payloadStr = `Data-${packet.seq}`;
  const hexDump = generateHexDump(packet.seq, payloadStr);
  const timestamp = new Date().toISOString();

  return (
    <div className="inspector-backdrop" onClick={onClose}>
      <div className="inspector-modal" onClick={(e) => e.stopPropagation()}>
        <div className="inspector-header">
          <h3>🔍 Packet Inspector — #{packet.seq}</h3>
          <button className="inspector-close" onClick={onClose}>✕</button>
        </div>

        <div className="inspector-body">
          {/* Protocol Header */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">📋 Protocol Header</h4>
            <div className="inspector-table">
              <div className="inspector-row">
                <span className="inspector-key">Sequence Number</span>
                <span className="inspector-val">{packet.seq}</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">ACK Flag</span>
                <span className="inspector-val">
                  {packet.status === "received" ? "True (ACK'd)" : "False (Pending)"}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Status</span>
                <span className={`inspector-val inspector-status-${packet.status}`}>
                  {STATUS_NAMES[packet.status] || packet.status}
                </span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Timestamp</span>
                <span className="inspector-val">{timestamp}</span>
              </div>
              {packet.protocol && (
                <div className="inspector-row">
                  <span className="inspector-key">Protocol Mode</span>
                  <span className="inspector-val">
                    {packet.protocol === "go_back_n" ? "Go-Back-N" : "Selective Repeat"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Detection */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">🛡️ Error Detection (CRC32)</h4>
            <div className="inspector-table">
              <div className="inspector-row">
                <span className="inspector-key">Algorithm</span>
                <span className="inspector-val">CRC-32 (ISO 3309)</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Checksum</span>
                <span className="inspector-val mono">{checksumHex}</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Verification</span>
                <span className={`inspector-val ${packet.checksum_ok !== false ? "inspector-ok" : "inspector-fail"}`}>
                  {packet.checksum_ok !== false ? "✅ PASS — Integrity verified" : "❌ FAIL — Corrupted in transit"}
                </span>
              </div>
            </div>
          </div>

          {/* Payload */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">📦 Payload</h4>
            <div className="inspector-table">
              <div className="inspector-row">
                <span className="inspector-key">Content</span>
                <span className="inspector-val mono">"{payloadStr}"</span>
              </div>
              <div className="inspector-row">
                <span className="inspector-key">Size</span>
                <span className="inspector-val">{payloadStr.length} bytes</span>
              </div>
            </div>
          </div>

          {/* Raw Hex Dump */}
          <div className="inspector-section">
            <h4 className="inspector-section-title">🔢 Raw Byte View</h4>
            <pre className="inspector-hex">{hexDump}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function PacketFlow({ packets }) {
  const [inspectedPacket, setInspectedPacket] = useState(null);

  return (
    <div className="flow-container">
      <h3 className="flow-title">
        📡 Packet Flow (last {packets.length})
        <span className="flow-hint">Click a packet to inspect</span>
      </h3>

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
                title={`Click to inspect Packet #${p.seq}`}
                onClick={() => setInspectedPacket(p)}
                style={{ cursor: "pointer" }}
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

      {/* Packet Inspector Modal */}
      {inspectedPacket && (
        <PacketInspector
          packet={inspectedPacket}
          onClose={() => setInspectedPacket(null)}
        />
      )}
    </div>
  );
}

export default PacketFlow;