import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Controls panel.
 *
 * Includes: Play/Pause, Speed, Packet Loss, Window Size, Timeout, Protocol Mode
 */
function Controls({ onControl }) {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [loss, setLoss] = useState(0.1);
  const [windowSize, setWindowSize] = useState(16);
  const [timeout, setTimeout_] = useState(1.0);
  const [protocolMode, setProtocolMode] = useState("selective_repeat");

  // Refs so sendControl always reads the latest values
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const lossRef = useRef(loss);
  const windowRef = useRef(windowSize);
  const timeoutRef = useRef(timeout);
  const protocolRef = useRef(protocolMode);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { lossRef.current = loss; }, [loss]);
  useEffect(() => { windowRef.current = windowSize; }, [windowSize]);
  useEffect(() => { timeoutRef.current = timeout; }, [timeout]);
  useEffect(() => { protocolRef.current = protocolMode; }, [protocolMode]);

  const sendControl = useCallback((overrides = {}) => {
    onControl({
      running: runningRef.current,
      speed: speedRef.current,
      loss: lossRef.current,
      window_size: windowRef.current,
      timeout: timeoutRef.current,
      protocol_mode: protocolRef.current,
      ...overrides,
    });
  }, [onControl]);

  const toggleRunning = () => {
    const next = !runningRef.current;
    setRunning(next);
    sendControl({ running: next });
  };

  const handleSpeed = (e) => {
    const val = parseFloat(e.target.value);
    setSpeed(val);
    sendControl({ speed: val });
  };

  const handleLoss = (e) => {
    const val = parseFloat(e.target.value);
    setLoss(val);
    sendControl({ loss: val });
  };

  const handleWindowSize = (e) => {
    const val = parseInt(e.target.value, 10);
    setWindowSize(val);
    sendControl({ window_size: val });
  };

  const handleTimeout = (e) => {
    const val = parseFloat(e.target.value);
    setTimeout_(val);
    sendControl({ timeout: val });
  };

  const handleProtocolMode = (mode) => {
    setProtocolMode(mode);
    sendControl({ protocol_mode: mode });
  };

  return (
    <div className="controls-panel">
      <h3 className="controls-title">⚙️ Simulation Controls</h3>

      <div className="controls-row">
        {/* Play / Pause */}
        <button
          id="btn-toggle-sim"
          className={`btn-toggle ${running ? "btn-pause" : "btn-play"}`}
          onClick={toggleRunning}
        >
          {running ? "⏸ Pause" : "▶ Resume"}
        </button>

        {/* Speed */}
        <div className="control-group">
          <label className="control-label">
            Speed
            <span className="control-value">{speed.toFixed(1)}×</span>
          </label>
          <input
            id="slider-speed"
            type="range"
            className="slider"
            min="0.5"
            max="4"
            step="0.5"
            value={speed}
            onChange={handleSpeed}
          />
          <div className="slider-ticks">
            <span>0.5×</span><span>2×</span><span>4×</span>
          </div>
        </div>

        {/* Packet Loss */}
        <div className="control-group">
          <label className="control-label">
            Packet Loss
            <span className="control-value">{(loss * 100).toFixed(0)}%</span>
          </label>
          <input
            id="slider-loss"
            type="range"
            className="slider slider-loss"
            min="0"
            max="0.9"
            step="0.05"
            value={loss}
            onChange={handleLoss}
          />
          <div className="slider-ticks">
            <span>0%</span><span>45%</span><span>90%</span>
          </div>
        </div>
      </div>

      {/* Second row: Window Size, Timeout, Protocol Mode */}
      <div className="controls-row" style={{ marginTop: "16px" }}>
        {/* Window Size */}
        <div className="control-group">
          <label className="control-label">
            Window Size
            <span className="control-value">{windowSize} pkts</span>
          </label>
          <input
            id="slider-window"
            type="range"
            className="slider slider-window"
            min="1"
            max="32"
            step="1"
            value={windowSize}
            onChange={handleWindowSize}
          />
          <div className="slider-ticks">
            <span>1</span><span>16</span><span>32</span>
          </div>
        </div>

        {/* Timeout */}
        <div className="control-group">
          <label className="control-label">
            ACK Timeout
            <span className="control-value">{timeout.toFixed(1)}s</span>
          </label>
          <input
            id="slider-timeout"
            type="range"
            className="slider slider-timeout"
            min="0.3"
            max="5"
            step="0.1"
            value={timeout}
            onChange={handleTimeout}
          />
          <div className="slider-ticks">
            <span>0.3s</span><span>2.5s</span><span>5s</span>
          </div>
        </div>

        {/* Protocol Mode */}
        <div className="control-group protocol-group">
          <label className="control-label">Protocol Mode</label>
          <div className="protocol-buttons">
            <button
              id="btn-selective-repeat"
              className={`btn-protocol ${protocolMode === "selective_repeat" ? "btn-protocol-active" : ""}`}
              onClick={() => handleProtocolMode("selective_repeat")}
            >
              Selective Repeat
            </button>
            <button
              id="btn-go-back-n"
              className={`btn-protocol ${protocolMode === "go_back_n" ? "btn-protocol-active" : ""}`}
              onClick={() => handleProtocolMode("go_back_n")}
            >
              Go-Back-N
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Controls;