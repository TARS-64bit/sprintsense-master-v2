import React, { useEffect, useRef } from "react";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import * as d3 from "d3";

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

    // Skip D3 render if no tickets are available
    if (tickets.length === 0) return;

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
    const nodes = tickets.map((t: any) => ({
      id: t.id,
      label: t.id,
      title: t.title ?? t.id,
      pts: t.estimate?.points ?? 5,
      status: statusMap[t.id] ?? "backlog"
    }));

    // Only map edges where both source and target actually exist in our nodes array
    const validLinks = edges.filter(e => tickets.some((t: any) => t.id === e.from) && tickets.some((t: any) => t.id === e.to));
    const links = validLinks.map(e => ({ source: e.from, target: e.to, reason: e.reason }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 700;
    const H = 480;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // 1. Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 28).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#3d7eff");

    // Wrap everything in a primary group so we can apply zoom transformations
    const gMain = svg.append("g");

    // 2. Force simulation
    const sim = d3.forceSimulation(nodes as any)
      .force("link",      d3.forceLink(links).id((d:any)=>d.id).distance(120))
      .force("charge",    d3.forceManyBody().strength(-350))
      .force("center",    d3.forceCenter(W/2, H/2))
      .force("collision", d3.forceCollide(50));

    // 3. Link lines
    const link = gMain.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", "#3d7eff").attr("stroke-opacity", 0.55)
      .attr("stroke-width", 1.5).attr("marker-end", "url(#arrow)");

    // 4. Link labels
    const linkLabel = gMain.append("g").selectAll("text").data(links).join("text")
      .attr("font-size", 9).attr("fill", "#4a5468")
      .attr("font-family", "Space Mono, monospace")
      .text((d:any) => d.reason.length > 28 ? d.reason.substring(0, 28) + "…" : d.reason);

    // 5. Node groups
    const node = gMain.append("g").selectAll("g").data(nodes).join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<any,any>()
        .on("start", (event, d:any) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag",  (event, d:any) => { d.fx=event.x; d.fy=event.y; })
        .on("end",   (event, d:any) => { if (!event.active) sim.alphaTarget(0); d.fx=null; d.fy=null; })
      );

    // 6. Node elements
    node.append("circle")
      .attr("r", (d:any) => 14 + d.pts)
      .attr("fill", (d:any) => {
        const c = STATUS_COLOR[d.status] || "#4a5468";
        // Convert hex to rgba string roughly
        return d3.color(c)?.copy({opacity: 0.18})?.toString() || c;
      })
      .attr("stroke", (d:any) => STATUS_COLOR[d.status] || "#4a5468")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dy", "-4px")
      .attr("font-size", 10).attr("font-weight", 700).attr("fill", "#3d7eff")
      .attr("text-anchor", "middle")
      .text((d:any) => d.id);

    node.append("text")
      .attr("dy", "12px")
      .attr("font-size", 9).attr("fill", "#8b95a8")
      .attr("text-anchor", "middle")
      .text((d:any) => `${d.pts}p`);

    // 7. Tooltip
    const tooltip = d3.select("body").append("div")
      .style("position", "absolute")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("background", "var(--bg-elevated)")
      .style("color", "var(--text-primary)")
      .style("padding", "8px 12px")
      .style("border", "1px solid var(--border)")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("box-shadow", "0 4px 6px rgba(0,0,0,0.1)")
      .style("z-index", "1000")
      .style("max-width", "250px");

    node
      .on("mouseover", (event, d:any) => {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--accent); margin-bottom: 4px;">${d.id}</div>
          <div style="font-weight: 600; margin-bottom: 4px;">${d.title}</div>
          <div style="color: var(--text-muted); font-size: 11px;">Status: ${d.status}</div>
        `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // 8. Tick handler
    sim.on("tick", () => {
      link
        .attr("x1", (d:any) => d.source.x)
        .attr("y1", (d:any) => d.source.y)
        .attr("x2", (d:any) => d.target.x)
        .attr("y2", (d:any) => d.target.y);

      linkLabel
        .attr("x", (d:any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d:any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d:any) => `translate(${d.x},${d.y})`);
    });

    // 9. Setup Zoom/Pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on("zoom", (event) => {
        gMain.attr("transform", event.transform);
      });

    svg.call(zoom);

    // 10. Cleanup
    return () => {
      tooltip.remove();
      sim.stop();
    };

  }, [deps, backlog, board]);

  const hasTickets = backlog?.tickets && backlog.tickets.length > 0;

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

      {/* SVG canvas or Empty state */}
      <div className="card" style={{ padding: 0, overflow: "hidden", minHeight: 480, display: "flex", flexDirection: "column" }}>
        {!hasTickets && backlog && (
           <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
              <div>No tickets found in the backlog.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Sync tickets from a repository or integration to generate a dependency graph.</div>
           </div>
        )}
        <svg ref={svgRef} style={{ width: "100%", height: 480, display: hasTickets ? "block" : "none", cursor: "grab" }} />
      </div>

      {/* Dependency edge list (always rendered — no implementation needed) */}
      {hasTickets && (
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
            {(deps?.edges ?? []).length === 0 && (
              <div style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", padding: "8px 0" }}>
                No explicit dependency edges found between the tickets.
              </div>
            )}
          </div>
        </div>
      )}
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
