import React, { useState, useEffect, useCallback } from "react";
import { getLlmKey, setLlmKey, api } from "../utils/api";
import type { AllIntegrationStatus, IntegrationConfig } from "../types";
import {
  Key, CheckCircle, AlertCircle, Zap, Eye, EyeOff, Trash2,
  Plug, RefreshCw, Send,
} from "lucide-react";

type StatusState = "idle" | "checking" | "active" | "error";

// ── localStorage helpers for integration config ─────────────────────────────

const INTEGRATION_STORAGE_KEY = "sprintsense_integration_config";

function loadIntegrationConfig(): IntegrationConfig {
  try {
    return JSON.parse(localStorage.getItem(INTEGRATION_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveIntegrationConfigLocal(update: Partial<IntegrationConfig>) {
  const current = loadIntegrationConfig();
  const merged = { ...current, ...update };
  // Strip empty strings so we don't store blank values
  Object.keys(merged).forEach(k => {
    if (!(merged as any)[k]) delete (merged as any)[k];
  });
  localStorage.setItem(INTEGRATION_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

// ── Sub-component: single text/password field ────────────────────────────────

function Field({
  label, value, onChange, placeholder, secret = false, mono = false,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; secret?: boolean; mono?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={fs.fieldWrap}>
      <label style={fs.label}>{label}</label>
      <div style={fs.inputWrap}>
        <input
          type={secret && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...fs.input, fontFamily: mono ? "monospace" : "inherit" }}
          autoComplete="off"
          spellCheck={false}
        />
        {secret && (
          <button style={fs.eyeBtn} onClick={() => setShow(s => !s)} title={show ? "Hide" : "Show"}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: status badge ──────────────────────────────────────────────

function Badge({ configured }: { configured: boolean }) {
  return (
    <span style={{
      ...bs.badge,
      background: configured ? "color-mix(in srgb, var(--green) 15%, transparent)" : "color-mix(in srgb, var(--fg-muted) 12%, transparent)",
      color: configured ? "var(--green)" : "var(--fg-muted)",
      border: `1px solid ${configured ? "color-mix(in srgb, var(--green) 30%, transparent)" : "var(--border)"}`,
    }}>
      {configured ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
      {configured ? "Configured" : "Not configured"}
    </span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  // LLM key state
  const [inputKey, setInputKey]   = useState(getLlmKey());
  const [showKey, setShowKey]     = useState(false);
  const [llmStatus, setLlmStatus] = useState<StatusState>("idle");
  const [llmMsg, setLlmMsg]       = useState("");
  const [llmSaved, setLlmSaved]   = useState(false);

  // Integration status from backend
  const [intStatus, setIntStatus] = useState<AllIntegrationStatus | null>(null);

  // Integration config form state (loaded from localStorage)
  const [cfg, setCfg] = useState<IntegrationConfig>(loadIntegrationConfig());

  // Per-integration action state
  const [saving, setSaving]     = useState<string | null>(null);
  const [syncing, setSyncing]   = useState<string | null>(null);
  const [syncMsg, setSyncMsg]   = useState<Record<string, string>>({});

  const updateCfg = (key: keyof IntegrationConfig) => (v: string) =>
    setCfg(prev => ({ ...prev, [key]: v }));

  // ── LLM helpers ────────────────────────────────────────────────────────────

  async function checkLlmStatus() {
    setLlmStatus("checking");
    setLlmMsg("Verifying key with backend…");
    try {
      const res = await api.getLlmStatus();
      if (res.llm_active) {
        setLlmStatus("active");
        const src = res.source === "env" ? "environment variable" : "saved key";
        setLlmMsg(`Real LLM mode active (${src}). Estimates and digest will use live AI.`);
      } else {
        setLlmStatus("idle");
        setLlmMsg("No key detected. Running in mock/demo mode.");
      }
    } catch {
      setLlmStatus("error");
      setLlmMsg("Could not reach backend.");
    }
  }

  async function handleLlmSave() {
    setLlmKey(inputKey);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 2000);
    await checkLlmStatus();
  }

  function handleLlmClear() {
    setInputKey("");
    setLlmKey("");
    setLlmStatus("idle");
    setLlmMsg("Key cleared. Running in mock/demo mode.");
  }

  // ── Integration helpers ─────────────────────────────────────────────────────

  const fetchIntStatus = useCallback(async () => {
    try {
      const res = await api.getIntegrationStatus();
      setIntStatus(res);
    } catch {
      // backend unreachable — show whatever localStorage has
    }
  }, []);

  useEffect(() => {
    if (getLlmKey()) checkLlmStatus();
    fetchIntStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSaveIntegration(name: string, fields: Partial<IntegrationConfig>) {
    setSaving(name);
    const merged = saveIntegrationConfigLocal(fields);
    try {
      // post() is a TODO stub — once implemented this will persist to backend too
      await api.saveIntegrationConfig(merged as Record<string, string>);
    } catch {
      // post() not yet implemented — saved to localStorage only
    }
    await fetchIntStatus();
    setSaving(null);
    setSyncMsg(prev => ({ ...prev, [name]: "Saved to local config." }));
    setTimeout(() => setSyncMsg(prev => { const n = { ...prev }; delete n[name]; return n; }), 3000);
  }

  async function handleSync(name: string, syncFn: () => Promise<any>) {
    setSyncing(name);
    setSyncMsg(prev => ({ ...prev, [name]: "Syncing…" }));
    try {
      const res = await syncFn();
      setSyncMsg(prev => ({ ...prev, [name]: `Synced ${res.synced_tickets ?? res.synced ?? 0} tickets.` }));
    } catch (e: any) {
      const msg = e?.message?.includes("not implemented")
        ? "Sync stub not yet implemented — see backend/app/api/integrations.py"
        : `Error: ${e?.message ?? "unknown"}`;
      setSyncMsg(prev => ({ ...prev, [name]: msg }));
    }
    setSyncing(null);
    setTimeout(() => setSyncMsg(prev => { const n = { ...prev }; delete n[name]; return n; }), 6000);
  }

  const llmStatusColor = llmStatus === "active" ? "var(--green)"
    : llmStatus === "error" ? "var(--red)"
    : llmStatus === "checking" ? "var(--amber)"
    : "var(--fg-muted)";

  const llmStatusIcon = () => {
    if (llmStatus === "active")   return <CheckCircle size={16} color="var(--green)" />;
    if (llmStatus === "error")    return <AlertCircle size={16} color="var(--red)" />;
    if (llmStatus === "checking") return <Zap size={16} color="var(--amber)" />;
    return null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page-enter" style={s.page}>

      {/* ── Page header ── */}
      <div style={s.header}>
        <h1 style={s.title}>Settings</h1>
        <p style={s.subtitle}>Configure AI features and connect SprintSense to your project tools.</p>
      </div>

      {/* ════════════════════════════ LLM API KEY ════════════════════════════ */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <Key size={20} color="var(--accent)" />
          <h2 style={s.cardTitle}>LLM API Key</h2>
        </div>

        <p style={s.desc}>
          SprintSense works fully in <strong>mock/demo mode</strong> with no key needed.
          Add an OpenAI or Anthropic key to enable <em>live AI estimation</em> and <em>dynamic standup digests</em>.
        </p>

        <div style={s.providers}>
          {[
            { name: "OpenAI",    prefix: "sk-…",     model: "gpt-4o-mini" },
            { name: "Anthropic", prefix: "sk-ant-…", model: "claude-haiku" },
          ].map(p => (
            <div key={p.name} style={s.providerChip}>
              <strong>{p.name}</strong>
              <code style={s.prefix}>{p.prefix}</code>
              <span style={s.model}>→ {p.model}</span>
            </div>
          ))}
        </div>

        <div style={s.inputRow}>
          <div style={s.inputWrap}>
            <Key size={14} color="var(--fg-muted)" style={{ flexShrink: 0 }} />
            <input
              type={showKey ? "text" : "password"}
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              placeholder="sk-… or sk-ant-…"
              style={{ ...s.input, fontFamily: "monospace" }}
              autoComplete="off"
            />
            <button style={s.iconBtn} onClick={() => setShowKey(v => !v)}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button style={{ ...s.btn, ...s.btnPrimary, opacity: llmSaved ? 0.7 : 1 }} onClick={handleLlmSave}>
            {llmSaved ? "Saved!" : "Save & Verify"}
          </button>
          {inputKey && (
            <button style={{ ...s.btn, ...s.btnGhost }} onClick={handleLlmClear} title="Clear">
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {llmMsg && (
          <div style={{ ...s.statusBar, borderColor: llmStatusColor, color: llmStatusColor }}>
            {llmStatusIcon()}
            <span>{llmMsg}</span>
          </div>
        )}
      </div>

      {/* ════════════════════════════ INTEGRATIONS ════════════════════════════ */}
      <div style={s.sectionHeading}>
        <Plug size={17} color="var(--accent)" />
        <span>Integrations</span>
      </div>
      <p style={s.sectionDesc}>
        Connect SprintSense to your project management tools to pull real tickets and sprint history.
        Credentials saved here are stored in your browser and sent to the backend for this session —
        or set them permanently as environment variables in <code style={s.envCode}>.env</code>.
      </p>

      {/* ── Jira ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.integIcon}>J</span>
          <h2 style={s.cardTitle}>Jira Cloud</h2>
          <Badge configured={intStatus?.jira.configured ?? false} />
        </div>
        <p style={s.desc}>Pull open tickets and sprint history from a Jira Cloud project.</p>

        <div style={fs.grid}>
          <Field label="Jira URL"     value={cfg.jira_url ?? ""}         onChange={updateCfg("jira_url")}         placeholder="https://yourorg.atlassian.net" mono />
          <Field label="Email"        value={cfg.jira_email ?? ""}        onChange={updateCfg("jira_email")}        placeholder="you@company.com" />
          <Field label="API Token"    value={cfg.jira_api_token ?? ""}    onChange={updateCfg("jira_api_token")}    placeholder="ATATT3xyz…" secret mono />
          <Field label="Project Key"  value={cfg.jira_project_key ?? ""}  onChange={updateCfg("jira_project_key")}  placeholder="PROJ" mono />
          <Field label="Board ID"     value={cfg.jira_board_id ?? ""}     onChange={updateCfg("jira_board_id")}     placeholder="1  (Agile board integer ID)" mono />
        </div>

        <div style={s.actionRow}>
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={() => handleSaveIntegration("jira", {
              jira_url: cfg.jira_url, jira_email: cfg.jira_email,
              jira_api_token: cfg.jira_api_token, jira_project_key: cfg.jira_project_key,
              jira_board_id: cfg.jira_board_id,
            })}
            disabled={saving === "jira"}
          >
            {saving === "jira" ? "Saving…" : "Save"}
          </button>
          <button
            style={{ ...s.btn, ...s.btnGhost }}
            onClick={() => handleSync("jira", api.syncJira)}
            disabled={syncing === "jira"}
          >
            <RefreshCw size={14} style={{ animation: syncing === "jira" ? "spin 1s linear infinite" : "none" }} />
            {syncing === "jira" ? "Syncing…" : "Sync Now"}
          </button>
          {syncMsg.jira && <span style={s.syncMsg}>{syncMsg.jira}</span>}
        </div>

        <div style={s.envHint}>
          Env vars: <code style={s.envCode}>JIRA_URL</code> <code style={s.envCode}>JIRA_EMAIL</code>{" "}
          <code style={s.envCode}>JIRA_API_TOKEN</code> <code style={s.envCode}>JIRA_PROJECT_KEY</code>{" "}
          <code style={s.envCode}>JIRA_BOARD_ID</code>
        </div>
      </div>

      {/* ── Slack ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.integIcon}>#</span>
          <h2 style={s.cardTitle}>Slack</h2>
          <Badge configured={intStatus?.slack.configured ?? false} />
        </div>
        <p style={s.desc}>
          Send slippage alerts and daily standup digests to a Slack channel.
          A Webhook URL is enough for alerts; a Bot Token enables interactive features.
        </p>

        <div style={fs.grid}>
          <Field label="Incoming Webhook URL" value={cfg.slack_webhook_url ?? ""} onChange={updateCfg("slack_webhook_url")} placeholder="https://hooks.slack.com/services/…" secret mono />
          <Field label="Bot Token (optional)"  value={cfg.slack_bot_token ?? ""}  onChange={updateCfg("slack_bot_token")}  placeholder="xoxb-…" secret mono />
        </div>

        <div style={s.actionRow}>
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={() => handleSaveIntegration("slack", {
              slack_webhook_url: cfg.slack_webhook_url,
              slack_bot_token: cfg.slack_bot_token,
            })}
            disabled={saving === "slack"}
          >
            {saving === "slack" ? "Saving…" : "Save"}
          </button>
          <button
            style={{ ...s.btn, ...s.btnGhost }}
            onClick={() => handleSync("slack", api.testSlack)}
            disabled={syncing === "slack"}
          >
            <Send size={14} />
            {syncing === "slack" ? "Sending…" : "Send Test Message"}
          </button>
          {syncMsg.slack && <span style={s.syncMsg}>{syncMsg.slack}</span>}
        </div>

        <div style={s.envHint}>
          Env vars: <code style={s.envCode}>SLACK_WEBHOOK_URL</code> <code style={s.envCode}>SLACK_BOT_TOKEN</code>
        </div>
      </div>

      {/* ── GitHub ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.integIcon}>GH</span>
          <h2 style={s.cardTitle}>GitHub Issues</h2>
          <Badge configured={intStatus?.github.configured ?? false} />
        </div>
        <p style={s.desc}>Import open GitHub Issues as backlog tickets.</p>

        <div style={fs.grid}>
          <Field label="Personal Access Token" value={cfg.github_token ?? ""} onChange={updateCfg("github_token")} placeholder="ghp_…" secret mono />
          <Field label="Owner"                 value={cfg.github_owner ?? ""} onChange={updateCfg("github_owner")} placeholder="your-org" mono />
          <Field label="Repository"            value={cfg.github_repo  ?? ""} onChange={updateCfg("github_repo")}  placeholder="your-repo" mono />
        </div>

        <div style={s.actionRow}>
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={() => handleSaveIntegration("github", {
              github_token: cfg.github_token,
              github_owner: cfg.github_owner,
              github_repo: cfg.github_repo,
            })}
            disabled={saving === "github"}
          >
            {saving === "github" ? "Saving…" : "Save"}
          </button>
          <button
            style={{ ...s.btn, ...s.btnGhost }}
            onClick={() => handleSync("github", api.syncGitHub)}
            disabled={syncing === "github"}
          >
            <RefreshCw size={14} style={{ animation: syncing === "github" ? "spin 1s linear infinite" : "none" }} />
            {syncing === "github" ? "Syncing…" : "Sync Now"}
          </button>
          {syncMsg.github && <span style={s.syncMsg}>{syncMsg.github}</span>}
        </div>

        <div style={s.envHint}>
          Env vars: <code style={s.envCode}>GITHUB_TOKEN</code> <code style={s.envCode}>GITHUB_OWNER</code>{" "}
          <code style={s.envCode}>GITHUB_REPO</code>
        </div>
      </div>

      {/* ── Linear ── */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.integIcon}>L</span>
          <h2 style={s.cardTitle}>Linear</h2>
          <Badge configured={intStatus?.linear.configured ?? false} />
        </div>
        <p style={s.desc}>Import issues from a Linear team as backlog tickets.</p>

        <div style={fs.grid}>
          <Field label="API Key"  value={cfg.linear_api_key ?? ""} onChange={updateCfg("linear_api_key")} placeholder="lin_api_…" secret mono />
          <Field label="Team ID"  value={cfg.linear_team_id ?? ""} onChange={updateCfg("linear_team_id")} placeholder="TEAM_ID" mono />
        </div>

        <div style={s.actionRow}>
          <button
            style={{ ...s.btn, ...s.btnPrimary }}
            onClick={() => handleSaveIntegration("linear", {
              linear_api_key: cfg.linear_api_key,
              linear_team_id: cfg.linear_team_id,
            })}
            disabled={saving === "linear"}
          >
            {saving === "linear" ? "Saving…" : "Save"}
          </button>
          {syncMsg.linear && <span style={s.syncMsg}>{syncMsg.linear}</span>}
        </div>

        <div style={s.envHint}>
          Env vars: <code style={s.envCode}>LINEAR_API_KEY</code> <code style={s.envCode}>LINEAR_TEAM_ID</code>
        </div>
      </div>

      {/* ════════════════════════════ FEATURE MATRIX ═════════════════════════ */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Feature Matrix</h2>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Feature</th>
              <th style={s.th}>Demo Mode</th>
              <th style={s.th}>With Integration</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Backlog tickets",         "🟡 Static seed data (10 tickets)",  "✅ Live pull from Jira / GitHub / Linear"],
              ["Sprint history",          "🟡 8 hardcoded sprints",            "✅ Real sprint records from Jira board"],
              ["Team members",            "🟡 5 demo users",                   "✅ Actual team from Jira / GitHub"],
              ["Board state",             "🟡 Fixed column layout",            "✅ Real ticket statuses on every load"],
              ["Story-point estimates",   "🟡 Hardcoded values",               "✅ Live LLM call per ticket (needs LLM key)"],
              ["Slippage alerts",         "🟡 No notifications sent",          "✅ Slack / email when probability < 70%"],
              ["Standup digest delivery", "🟡 Display-only",                   "✅ Delivered to Slack channel or email"],
            ].map(([feat, demo, live]) => (
              <tr key={feat}>
                <td style={s.td}>{feat}</td>
                <td style={{ ...s.td, color: demo.startsWith("✅") ? "var(--green)" : "var(--amber)" }}>{demo}</td>
                <td style={{ ...s.td, color: "var(--green)" }}>{live}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}

// ── Shared field styles ──────────────────────────────────────────────────────
const fs: Record<string, React.CSSProperties> = {
  grid:     { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px 16px", marginBottom: 16 },
  fieldWrap:{ display: "flex", flexDirection: "column", gap: 4 },
  label:    { fontSize: 12, fontWeight: 600, color: "var(--fg-muted)", textTransform: "uppercase", letterSpacing: "0.03em" },
  inputWrap:{ display: "flex", alignItems: "center", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 10px", height: 36 },
  input:    { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--fg)", fontSize: 13 },
  eyeBtn:   { background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: 0, display: "flex", alignItems: "center" },
};

// ── Badge styles ─────────────────────────────────────────────────────────────
const bs: Record<string, React.CSSProperties> = {
  badge: { display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
};

// ── Page-level styles ─────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:          { maxWidth: 800, margin: "0 auto", padding: "0 0 48px" },
  header:        { marginBottom: 28 },
  title:         { fontSize: 24, fontWeight: 700, margin: 0, color: "var(--fg)" },
  subtitle:      { marginTop: 6, color: "var(--fg-muted)", fontSize: 14 },
  card:          { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 26px", marginBottom: 16 },
  cardHeader:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  cardTitle:     { fontSize: 16, fontWeight: 600, color: "var(--fg)", margin: 0, flex: 1 },
  desc:          { color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 14 },
  providers:     { display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 16 },
  providerChip:  { display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 13 },
  prefix:        { background: "var(--surface)", padding: "1px 6px", borderRadius: 4, fontSize: 12, color: "var(--accent)" },
  model:         { color: "var(--fg-muted)", fontSize: 12 },
  inputRow:      { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const },
  inputWrap:     { flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "0 12px", height: 40 },
  input:         { flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--fg)", fontSize: 13 },
  iconBtn:       { background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: 0, display: "flex", alignItems: "center" },
  btn:           { height: 36, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" as const },
  btnPrimary:    { background: "var(--accent)", color: "#fff" },
  btnGhost:      { background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-muted)" },
  statusBar:     { display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 14px", borderRadius: 8, border: "1px solid", fontSize: 13 },
  sectionHeading:{ display: "flex", alignItems: "center", gap: 8, margin: "32px 0 6px", fontSize: 18, fontWeight: 700, color: "var(--fg)" },
  sectionDesc:   { color: "var(--fg-muted)", fontSize: 13, lineHeight: 1.6, marginBottom: 18 },
  integIcon:     { width: 32, height: 32, borderRadius: 8, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  actionRow:     { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const, marginTop: 4 },
  syncMsg:       { fontSize: 12, color: "var(--fg-muted)", fontStyle: "italic" },
  envHint:       { marginTop: 14, fontSize: 12, color: "var(--fg-muted)", lineHeight: 1.8 },
  envCode:       { background: "var(--bg)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", color: "var(--accent)", fontSize: 11 },
  table:         { width: "100%", borderCollapse: "collapse" as const, fontSize: 13, marginTop: 12 },
  th:            { textAlign: "left" as const, padding: "8px 12px", borderBottom: "1px solid var(--border)", color: "var(--fg-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const },
  td:            { padding: "10px 12px", borderBottom: "1px solid var(--border)", color: "var(--fg)", verticalAlign: "top" as const },
};
