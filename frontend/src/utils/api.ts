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
  const key = getLlmKey();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) h["X-LLM-Key"] = key;
  return h;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: buildHeaders() });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

/* ---------------------------------------------------------------------------
 * TODO — implement post()
 * ---------------------------------------------------------------------------
 * A generic HTTP POST helper mirroring the existing get() above.
 *
 * Parameters:
 *   path : string  — API path, e.g. "/api/board/move"
 *   body : unknown — JSON-serialisable payload
 *
 * Steps:
 *   a. Call fetch(`${BASE}${path}`, {
 *        method:  "POST",
 *        headers: buildHeaders(),        // already includes Content-Type + LLM key
 *        body:    JSON.stringify(body),
 *      })
 *   b. If !res.ok → throw new Error(`API error ${res.status}: ${path}`)
 *   c. Return res.json() cast to T.
 *
 * Acceptance:
 *   - Mirrors get() in error handling.
 *   - buildHeaders() must be called so the LLM key is forwarded on POST too.
 * --------------------------------------------------------------------------- */
async function post<T>(path: string, body: unknown): Promise<T> {
  // TODO — implement this function
  throw new Error("post() not implemented");
}

export const api = {
  /* ── Read endpoints (all implemented) ─────────────────────────────────── */

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

  /* ── Write endpoints (stubs — implement post() above first) ───────────── */

  /* -------------------------------------------------------------------------
   * TODO — updateTicketStatus()
   * -------------------------------------------------------------------------
   * Persist a board column change after drag-and-drop.
   *
   * Steps:
   *   a. Call post<any>("/api/board/move", { ticket_id: ticketId, status: newStatus })
   *   b. Return the result.
   *
   * Backend note: POST /api/board/move does not exist yet — add it in
   * backend/app/api/board.py (see board.py TODO comment).
   * ------------------------------------------------------------------------- */
  updateTicketStatus: (ticketId: string, newStatus: string) => {
    // TODO — implement this function
    throw new Error("updateTicketStatus not implemented");
  },

  /* ── Integration endpoints ─────────────────────────────────────────────── */
  getIntegrationStatus: () => get<any>("/api/integrations/status"),
  saveIntegrationConfig: (cfg: Record<string, string>) =>
    post<any>("/api/integrations/config", cfg),
  syncJira:   () => post<any>("/api/integrations/jira/sync",   {}),
  syncGitHub: () => post<any>("/api/integrations/github/sync", {}),
  testSlack:  () => post<any>("/api/integrations/slack/test",  {}),
};
