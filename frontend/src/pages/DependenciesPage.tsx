import React, { useEffect, useRef } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import * as d3 from "d3";

/* Hardcoded story-point sizes for node radii — r = 14 + pts */
const TICKET_POINTS: Record<string, number> = {
  "TKT-101": 8, "TKT-102": 3, "TKT-103": 5, "TKT-104": 5,
  "TKT-105": 8, "TKT-106": 8, "TKT-107": 13, "TKT-108": 8,
  "TKT-109": 8, "TKT-110": 3,
};

const STATUS_COLOR: Record<string, string> = {
  in_progress: "#3d7eff",
  review:      "#a78bfa",
  done:        "#22d58a",
  todo:        "#4a5468",
  backlog:     "#4a5468",
};

export default function DependenciesPage() {
  const { data: deps }    = useApi(() => api.getDependencies());
  const { data: backlog } = useApi(() => api.getBacklog());
  const { data: board }   = useApi(() => api.getBoard());
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!deps || !backlog || !svgRef.current) return;

    const edges: { from: string; to: string; reason: string }[] = deps.edges ?? [];
    const tickets = backlog.tickets ?? [];
    const boardState = board;

    /* Derive a status for every node from the live board state */
    const statusMap: Record<string, string> = {};
    if (boardState) {
      ["todo","in_progress","review","done"].forEach((col: string) => {
        (boardState[col] ?? []).forEach((t: any) => { statusMap[t.id] = col; });
      });
    }
    tickets.forEach((t: any) => { if (!statusMap[t.id]) statusMap[t.id] = "backlog"; });

    /* Build node and link arrays for D3 */
    const nodeIds = Array.from(new Set([...edges.map(e => e.from), ...edges.map(e => e.to)]));
    const nodes = nodeIds.map(id => {
      const t = tickets.find((tk: any) => tk.id === id);
      return { id, label: id, title: t?.title ?? id, pts: TICKET_POINTS[id] ?? 5, status: statusMap[id] ?? "backlog" };
    });
    const links = edges.map(e => ({ source: e.from, target: e.to, reason: e.reason }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 700;
    const H = 480;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    /* -------------------------------------------------------------------------
     * TODO — implement the D3 force-directed graph
     * -------------------------------------------------------------------------
     * All data is prepared above: nodes[], links[], W, H, svg selection.
     *
     * Steps:
     *
     * 1. Arrow marker — append to <defs>:
     *      svg.append("defs").append("marker")
     *        .attr("id", "arrow")
     *        .attr("viewBox", "0 -5 10 10")
     *        .attr("refX", 28).attr("refY", 0)
     *        .attr("markerWidth", 6).attr("markerHeight", 6)
     *        .attr("orient", "auto")
     *        .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#3d7eff")
     *
     * 2. Force simulation:
     *      const sim = d3.forceSimulation(nodes as any)
     *        .force("link",      d3.forceLink(links).id((d:any)=>d.id).distance(120))
     *        .force("charge",    d3.forceManyBody().strength(-350))
     *        .force("center",    d3.forceCenter(W/2, H/2))
     *        .force("collision", d3.forceCollide(50))
     *
     * 3. Link lines:
     *      const link = svg.append("g").selectAll("line").data(links).join("line")
     *        .attr("stroke", "#3d7eff").attr("stroke-opacity", 0.55)
     *        .attr("stroke-width", 1.5).attr("marker-end", "url(#arrow)")
     *
     * 4. Link labels (edge reason text, truncated to 28 chars + "…"):
     *      const linkLabel = svg.append("g").selectAll("text").data(links).join("text")
     *        .attr("font-size", 9).attr("fill", "#4a5468")
     *        .attr("font-family", "Space Mono, monospace")
     *        .text((d:any) => d.reason.substring(0, 28) + "…")
     *
     * 5. Node groups with drag behaviour:
     *      const node = svg.append("g").selectAll("g").data(nodes).join("g")
     *        .attr("cursor", "pointer")
     *        .call(d3.drag<any,any>()
     *          .on("start", (event, d:any) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
     *          .on("drag",  (event, d:any) => { d.fx=event.x; d.fy=event.y; })
     *          .on("end",   (event, d:any) => { if (!event.active) sim.alphaTarget(0); d.fx=null; d.fy=null; })
     *        )
     *
     * 6. For each node, append:
     *      a) circle: r = 14 + d.pts, fill = STATUS_COLOR[d.status] at 18% opacity,
     *                 stroke = STATUS_COLOR[d.status], strokeWidth = 2
     *      b) text (ticket ID): dy="-4px", fontSize=10, fontWeight=700, fill="#3d7eff"
     *      c) text (points):    dy="12px", fontSize=9,  fill="#8b95a8", text="${d.pts}p"
     *
     * 7. Tooltip — append a fixed-position <div> to document.body.
     *      On node mouseover: fade in, set innerHTML with id/title/status.
     *      On mousemove: update left/top to follow cursor.
     *      On mouseout: fade out.
     *
     * 8. Tick handler:
     *      sim.on("tick", () => {
     *        link.attr("x1",(d:any)=>d.source.x).attr("y1",(d:any)=>d.source.y)
     *            .attr("x2",(d:any)=>d.target.x).attr("y2",(d:any)=>d.target.y)
     *        linkLabel.attr("x",(d:any)=>(d.source.x+d.target.x)/2)
     *                 .attr("y",(d:any)=>(d.source.y+d.target.y)/2)
     *        node.attr("transform",(d:any)=>`translate(${d.x},${d.y})`)
     *      })
     *
     * 9. Cleanup: return () => { tooltip.remove(); sim.stop(); }
     * ------------------------------------------------------------------------- */

  }, [deps, backlog, board]);

  return (
    <div className="page-enter">
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dependency Graph</h1>
          <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            LLM-inferred implicit + explicit ticket dependencies · drag nodes to rearrange
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { color: "#3d7eff", label: "In Progress" },
            { color: "#a78bfa", label: "Review" },
            { color: "#22d58a", label: "Done" },
            { color: "#4a5468", label: "Not started" },
          ].map(l => (
            <div key={l.label} style={styles.legendItem}>
              <div style={{ width:10, height:10, borderRadius:"50%", background:l.color }} />
              <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG canvas — D3 renders into this element */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <svg ref={svgRef} style={{ width: "100%", height: 480, display: "block" }} />
      </div>

      {/* Dependency edge list (always rendered — no implementation needed) */}
      <div className="card" style={{ marginTop: 14 }}>
        <div style={styles.cardTitle}>Dependency Edges</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
          {(deps?.edges ?? []).map((e: any, i: number) => (
            <div key={i} style={styles.edgeRow}>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--accent)" }}>{e.from}</span>
              <span style={{ color:"var(--text-muted)", fontSize:12 }}>→ blocks →</span>
              <span style={{ fontFamily:"var(--font-mono)", fontSize:12, color:"var(--purple)" }}>{e.to}</span>
              <span style={{ flex:1, fontSize:12, color:"var(--text-secondary)", textAlign:"right" }}>{e.reason}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header:   { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  title:    { fontSize:22, fontWeight:700, letterSpacing:"-0.02em" },
  cardTitle: { fontSize:12, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase" as const, letterSpacing:"0.06em", fontFamily:"var(--font-mono)" },
  legendItem: { display:"flex", alignItems:"center", gap:6, padding:"6px 10px", background:"var(--bg-surface)", border:"1px solid var(--border)", borderRadius:6 },
  edgeRow: { display:"flex", alignItems:"center", gap:12, padding:"8px 12px", background:"var(--bg-elevated)", border:"1px solid var(--border)", borderRadius:6 },
};
