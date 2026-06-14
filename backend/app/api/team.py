from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import TEAM_MEMBERS, BACKLOG_TICKETS
from app.api.backlog import get_active_tickets, get_historical_tickets

router = APIRouter()

# Global cache for integration collaborators populated by integrations.py
_integration_team_cache = []

@router.get("/")
async def get_team(
    sprint_days: int = 14,
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None)
):
    # Calculate expected hours assuming 8 hr workdays and omitting weekends roughly.
    # A standard 14 day sprint (2 weeks) has 10 working days = 80 hours.
    # To keep it simple, we just do sprint_days * 5.71 working days per week * 8 ~ roughly.
    # Or more easily: 8 hours * (sprint_days * 5 // 7) -> 80 hrs for 14 days.
    working_days = max(1, (sprint_days * 5) // 7)
    expected_capacity = working_days * 8

    tickets = await get_active_tickets(
        x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )

    # If the active tickets match the mock seed data exactly, return the dummy team.
    if tickets is BACKLOG_TICKETS:
        return {"members": TEAM_MEMBERS}

    # If we successfully fetched collaborators during sync, return them directly.
    # They represent everyone in the repo, not just people with active tickets.
    if _integration_team_cache:
        members = []
        for m in _integration_team_cache:
            members.append({**m, "capacity_hours": expected_capacity})
        return {"members": members}

    # Fallback: if we are in integration mode but have no collaborators fetched
    # (e.g. read-only token lacking permissions to hit /collaborators API),
    # dynamically infer the minimal team directly from assignees on active AND historical tickets.
    historical_tickets = await get_historical_tickets(
        x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )

    dynamic_members = {}
    for t in tickets + historical_tickets:
        assignee = t.get("assignee")
        if assignee and assignee not in dynamic_members:
            dynamic_members[assignee] = {
                "id": str(assignee),
                "name": str(assignee),
                "role": "Engineer",
                "capacity_hours": expected_capacity,
                "avatar": str(assignee)[:2].upper()
            }

    if not dynamic_members:
        dynamic_members["Engineer"] = {
            "id": "Engineer",
            "name": "Engineer",
            "role": "Engineer",
            "capacity_hours": expected_capacity,
            "avatar": "EN"
        }

    return {"members": list(dynamic_members.values())}
