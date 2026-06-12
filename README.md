# SprintSense — AI-Augmented Sprint Planning & Slippage Forecasting

---

## Problem Statement

### Sprint Planning Is Largely Guesswork — and Slippage Is Only Discovered at the Retro

A modern engineering team commits to a sprint based on gut feel, rough estimates, and optimism. Estimates are inconsistent between people, implicit dependencies between tickets are never surfaced, and teams routinely over-commit. When the sprint goes off-track on day two, nobody knows until the retro — by which point the roadmap has already slipped, stakeholders have already been let down, and crunch is already inevitable.

No existing project-management tool *reasons* about the work. Jira tracks tickets. Linear tracks tickets. GitHub Projects tracks tickets. None of them ask: "given this team's actual delivery history, will this sprint finish?" None of them say: "ticket A implicitly blocks ticket B — your plan schedules B to start tomorrow but A won't merge until day six." None of them fire a warning on day two while there is still time to rebalance.

**Why it matters:** Missed sprints erode stakeholder trust, break roadmaps, and force crunch. Even modest gains in estimate accuracy — and early warning when a sprint is trending off-track — compound into far more predictable delivery. That is one of the clearest wins available to the production function, and it is exactly the kind of pattern-over-history reasoning that an LLM plus a team's own data can do well.

### Proposed Solution

SprintSense ingests the backlog (tickets, descriptions, labels) together with the team's historical velocity and cycle-time data. It estimates each ticket from its text and the most similar previously-completed tickets, detects implicit blocking relationships between tickets from their content, and proposes a capacity-aware sprint plan that actually fits the team. Once the sprint starts it produces a daily slippage forecast — updating as work moves across the board — flagging the specific at-risk items with reasons, while there is still time to react.

### Expected Impact
- More accurate, consistent estimates grounded in the team's own delivery history
- Fewer over-commitments through capacity-aware planning that respects dependency order
- Slippage flagged on day two with the specific items at risk — not explained at the retro
- Less crunch and more predictable roadmaps for stakeholders

---

## Overview

A full-stack prototype that runs end-to-end with zero credentials in demo mode. The backend serves 13 endpoints backed by rich seed data covering a realistic 10-ticket backlog, 8 sprints of velocity history, an active Sprint 9 in progress on day 6, and a live slippage forecast. The frontend renders a dashboard, Gantt plan, drag-and-drop Kanban board, D3 dependency graph, and Monte-Carlo slippage charts — all wired to the API with no hardcoded values in the UI.

Ten service stubs are left intentionally incomplete for contributors to implement: the Monte-Carlo simulation engine, LLM dependency detector, capacity bin-packing scheduler, Slack/email notifier, and more.

---

## What Works Right Now vs What Needs Completion

### ✅ Works out of the box (built)

| Feature | Details |
|---------|---------|
| Full demo mode (end-to-end) | All 13 API endpoints return rich seed data with zero credentials |
| History-grounded estimation | Every backlog ticket has LLM estimate (points, low/high range, rationale) backed by similar historical tickets |
| Similarity matching | Each ticket maps to 1–2 nearest completed tickets by label + content proximity |
| Dependency graph | 7 DAG edges, cycle-free, all deferred sprint tickets traceable to active blockers |
| Capacity-aware sprint plan | Sprint 9 respects dependency order and member role; QA, AI, Backend, Frontend all assigned |
| Gantt timeline | Per-ticket bar chart with member colour-coding, day-start and duration |
| Monte-Carlo slippage data | 10-day forecast series: monotonically decreasing probabilities 91%→44%, consistent with burndown |
| At-risk items | 3 items with high/medium/low risk levels, reasons, and links to dependency chains |
| Burndown chart | Ideal (36pts/10 days) vs actuals for days 1–6; future days correctly null |
| Daily standup digest | Structured markdown narrative: completed / in-progress / blockers / SprintSense alert |
| Sprint board | 4 Kanban columns; all ticket status fields reflect their board column (not stale "backlog") |
| Velocity tracking | 8-sprint history with avg/min/max; avg velocity (35.8) used for capacity check |
| Team capacity view | Per-member allocation vs capacity hours; all 5 members including QA assigned |
| LLM fallback | Mock path returns seed estimates when no API key is set; real path activates with key |
| 404 handling | `/api/backlog/{id}` returns proper HTTP 404 for unknown IDs |
| Case-insensitive IDs | `tkt-101` normalised to `TKT-101` before lookup |
| React dev server | Hot-reload frontend proxied to backend on port 8000 |

