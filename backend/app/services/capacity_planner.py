"""
SprintSense — Capacity-Aware Sprint Planner
============================================
TASK  ★★★

Replace the hardcoded PROPOSED_SPRINT seed data with a dynamic bin-packing
scheduler that respects dependency ordering and per-member capacity.

Problem
-------
The hardcoded sprint plan is static. A real planner must:
  1. Topologically sort the backlog so no ticket is scheduled before its blockers.
  2. Assign each ticket to the best-fit team member within their capacity budget.
  3. Pack as many points as possible without exceeding total available hours.
  4. Defer any ticket that cannot fit, with an explanatory note.

Algorithm
---------
  Topological sort (Kahn's) → Greedy assignment (role-match + capacity-first)
  → Return dict matching PROPOSED_SPRINT shape.

Role → label heuristic
-----------------------
  Backend Engineer   → labels contain "backend"
  Frontend Engineer  → labels contain "frontend"
  AI / ML Engineer   → labels contain "ai"
  QA Engineer        → labels contain "qa" or ticket status is "review"
  Full-stack Engineer→ anything else (catch-all)

API reference
-------------
  app.data.seed_data.TEAM_MEMBERS      — id, name, role, capacity_hours
  app.data.seed_data.LLM_ESTIMATES     — ticket_id → {points, low, high}
  app.data.seed_data.DEPENDENCY_EDGES  — {from, to} DAG edges
  HOURS_PER_POINT = 8.0  (assumed constant throughout this module)
"""
from typing import Optional

HOURS_PER_POINT: float = 8.0

ROLE_LABEL_MAP: dict = {
    "Backend Engineer":   ["backend", "security", "performance", "notifications", "integration"],
    "Frontend Engineer":  ["frontend", "ux", "analytics"],
    "AI / ML Engineer":   ["ai", "forecasting"],
    "QA Engineer":        ["qa"],
    "Full-stack Engineer": [],   # catch-all
}


# ---------------------------------------------------------------------------
# TODO 1 — topological_sort()
# ---------------------------------------------------------------------------
# Return ticket IDs in topological order (all blockers before their dependents).
#
# Parameters:
#   ticket_ids : list[str]
#   edges      : list[dict]  — each dict has "from" (blocker) and "to" (blocked)
#
# Algorithm — Kahn's BFS:
#   a. Build adjacency list  adj[u]  = [v, ...]  (u blocks v)
#      and in-degree count   indeg[v] = number of tickets blocking v
#   b. Initialise queue with all nodes where indeg == 0.
#   c. While queue is not empty:
#        pop u → append to result
#        for each v in adj[u]: indeg[v] -= 1; if 0 → enqueue
#   d. If len(result) < len(ticket_ids) a cycle was detected:
#        append remaining nodes (those with indeg > 0) in arbitrary order.
#        Log a warning — never raise.
#   e. Return result.
#
# Acceptance:
#   - len(result) == len(ticket_ids)
#   - Every ticket_id appears exactly once.
#   - For every edge (u, v), u appears before v in result (when no cycle).

def topological_sort(ticket_ids: list, edges: list) -> list:
    # TODO 1 — implement this function
    raise NotImplementedError("topological_sort not implemented")


# ---------------------------------------------------------------------------
# TODO 2 — role_score()
# ---------------------------------------------------------------------------
# Score how well a member's role matches a ticket's labels (higher is better).
#
# Parameters:
#   member_role   : str        — e.g. "Backend Engineer"
#   ticket_labels : list[str]  — e.g. ["backend", "security"]
#
# Steps:
#   a. Look up the preferred labels for member_role in ROLE_LABEL_MAP.
#   b. Count how many ticket_labels appear in the preferred list.
#   c. Return the count as an int (0 means no preference match).
#
# Acceptance: returns 0 for Full-stack Engineer (catch-all) unless labels
# happen to match; deterministic for the same inputs.

def role_score(member_role: str, ticket_labels: list) -> int:
    # TODO 2 — implement this function
    raise NotImplementedError("role_score not implemented")


