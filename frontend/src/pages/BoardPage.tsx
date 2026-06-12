import React, { useState } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import { Brain } from "lucide-react";

type Column = "todo" | "in_progress" | "review" | "done";

const COLS: { key: Column; label: string; color: string }[] = [
  { key: "todo",        label: "To Do",       color: "var(--text-muted)" },
  { key: "in_progress", label: "In Progress", color: "var(--accent)" },
  { key: "review",      label: "In Review",   color: "var(--purple)" },
  { key: "done",        label: "Done",        color: "var(--green)" },
];

const LABEL_COLORS: Record<string, string> = {
  auth: "badge-purple", backend: "badge-blue", security: "badge-red",
  frontend: "badge-cyan", analytics: "badge-blue", performance: "badge-amber",
  notifications: "badge-green", ux: "badge-cyan", ai: "badge-purple",
  forecasting: "badge-amber", integration: "badge-gray",
};

export default function BoardPage() {
  const { data, loading } = useApi(() => api.getBoard());
  const [board, setBoard] = useState<Record<Column, any[]> | null>(null);
  const [dragging, setDragging] = useState<{ id: string; from: Column } | null>(null);
  const [dragOver, setDragOver] = useState<Column | null>(null);

  const activeBoard: Record<Column, any[]> = board ?? (data ? data : { todo: [], in_progress: [], review: [], done: [] });

  const handleDragStart = (id: string, from: Column) => setDragging({ id, from });

  /* ---------------------------------------------------------------------------
   * TODO 1 — persistColumnChange()
   * ---------------------------------------------------------------------------
   * Call the backend to save a ticket's new column after a drag-drop.
   *
   * Parameters:
   *   ticketId  : string  — e.g. "TKT-101"
   *   newColumn : Column  — "todo" | "in_progress" | "review" | "done"
   *
   * Steps:
   *   a. Call api.updateTicketStatus(ticketId, newColumn)  (stub in utils/api.ts).
   *   b. The call may fail (network, 404) — catch and log to console.error.
   *      Do not propagate the error; the local board state is already updated.
   *   c. On success, log: console.info(`[Board] ${ticketId} → ${newColumn}`)
   *
   * Acceptance:
   *   - Never throws; board stays updated even if the API call fails.
   *   - Call is fire-and-forget (no await needed in handleDrop).
   * --------------------------------------------------------------------------- */
  async function persistColumnChange(ticketId: string, newColumn: Column): Promise<void> {
    // TODO 1 — implement this function
    throw new Error("persistColumnChange not implemented");
  }

  /* ---------------------------------------------------------------------------
   * TODO 2 — handleDrop()
   * ---------------------------------------------------------------------------
   * Move a dragged ticket to the target column and persist the change.
   *
   * Parameters:
   *   to : Column  — the column being dropped onto
   *
   * Steps:
   *   a. If dragging is null OR dragging.from === to:
   *        setDragging(null); setDragOver(null); return;
   *
   *   b. Copy the source and destination column arrays:
   *        const src = [...activeBoard[dragging.from]]
   *        const dst = [...activeBoard[to]]
   *
   *   c. Find the ticket in src by id:
   *        const idx = src.findIndex((t: any) => t.id === dragging.id)
   *        if idx === -1: reset state and return.
   *
   *   d. Splice the ticket out of src and push it to dst with updated status:
   *        const [ticket] = src.splice(idx, 1)
   *        dst.push({ ...ticket, status: to })
   *
   *   e. Update board state:
   *        setBoard({ ...activeBoard, [dragging.from]: src, [to]: dst })
   *
   *   f. Call persistColumnChange(dragging.id, to)  — fire and forget.
   *
   *   g. Reset drag state: setDragging(null); setDragOver(null)
   *
   * Acceptance:
   *   - Moving within the same column is a no-op (step a).
   *   - The ticket's status field in the new column equals the column key.
   *   - Board re-renders immediately; persistence is async in background.
   * --------------------------------------------------------------------------- */
  const handleDrop = (to: Column) => {
    // TODO 2 — implement this function
    setDragging(null);
    setDragOver(null);
  };

  if (loading) return <div className="loading-spinner"><div className="pulse" />Loading board...</div>;

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <h1 style={styles.title}>Sprint Board</h1>
        <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Sprint 9 · Drag tickets between columns
        </p>
      </div>

      <div style={styles.board}>
        {COLS.map(col => {
          const tickets = activeBoard[col.key] ?? [];
          const isOver  = dragOver === col.key;
          return (
            <div
              key={col.key}
              style={{ ...styles.column, borderColor: isOver ? col.color : "var(--border)", background: isOver ? "rgba(61,126,255,0.04)" : "var(--bg-surface)" }}
              onDragOver={e => { e.preventDefault(); setDragOver(col.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(col.key)}
            >
              <div style={styles.colHeader}>
                <div style={{ ...styles.colDot, background: col.color }} />
                <span style={{ ...styles.colTitle, color: col.color }}>{col.label}</span>
                <span style={styles.colCount}>{tickets.length}</span>
              </div>
              <div style={styles.cardStack}>
                {tickets.map((t: any) => (
                  <TicketCard
                    key={t.id} ticket={t}
                    isDragging={dragging?.id === t.id}
                    onDragStart={() => handleDragStart(t.id, col.key)}
                    onDragEnd={() => setDragging(null)}
                  />
                ))}
                {tickets.length === 0 && (
                  <div style={styles.emptyCol}>Drop here</div>
                )}
              </div>
              <div style={styles.colFooter}>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {tickets.reduce((s: number, t: any) => s + (t.estimate?.points ?? 0), 0)} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TicketCard({ ticket, isDragging, onDragStart, onDragEnd }: any) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{ ...cardStyles.card, opacity: isDragging ? 0.4 : 1, transform: isDragging ? "scale(0.97)" : "scale(1)" }}
    >
      <div style={cardStyles.top}>
        <span style={cardStyles.id}>{ticket.id}</span>
        {ticket.estimate && (
          <div style={cardStyles.pts}>
            <Brain size={10} color="var(--purple)" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--purple)" }}>
              {ticket.estimate.points}
            </span>
          </div>
        )}
      </div>
      <p style={cardStyles.title}>{ticket.title}</p>
      <div style={cardStyles.labels}>
        {(ticket.labels ?? []).slice(0, 3).map((l: string) => (
          <span key={l} className={`badge ${(LABEL_COLORS as any)[l] ?? "badge-gray"}`}>{l}</span>
        ))}
      </div>
    </div>
  );
}

const cardStyles: Record<string, React.CSSProperties> = {
  card:   { background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:8, padding:"12px", cursor:"grab", transition:"all 0.15s", userSelect:"none" },
  top:    { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 },
  id:     { fontFamily:"var(--font-mono)", fontSize:11, color:"var(--accent)" },
  pts:    { display:"flex", alignItems:"center", gap:3 },
  title:  { fontSize:13, fontWeight:500, lineHeight:1.4, marginBottom:8, color:"var(--text-primary)" },
  labels: { display:"flex", gap:4, flexWrap:"wrap" },
};

const styles: Record<string, React.CSSProperties> = {
  header:   { marginBottom:20 },
  title:    { fontSize:22, fontWeight:700, letterSpacing:"-0.02em" },
  board:    { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, alignItems:"start" },
  column:   { border:"1px solid", borderRadius:12, padding:"14px", transition:"all 0.15s", minHeight:300, display:"flex", flexDirection:"column" },
  colHeader: { display:"flex", alignItems:"center", gap:8, marginBottom:14, paddingBottom:12, borderBottom:"1px solid var(--border-subtle)" },
  colDot:   { width:8, height:8, borderRadius:"50%", flexShrink:0 },
  colTitle: { flex:1, fontSize:12, fontWeight:600, fontFamily:"var(--font-mono)", textTransform:"uppercase", letterSpacing:"0.06em" },
  colCount: { width:20, height:20, background:"var(--bg-overlay)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-muted)" },
  cardStack: { flex:1, display:"flex", flexDirection:"column", gap:8 },
  emptyCol: { height:60, border:"1px dashed var(--border)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"var(--text-muted)" },
  colFooter: { marginTop:12, paddingTop:8, borderTop:"1px solid var(--border-subtle)", textAlign:"right" },
};
