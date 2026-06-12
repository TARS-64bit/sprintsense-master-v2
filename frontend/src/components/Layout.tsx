import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ListTodo, CalendarDays, Kanban,
  TrendingDown, Network, Users, Zap, ChevronRight,
  Bell, Settings, Activity
} from "lucide-react";
import { getLlmKey } from "../utils/api";

const NAV = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard" },
  { to: "/backlog",      icon: ListTodo,        label: "Backlog" },
  { to: "/sprint",       icon: CalendarDays,    label: "Sprint Plan" },
  { to: "/board",        icon: Kanban,          label: "Board" },
  { to: "/forecast",     icon: TrendingDown,    label: "Forecast" },
  { to: "/dependencies", icon: Network,         label: "Dependencies" },
  { to: "/team",         icon: Users,           label: "Team" },
  { to: "/settings",     icon: Settings,        label: "Settings" },
];

export default function Layout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const currentPage = NAV.find(n => location.pathname.startsWith(n.to))?.label || "SprintSense";

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 220 }}>
        {/* Logo */}
        <div style={styles.logo} onClick={() => setCollapsed(!collapsed)}>
          <div style={styles.logoIcon}>
            <Zap size={16} color="#3d7eff" fill="#3d7eff" />
          </div>
          {!collapsed && (
            <span style={styles.logoText}>Sprint<span style={{ color: "var(--accent)" }}>Sense</span></span>
          )}
        </div>

        <div style={styles.sidebarDivider} />

        {/* Nav items */}
        <nav style={styles.nav}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              ...styles.navItem,
              background: isActive ? "var(--bg-overlay)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
            })}>
              <Icon size={16} />
              {!collapsed && <span style={styles.navLabel}>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sprint progress indicator */}
        {!collapsed && (
          <div style={styles.sprintWidget}>
            <div style={styles.sprintWidgetHeader}>
              <Activity size={12} color="var(--accent)" />
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>SPRINT 9 — DAY 6</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: "60%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
              <span>63% complete prob.</span>
              <span style={{ color: "var(--amber)" }}>⚠ slipping</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div style={styles.main}>
        {/* Topbar */}
        <header style={styles.topbar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={styles.breadcrumb}>
              SprintSense <ChevronRight size={12} style={{ opacity: 0.4 }} /> {currentPage}
            </span>
          </div>
          <div style={styles.topbarRight}>
            {getLlmKey() && (
              <div style={styles.llmBadge} title="Real LLM mode active">
                <Zap size={11} />
                <span>AI</span>
              </div>
            )}
            <div style={styles.alertBadge}>
              <Bell size={14} />
              <span style={styles.alertDot} />
            </div>
            <div style={styles.avatar}>PS</div>
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: "var(--bg-base)",
  },
  sidebar: {
    flexShrink: 0,
    background: "var(--bg-surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    transition: "width 0.2s ease",
    overflow: "hidden",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "18px 16px",
    cursor: "pointer",
    userSelect: "none",
  },
  logoIcon: {
    width: 30, height: 30,
    background: "var(--accent-dim)",
    border: "1px solid var(--accent-glow)",
    borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "var(--font-mono)",
    fontWeight: 700,
    fontSize: 15,
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
  },
  sidebarDivider: {
    height: 1,
    background: "var(--border-subtle)",
    margin: "0 12px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    padding: "12px 8px",
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 8,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  navLabel: { flex: 1 },
  sprintWidget: {
    margin: "0 12px 16px",
    padding: "12px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sprintWidgetHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  progressBar: {
    height: 4,
    background: "var(--bg-overlay)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "var(--amber)",
    borderRadius: 2,
    transition: "width 0.6s ease",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  topbar: {
    height: 56,
    background: "var(--bg-surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
  },
  topbarRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  alertBadge: {
    position: "relative" as const,
    cursor: "pointer",
    color: "var(--text-secondary)",
  },
  alertDot: {
    position: "absolute" as const,
    top: -1, right: -1,
    width: 6, height: 6,
    background: "var(--red)",
    borderRadius: "50%",
    border: "1.5px solid var(--bg-surface)",
  },
  llmBadge: { display: "flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.15)", color: "var(--accent)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 600 },
  avatar: {
    width: 32, height: 32,
    background: "var(--accent-dim)",
    border: "1px solid var(--accent)",
    borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent)",
    fontFamily: "var(--font-mono)",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    overflow: "auto",
    padding: "24px",
  },
};
