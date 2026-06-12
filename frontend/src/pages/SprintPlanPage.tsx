import React from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import { Calendar, User, Info, BarChart2 } from "lucide-react";

const MEMBER_COLORS: Record<string, string> = {
  "USR-1": "#3d7eff",
  "USR-2": "#22d58a",
  "USR-3": "#a78bfa",
  "USR-4": "#f5a623",
  "USR-5": "#22d3ee",
};

const MEMBER_NAMES: Record<string, string> = {
  "USR-1": "Priya S.",
  "USR-2": "James O.",
  "USR-3": "Meera N.",
  "USR-4": "Carlos R.",
  "USR-5": "Aisha O.",
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  todo:        { label: "To Do",       cls: "badge-gray" },
  in_progress: { label: "In Progress", cls: "badge-blue" },
  review:      { label: "In Review",   cls: "badge-purple" },
  done:        { label: "Done",        cls: "badge-green" },
};

export default function SprintPlanPage() {
  const { data: sprint, loading } = useApi(() => api.getCurrentSprint());
  const { data: history }        = useApi(() => api.getSprintHistory());

  if (loading) return <div className="loading-spinner"><div className="pulse" />Loading sprint plan...</div>;

  const tickets = sprint?.tickets ?? [];
  const DAYS = 10;

  const velocityHistory = history?.sprints ?? [];
  const avgVel = velocityHistory.length
    ? Math.round(velocityHistory.reduce((s: number, h: any) => s + h.velocity, 0) / velocityHistory.length)
    : 36;

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Sprint {sprint?.sprint_number} Plan</h1>
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            {sprint?.start_date} → {sprint?.end_date}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={styles.statChip}>
            <BarChart2 size={13} color="var(--green)" />
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--green)", fontWeight: 700 }}>{sprint?.total_capacity_points}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>pts committed</span>
          </div>
          <div style={styles.statChip}>
            <BarChart2 size={13} color="var(--purple)" />
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--purple)", fontWeight: 700 }}>{avgVel}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>avg velocity</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div style={styles.notesBanner}>
        <Info size={13} color="var(--cyan)" />
        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{sprint?.notes}</span>
      </div>

      {/* Gantt */}
      <div className="card" style={{ marginBottom: 16, overflowX: "auto" }}>
        <div style={styles.cardTitle}>Gantt Timeline</div>
        <div style={{ minWidth: 700 }}>
          {/* Day headers */}
          <div style={styles.ganttHeader}>
            <div style={styles.ganttTicketCol}>Ticket</div>
            {Array.from({ length: DAYS }, (_, i) => (
              <div key={i} style={styles.ganttDayCell}>D{i + 1}</div>
            ))}
            <div style={styles.ganttStatusCol}>Status</div>
          </div>
          {/* Rows */}
          {tickets.map((t: any) => {
            const color = MEMBER_COLORS[t.assignee] ?? "var(--accent)";
            const start = t.sprint_day_start - 1;
            const len   = t.estimated_days;
            return (
              <div key={t.id} style={styles.ganttRow}>
                <div style={styles.ganttTicketCol}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{t.id}</span>
                      <span style={{ ...styles.memberDot, background: color }} title={MEMBER_NAMES[t.assignee]} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{MEMBER_NAMES[t.assignee]}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{t.title}</span>
                  </div>
                </div>
                {Array.from({ length: DAYS }, (_, i) => {
                  const inBar  = i >= start && i < start + len;
                  const isFirst = i === start;
                  const isLast  = i === start + len - 1;
                  return (
                    <div key={i} style={styles.ganttDayCell}>
                      {inBar && (
                        <div style={{
                          ...styles.ganttBar,
                          background: color,
                          opacity: t.status === "done" ? 0.5 : 0.85,
                          borderRadius: `${isFirst ? 4 : 0}px ${isLast ? 4 : 0}px ${isLast ? 4 : 0}px ${isFirst ? 4 : 0}px`,
                        }}>
                          {isFirst && <span style={{ fontSize: 10, color: "#fff", padding: "0 4px", fontWeight: 700 }}>{t.estimate?.points}p</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={styles.ganttStatusCol}>
                  <span className={`badge ${STATUS_LABEL[t.status]?.cls ?? "badge-gray"}`}>
                    {STATUS_LABEL[t.status]?.label ?? t.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legendRow}>
        {Object.entries(MEMBER_NAMES).map(([id, name]) => (
          <div key={id} style={styles.legendItem}>
            <div style={{ ...styles.memberDot, background: MEMBER_COLORS[id] }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{name}</span>
          </div>
        ))}
      </div>

      {/* Deferred */}
      <div className="card">
        <div style={styles.cardTitle}>Deferred to Sprint {(sprint?.sprint_number ?? 9) + 1}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {(sprint?.deferred ?? []).map((id: string) => (
            <span key={id} style={styles.deferredChip}>{id}</span>
          ))}
        </div>
      </div>

      {/* Velocity table */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={styles.cardTitle}>Sprint History</div>
        <table style={styles.table}>
          <thead>
            <tr style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {["Sprint", "Start", "End", "Committed", "Completed", "Velocity"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {velocityHistory.map((s: any) => (
              <tr key={s.sprint} style={styles.tr}>
                <td style={styles.td}><span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>S{s.sprint}</span></td>
                <td style={styles.td}>{s.start}</td>
                <td style={styles.td}>{s.end}</td>
                <td style={styles.td}>{s.committed}</td>
                <td style={styles.td}>
                  <span style={{ color: s.completed >= s.committed ? "var(--green)" : "var(--amber)" }}>{s.completed}</span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{s.velocity}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
  statChip: {
    display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
    background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8,
  },
  notesBanner: {
    display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 14px",
    background: "var(--cyan-dim)", border: "1px solid var(--cyan)", borderRadius: 8,
    marginBottom: 14, fontSize: 13, lineHeight: 1.5,
  },
  cardTitle: {
    fontSize: 12, fontWeight: 600, color: "var(--text-muted)",
    textTransform: "uppercase" as const, letterSpacing: "0.06em",
    fontFamily: "var(--font-mono)", marginBottom: 16,
  },
  ganttHeader: {
    display: "flex", alignItems: "center",
    borderBottom: "1px solid var(--border)", paddingBottom: 8, marginBottom: 4,
  },
  ganttTicketCol: {
    width: 260, flexShrink: 0,
    fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)",
    textTransform: "uppercase" as const, letterSpacing: "0.05em",
  },
  ganttDayCell: {
    flex: 1, textAlign: "center" as const, height: 40,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)",
  },
  ganttStatusCol: {
    width: 100, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "flex-end",
  },
  ganttRow: {
    display: "flex", alignItems: "center",
    borderBottom: "1px solid var(--border-subtle)", padding: "8px 0",
  },
  ganttBar: {
    width: "100%", height: 22,
    display: "flex", alignItems: "center",
  },
  memberDot: {
    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
  },
  legendRow: {
    display: "flex", gap: 16, marginTop: -8, marginBottom: 14,
    flexWrap: "wrap" as const,
  },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  deferredChip: {
    padding: "6px 12px", background: "var(--bg-elevated)",
    border: "1px solid var(--border)", borderRadius: 6,
    fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)",
  },
  table: { width: "100%", borderCollapse: "collapse" as const },
  th: { padding: "6px 12px", textAlign: "left" as const, fontFamily: "var(--font-mono)", textTransform: "uppercase" as const, letterSpacing: "0.05em" },
  td: { padding: "8px 12px", fontSize: 13, color: "var(--text-primary)" },
  tr: { borderBottom: "1px solid var(--border-subtle)" },
};
