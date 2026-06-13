const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

const LLM_KEY_STORAGE = "sprintsense_llm_key";

export function getLlmKey(): string {
  return localStorage.getItem(LLM_KEY_STORAGE) || "";
}

export function setLlmKey(key: string): void {
  if (key.trim()) {
    localStorage.setItem(LLM_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(LLM_KEY_STORAGE);
  }
}

function buildHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = getLlmKey();
  if (key) h["X-LLM-Key"] = key;

  const cfgStr = localStorage.getItem("sprintsense_integration_config");
  if (cfgStr) {
    try {
      const cfg = JSON.parse(cfgStr);
      if (cfg.github_token) h["X-GitHub-Token"] = cfg.github_token;
      if (cfg.github_owner) h["X-GitHub-Owner"] = cfg.github_owner;
      if (cfg.github_repo) h["X-GitHub-Repo"] = cfg.github_repo;
    } catch (e) {}
  }
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  // Backlog
  getBacklog:       () => get<any>("/api/backlog/"),
  getBacklogHistory:() => get<any>("/api/backlog/history"),
  getDependencies:  () => get<any>("/api/backlog/dependencies"),
  getAtRisk:        () => get<any>("/api/backlog/at-risk"),
  getTicket:        (id: string) => get<any>(`/api/backlog/${id}`),

  // Sprint
  getCurrentSprint: () => get<any>("/api/sprint/current"),
  getSprintHistory: () => get<any>("/api/sprint/history"),
  getBurndown:      () => get<any>("/api/sprint/burndown"),
  getDigest:        () => get<any>("/api/sprint/digest"),

  // Forecast
  getSlippage:      () => get<any>("/api/forecast/slippage"),
  getVelocity:      () => get<any>("/api/forecast/velocity"),

  // Team / Board
  getTeam:          () => get<any>("/api/team/"),
  getBoard:         () => get<any>("/api/board/"),

  // LLM status
  getLlmStatus:     () => get<any>("/api/llm-status"),

  updateTicketStatus: (ticketId: string, newStatus: string) => {
    return post<any>("/api/board/move", { ticket_id: ticketId, status: newStatus });
  },

  /* ── Integration endpoints ─────────────────────────────────────────────── */
  getIntegrationStatus: () => get<any>("/api/integrations/status"),
  saveIntegrationConfig: (cfg: Record<string, string>) =>
    post<any>("/api/integrations/config", cfg),
  syncJira:   () => post<any>("/api/integrations/jira/sync",   {}),
  syncGitHub: () => post<any>("/api/integrations/github/sync", {}),
  testSlack:  () => post<any>("/api/integrations/slack/test",  {}),
};