### 🔶 Stubs / Partially built — needs completion

| # | Feature | What's missing | File |
|---|---------|---------------|------|
| 1 | Monte-Carlo simulation engine | `build_velocity_distribution()`, `project_remaining_points()`, `run_simulation()` all raise `NotImplementedError` | `backend/app/services/monte_carlo.py` |
| 2 | LLM dependency detector | `has_path()`, `classify_pair()`, `detect_implicit_dependencies()` all raise `NotImplementedError` | `backend/app/services/dependency_detector.py` |
| 3 | Capacity bin-packing scheduler | `topological_sort()`, `role_score()`, `assign_to_member()`, `build_sprint_plan()` all raise `NotImplementedError` | `backend/app/services/capacity_planner.py` |
| 4 | Slack / email alerts | `build_slack_blocks()`, `send_slack_alert()`, `markdown_to_html()`, `send_email_digest()` all raise `NotImplementedError` | `backend/app/services/notifier.py` |
| 5 | Real LLM estimation + digest | `estimate_ticket()` and `generate_digest()` LLM branches raise `NotImplementedError` when a key is provided | `backend/app/services/llm.py` |
| 6 | Live slippage forecast | `/api/forecast/slippage` returns static seed data — `run_simulation()` not yet wired | `backend/app/api/forecast.py` |
| 7 | Jira Cloud integration | `fetch_issues()` and `fetch_sprint_history()` raise `NotImplementedError` | `backend/app/services/jira_client.py` |
| 8 | GitHub Issues integration | `fetch_issues()` raises `NotImplementedError` | `backend/app/services/github_client.py` |
| 9 | Integration sync endpoints | `sync_jira()`, `sync_github()`, `test_slack()` all raise `NotImplementedError` | `backend/app/api/integrations.py` |
| 10 | Board column move | `POST /api/board/move` raises `NotImplementedError` — drag-and-drop has no persist path | `backend/app/api/board.py` |

### What the app produces today (before stubs are completed)

The full API runs end-to-end. You will see real estimates, a dependency graph, a sprint plan, and a slippage forecast. But:
- **Forecast** is static seed data — no simulations actually run
- **Dependency edges** are hardcoded — no LLM classifies ticket pairs
- **Sprint plan** is hardcoded — no bin-packing scheduler assigns tickets
- **LLM key** activates a `NotImplementedError` — the mock path is the only safe path
- **Jira / GitHub sync** buttons show a stub error until the client functions are implemented

After completing all stub files the system will run real Monte-Carlo simulations, detect implicit dependencies via LLM, generate dynamic sprint plans from any backlog, pull live tickets from Jira or GitHub, and send Slack/email alerts.

---

## Project Structure

