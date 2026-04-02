/**
 * WebSocket service for the QUIC Visualizer dashboard.
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Returns a sendMessage() function so callers never hold a raw socket ref
 * - Calls onMessage(data) for every incoming JSON frame
 * - Calls onStatusChange('connected'|'disconnected'|'reconnecting') for UI status
 */

const WS_URL = process.env.REACT_APP_WS_URL || "ws://127.0.0.1:8000/ws";
const INITIAL_RETRY_DELAY = 1000;  // ms
const MAX_RETRY_DELAY = 10000;     // ms

export function connectWebSocket(onMessage, onStatusChange) {
  let socket = null;
  let retryDelay = INITIAL_RETRY_DELAY;
  let shouldReconnect = true;
  let retryTimer = null;

  function connect() {
    if (!shouldReconnect) return;

    onStatusChange("reconnecting");
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("[WS] Connected to", WS_URL);
      retryDelay = INITIAL_RETRY_DELAY; // Reset backoff
      onStatusChange("connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.warn("[WS] Failed to parse message:", event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("[WS] Error:", err);
    };

    socket.onclose = () => {
      console.warn("[WS] Disconnected");
      onStatusChange("disconnected");
      if (shouldReconnect) {
        console.log(`[WS] Reconnecting in ${retryDelay}ms...`);
        retryTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 1.5, MAX_RETRY_DELAY);
          connect();
        }, retryDelay);
      }
    };
  }

  function sendMessage(payload) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    } else {
      console.warn("[WS] Cannot send — socket not open");
    }
  }

  function disconnect() {
    shouldReconnect = false;
    clearTimeout(retryTimer);
    if (socket) socket.close();
  }

  connect();

  return { sendMessage, disconnect };
}