import React from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar
} from "recharts";
import { AlertTriangle, TrendingDown, Zap } from "lucide-react";

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

      {/* -----------------------------------------------------------------------
       * TODO 1 — Completion Probability Area Chart
       * -----------------------------------------------------------------------
       * Render a row of two cards (flex, gap 12):
       *
       * Card 1 (flex: 2) — "Completion Probability — Daily"
       *   Use <ResponsiveContainer width="100%" height={220}>
       *       <AreaChart data={forecastData} margin={{ top:5, right:16, left:-20, bottom:0 }}>
       *   Add:
       *     - A <defs> gradient fill (id="pGrad") from amber at 35% opacity to transparent
       *     - <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
       *     - <XAxis dataKey="day" />  <YAxis domain={[30,100]} tickFormatter={v=>`${v}%`} />
       *     - <Tooltip formatter={(v)=>`${v}%`} />
       *     - <ReferenceLine y={70} stroke="var(--green)"  label="Target 70%" />
       *     - <ReferenceLine y={50} stroke="var(--red)"    label="Critical 50%" />
       *     - <Area dataKey="prob" stroke="var(--amber)" fill="url(#pGrad)" strokeWidth={2.5}
       *             dot={{ r:4 }} name="Probability %" />
       *
       * Card 2 (flex: 1.5) — "Remaining Points"
       *   Use <BarChart data={forecastData}>
       *     - <Bar dataKey="remaining" fill="var(--accent)" radius={[4,4,0,0]} />
       * ----------------------------------------------------------------------- */}
      <div className="card" style={{ marginBottom: 16, display:"flex", alignItems:"center", justifyContent:"center", height: 240 }}>
        <p style={{ color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontSize:13 }}>
          📊 TODO 1 — render completion probability chart + remaining points bar chart here
        </p>
      </div>

      {/* -----------------------------------------------------------------------
       * TODO 2 — Burndown + Velocity Charts Row
       * -----------------------------------------------------------------------
       * Render another flex row (gap 12):
       *
       * Card 1 (flex: 1.5) — "Burndown — Actual vs Ideal"
       *   Use <LineChart data={burndownChart}>
       *     - Dashed line for "ideal" (stroke="var(--border)", no dots)
       *     - Solid line for "actual" (stroke="var(--accent)", connectNulls=false,
       *       dots at each actual data point)
       *
       * Card 2 (flex: 1) — "Velocity History"
       *   Top section: four <StatPill> components for avg / min / max / last_sprint.
       *   Chart: <LineChart data={velHistory}>
       *     - <ReferenceLine y={velocity?.average} /> — dotted avg line
       *     - <Line dataKey="velocity" stroke="var(--green)" />
       *
       * StatPill component signature:
       *   function StatPill({ label, value, color }: { label:string, value:string, color:string })
       *   Renders a small box with a monospaced label (muted) over a large coloured value.
       * ----------------------------------------------------------------------- */}
      <div className="card" style={{ marginBottom: 16, display:"flex", alignItems:"center", justifyContent:"center", height: 220 }}>
        <p style={{ color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontSize:13 }}>
          📊 TODO 2 — render burndown line chart + velocity history chart here
        </p>
      </div>

      {/* -----------------------------------------------------------------------
       * TODO 3 — At-Risk Items List
       * -----------------------------------------------------------------------
       * Render a card titled "At-Risk Items — Sprint 9".
       *
       * Data: slippage?.at_risk  (array of { ticket_id, title, risk_level, reason })
       *
       * For each item render a row div with:
       *   - Left border coloured by risk level: high=var(--red), medium=var(--amber), low=var(--accent)
       *   - Icon: AlertTriangle for high, TrendingDown for medium, Zap for low  (14px)
       *   - Ticket ID (mono, accent colour)
       *   - Title (bold)
       *   - Badge: "high risk" / "medium risk" / "low risk"
       *     class: badge-red / badge-amber / badge-blue respectively
       *   - Below: reason text (text-secondary, 13px)
       *
       * Render a placeholder "<p>No at-risk items</p>" when the array is empty.
       * ----------------------------------------------------------------------- */}
      <div className="card">
        <div style={styles.cardTitle}>At-Risk Items — Sprint 9</div>
        <p style={{ color:"var(--text-muted)", fontFamily:"var(--font-mono)", fontSize:13, marginTop:12 }}>
          ⚠️ TODO 3 — render at-risk items list here
          ({slippage?.at_risk?.length ?? 0} items available in slippage.at_risk)
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header:   { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 },
  title:    { fontSize:22, fontWeight:700, letterSpacing:"-0.02em" },
  probCard: { display:"flex", alignItems:"center", gap:14, padding:"14px 20px", border:"2px solid", borderRadius:12, background:"var(--bg-surface)" },
  cardTitle: { fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase" as const, letterSpacing:"0.06em", fontFamily:"var(--font-mono)", marginBottom:12 },
};