```
sprintsense/
├── backend/                                      ← Python 3.11 + FastAPI
│   ├── app/
│   │   ├── main.py                               ✅ BUILT — FastAPI app + CORS config
│   │   ├── api/
│   │   │   ├── backlog.py                        ✅ BUILT — /api/backlog/* (estimates, deps, at-risk)
│   │   │   ├── sprint.py                         ✅ BUILT — /api/sprint/* (plan, burndown, digest)
│   │   │   ├── forecast.py                       🔶 PARTIAL — /api/forecast/slippage (static fallback; wire monte_carlo TODO)
│   │   │   ├── team.py                           ✅ BUILT — /api/team/
│   │   │   └── board.py                          ✅ BUILT — /api/board/ (live column status)
│   │   ├── data/
│   │   │   └── seed_data.py                      ✅ BUILT — all 13 seed datasets (single source of truth)
│   │   └── services/
│   │       ├── llm.py                            🔶 PARTIAL — mock path works; LLM call paths raise NotImplementedError
│   │       ├── monte_carlo.py                    🔶 STUB — 3 functions to implement (velocity dist, projection, simulation)
│   │       ├── dependency_detector.py            🔶 STUB — 3 functions to implement (path check, pair classify, full detect)
│   │       ├── capacity_planner.py               🔶 STUB — 4 functions to implement (topo sort, role score, assign, build plan)
│   │       └── notifier.py                       🔶 STUB — 4 functions to implement (Slack blocks, Slack POST, HTML convert, SendGrid)
│   ├── requirements.txt                          ✅ BUILT
│   └── .env.example                              ✅ BUILT — copy to .env
├── frontend/                                     ← React 18 + TypeScript
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx                     ✅ BUILT — KPI cards, burndown, slippage gauge, digest
│   │   │   ├── BacklogPage.tsx                   ✅ BUILT — ticket list with estimates + similar tickets expand
│   │   │   ├── SprintPlanPage.tsx                ✅ BUILT — Gantt timeline + velocity history table
│   │   │   ├── TeamPage.tsx                      ✅ BUILT — member capacity bars + allocation
│   │   │   ├── SettingsPage.tsx                  ✅ BUILT — LLM API key entry + status
│   │   │   ├── ForecastPage.tsx                  🔶 STUB — 3 chart sections to implement (area, line, at-risk list)
│   │   │   ├── DependenciesPage.tsx              🔶 STUB — D3 force simulation to implement in useEffect
│   │   │   └── BoardPage.tsx                     🔶 STUB — handleDrop + persistColumnChange to implement
│   │   ├── components/
│   │   │   └── Layout.tsx                        ✅ BUILT — sidebar nav + topbar shell
│   │   ├── hooks/useApi.ts                       ✅ BUILT — generic fetch hook with loading/error state
│   │   ├── utils/api.ts                          🔶 STUB — post() helper + updateTicketStatus to implement
│   │   └── types/index.ts                        ✅ BUILT — TypeScript interfaces
│   ├── public/index.html                         ✅ BUILT
│   └── package.json                              ✅ BUILT
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend runtime | Python 3.11 + FastAPI | Async-native, typed, fast — async paths ready for LLM calls |
| LLM inference | OpenAI-compatible + Anthropic API | Any provider; mock works without a key |
| Simulation | Python `random` / `statistics` | Monte-Carlo engine runs in-process, no extra services |
| Frontend | React 18 + TypeScript | Type-safe, fast HMR |
| Charts | Recharts | Area, bar, line charts for forecast and velocity |
| Graph | D3.js force-directed layout | Interactive dependency DAG with drag |
| Drag-and-drop | Native HTML5 drag API | No library dependency |
| HTTP client | `fetch` (frontend) + `httpx` (backend) | Async, no extra dependencies |
| Notifications | Slack Incoming Webhooks + SendGrid v3 | Standard integrations — keys optional |

**No Redis. No PostgreSQL. No message queue. No external services required in demo mode.**

---

## Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- An OpenAI or Anthropic API key *(optional — mock mode works without it)*

### Local development

**Terminal 1 — Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# ✅ Backend → http://localhost:8000
# ✅ Swagger → http://localhost:8000/docs
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
REACT_APP_API_URL=http://localhost:8000 npm start
# ✅ Frontend → http://localhost:3000
```

### Try it (no credentials needed)
1. Open **http://localhost:3000**
2. The **Dashboard** shows Sprint 9 day 6 — KPIs, burndown, slippage probability (63%), digest
3. **Backlog** — expand any ticket to see its AI estimate, confidence range, and similar past tickets
4. **Sprint Plan** — Gantt timeline with assignee colour-coding and deferred ticket list
5. **Dependencies** — *(D3 graph is a TODO — edge list below it is visible)*
6. **Forecast** — *(Charts are TODOs — probability header badge is visible)*
7. **Board** — Kanban columns render; drag-and-drop is a TODO
8. **Settings** — paste an OpenAI or Anthropic key to activate real LLM estimation

### Activating the real LLM path
1. Open **Settings** in the sidebar
2. Paste an `sk-...` (OpenAI) or `sk-ant-...` (Anthropic) key — validated live
3. Navigate to **Backlog** — estimates will now call the LLM (requires `estimate_ticket()` stub to be implemented)

---

## Environment Variables

