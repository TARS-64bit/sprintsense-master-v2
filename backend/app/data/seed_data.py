"""
SprintSense — all static/seed data lives here.
Every list or dict below is the single source of truth for the demo.
"""
from datetime import date, timedelta

# ---------------------------------------------------------------------------
# 1. BACKLOG TICKETS
# ---------------------------------------------------------------------------
BACKLOG_TICKETS = [
    {
        "id": "TKT-101",
        "title": "User authentication with OAuth2",
        "description": "Implement OAuth2 login flow supporting Google and GitHub providers. Include token refresh logic and secure session handling.",
        "labels": ["auth", "backend", "security"],
        "story_points": None,   # to be estimated
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-102",
        "title": "Dashboard analytics overview widget",
        "description": "Create a summary widget on the main dashboard showing sprint velocity, burn-down trend, and open blockers count.",
        "labels": ["frontend", "analytics"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-103",
        "title": "REST API rate-limiting middleware",
        "description": "Add per-user rate limiting (100 req/min) to all public endpoints using Redis sliding-window counters.",
        "labels": ["backend", "performance", "security"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-104",
        "title": "Email notification service",
        "description": "Send transactional emails (sprint alerts, digest, assignment changes) via SendGrid. Support templated HTML emails.",
        "labels": ["backend", "notifications"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-105",
        "title": "Drag-and-drop sprint board UI",
        "description": "Kanban board with drag-to-move ticket across columns (Backlog → In Progress → Review → Done). Persist order via API.",
        "labels": ["frontend", "ux"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-106",
        "title": "Ticket dependency graph visualisation",
        "description": "Render the inferred dependency DAG as an interactive force-directed graph. Highlight critical path in red.",
        "labels": ["frontend", "analytics", "ux"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-107",
        "title": "Monte-Carlo slippage forecast engine",
        "description": "Run 10 000 simulations over remaining story points vs velocity distribution to produce daily completion-probability series.",
        "labels": ["backend", "ai", "forecasting"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-108",
        "title": "Jira integration — backlog import",
        "description": "OAuth2 connection to Jira Cloud. Pull open issues from a configured project and map fields to internal schema.",
        "labels": ["integration", "backend"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-109",
        "title": "LLM estimation pipeline",
        "description": "Embed each ticket description, retrieve 5 nearest completed tickets via cosine similarity, pass context + description to LLM to generate point estimate and confidence range.",
        "labels": ["ai", "backend"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
    {
        "id": "TKT-110",
        "title": "Burndown chart component",
        "description": "Reusable React component rendering ideal vs actual burndown line chart. Supports sprint date range and daily actuals.",
        "labels": ["frontend", "analytics"],
        "story_points": None,
        "status": "backlog",
        "assignee": None,
    },
]

# ---------------------------------------------------------------------------
# 2. HISTORICAL COMPLETED TICKETS
# ---------------------------------------------------------------------------
HISTORICAL_TICKETS = [
    {"id": "TKT-001", "title": "SSO SAML integration",          "labels": ["auth","backend","security"],    "story_points": 8,  "actual_cycle_days": 9,  "completed_date": "2024-10-04", "assignee": "USR-1"},
    {"id": "TKT-002", "title": "KPI summary card component",     "labels": ["frontend","analytics"],         "story_points": 3,  "actual_cycle_days": 2,  "completed_date": "2024-10-04", "assignee": "USR-2"},
    {"id": "TKT-003", "title": "API throttling via Redis",        "labels": ["backend","performance"],        "story_points": 5,  "actual_cycle_days": 4,  "completed_date": "2024-10-18", "assignee": "USR-1"},
    {"id": "TKT-004", "title": "Slack webhook notifications",    "labels": ["backend","notifications"],      "story_points": 3,  "actual_cycle_days": 3,  "completed_date": "2024-10-18", "assignee": "USR-3"},
    {"id": "TKT-005", "title": "Sortable backlog list UI",       "labels": ["frontend","ux"],                "story_points": 5,  "actual_cycle_days": 6,  "completed_date": "2024-11-01", "assignee": "USR-2"},
    {"id": "TKT-006", "title": "Dependency tree page",           "labels": ["frontend","analytics"],         "story_points": 8,  "actual_cycle_days": 10, "completed_date": "2024-11-01", "assignee": "USR-3"},
    {"id": "TKT-007", "title": "Forecast probability widget",    "labels": ["backend","forecasting"],        "story_points": 8,  "actual_cycle_days": 7,  "completed_date": "2024-11-15", "assignee": "USR-4"},
    {"id": "TKT-008", "title": "GitHub Issues import",           "labels": ["integration","backend"],        "story_points": 5,  "actual_cycle_days": 5,  "completed_date": "2024-11-15", "assignee": "USR-1"},
    {"id": "TKT-009", "title": "Embedding similarity search",    "labels": ["ai","backend"],                 "story_points": 8,  "actual_cycle_days": 8,  "completed_date": "2024-11-29", "assignee": "USR-4"},
    {"id": "TKT-010", "title": "Velocity chart component",       "labels": ["frontend","analytics"],         "story_points": 3,  "actual_cycle_days": 2,  "completed_date": "2024-11-29", "assignee": "USR-2"},
    {"id": "TKT-011", "title": "JWT refresh token handling",     "labels": ["auth","backend","security"],    "story_points": 5,  "actual_cycle_days": 5,  "completed_date": "2024-12-13", "assignee": "USR-1"},
    {"id": "TKT-012", "title": "Azure DevOps connector",         "labels": ["integration","backend"],        "story_points": 8,  "actual_cycle_days": 9,  "completed_date": "2024-12-13", "assignee": "USR-3"},
    {"id": "TKT-013", "title": "Capacity planner UI",            "labels": ["frontend","ux"],                "story_points": 5,  "actual_cycle_days": 4,  "completed_date": "2024-12-27", "assignee": "USR-2"},
    {"id": "TKT-014", "title": "Monte-Carlo engine v1",          "labels": ["backend","ai","forecasting"],   "story_points": 13, "actual_cycle_days": 12, "completed_date": "2024-12-27", "assignee": "USR-4"},
    {"id": "TKT-015", "title": "Email digest template",          "labels": ["backend","notifications"],      "story_points": 3,  "actual_cycle_days": 3,  "completed_date": "2025-01-10", "assignee": "USR-3"},
    {"id": "TKT-016", "title": "Backlog priority sort UI",       "labels": ["frontend","ux"],                "story_points": 5,  "actual_cycle_days": 4,  "completed_date": "2025-01-28", "assignee": "USR-2"},
    {"id": "TKT-017", "title": "LLM prompt tuning for estimation","labels": ["ai","backend"],                "story_points": 8,  "actual_cycle_days": 7,  "completed_date": "2025-02-03", "assignee": "USR-4"},
]

# ---------------------------------------------------------------------------
# 3. TEAM MEMBERS
# ---------------------------------------------------------------------------
TEAM_MEMBERS = [
    {"id": "USR-1", "name": "Priya Sharma",   "role": "Backend Engineer",      "capacity_hours": 64, "avatar": "PS"},
    {"id": "USR-2", "name": "James O'Brien",  "role": "Frontend Engineer",     "capacity_hours": 56, "avatar": "JO"},
    {"id": "USR-3", "name": "Meera Nair",     "role": "Full-stack Engineer",   "capacity_hours": 64, "avatar": "MN"},
    {"id": "USR-4", "name": "Carlos Ruiz",    "role": "AI / ML Engineer",      "capacity_hours": 48, "avatar": "CR"},
    {"id": "USR-5", "name": "Aisha Okonkwo",  "role": "QA Engineer",           "capacity_hours": 40, "avatar": "AO"},
]

# ---------------------------------------------------------------------------
# 4. SPRINT HISTORY
# ---------------------------------------------------------------------------
SPRINT_HISTORY = [
    {"sprint": 1,  "start": "2024-10-01", "end": "2024-10-14", "committed": 32, "completed": 28, "velocity": 28},
    {"sprint": 2,  "start": "2024-10-15", "end": "2024-10-28", "committed": 34, "completed": 34, "velocity": 34},
    {"sprint": 3,  "start": "2024-10-29", "end": "2024-11-11", "committed": 36, "completed": 30, "velocity": 30},
    {"sprint": 4,  "start": "2024-11-12", "end": "2024-11-25", "committed": 38, "completed": 38, "velocity": 38},
    {"sprint": 5,  "start": "2024-11-26", "end": "2024-12-09", "committed": 40, "completed": 36, "velocity": 36},
    {"sprint": 6,  "start": "2024-12-10", "end": "2024-12-23", "committed": 38, "completed": 40, "velocity": 40},
    {"sprint": 7,  "start": "2025-01-07", "end": "2025-01-20", "committed": 42, "completed": 38, "velocity": 38},
    {"sprint": 8,  "start": "2025-01-21", "end": "2025-02-03", "committed": 40, "completed": 42, "velocity": 42},
]

# Derived average velocity
AVG_VELOCITY = sum(s["velocity"] for s in SPRINT_HISTORY) / len(SPRINT_HISTORY)   # ≈ 35.75

# ---------------------------------------------------------------------------
# 5. TICKET EMBEDDINGS / SIMILARITY MATCHES (hardcoded)
# ---------------------------------------------------------------------------
SIMILARITY_MATCHES = {
    "TKT-101": ["TKT-001", "TKT-011"],   # auth tickets
    "TKT-102": ["TKT-002", "TKT-010"],   # dashboard widgets
    "TKT-103": ["TKT-003"],              # rate-limiting
    "TKT-104": ["TKT-004", "TKT-015"],   # notifications
    "TKT-105": ["TKT-005", "TKT-013"],   # board/UI
    "TKT-106": ["TKT-006"],              # dependency viz
    "TKT-107": ["TKT-007", "TKT-014"],   # forecasting
    "TKT-108": ["TKT-008", "TKT-012"],   # integrations
    "TKT-109": ["TKT-009"],              # AI/embeddings
    "TKT-110": ["TKT-010", "TKT-002"],   # charts
}

# ---------------------------------------------------------------------------
# 6. LLM ESTIMATES (point + confidence range)
# ---------------------------------------------------------------------------
LLM_ESTIMATES = {
    "TKT-101": {"points": 8,  "low": 5,  "high": 13, "rationale": "OAuth2 flow + refresh logic is similar to TKT-001 (8 pts); dual provider adds ~0 pts overhead."},
    "TKT-102": {"points": 3,  "low": 2,  "high": 5,  "rationale": "Composites 3 sub-widgets; matches TKT-002 pattern closely."},
    "TKT-103": {"points": 5,  "low": 3,  "high": 8,  "rationale": "Redis sliding-window is well-understood; TKT-003 took 5 pts. Scope is equivalent."},
    "TKT-104": {"points": 5,  "low": 3,  "high": 8,  "rationale": "SendGrid templated emails; TKT-004 (Slack webhooks) took 3 pts but HTML templates add complexity."},
    "TKT-105": {"points": 8,  "low": 5,  "high": 13, "rationale": "Drag-and-drop libraries add complexity over TKT-005 (5 pts); persistence API doubles scope."},
    "TKT-106": {"points": 8,  "low": 5,  "high": 13, "rationale": "Force-directed graph + critical path highlighting; TKT-006 (8 pts) is nearly identical."},
    "TKT-107": {"points": 13, "low": 8,  "high": 21, "rationale": "10k Monte-Carlo runs + daily scheduling job is heavier than TKT-007/TKT-014; confidence wide."},
    "TKT-108": {"points": 8,  "low": 5,  "high": 13, "rationale": "Jira OAuth + field mapping; TKT-008 (GitHub, 5 pts) is simpler — Jira schema is more complex."},
    "TKT-109": {"points": 8,  "low": 5,  "high": 13, "rationale": "Embedding pipeline matches TKT-009 (8 pts); LLM call layer is additive but small."},
    "TKT-110": {"points": 3,  "low": 2,  "high": 5,  "rationale": "Reusable chart component; TKT-010 (3 pts) is the closest match."},
}

# ---------------------------------------------------------------------------
# 7. DEPENDENCY GRAPH EDGES  (A blocks B)
# ---------------------------------------------------------------------------
DEPENDENCY_EDGES = [
    {"from": "TKT-101", "to": "TKT-104", "reason": "Email notifications require authenticated user sessions"},
    {"from": "TKT-101", "to": "TKT-108", "reason": "Jira OAuth shares the same auth middleware"},
    {"from": "TKT-103", "to": "TKT-108", "reason": "Rate-limiting must wrap external integration endpoints"},
    {"from": "TKT-109", "to": "TKT-107", "reason": "Slippage engine uses LLM estimates as input"},
    {"from": "TKT-109", "to": "TKT-106", "reason": "Dependency graph is populated by LLM inference pipeline"},
    {"from": "TKT-105", "to": "TKT-106", "reason": "Dependency graph is rendered on the sprint board"},
    {"from": "TKT-110", "to": "TKT-102", "reason": "Dashboard widget composes the burndown chart component"},
]

# ---------------------------------------------------------------------------
# 8. PROPOSED SPRINT PLAN
# ---------------------------------------------------------------------------
PROPOSED_SPRINT = {
    "sprint_number": 9,
    "start_date": "2025-02-04",
    "end_date": "2025-02-17",
    "total_capacity_points": 35,
    "tickets": [
        {"id": "TKT-101", "assignee": "USR-1", "sprint_day_start": 1,  "estimated_days": 4, "status": "in_progress"},
        {"id": "TKT-103", "assignee": "USR-1", "sprint_day_start": 5,  "estimated_days": 3, "status": "todo"},
        {"id": "TKT-109", "assignee": "USR-4", "sprint_day_start": 1,  "estimated_days": 5, "status": "in_progress"},
        {"id": "TKT-110", "assignee": "USR-2", "sprint_day_start": 1,  "estimated_days": 2, "status": "done"},
        {"id": "TKT-105", "assignee": "USR-2", "sprint_day_start": 3,  "estimated_days": 4, "status": "in_progress"},
        {"id": "TKT-102", "assignee": "USR-5", "sprint_day_start": 1,  "estimated_days": 2, "status": "review"},
    ],
    "deferred": ["TKT-104", "TKT-106", "TKT-107", "TKT-108"],
    "notes": "TKT-106 deferred: depends on TKT-109 not yet complete. TKT-107 is 13 pts — carries over to Sprint 10.",
}

# ---------------------------------------------------------------------------
# 9. DAILY SLIPPAGE FORECAST  (10-day sprint)
# ---------------------------------------------------------------------------
SLIPPAGE_FORECAST = [
    {"day": 1,  "date": "2025-02-04", "completion_probability": 0.91, "remaining_points": 35},
    {"day": 2,  "date": "2025-02-05", "completion_probability": 0.88, "remaining_points": 32},
    {"day": 3,  "date": "2025-02-06", "completion_probability": 0.85, "remaining_points": 29},
    {"day": 4,  "date": "2025-02-07", "completion_probability": 0.79, "remaining_points": 27},
    {"day": 5,  "date": "2025-02-10", "completion_probability": 0.71, "remaining_points": 24},
    {"day": 6,  "date": "2025-02-11", "completion_probability": 0.63, "remaining_points": 22},
    {"day": 7,  "date": "2025-02-12", "completion_probability": 0.57, "remaining_points": 20},
    {"day": 8,  "date": "2025-02-13", "completion_probability": 0.52, "remaining_points": 17},
    {"day": 9,  "date": "2025-02-14", "completion_probability": 0.48, "remaining_points": 14},
    {"day": 10, "date": "2025-02-17", "completion_probability": 0.44, "remaining_points": 12},
]

# ---------------------------------------------------------------------------
# 10. AT-RISK ITEMS
# ---------------------------------------------------------------------------
AT_RISK_ITEMS = [
    {
        "ticket_id": "TKT-109",
        "title": "LLM estimation pipeline",
        "risk_level": "high",
        "reason": "Day 5 — still in progress; blocks TKT-106 and TKT-107. LLM integration taking longer than estimated (8 pts → tracking 11).",
    },
    {
        "ticket_id": "TKT-105",
        "title": "Drag-and-drop sprint board UI",
        "risk_level": "medium",
        "reason": "Drag-and-drop library conflict with React 18 strict-mode discovered on Day 4. Workaround under investigation.",
    },
    {
        "ticket_id": "TKT-103",
        "title": "REST API rate-limiting middleware",
        "risk_level": "low",
        "reason": "Blocked by TKT-101 not yet merged. Dependency was implicit — not in tracker links. Starts Day 5 at earliest.",
    },
]

# ---------------------------------------------------------------------------
# 11. CURRENT SPRINT BOARD STATE
# ---------------------------------------------------------------------------
SPRINT_BOARD = {
    "todo":        ["TKT-103"],
    "in_progress": ["TKT-101", "TKT-109", "TKT-105"],
    "review":      ["TKT-102"],
    "done":        ["TKT-110"],
}

# ---------------------------------------------------------------------------
# 12. BURNDOWN ACTUALS  (ideal 36 → 0 over 10 days)
# ---------------------------------------------------------------------------
BURNDOWN = {
    "total_points": 35,
    "ideal": [35, 31.5, 28.0, 24.5, 21.0, 17.5, 14.0, 10.5, 7.0, 3.5, 0],
    "actual": [35, 32,   29,   27,   24,   22,   None, None, None, None, None],
    "days":   ["Feb 4","Feb 5","Feb 6","Feb 7","Feb 10","Feb 11","Feb 12","Feb 13","Feb 14","Feb 17","End"],
}

# ---------------------------------------------------------------------------
# 13. DAILY STANDUP DIGEST
# ---------------------------------------------------------------------------
STANDUP_DIGEST = """**SprintSense Daily Digest — Day 6 (Feb 11)**

🟢 **Completed yesterday**
- TKT-110 (Burndown chart component) merged to main by James. ✅
- TKT-102 (Dashboard analytics widget) moved to Review by Meera; awaiting QA sign-off.

🔵 **In progress today**
- TKT-101 (OAuth2) — Priya in final testing; PR expected EOD.
- TKT-109 (LLM estimation pipeline) — Carlos unblocked after fixing tokeniser issue; 60% complete.
- TKT-105 (Drag-and-drop board) — James investigating React 18 strict-mode conflict; workaround found, resuming implementation.

🔴 **Blockers**
- TKT-103 (Rate-limiting) waiting on TKT-101 merge before it can start. Estimated start: tomorrow.
- TKT-109 slip may push TKT-106 and TKT-107 out of this sprint.

⚠️ **SprintSense alert**
Sprint completion probability has dropped to **63%** (day 6 of 10). 
At-risk: TKT-109, TKT-105. Consider descoping TKT-103 or pulling in help for Carlos on TKT-109.
"""
