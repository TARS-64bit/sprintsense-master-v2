import React from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar
} from "recharts";
import { AlertTriangle, TrendingDown, Zap } from "lucide-react";

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, padding: "8px 12px", background: "var(--bg-overlay)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value ?? "-"}</div>
    </div>
  );
}

export default function ForecastPage() {
  const { data: slippage, loading: sl } = useApi(() => api.getSlippage());
  const { data: velocity, loading: vl } = useApi(() => api.getVelocity());
  const { data: burndown }              = useApi(() => api.getBurndown());

  if (sl || vl) return <div className="loading-spinner"><div className="pulse" />Loading forecast...</div>;

  const currentProb = slippage?.current_probability ?? 0.63;
  const probPct     = Math.round(currentProb * 100);
  const probColor   = currentProb >= 0.8 ? "var(--green)" : currentProb >= 0.6 ? "var(--amber)" : "var(--red)";

  /*
   * Data shapes already prepared for you — use these in your chart implementations.
   *
   *  forecastData : Array<{ day: string, prob: number, remaining: number, date: string }>
   *    - day       e.g. "D1" .. "D10"
   *    - prob      completion probability as integer percentage  (e.g. 91)
   *    - remaining story points still to burn
   *
   *  velHistory   : Array<{ sprint: string, velocity: number, avg: number }>
   *    - sprint    e.g. "S1" .. "S8"
   *    - velocity  actual velocity for that sprint
   *    - avg       team average (same value for every row — use as a reference line)
   *
   *  burndownChart : Array<{ day: string, ideal: number, actual: number | undefined }>
   *    - ideal     ideal remaining at that day
   *    - actual    undefined for future days (connect nulls = false)
   */
  const forecastData = (slippage?.forecast ?? []).map((f: any) => ({
    day: `D${f.day}`, prob: Math.round(f.completion_probability * 100),
    remaining: f.remaining_points, date: f.date,
  }));
  const velHistory = (velocity?.history ?? []).map((v: number, i: number) => ({
    sprint: `S${i + 1}`, velocity: v, avg: velocity?.average,
  }));
  const burndownChart = burndown ? burndown.days.map((d: string, i: number) => ({
    day: d, ideal: burndown.ideal[i], actual: burndown.actual[i] ?? undefined,
  })) : [];

  const riskColors: Record<string, string> = {
    high: "var(--red)", medium: "var(--amber)", low: "var(--accent)"
  };

  return (
    <div className="page-enter">
      {/* Header — probability badge */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Slippage Forecast</h1>
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            Monte-Carlo simulation · Sprint 9 · 10 000 runs/day
          </p>
        </div>
        <div style={{ ...styles.probCard, borderColor: probColor }}>
          <TrendingDown size={20} color={probColor} />
          <div>
            <div style={{ fontSize: 32, fontFamily: "var(--font-mono)", fontWeight: 700, color: probColor, lineHeight: 1 }}>
              {probPct}%
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Day {slippage?.current_day} · {slippage?.trend}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ flex: 2 }}>
          <div style={styles.cardTitle}>Completion Probability — Daily</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={forecastData} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--amber)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis domain={[30, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
              <ReferenceLine y={70} stroke="var(--green)" label={{ position: 'insideTopLeft', value: 'Target 70%', fill: 'var(--green)', fontSize: 11 }} />
              <ReferenceLine y={50} stroke="var(--red)" label={{ position: 'insideBottomLeft', value: 'Critical 50%', fill: 'var(--red)', fontSize: 11 }} />
              <Area type="monotone" dataKey="prob" stroke="var(--amber)" fill="url(#pGrad)" strokeWidth={2.5} dot={{ r: 4 }} name="Probability %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ flex: 1.5 }}>
          <div style={styles.cardTitle}>Remaining Points</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={forecastData} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <Tooltip cursor={{ fill: "var(--bg-overlay)" }} contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
              <Bar dataKey="remaining" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Points" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ flex: 1.5 }}>
          <div style={styles.cardTitle}>Burndown — Actual vs Ideal</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={burndownChart} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="ideal" stroke="var(--border)" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Ideal" />
              <Line type="monotone" dataKey="actual" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4 }} connectNulls={false} name="Actual" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div style={styles.cardTitle}>Velocity History</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <StatPill label="AVG" value={velocity?.average?.toString()} color="var(--green)" />
            <StatPill label="MIN" value={velocity?.min?.toString()} color="var(--amber)" />
            <StatPill label="MAX" value={velocity?.max?.toString()} color="var(--purple)" />
            <StatPill label="LAST" value={velocity?.last_sprint?.toString()} color="var(--accent)" />
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={velHistory} margin={{ top: 5, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="sprint" tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)" }} />
              <ReferenceLine y={velocity?.average} stroke="var(--text-muted)" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="velocity" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 4 }} name="Velocity" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div style={styles.cardTitle}>At-Risk Items — Sprint 9</div>
        {(!slippage?.at_risk || slippage.at_risk.length === 0) ? (
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 12 }}>No at-risk items</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            {slippage.at_risk.map((item: any) => {
              const Icon = item.risk_level === "high" ? AlertTriangle : item.risk_level === "medium" ? TrendingDown : Zap;
              const bColor = riskColors[item.risk_level] || "var(--accent)";
              const badgeClass = item.risk_level === "high" ? "badge-red" : item.risk_level === "medium" ? "badge-amber" : "badge-blue";

              return (
                <div key={item.ticket_id} style={{ ...styles.riskRow, borderLeft: `4px solid ${bColor}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Icon size={14} color={bColor} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>{item.ticket_id}</span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</span>
                    <span className={`badge ${badgeClass}`}>{item.risk_level} risk</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", paddingLeft: 22 }}>
                    {item.reason}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header:   { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  title:    { fontSize:22, fontWeight:700, letterSpacing:"-0.02em" },
  probCard: { display:"flex", alignItems:"center", gap:14, padding:"14px 20px", border:"2px solid", borderRadius:12, background:"var(--bg-surface)" },
  cardTitle: { fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase" as const, letterSpacing:"0.06em", fontFamily:"var(--font-mono)", marginBottom:12 },
  riskRow:  { background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: "0 8px 8px 0", padding: "12px 16px" },
};