# ---------------------------------------------------------------------------
# TODO 3 — assign_to_member()
# ---------------------------------------------------------------------------
# Choose the best available team member for a single ticket.
#
# Parameters:
#   ticket       : dict   — backlog ticket with "id" and "labels"
#   estimates    : dict   — LLM_ESTIMATES: ticket_id → {points, …}
#   members      : list   — TEAM_MEMBERS list
#   used_hours   : dict   — {member_id: float} hours already committed
#
# Steps:
#   a. Look up points = estimates[ticket["id"]]["points"].
#      hours_needed = points * HOURS_PER_POINT
#   b. Filter members to those where:
#        members[i]["capacity_hours"] - used_hours.get(id, 0) >= hours_needed
#   c. Among eligible members, sort by:
#        1. role_score() descending (best role match first)
#        2. remaining capacity descending (most available first) as tiebreak
#   d. Return the first eligible member's id, or None if no one can take it.
#
# Acceptance: returns a valid member id or None; never raises.

def assign_to_member(
    ticket: dict,
    estimates: dict,
    members: list,
    used_hours: dict,
) -> Optional[str]:
    # TODO 3 — implement this function
    raise NotImplementedError("assign_to_member not implemented")


# ---------------------------------------------------------------------------
# TODO 4 — build_sprint_plan()
# ---------------------------------------------------------------------------
# Assemble the full sprint plan, returned by GET /api/sprint/current.
#
# Parameters:
#   backlog_tickets  : list[dict]  — BACKLOG_TICKETS
#   estimates        : dict        — LLM_ESTIMATES
#   team_members     : list[dict]  — TEAM_MEMBERS
#   dependency_edges : list[dict]  — DEPENDENCY_EDGES
#   sprint_number    : int
#   start_date       : str         — ISO "YYYY-MM-DD"
#   end_date         : str         — ISO "YYYY-MM-DD"
#   sprint_days      : int         — default 10
#
# Steps:
#   a. sorted_ids = topological_sort([t["id"] for t in backlog_tickets],
#                                     dependency_edges)
#   b. Initialise used_hours = {m["id"]: 0.0 for m in team_members}
#      Initialise finish_day  = {}  (ticket_id → last day of its bar)
#   c. For each ticket_id in sorted_ids:
#        ticket = look up in backlog_tickets
#        assignee = assign_to_member(ticket, estimates, team_members, used_hours)
#        if assignee is None → add to deferred list, continue
#        pts = estimates[ticket_id]["points"]
#        used_hours[assignee] += pts * HOURS_PER_POINT
#        blockers = [e["from"] for e in dependency_edges if e["to"] == ticket_id]
#        sprint_day_start = max(finish_day.get(b, 0) for b in blockers) + 1
#                          (use 1 if no blockers)
#        clamp sprint_day_start to [1, sprint_days]
#        estimated_days = max(1, round(pts * HOURS_PER_POINT / 8))
#        finish_day[ticket_id] = sprint_day_start + estimated_days - 1
#        append to planned list with status = "todo"
#   d. total_capacity_points = sum(estimates[t["id"]]["points"] for t in planned)
#   e. Build deferred notes string listing ticket IDs and reason (dependency or size).
#   f. Return dict:
#        {
#          "sprint_number": sprint_number,
#          "start_date":    start_date,
#          "end_date":      end_date,
#          "total_capacity_points": total_capacity_points,
#          "tickets":  [{"id", "assignee", "sprint_day_start",
#                        "estimated_days", "status"}, ...],
#          "deferred": [id, ...],
#          "notes":    deferred_notes_string,
#        }
#
# Acceptance:
#   - All assignee ids exist in team_members.
#   - No ticket in "tickets" list has an unresolved blocker that is also
#     in "tickets" but scheduled to START after it.
#   - total_capacity_points == sum of points for all tickets in the plan.

def build_sprint_plan(
    backlog_tickets: list,
    estimates: dict,
    team_members: list,
    dependency_edges: list,
    sprint_number: int,
    start_date: str,
    end_date: str,
    sprint_days: int = 10,
) -> dict:
    # TODO 4 — implement this function
    raise NotImplementedError("build_sprint_plan not implemented")
