import React from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div>
      {/* sticky top bar */}
      <header className="app-header">
        <div>
          <div className="app-title">🚀 QUIC Visualizer</div>
          <div className="app-subtitle">
            Custom Reliable Data Transfer Protocol over UDP · Sliding Window · Congestion Control · Error Detection
          </div>
        </div>
      </header>

      {/* main content */}
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;