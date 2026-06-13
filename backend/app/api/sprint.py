from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import (
    PROPOSED_SPRINT, SPRINT_HISTORY, BURNDOWN,
    BACKLOG_TICKETS, LLM_ESTIMATES, STANDUP_DIGEST, AT_RISK_ITEMS,
    TEAM_MEMBERS, DEPENDENCY_EDGES
)
from app.services.llm import generate_digest
from app.services.capacity_planner import build_sprint_plan
from app.services import github_client

router = APIRouter()

async def get_active_tickets():
    if github_client.is_configured():
        try:
            issues = await github_client.fetch_issues()
            if issues:
                return issues
        except Exception:
            pass
    return BACKLOG_TICKETS

@router.get("/current")
async def get_current_sprint():
    tickets = await get_active_tickets()

    plan = build_sprint_plan(
        backlog_tickets=tickets,
        estimates=LLM_ESTIMATES,
        team_members=TEAM_MEMBERS,
        dependency_edges=DEPENDENCY_EDGES,
        sprint_number=9,
        start_date="2025-02-04",
        end_date="2025-02-17",
    )

    enriched = []
    for entry in plan["tickets"]:
        ticket = next((t for t in tickets if t["id"] == entry["id"]), {})
        est = LLM_ESTIMATES.get(entry["id"], {})
        enriched.append({**entry, "title": ticket.get("title", ""), "labels": ticket.get("labels", []), "estimate": est})
    return {**plan, "tickets": enriched}


@router.get("/history")
def get_sprint_history():
    return {"sprints": SPRINT_HISTORY}


@router.get("/burndown")
def get_burndown():
    return BURNDOWN


@router.get("/digest")
async def get_standup_digest(x_llm_key: Optional[str] = Header(default=None)):
    sprint_state = await get_current_sprint()
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
