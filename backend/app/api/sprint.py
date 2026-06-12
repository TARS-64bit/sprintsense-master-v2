from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import (
    PROPOSED_SPRINT, SPRINT_HISTORY, BURNDOWN,
    BACKLOG_TICKETS, LLM_ESTIMATES, STANDUP_DIGEST, AT_RISK_ITEMS
)
from app.services.llm import generate_digest

router = APIRouter()


@router.get("/current")
def get_current_sprint():
    enriched = []
    for entry in PROPOSED_SPRINT["tickets"]:
        ticket = next((t for t in BACKLOG_TICKETS if t["id"] == entry["id"]), {})
        est = LLM_ESTIMATES.get(entry["id"], {})
        enriched.append({**entry, "title": ticket.get("title", ""), "labels": ticket.get("labels", []), "estimate": est})
    return {**PROPOSED_SPRINT, "tickets": enriched}


@router.get("/history")
def get_sprint_history():
    return {"sprints": SPRINT_HISTORY}


@router.get("/burndown")
def get_burndown():
    return BURNDOWN


@router.get("/digest")
async def get_standup_digest(x_llm_key: Optional[str] = Header(default=None)):
    sprint_state = get_current_sprint()
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
