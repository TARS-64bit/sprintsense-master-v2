from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import TEAM_MEMBERS, BACKLOG_TICKETS
from app.api.backlog import get_active_tickets

router = APIRouter()


@router.get("/")
async def get_team(
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None)
):
    tickets = await get_active_tickets(x_github_token, x_github_owner, x_github_repo)

    # If the active tickets match the mock seed data exactly, return the dummy team.
    # Otherwise, we are in an integration mode (GitHub/Jira) and should infer the team from assignees.
    if tickets is BACKLOG_TICKETS:
        return {"members": TEAM_MEMBERS}

    # We are in integration mode. Build team dynamically from assignees.
    dynamic_members = {}
    for t in tickets:
        assignee = t.get("assignee")
        if assignee and assignee not in dynamic_members:
            dynamic_members[assignee] = {
                "id": str(assignee),
                "name": str(assignee),
                "role": "Engineer",
                "capacity_hours": 40,
                "avatar": str(assignee)[:2].upper()
            }

    return {"members": list(dynamic_members.values())}
