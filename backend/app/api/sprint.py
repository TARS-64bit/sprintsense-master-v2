from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import (
    PROPOSED_SPRINT, SPRINT_HISTORY, BURNDOWN,
    BACKLOG_TICKETS, LLM_ESTIMATES, STANDUP_DIGEST, AT_RISK_ITEMS,
    TEAM_MEMBERS, DEPENDENCY_EDGES
)
from pydantic import BaseModel
from typing import List
from app.services.llm import generate_digest
from datetime import datetime, timedelta
from app.services.capacity_planner import build_sprint_plan
from app.api.backlog import get_active_tickets, get_dependencies, get_backlog
from app.api.team import get_team
from app.services import jira_client, github_client

class SprintStartRequest(BaseModel):
    provider: str
    name: str
    goal: str
    start_date: str
    end_date: str
    ticket_ids: List[str]

router = APIRouter()

@router.post("/start")
async def start_sprint(
    req: SprintStartRequest,
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None)
):
    if req.provider.lower() == "jira":
        result = await jira_client.create_and_start_sprint(
            name=req.name,
            goal=req.goal,
            start_date=req.start_date,
            end_date=req.end_date,
            ticket_ids=req.ticket_ids,
            url_override=x_jira_url,
            email_override=x_jira_email,
            token_override=x_jira_api_token,
        )
        return result
    elif req.provider.lower() == "github":
        result = await github_client.create_milestone_and_assign_issues(
            name=req.name,
            description=req.goal,
            due_on=req.end_date,
            ticket_ids=req.ticket_ids,
            owner=x_github_owner,
            repo=x_github_repo,
            token_override=x_github_token,
        )
        return result
    else:
        return {"success": False, "error": f"Unknown provider: {req.provider}"}

@router.get("/current")
async def get_current_sprint(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    x_llm_key: Optional[str] = Header(default=None),
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None),
    x_jira_board_id: Optional[str] = Header(default=None)
):
    tickets = await get_active_tickets(
        x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )

    # Predict dates if not provided
    sprint_number = 1
    if not start_date or not end_date:
        history_response = await get_sprint_history(
            x_github_token, x_github_owner, x_github_repo,
            x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key, x_jira_board_id
        )
        history = history_response.get("sprints", [])
        if history:
            sprint_number = len(history) + 1
            last_sprint = history[-1]
            try:
                last_end = datetime.strptime(last_sprint["end"], "%Y-%m-%d")
                start_dt = last_end + timedelta(days=1)

                # Default to 14 days sprint length if we can't figure it out
                sprint_length = 14
                if last_sprint.get("start") and last_sprint.get("end"):
                    last_start = datetime.strptime(last_sprint["start"], "%Y-%m-%d")
                    sprint_length = max(1, (last_end - last_start).days)

                end_dt = start_dt + timedelta(days=sprint_length)

                if not start_date:
                    start_date = start_dt.strftime("%Y-%m-%d")
                if not end_date:
                    end_date = end_dt.strftime("%Y-%m-%d")
            except Exception:
                pass

    if not start_date:
        start_date = datetime.now().strftime("%Y-%m-%d")
    if not end_date:
        end_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")


    team_data = await get_team(
        x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )
    members = team_data.get("members", TEAM_MEMBERS)

    deps_data = await get_dependencies(
        x_llm_key, x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )
    edges = deps_data.get("edges", DEPENDENCY_EDGES)

    backlog_data = await get_backlog(
        x_llm_key, x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )
    # create estimate dict from backlog logic (which already incorporates LLM)
    estimates = {}
    for t in backlog_data.get("tickets", []):
        estimates[t["id"]] = t.get("estimate", LLM_ESTIMATES.get(t["id"], {}))

    # Pass days to build_sprint_plan
    try:
        s_dt = datetime.strptime(start_date, "%Y-%m-%d")
        e_dt = datetime.strptime(end_date, "%Y-%m-%d")
        sprint_days = max(1, (e_dt - s_dt).days)
    except Exception:
        sprint_days = 14

    plan = build_sprint_plan(
        backlog_tickets=tickets,
        estimates=estimates,
        team_members=members,
        dependency_edges=edges,
        sprint_number=sprint_number,
        start_date=start_date,
        end_date=end_date,
        sprint_days=sprint_days
    )

    enriched = []
    for entry in plan["tickets"]:
        ticket = next((t for t in tickets if t["id"] == entry["id"]), {})
        est = estimates.get(entry["id"], {})
        enriched.append({**entry, "title": ticket.get("title", ""), "labels": ticket.get("labels", []), "estimate": est})
    return {**plan, "tickets": enriched}


@router.get("/history")
async def get_sprint_history(
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None),
    x_jira_board_id: Optional[str] = Header(default=None)
):
    # Try Jira first
    if x_jira_url and x_jira_email and x_jira_api_token and x_jira_board_id:
        try:
            history = await jira_client.fetch_sprint_history(
                board_id=x_jira_board_id,
                url_override=x_jira_url,
                email_override=x_jira_email,
                token_override=x_jira_api_token
            )
            if history:
                return {"sprints": history}
        except Exception:
            pass

    # Try GitHub
    try:
        if x_github_token and x_github_owner and x_github_repo:
            history = await github_client.fetch_sprint_history(
                owner=x_github_owner,
                repo=x_github_repo,
                token_override=x_github_token
            )
            if history:
                return {"sprints": history}
    except Exception:
        pass

    # Fallback configured environments
    if github_client.is_configured():
        history = await github_client.fetch_sprint_history()
        if history: return {"sprints": history}

    if jira_client.is_configured():
        history = await jira_client.fetch_sprint_history()
        if history: return {"sprints": history}

    return {"sprints": SPRINT_HISTORY}


@router.get("/burndown")
def get_burndown():
    return BURNDOWN


@router.get("/digest")
async def get_standup_digest(
    x_llm_key: Optional[str] = Header(default=None),
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None)
):
    sprint_state = await get_current_sprint(
        x_github_token, x_github_owner, x_github_repo,
        x_jira_url, x_jira_email, x_jira_api_token, x_jira_project_key
    )
    digest_text, source = await generate_digest(
        sprint_state=sprint_state,
        burndown=BURNDOWN,
        at_risk=AT_RISK_ITEMS,
        day=6,
        date_str="2025-02-11",
        api_key=x_llm_key,
        mock_digest=STANDUP_DIGEST,
    )
    return {"digest": digest_text, "day": 6, "date": "2025-02-11", "source": source}
