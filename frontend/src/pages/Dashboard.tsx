import React from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  TrendingDown, AlertTriangle, CheckCircle, Clock,
  Zap, Users, Activity, ArrowRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { data: slippage }  = useApi(() => api.getSlippage());
  const { data: sprint }    = useApi(() => api.getCurrentSprint());
  const { data: burndown }  = useApi(() => api.getBurndown());
  const { data: velocity }  = useApi(() => api.getVelocity());
  const { data: digest }    = useApi(() => api.getDigest());
  const { data: teamData }  = useApi(() => api.getTeam());
  const navigate = useNavigate();

  const totalCapacity = teamData?.members?.reduce((sum: number, m: any) => sum + (m.capacity_hours || 0), 0) ?? 0;

  const currentProb = slippage?.current_probability ?? 0.63;
  const probPct = Math.round(currentProb * 100);
  const probColor = currentProb >= 0.8 ? "var(--green)" : currentProb >= 0.6 ? "var(--amber)" : "var(--red)";

  const burndownChart = burndown ? burndown.days.map((d: string, i: number) => ({
    day: d,
    ideal: burndown.ideal[i],
    actual: burndown.actual[i] ?? undefined,
  })) : [];

  const forecastChart = slippage?.forecast?.map((f: any) => ({
    day: `D${f.day}`,
    prob: Math.round(f.completion_probability * 100),
  })) ?? [];

  const velocityChart = velocity?.history?.map((v: number, i: number) => ({
    sprint: `S${i + 1}`, velocity: v
  })) ?? [];

  const doneCount = sprint?.tickets?.filter((t: any) => t.status === "done").length ?? 0;
  const totalCount = sprint?.tickets?.length ?? 0;

  return (
    <div className="page-enter">
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sprint 9 Overview</h1>
          <p style={styles.subtitle}>Feb 4 – Feb 17, 2025 &nbsp;·&nbsp; Day 6 of 10</p>
        </div>
        <div style={styles.headerRight}>
          <div style={{ ...styles.probGauge, borderColor: probColor }}>
            <span style={{ ...styles.probNum, color: probColor }}>{probPct}%</span>
            <span style={styles.probLabel}>completion<br />probability</span>
          </div>
        </div>
      </div>

      {/* Alert banner */}
      {slippage?.at_risk?.length > 0 && (
        <div style={styles.alertBanner} onClick={() => navigate("/forecast")}>
          <AlertTriangle size={14} color="var(--amber)" />
          <span style={{ flex: 1 }}>
            <strong style={{ color: "var(--amber)" }}>Sprint slipping</strong>
            &nbsp;— {slippage.at_risk.length} tickets at risk.
            Completion probability dropped to <strong>{probPct}%</strong>.
          </span>
          <ArrowRight size={13} color="var(--text-muted)" />
        </div>
      )}

      {/* KPI Row */}
      <div style={styles.kpiRow}>
        <KpiCard icon={<Activity size={16} color="var(--accent)" />}
          label="Points Remaining" value="23"
          sub="of 36 committed" color="var(--accent)" />
        <KpiCard icon={<CheckCircle size={16} color="var(--green)" />}
          label="Tickets Done" value={`${doneCount}/${totalCount}`}
          sub="in sprint" color="var(--green)" />
        <KpiCard icon={<Clock size={16} color="var(--amber)" />}
          label="At Risk" value={`${slippage?.at_risk?.length ?? 3}`}
          sub="tickets" color="var(--amber)" />
        <KpiCard icon={<Zap size={16} color="var(--purple)" />}
          label="Avg Velocity" value={`${velocity?.average ?? 0}`}
          sub="pts / sprint" color="var(--purple)" />
        <KpiCard icon={<Users size={16} color="var(--cyan)" />}
          label="Team Capacity" value={`${totalCapacity} hrs`}
          sub="this sprint" color="var(--cyan)" />
      </div>

      {/* Charts row */}
      <div style={styles.chartsRow}>
        {/* Burndown */}
        <div className="card" style={{ flex: 2 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Burndown</span>
            <span className="badge badge-amber">Day 6</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={burndownChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3d7eff" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3d7eff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="ideal" stroke="var(--border)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} name="Ideal" />
              <Area type="monotone" dataKey="actual" stroke="var(--accent)" fill="url(#actualGrad)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} name="Actual" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Slippage prob */}
        <div className="card" style={{ flex: 1.5 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Completion Probability</span>
            <span className="badge badge-red">Declining</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={forecastChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="probGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5a623" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f5a623" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <ReferenceLine y={70} stroke="var(--border)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="prob" stroke="var(--amber)" fill="url(#probGrad)" strokeWidth={2} dot={{ r: 3, fill: "var(--amber)" }} name="Prob %" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Velocity history */}
        <div className="card" style={{ flex: 1.2 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Velocity History</span>
            <span className="badge badge-blue">{velocityChart.length} sprints</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={velocityChart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d58a" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#22d58a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="sprint" tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} />
              <Tooltip contentStyle={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="velocity" stroke="var(--green)" fill="url(#velGrad)" strokeWidth={2} dot={false} name="Velocity" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={styles.bottomRow}>
        {/* At risk */}
        <div className="card" style={{ flex: 1 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>At-Risk Tickets</span>
            <span className="badge badge-red">{slippage?.at_risk?.length ?? 3} items</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {(slippage?.at_risk ?? []).map((item: any) => (
              <RiskRow key={item.ticket_id} item={item} />
            ))}
          </div>
        </div>

        {/* Standup digest */}
        <div className="card" style={{ flex: 1.2 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Standup Digest</span>
            <span className="badge badge-blue">Day 6 · Feb 11</span>
          </div>
          <div style={styles.digest}>
            <pre style={styles.digestText}>{digest?.digest ?? ""}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: any) {
  return (
    <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>
    </div>
  );
}

function RiskRow({ item }: any) {
  const colors: any = { high: "badge-red", medium: "badge-amber", low: "badge-blue" };
  return (
    <div style={{ padding: "10px 12px", background: "var(--bg-elevated)", borderRadius: 8, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--accent)" }}>{item.ticket_id}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{item.title}</span>
        <span className={`badge ${colors[item.risk_level]}`}>{item.risk_level}</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.reason}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    color: "var(--text-muted)",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    marginTop: 4,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  probGauge: {
    padding: "12px 20px",
    border: "2px solid",
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    background: "var(--bg-surface)",
  },
  probNum: {
    fontSize: 28,
    fontWeight: 700,
    fontFamily: "var(--font-mono)",
    lineHeight: 1,
  },
  probLabel: {
    fontSize: 11,
    color: "var(--text-muted)",
    textAlign: "center",
    lineHeight: 1.3,
  },
  alertBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    background: "var(--amber-dim)",
    border: "1px solid var(--amber)",
    borderRadius: 10,
    marginBottom: 20,
    cursor: "pointer",
    fontSize: 13,
    color: "var(--text-primary)",
  },
  kpiRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },
  chartsRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },
  bottomRow: {
    display: "flex",
    gap: 12,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontFamily: "var(--font-mono)",
  },
  digest: {
    marginTop: 12,
    maxHeight: 280,
    overflowY: "auto",
    background: "var(--bg-elevated)",
    borderRadius: 8,
    padding: 14,
  },
  digestText: {
    fontSize: 12,
    color: "var(--text-secondary)",
    whiteSpace: "pre-wrap",
    fontFamily: "var(--font-sans)",
    lineHeight: 1.7,
  },
};
