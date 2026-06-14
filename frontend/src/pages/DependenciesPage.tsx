import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApi } from "../hooks/useApi";
import { api } from "../utils/api";
import * as d3 from "d3";
import { Maximize, Minimize } from "lucide-react";

const STATUS_COLOR: Record<string, string> = {
  in_progress: "#3d7eff",
  review:      "#a78bfa",
  done:        "#22d58a",
  todo:        "#4a5468",
  backlog:     "#4a5468",
  open:        "#22d58a", // Green for GitHub open
  closed:      "#a78bfa", // Purple for GitHub closed
};

// Helper to color nodes based on complexity (story points)
function getPointsColor(pts: number): string {
  if (pts <= 3) return "#22d58a"; // Green for simple
  if (pts <= 5) return "#3d7eff"; // Blue for medium
  if (pts <= 8) return "#a78bfa"; // Purple for hard
  return "#ff5a5f";               // Red/coral for very hard
}

export default function DependenciesPage() {
  const { data: deps, loading: depsLoading }       = useApi(() => api.getDependencies());
  const { data: backlog, loading: backlogLoading } = useApi(() => api.getBacklog());
  const { data: board }                            = useApi(() => api.getBoard());
  const svgRef = useRef<SVGSVGElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isLoading = depsLoading || backlogLoading;

  useEffect(() => {
    if (isLoading || !deps || !backlog || !svgRef.current) return;

    const edges: { from: string; to: string; reason: string }[] = deps.edges ?? [];
    const tickets = backlog.tickets ?? [];

    // Skip D3 render if no tickets are available
    if (tickets.length === 0) return;

    const boardState = board;

    /* Derive a status for every node from the live board state */
    const statusMap: Record<string, string> = {};
    if (boardState) {
      ["todo","in_progress","review","done"].forEach((col: string) => {
        (boardState[col] ?? []).forEach((id: string) => { statusMap[id] = col; });
      });
    }
    tickets.forEach((t: any) => {
      // If the ticket already has a native status (like open/closed from GitHub), keep it.
      if (!statusMap[t.id]) {
        statusMap[t.id] = t.status || "backlog";
      }
    });

    /* Build node and link arrays for D3 */
    const nodes = tickets.map((t: any) => ({
      id: t.id,
      label: t.id,
      title: t.title ?? t.id,
      pts: t.estimate?.points ?? 5,
      status: statusMap[t.id]
    }));

    // Only map edges where both source and target actually exist in our nodes array
    const validLinks = edges.filter(e => tickets.some((t: any) => t.id === e.from) && tickets.some((t: any) => t.id === e.to));
    const links = validLinks.map(e => ({ source: e.from, target: e.to, reason: e.reason }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const W = svgRef.current.clientWidth || 700;
    const H = isFullscreen ? window.innerHeight : 320;
    svg.attr("viewBox", `0 0 ${W} ${H}`);

    // 1. Arrow marker
    svg.append("defs").append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10).attr("refY", 0)
      .attr("markerWidth", 4).attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path").attr("d", "M0,-5L10,0L0,5").attr("fill", "#3d7eff");

    // Wrap everything in a primary group so we can apply zoom transformations
    const gMain = svg.append("g");

    // 2. Force simulation
    const sim = d3.forceSimulation(nodes as any)
      .force("link",      d3.forceLink(links).id((d:any)=>d.id).distance(250))
      .force("charge",    d3.forceManyBody().strength(-600))
      .force("center",    d3.forceCenter(W/2, H/2))
      .force("collision", d3.forceCollide(80));

    // 7. Tooltip (moved up to be used by links as well)
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
      .style("z-index", "99999") // Fixed: Render above 9999 portal
      .style("max-width", "250px");

    // 3. Link lines (now using path instead of line to allow geometric drawing via "d" attribute)
    const link = gMain.append("g").selectAll("path").data(links).join("path")
      .attr("stroke", "#3d7eff").attr("stroke-opacity", 0.55)
      .attr("stroke-width", 1.0)
      .attr("fill", "none")
      .attr("marker-end", "url(#arrow)")
      .style("cursor", "pointer")
      .on("mouseover", function(event, d: any) {
        d3.select(this)
          .attr("stroke-width", 2.5)
          .attr("stroke-opacity", 0.9);

        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--accent); margin-bottom: 4px;">${d.source.id} → blocks → ${d.target.id}</div>
          <div style="font-size: 11px;">${d.reason}</div>
        `);
      })
      .on("mousemove", (event) => {
        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("stroke-width", 1.0)
          .attr("stroke-opacity", 0.55);
        tooltip.transition().duration(200).style("opacity", 0);
      });

    // 4. Node groups
    const node = gMain.append("g").selectAll("g").data(nodes).join("g")
      .attr("cursor", "pointer")
      .call(d3.drag<any,any>()
        .on("start", (event, d:any) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
        .on("drag",  (event, d:any) => { d.fx=event.x; d.fy=event.y; })
        .on("end",   (event, d:any) => { if (!event.active) sim.alphaTarget(0); d.fx=null; d.fy=null; })
      );

    // 6. Node elements (Opaque with dynamic points color)
    node.append("circle")
      .attr("r", (d:any) => 24 + (d.pts * 1.5))
      .attr("fill", (d:any) => getPointsColor(d.pts))
      .attr("stroke", (d:any) => STATUS_COLOR[d.status] || "#4a5468")
      .attr("stroke-width", 3);

    node.append("text")
      .attr("dy", "-2px")
      .attr("font-size", 10).attr("font-weight", 700).attr("fill", "#ffffff")
      .attr("text-anchor", "middle")
      .text((d:any) => d.id);

    node.append("text")
      .attr("dy", "12px")
      .attr("font-size", 9).attr("fill", "rgba(255, 255, 255, 0.8)")
      .attr("font-weight", 600)
      .attr("text-anchor", "middle")
      .text((d:any) => `${d.pts}p`);

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

    // 8. Tick handler (with edge clipping geometry)
    sim.on("tick", () => {
      link.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Target node radius + stroke width + small buffer for the arrow
        const targetRadius = 24 + (d.target.pts * 1.5) + 3;

        if (dist === 0) return "M0,0L0,0";

        // Offset the line so it stops at the edge of the target circle
        const targetX = d.target.x - (dx * targetRadius) / dist;
        const targetY = d.target.y - (dy * targetRadius) / dist;

        // Clip the source side to look cleaner too
        const sourceRadius = 24 + (d.source.pts * 1.5) + 3;
        const sourceX = d.source.x + (dx * sourceRadius) / dist;
        const sourceY = d.source.y + (dy * sourceRadius) / dist;

        return `M${sourceX},${sourceY} L${targetX},${targetY}`;
      });

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

  }, [deps, backlog, board, isFullscreen, isLoading]);

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
          {hasTickets && backlog.tickets[0].id.startsWith("GH-") ? (
            [
              { color: "#22d58a", label: "Open" },
              { color: "#a78bfa", label: "Closed" },
            ].map(l => (
              <div key={l.label} style={styles.legendItem}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:l.color }} />
                <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{l.label}</span>
              </div>
            ))
          ) : (
            [
              { color: "#3d7eff", label: "In Progress" },
              { color: "#a78bfa", label: "Review" },
              { color: "#22d58a", label: "Done" },
              { color: "#4a5468", label: "Not started" },
            ].map(l => (
              <div key={l.label} style={styles.legendItem}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:l.color }} />
                <span style={{ fontSize:12, color:"var(--text-secondary)" }}>{l.label}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SVG canvas or Empty state */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: "hidden",
          height: 320,
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
          <button
            onClick={() => setIsFullscreen(true)}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-secondary)"
            }}
            title="Fullscreen"
            disabled={isLoading}
          >
            <Maximize size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="shimmer-skeleton" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", gap: 16 }}>
             <div className="pulse" style={{ width: 40, height: 40, border: "3px solid var(--accent)", borderRadius: "50%", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
             <div style={{ fontSize: 14, fontWeight: 600, color: "var(--fg)", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>AI is analyzing tickets...</div>
             <div style={{ fontSize: 13, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>Inferring implicit dependencies and calculating story points.</div>
          </div>
        )}

        {!isLoading && !hasTickets && backlog && (
           <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
              <div>No tickets found in the backlog.</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Sync tickets from a repository or integration to generate a dependency graph.</div>
           </div>
        )}

        {/* Render inline SVG only when NOT fullscreen and NOT loading */}
        {!isFullscreen && !isLoading && (
           <svg ref={svgRef} style={{ width: "100%", height: "100%", display: hasTickets ? "block" : "none", cursor: "grab" }} />
        )}
      </div>

      {/* Fullscreen Portal */}
      {isFullscreen && createPortal(
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
          background: "var(--bg-surface)", zIndex: 9999,
          display: "flex", flexDirection: "column"
        }}>
          <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                background: "var(--bg-elevated)", border: "1px solid var(--border)",
                borderRadius: 6, padding: 8, cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", color: "var(--text-secondary)"
              }}
              title="Minimize"
            >
              <Minimize size={20} />
            </button>
          </div>
          <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block", cursor: "grab" }} />
        </div>,
        document.body
      )}

      {/* Dependency edge list (always rendered — no implementation needed) */}
      {!isLoading && hasTickets && (
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