Set in `backend/.env` (copy from `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8000` | Backend port |
| `OPENAI_API_KEY` | No | — | Activates real LLM estimation + digest. Prefix `sk-` |
| `ANTHROPIC_API_KEY` | No | — | Alternative to OpenAI. Prefix `sk-ant-` |
| `REACT_APP_API_URL` | No | `http://localhost:8000` | Frontend → backend base URL |

The LLM key can also be provided **per-request** via the `X-LLM-Key` HTTP header (set in the browser UI under Settings) — it takes precedence over environment variables.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service health check |
| `GET` | `/api/llm-status` | Whether a real LLM key is active |
| `GET` | `/api/backlog/` | All backlog tickets with AI estimates + similar tickets |
| `GET` | `/api/backlog/history` | Historical completed tickets (with assignee) |
| `GET` | `/api/backlog/dependencies` | Dependency graph edges (DAG) |
| `GET` | `/api/backlog/at-risk` | Current at-risk items with risk level + reason |
| `GET` | `/api/backlog/{id}` | Single ticket — estimate, similar, blocks, blocked_by |
| `GET` | `/api/sprint/current` | Active sprint plan — tickets, assignees, Gantt data |
| `GET` | `/api/sprint/history` | Past 8 sprints — velocity, committed, completed |
| `GET` | `/api/sprint/burndown` | Ideal vs actual remaining points per day |
| `GET` | `/api/sprint/digest` | Daily standup digest (LLM or mock) |
| `GET` | `/api/forecast/slippage` | Monte-Carlo forecast series + at-risk items |
| `GET` | `/api/forecast/velocity` | Avg / min / max / last velocity stats |
| `GET` | `/api/team/` | Team members with roles and capacity hours |
| `GET` | `/api/board/` | Kanban board — tickets in 4 columns with live status |

Full interactive API docs at `/docs` (Swagger UI) or `/redoc`.

---

## Pipeline — How It Works

```
  Backlog tickets + team history
           │
           ▼
  ┌──────────────────────────────────────────┐
  │  1. Similarity Search                    │  ← which past tickets are most similar?
  │     embedding nearest-neighbour          │    (hardcoded in demo; real embeddings TODO)
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │  2. LLM Estimation                       │  ← how many points is this ticket?
  │     similar tickets + description → LLM  │    mock: seed data / real: sk-... key
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │  3. Dependency Detection                 │  ← does ticket A implicitly block ticket B?
  │     LLM classifies all ordered pairs     │    mock: hardcoded edges / real: TODO stub
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │  4. Capacity-Aware Sprint Planning       │  ← which tickets fit? who gets what?
  │     topological sort → bin-packing       │    mock: hardcoded plan / real: TODO stub
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │  5. Sprint Execution Tracking            │  ← how is the team actually progressing?
  │     board state + burndown actuals       │    live in Sprint 9 demo (day 6 of 10)
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │  6. Monte-Carlo Slippage Forecast        │  ← will we finish? what's at risk?
  │     10 000 simulations over velocity     │    mock: static series / real: TODO stub
  │     distribution → daily probabilities   │
  └─────────────────┬────────────────────────┘
                    │
                    ▼
  ┌──────────────────────────────────────────┐
  │  7. Alert + Digest                       │  ← notify the team while there's time
  │     Slack / email when prob < 70%        │    mock: seed digest / real: TODO stub
  └─────────────────┬────────────────────────┘
                    │
                    ▼
       SprintSense Dashboard
       ├── Completion probability (63% on day 6)
       ├── Burndown — actual vs ideal
       ├── Velocity history (8 sprints)
       ├── At-risk items with reasons
       ├── Gantt timeline with dependency order
       └── Daily standup digest
```

---

## Seed Data (all in `backend/app/data/seed_data.py`)

The single source of truth for all demo data — 13 datasets covering a realistic Sprint 9 scenario:

| # | Dataset | Contents |
|---|---------|---------|
| 1 | `BACKLOG_TICKETS` | 10 tickets (TKT-101–110): title, description, labels |
| 2 | `HISTORICAL_TICKETS` | 17 completed tickets with story_points, cycle_days, assignee |
| 3 | `TEAM_MEMBERS` | 5 members: Backend, Frontend, Full-stack, AI/ML, QA |
| 4 | `SPRINT_HISTORY` | 8 sprints of velocity data (28–42 pts) |
| 5 | `SIMILARITY_MATCHES` | Nearest-neighbour matches per backlog ticket |
| 6 | `LLM_ESTIMATES` | Point estimate, confidence range, rationale per ticket |
| 7 | `DEPENDENCY_EDGES` | 7 A→B blocking relationships with reasons |
| 8 | `PROPOSED_SPRINT` | Sprint 9: 6 tickets assigned, 4 deferred, Gantt data |
| 9 | `SLIPPAGE_FORECAST` | 10-day series: probabilities 91%→44%, remaining points |
| 10 | `AT_RISK_ITEMS` | 3 items: TKT-109 (high), TKT-105 (medium), TKT-103 (low) |
| 11 | `SPRINT_BOARD` | Live board: todo / in_progress / review / done columns |
| 12 | `BURNDOWN` | Ideal (35pts/10 days) vs actuals days 1–6; future days null |
| 13 | `STANDUP_DIGEST` | Day 6 narrative: completed, in-progress, blockers, alert |

All 13 datasets are internally consistent — 218 regression checks pass against them.

---

## Contributor Tasks

Complete all 10 stubs to make the prototype fully functional. Each stub is one file — each file contains detailed `TODO` comments with step-by-step implementation guides, algorithm descriptions, and acceptance criteria.

| # | File | What to implement | Difficulty |
|---|------|------------------|------------|
| 1 | `backend/app/services/monte_carlo.py` | Implement `build_velocity_distribution()`, `project_remaining_points()`, and `run_simulation()` — 10 000 Monte-Carlo trials over the team's velocity distribution, producing a daily completion-probability series | ★★★ |
| 2 | `backend/app/services/dependency_detector.py` | Implement `has_path()` (cycle-safe DFS), `classify_pair()` (LLM classifies whether ticket A blocks B), and `detect_implicit_dependencies()` — concurrent pair inference with asyncio semaphore and cycle pruning | ★★★ |
| 3 | `backend/app/services/capacity_planner.py` | Implement `topological_sort()` (Kahn's BFS), `role_score()` (label→role affinity), `assign_to_member()` (capacity-aware greedy), and `build_sprint_plan()` — full bin-packing scheduler respecting the dependency DAG | ★★★ |
| 4 | `backend/app/services/notifier.py` | Implement `build_slack_blocks()` (Block Kit payload), `send_slack_alert()` (Incoming Webhook POST, threshold-gated at 70%), `markdown_to_html()`, and `send_email_digest()` (SendGrid v3 mail/send) | ★★ |
| 5 | `backend/app/services/llm.py` | Implement the LLM call path inside `estimate_ticket()` — similar-ticket prompt + `call_llm()` + JSON parse; and inside `generate_digest()` — sprint context assembly + LLM call + markdown return | ★★ |
| 6 | `backend/app/api/forecast.py` | Replace the static `SLIPPAGE_FORECAST` return in `GET /api/forecast/slippage` with a live call to `monte_carlo.run_simulation()` wired to current burndown state | ★★ |
| 7 | `backend/app/services/jira_client.py` | Implement `fetch_issues()` (pull open Jira tickets → SprintSense schema) and `fetch_sprint_history()` (pull closed sprints → velocity data) using Jira Cloud REST API | ★★ |
| 8 | `backend/app/services/github_client.py` | Implement `fetch_issues()` — pull open GitHub Issues, filter PRs, map fields to SprintSense ticket schema | ★ |
| 9 | `backend/app/api/integrations.py` | Implement `sync_jira()`, `sync_github()` (call the client stubs and upsert into seed data), and `test_slack()` (fire a test webhook message) | ★★ |
| 10 | `backend/app/api/board.py` | Implement `POST /api/board/move` — validate status, find ticket across columns, move it, update `SPRINT_BOARD` and `BACKLOG_TICKETS`, return updated board | ★ |

### Notes for contributors
- All `GET` endpoints work in demo mode with zero credentials — `NotImplementedError` fires only on `POST` requests and real LLM key paths
- Use `http://localhost:8000/docs` for the interactive Swagger explorer
- `backend/app/data/seed_data.py` is the single source of truth for all data shapes and field names
- `backend/app/services/llm.py` → `call_llm()` is the ready-made async LLM helper used by Tasks 2 and 5
- `backend/app/services/jira_client.py` and `github_client.py` → implement these before Task 9
- Each stub has `TODO` comments with exact steps, data structures, and acceptance criteria
