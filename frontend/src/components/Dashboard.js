import React, { useEffect, useState, useRef, useCallback } from "react";
import { connectWebSocket } from "../services/websocket";
import PacketFlow from "./PacketFlow";
import Graphs from "./Graphs";
import Controls from "./Controls";

const MAX_PACKETS = 24;   // Number of packets to show in the flow lane
const MAX_METRICS = 60;   // Number of data-points to keep in graphs
const MAX_LOGS = 80;      // Max log entries to keep

function Dashboard() {
  // Ordered list of packets shown in the flow lane
  const [packets, setPackets] = useState([]);

  // Time-series data for graphs
  const [metrics, setMetrics] = useState([]);

  // Transmission logs
  const [logs, setLogs] = useState([]);

  // Live summary counters
  const [summary, setSummary] = useState({
    cwnd: 1,
    rtt: 0,
    throughput: 0,
    total_sent: 0,
    total_acked: 0,
    total_lost: 0,
    total_retransmits: 0,
    loss_rate: 0,
    window_size: 16,
    timeout: 1.0,
    protocol_mode: "selective_repeat",
  });

  // WebSocket status: 'connected' | 'disconnected' | 'reconnecting'
  const [wsStatus, setWsStatus] = useState("reconnecting");

  // sendMessage ref — stable across renders
  const sendMessageRef = useRef(null);

  // ── Packet state updater ──────────────────────────────────────────────────
  const packetMapRef = useRef(new Map());

  const updatePacketStatus = useCallback((seq, status, extra = {}) => {
    packetMapRef.current.set(seq, { status, ...extra });

    setPackets(() => {
      const entries = Array.from(packetMapRef.current.entries());
      const trimmed = entries.slice(-MAX_PACKETS);
      return trimmed.map(([s, info]) => ({
        seq: s,
        status: info.status,
        checksum_ok: info.checksum_ok !== undefined ? info.checksum_ok : true,
        checksum: info.checksum || null,
        protocol: info.protocol || "",
        reason: info.reason || "",
      }));
    });
  }, []);

  // Log ref for auto-scroll
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollTop = logEndRef.current.scrollHeight;
    }
  }, [logs]);

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
    const { sendMessage, disconnect } = connectWebSocket(
      // onMessage
      (data) => {
        switch (data.type) {
          case "send":
            updatePacketStatus(data.seq, "sent", {
              checksum_ok: data.checksum_ok,
              checksum: data.checksum,
            });
            break;

          case "receive":
            updatePacketStatus(data.seq, "received", {
              checksum_ok: data.checksum_ok,
              checksum: data.checksum,
            });
            break;

          case "loss":
            updatePacketStatus(data.seq, "lost", {
              checksum_ok: data.checksum_ok,
              reason: data.reason,
            });
            break;

          case "retransmit":
            updatePacketStatus(data.seq, "retransmit", {
              checksum_ok: data.checksum_ok,
              checksum: data.checksum,
              protocol: data.protocol,
            });
            break;

          case "metrics":
            setSummary({
              cwnd: data.cwnd ?? 1,
              rtt: data.rtt ?? 0,
              throughput: data.throughput ?? 0,
              total_sent: data.total_sent ?? 0,
              total_acked: data.total_acked ?? 0,
              total_lost: data.total_lost ?? 0,
              total_retransmits: data.total_retransmits ?? 0,
              loss_rate: data.loss_rate ?? 0,
              window_size: data.window_size ?? 16,
              timeout: data.timeout ?? 1.0,
              protocol_mode: data.protocol_mode ?? "selective_repeat",
            });
            setMetrics((prev) => [
              ...prev.slice(-(MAX_METRICS - 1)),
              {
                time: Date.now(),
                rtt: data.rtt ?? 0,
                cwnd: data.cwnd ?? 0,
                throughput: data.throughput ?? 0,
                loss_rate: (data.loss_rate ?? 0) * 100,
              },
            ]);
            break;

          case "log":
            setLogs((prev) => [
              ...prev.slice(-(MAX_LOGS - 1)),
              {
                time: data.timestamp
                  ? new Date(data.timestamp * 1000).toLocaleTimeString()
                  : new Date().toLocaleTimeString(),
                message: data.message,
              },
            ]);
            break;

          case "config":
            // Initial config from server
            break;

          case "control_ack":
            break;

          default:
            break;
        }
      },
      // onStatusChange
      (status) => setWsStatus(status)
    );

    sendMessageRef.current = sendMessage;

    return () => disconnect();
  }, [updatePacketStatus]);

  // ── Control message sender ───────────────────────────────────────────────
  const handleControl = useCallback((payload) => {
    if (sendMessageRef.current) {
      sendMessageRef.current({ type: "control", ...payload });
    }
  }, []);

  // ── Connection badge colour ───────────────────────────────────────────────
  const statusColor = {
    connected: "#22c55e",
    disconnected: "#ef4444",
    reconnecting: "#f59e0b",
  }[wsStatus];

  const protocolLabel = summary.protocol_mode === "go_back_n"
    ? "Go-Back-N"
    : "Selective Repeat";

  return (
    <div className="container">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="dashboard-header">
        <div className="header-info">
          <span className="protocol-badge">{protocolLabel}</span>
          <span className="config-info">
            Window: {summary.window_size} · Timeout: {summary.timeout.toFixed(1)}s
          </span>
        </div>
        <div className="status-badge" style={{ "--badge-color": statusColor }}>
          <span className="status-dot" />
          {wsStatus.charAt(0).toUpperCase() + wsStatus.slice(1)}
        </div>
      </div>

      {/* ── Summary cards ──────────────────────────────────── */}
      <div className="stat-grid">
        <StatCard label="Congestion Window" value={summary.cwnd.toFixed(2)} unit="pkts" color="#38bdf8" />
        <StatCard label="Smoothed RTT" value={summary.rtt.toFixed(1)} unit="ms" color="#a78bfa" />
        <StatCard label="Throughput" value={summary.throughput.toFixed(2)} unit="pkts/s" color="#22c55e" />
        <StatCard label="Loss Rate" value={(summary.loss_rate * 100).toFixed(1)} unit="%" color="#f97316" />
        <StatCard label="Sent" value={summary.total_sent} color="#60a5fa" />
        <StatCard label="Received" value={summary.total_acked} color="#4ade80" />
        <StatCard label="Lost" value={summary.total_lost} color="#f87171" />
        <StatCard label="Retransmits" value={summary.total_retransmits} color="#fb923c" />
      </div>

      {/* ── Controls ───────────────────────────────────────── */}
      <Controls onControl={handleControl} />

      {/* ── Packet flow lane ───────────────────────────────── */}
      <PacketFlow packets={packets} />

      {/* ── Graphs ─────────────────────────────────────────── */}
      <Graphs metrics={metrics} />

      {/* ── Transmission Log ────────────────────────────────── */}
      <div className="log-panel">
        <h3 className="log-title">📋 Transmission Log</h3>
        <div className="log-scroll" ref={logEndRef}>
          {logs.length === 0 ? (
            <div className="log-empty">Waiting for transmission events...</div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">{entry.time}</span>
                <span className="log-msg">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit = "", color }) {
  return (
    <div className="stat-card" style={{ "--accent": color }}>
      <div className="stat-value" style={{ color }}>
        {value}
        {unit && <span className="stat-unit">{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default Dashboard;