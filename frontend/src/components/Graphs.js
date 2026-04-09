import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

/**
 * Graphs — Live time-series charts for RTT, Congestion Window, Throughput, and Loss Rate.
 */

const CHART_HEIGHT = 220;

const customTooltipStyle = {
  background: "rgba(15,23,42,0.92)",
  border: "1px solid rgba(56,189,248,0.2)",
  borderRadius: "8px",
  fontSize: "0.8rem",
  color: "#e2e8f0",
};

function GraphCard({ title, data, dataKey, color, unit = "", yMin = 0 }) {
  return (
    <div className="graph-card">
      <h3 className="graph-title" style={{ color }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <LineChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148,163,184,0.12)"
          />
          <XAxis
            hide
            dataKey="time"
          />
          <YAxis
            domain={[yMin, "auto"]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v) =>
              unit ? `${v}${unit}` : String(v)
            }
          />
          <Tooltip
            contentStyle={customTooltipStyle}
            labelFormatter={() => ""}
            formatter={(val) => [
              `${typeof val === "number" ? val.toFixed(2) : val}${unit}`,
              title,
            ]}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Graphs({ metrics }) {
  return (
    <div className="graphs-container">
      <GraphCard
        title="RTT"
        data={metrics}
        dataKey="rtt"
        color="#a78bfa"
        unit=" ms"
        yMin={0}
      />
      <GraphCard
        title="Congestion Window"
        data={metrics}
        dataKey="cwnd"
        color="#22c55e"
        unit=" pkts"
        yMin={0}
      />
      <GraphCard
        title="Throughput"
        data={metrics}
        dataKey="throughput"
        color="#38bdf8"
        unit=" pkt/s"
        yMin={0}
      />
      <GraphCard
        title="Packet Loss Rate"
        data={metrics}
        dataKey="loss_rate"
        color="#f87171"
        unit="%"
        yMin={0}
      />
    </div>
  );
}

export default Graphs;