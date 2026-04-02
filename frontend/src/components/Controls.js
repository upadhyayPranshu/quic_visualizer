import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Controls panel.
 *
 * Uses refs to always read current values when building the control payload,
 * fixing the stale-closure bug where sliders sent outdated state.
 */
function Controls({ onControl }) {
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [loss, setLoss] = useState(0.1);

  // Refs so sendControl always reads the latest values without stale closures
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const lossRef = useRef(loss);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { lossRef.current = loss; }, [loss]);

  const sendControl = useCallback((overrides = {}) => {
    onControl({
      running: runningRef.current,
      speed: speedRef.current,
      loss: lossRef.current,
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
    </div>
  );
}

export default Controls;