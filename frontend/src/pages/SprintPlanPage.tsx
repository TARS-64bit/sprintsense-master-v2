import React, { useState, useEffect } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import { Calendar, User, Info, BarChart2, Play } from "lucide-react";

const COLORS = [
  "#3d7eff", "#22d58a", "#a78bfa", "#f5a623", "#22d3ee", "#ff6b6b", "#4ecdc4", "#ffe66d"
];

function getMemberColor(name: string): string {
  if (!name) return "var(--accent)";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  todo:        { label: "To Do",       cls: "badge-gray" },
  in_progress: { label: "In Progress", cls: "badge-blue" },
  review:      { label: "In Review",   cls: "badge-purple" },
  done:        { label: "Done",        cls: "badge-green" },
};

export default function SprintPlanPage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customDates, setCustomDates] = useState(false);

  const { data: sprint, loading, refetch } = useApi(() =>
    customDates && startDate && endDate
      ? api.getCurrentSprint(startDate, endDate)
      : api.getCurrentSprint()
  );

  const { data: history }        = useApi(() => api.getSprintHistory());

  // Set initial dates from server prediction once loaded
  useEffect(() => {
    if (sprint && !customDates) {
      setStartDate(sprint.start_date || "");
      setEndDate(sprint.end_date || "");
    }
  }, [sprint, customDates]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sprintName, setSprintName] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [provider, setProvider] = useState("jira");
  const [starting, setStarting] = useState(false);
  const [startResult, setStartResult] = useState<{ success?: boolean; error?: string; url?: string } | null>(null);

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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              type="date"
              style={styles.dateInput}
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCustomDates(true);
              }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>→</span>
            <input
              type="date"
              style={styles.dateInput}
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCustomDates(true);
              }}
            />
            {customDates && (
              <button
                onClick={() => refetch()}
                style={{ ...styles.button, padding: "4px 8px", fontSize: 11, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                Apply Dates
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            style={{ ...styles.statChip, cursor: "pointer", background: "var(--accent)", color: "#fff", border: "none" }}
            onClick={() => {
              setSprintName(`Sprint ${sprint?.sprint_number || ""}`);
              setIsModalOpen(true);
              setStartResult(null);
            }}
          >
            <Play size={13} color="#fff" fill="#fff" />
            <span style={{ fontWeight: 600, fontSize: 13 }}>Start Sprint</span>
          </button>
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
            const color = getMemberColor(t.assignee);
            const start = t.sprint_day_start - 1;
            const len   = t.estimated_days;
            return (
              <div key={t.id} style={styles.ganttRow}>
                <div style={styles.ganttTicketCol}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)" }}>{t.id}</span>
                      <span style={{ ...styles.memberDot, background: color }} title={t.assignee} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.assignee}</span>
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
        {Array.from(new Set(tickets.map((t: any) => t.assignee).filter(Boolean))).map((name: any) => (
          <div key={name} style={styles.legendItem}>
            <div style={{ ...styles.memberDot, background: getMemberColor(name) }} />
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

      {/* Start Sprint Modal */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>Start Sprint</h2>

            <label style={styles.label}>Provider</label>
            <select
              style={styles.input}
              value={provider}
              onChange={e => setProvider(e.target.value)}
            >
              <option value="jira">Jira</option>
              <option value="github">GitHub</option>
            </select>

            <label style={styles.label}>Sprint Name</label>
            <input
              style={styles.input}
              value={sprintName}
              onChange={e => setSprintName(e.target.value)}
              placeholder="e.g. Sprint 10"
            />

            <label style={styles.label}>Sprint Goal / Description</label>
            <textarea
              style={{ ...styles.input, minHeight: 60 }}
              value={sprintGoal}
              onChange={e => setSprintGoal(e.target.value)}
              placeholder="Optional sprint goal..."
            />

            {startResult && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 6, fontSize: 13,
                background: startResult.success ? "var(--green-dim)" : "var(--red-dim)",
                color: startResult.success ? "var(--green)" : "var(--red)",
                border: `1px solid ${startResult.success ? "var(--green)" : "var(--red)"}`
              }}>
                {startResult.success ? (
                  <>Sprint started successfully! <a href={startResult.url} target="_blank" rel="noreferrer" style={{color: "var(--green)", textDecoration: "underline"}}>View here</a></>
                ) : (
                  <>Error: {startResult.error}</>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button
                style={{ ...styles.button, background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
                onClick={() => setIsModalOpen(false)}
              >
                Close
              </button>
              <button
                style={{ ...styles.button, background: "var(--accent)", color: "#fff", border: "none", opacity: starting ? 0.7 : 1 }}
                disabled={starting}
                onClick={async () => {
                  setStarting(true);
                  setStartResult(null);
                  try {
                    const ticketIds = (sprint?.tickets || []).map((t: any) => t.id);
                    const res = await api.startSprint({
                      provider,
                      name: sprintName,
                      goal: sprintGoal,
                      start_date: sprint?.start_date,
                      end_date: sprint?.end_date,
                      ticket_ids: ticketIds,
                    });
                    setStartResult({ success: res.success, error: res.error, url: res.sprint_url || res.milestone_url });
                  } catch (err: any) {
                    setStartResult({ success: false, error: err.message });
                  } finally {
                    setStarting(false);
                  }
                }}
              >
                {starting ? "Starting..." : "Start Sprint"}
              </button>
            </div>
          </div>
        </div>
      )}

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
  modalOverlay: {
    position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, backdropFilter: "blur(4px)"
  },
  modalContent: {
    background: "var(--bg-surface)", padding: 24, borderRadius: 12,
    width: "100%", maxWidth: 400, border: "1px solid var(--border)",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, marginTop: 12 },
  input: {
    width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)",
    background: "var(--bg-body)", color: "var(--text-primary)", fontSize: 14,
    boxSizing: "border-box" as const, fontFamily: "inherit"
  },
  button: {
    padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  dateInput: {
    padding: "4px 8px", borderRadius: 4, border: "1px solid var(--border)",
    background: "var(--bg-body)", color: "var(--text-primary)", fontSize: 12,
    fontFamily: "var(--font-mono)"
  }
};
