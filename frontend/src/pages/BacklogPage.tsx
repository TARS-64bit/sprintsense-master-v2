import React, { useState } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import { Search, ChevronDown, ChevronRight, Brain, History } from "lucide-react";

const LABEL_COLORS: Record<string, string> = {
  auth: "badge-purple", backend: "badge-blue", security: "badge-red",
  frontend: "badge-cyan", analytics: "badge-blue", performance: "badge-amber",
  notifications: "badge-green", ux: "badge-cyan", ai: "badge-purple",
  forecasting: "badge-amber", integration: "badge-gray",
};

export default function BacklogPage() {
  const { data, loading } = useApi(() => api.getBacklog());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const tickets = data?.tickets ?? [];
  const filtered = tickets.filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Backlog</h1>
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            {tickets.length} tickets · AI estimates applied
          </p>
        </div>
        <div style={styles.searchBox}>
          <Search size={14} color="var(--text-muted)" />
          <input
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner"><div className="pulse" />Loading backlog...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((t: any) => (
            <TicketRow
              key={t.id} ticket={t}
              expanded={expanded === t.id}
              onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TicketRow({ ticket, expanded, onToggle }: any) {
  const est = ticket.estimate;
  const ptColor = est?.points >= 8 ? "var(--amber)" : est?.points >= 5 ? "var(--accent)" : "var(--green)";

  return (
    <div style={{
      ...styles.ticketCard,
      border: expanded ? "1px solid var(--accent)" : "1px solid var(--border)",
    }}>
      <div style={styles.ticketRow} onClick={onToggle}>
        <div style={styles.ticketLeft}>
          <span style={styles.ticketId}>{ticket.id}</span>
          <span style={styles.ticketTitle}>{ticket.title}</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {ticket.labels.map((l: string) => (
              <span key={l} className={`badge ${LABEL_COLORS[l] ?? "badge-gray"}`}>{l}</span>
            ))}
          </div>
        </div>
        <div style={styles.ticketRight}>
          {est && (
            <div style={styles.estimateChip}>
              <Brain size={12} color="var(--purple)" />
              <span style={{ color: ptColor, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{est.points}</span>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>pts</span>
              <span style={{ color: "var(--text-muted)", fontSize: 11 }}>({est.low}–{est.high})</span>
            </div>
          )}
          <span style={{ color: "var(--text-muted)" }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        </div>
      </div>

      {expanded && (
        <div style={styles.expandedBody}>
          <p style={styles.description}>{ticket.description}</p>

          {est && (
            <div style={styles.estimateBox}>
              <div style={styles.estimateHeader}>
                <Brain size={13} color="var(--purple)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--purple)" }}>AI Estimate</span>
                <span className="badge badge-purple">{est.points} pts</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Range: {est.low}–{est.high}</span>
              </div>
              <p style={styles.rationale}>{est.rationale}</p>
            </div>
          )}

          {ticket.similar_tickets?.length > 0 && (
            <div style={styles.similarBox}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <History size={13} color="var(--cyan)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--cyan)" }}>Similar Past Tickets</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {ticket.similar_tickets.map((h: any) => (
                  <div key={h.id} style={styles.similarRow}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>{h.id}</span>
                    <span style={{ flex: 1, fontSize: 12 }}>{h.title}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--green)" }}>{h.story_points} pts</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.actual_cycle_days}d actual</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{h.completed_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
  title: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    minWidth: 240,
  },
  searchInput: {
    background: "transparent",
    border: "none",
    outline: "none",
    color: "var(--text-primary)",
    fontSize: 13,
    width: "100%",
  },
  ticketCard: {
    background: "var(--bg-surface)",
    borderRadius: 10,
    overflow: "hidden",
    transition: "border-color 0.15s",
  },
  ticketRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    cursor: "pointer",
    gap: 12,
  },
  ticketLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  ticketId: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--accent)",
    flexShrink: 0,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: 500,
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ticketRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  estimateChip: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "4px 10px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 6,
  },
  expandedBody: {
    padding: "0 16px 16px",
    borderTop: "1px solid var(--border-subtle)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    marginTop: 0,
    paddingTop: 14,
  },
  description: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
  },
  estimateBox: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  estimateHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  rationale: {
    fontSize: 12,
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    borderLeft: "2px solid var(--purple)",
    paddingLeft: 10,
    marginLeft: 2,
  },
  similarBox: {
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "12px 14px",
  },
  similarRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px",
    background: "var(--bg-overlay)",
    borderRadius: 6,
  },
};
