import React from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { User } from "lucide-react";

const COLORS = ["#3d7eff", "#22d58a", "#a78bfa", "#f5a623", "#22d3ee"];

const MEMBER_WORK: Record<string, { ticket: string; pts: number }[]> = {
  "USR-1": [{ ticket: "TKT-101", pts: 8 }, { ticket: "TKT-103", pts: 5 }],
  "USR-2": [{ ticket: "TKT-110", pts: 3 }, { ticket: "TKT-105", pts: 8 }],
  "USR-3": [{ ticket: "TKT-102", pts: 3 }],
  "USR-4": [{ ticket: "TKT-109", pts: 8 }],
  "USR-5": [],
};

export default function TeamPage() {
  const { data, loading } = useApi(() => api.getTeam());

  if (loading) return <div className="loading-spinner"><div className="pulse" />Loading team...</div>;

  const members = data?.members ?? [];

  const capacityChart = members.map((m: any, i: number) => ({
    name: m.name.split(" ")[0],
    capacity: m.capacity_hours,
    allocated: (MEMBER_WORK[m.id] ?? []).reduce((s: number, w: any) => s + w.pts * 4, 0),
    color: COLORS[i],
  }));

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <h1 style={styles.title}>Team Capacity</h1>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Sprint 9 · {members.length} members
        </p>
      </div>

      {/* Member cards */}
      <div style={styles.memberGrid}>
        {members.map((m: any, i: number) => {
          const color = COLORS[i];
          const work  = MEMBER_WORK[m.id] ?? [];
          const allocHrs = work.reduce((s: number, w: any) => s + w.pts * 4, 0);
          const pct = Math.round((allocHrs / m.capacity_hours) * 100);
          return (
            <div key={m.id} className="card" style={{ ...styles.memberCard, borderTop: `3px solid ${color}` }}>
              <div style={styles.memberTop}>
                <div style={{ ...styles.avatarBig, background: `${color}22`, border: `2px solid ${color}`, color }}>
                  {m.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{m.role}</div>
                </div>
              </div>
              <div style={styles.capacityRow}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Capacity</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color }}>{m.capacity_hours}h</span>
              </div>
              <div style={styles.capacityRow}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Allocated (est.)</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: pct > 90 ? "var(--red)" : pct > 70 ? "var(--amber)" : "var(--green)" }}>
                  {allocHrs}h ({pct}%)
                </span>
              </div>
              <div style={styles.progressBar}>
                <div style={{ ...styles.progressFill, width: `${Math.min(pct, 100)}%`, background: color }} />
              </div>
              <div style={{ marginTop: 10 }}>
                {work.length === 0
                  ? <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No tickets assigned</span>
                  : work.map((w: any) => (
                    <div key={w.ticket} style={styles.workChip}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{w.ticket}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.pts} pts</span>
                    </div>
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Capacity chart */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={styles.cardTitle}>Capacity vs Allocation (hours)</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={capacityChart} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "var(--bg-overlay)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="capacity"  name="Capacity"  fill="#252d3d" radius={[4, 4, 0, 0]} />
            <Bar dataKey="allocated" name="Allocated" radius={[4, 4, 0, 0]}
              fill="var(--accent)"
              label={{ position: "top", fill: "var(--text-muted)", fontSize: 10, formatter: (v: number) => `${v}h` }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
  memberGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  memberCard: { display: "flex", flexDirection: "column", gap: 8 },
  memberTop: { display: "flex", alignItems: "center", gap: 12, marginBottom: 4 },
  avatarBig: {
    width: 44, height: 44, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13,
    flexShrink: 0,
  },
  capacityRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  progressBar: { height: 4, background: "var(--bg-overlay)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2, transition: "width 0.5s ease" },
  workChip: {
    display: "flex", justifyContent: "space-between",
    padding: "4px 8px", background: "var(--bg-elevated)",
    border: "1px solid var(--border)", borderRadius: 5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    fontFamily: "var(--font-mono)", marginBottom: 12,
  },
};
