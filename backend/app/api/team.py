from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import TEAM_MEMBERS, BACKLOG_TICKETS
from app.api.backlog import get_active_tickets

router = APIRouter()

# Global cache for integration collaborators populated by integrations.py
_integration_team_cache = []

@router.get("/")
async def get_team(
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None)
):
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
        return {"members": _integration_team_cache}

    # Fallback: if we are in integration mode but have no collaborators fetched
    # (e.g. read-only token lacking permissions to hit /collaborators API),
    # dynamically infer the minimal team directly from assignees.
    dynamic_members = {}
    for t in tickets:
        assignee = t.get("assignee")
        if assignee and assignee not in dynamic_members:
            dynamic_members[assignee] = {
                "id": str(assignee),
                "name": str(assignee),
                "role": "Engineer",
                "capacity_hours": 400, # Set a high capacity by default when guessing team to avoid deferring all items
                "avatar": str(assignee)[:2].upper()
            }

    if not dynamic_members:
        dynamic_members["Engineer"] = {
            "id": "Engineer",
            "name": "Engineer",
            "role": "Engineer",
            "capacity_hours": 400,
            "avatar": "EN"
        }

    return {"members": list(dynamic_members.values())}
