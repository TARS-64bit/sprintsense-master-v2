from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.data.seed_data import (
    BACKLOG_TICKETS, HISTORICAL_TICKETS, LLM_ESTIMATES,
    SIMILARITY_MATCHES, DEPENDENCY_EDGES, AT_RISK_ITEMS
)
from app.services.llm import estimate_ticket

router = APIRouter()


@router.get("/")
async def get_backlog(x_llm_key: Optional[str] = Header(default=None)):
    tickets = []
    for t in BACKLOG_TICKETS:
        mock_est = LLM_ESTIMATES.get(t["id"], {})
        similar_ids = SIMILARITY_MATCHES.get(t["id"], [])
        hist = [h for h in HISTORICAL_TICKETS if h["id"] in similar_ids]
        est = await estimate_ticket(t, hist, api_key=x_llm_key, mock_estimate=mock_est)
        tickets.append({**t, "estimate": est, "similar_tickets": hist})
    return {"tickets": tickets, "total": len(tickets)}


@router.get("/history")
def get_history():
    return {"tickets": HISTORICAL_TICKETS, "total": len(HISTORICAL_TICKETS)}


@router.get("/dependencies")
def get_dependencies():
    return {"edges": DEPENDENCY_EDGES, "total": len(DEPENDENCY_EDGES)}


@router.get("/at-risk")
def get_at_risk():
    return {"items": AT_RISK_ITEMS}


@router.get("/{ticket_id}")
async def get_ticket(ticket_id: str, x_llm_key: Optional[str] = Header(default=None)):
    tid = ticket_id.upper()
    ticket = next((t for t in BACKLOG_TICKETS if t["id"] == tid), None)
    if not ticket:
        raise HTTPException(status_code=404, detail=f"ticket {ticket_id} not found")
    mock_est = LLM_ESTIMATES.get(tid, {})
    similar_ids = SIMILARITY_MATCHES.get(tid, [])
    similar = [h for h in HISTORICAL_TICKETS if h["id"] in similar_ids]
    est = await estimate_ticket(ticket, similar, api_key=x_llm_key, mock_estimate=mock_est)
    deps_out = [e for e in DEPENDENCY_EDGES if e["from"] == tid]
    deps_in  = [e for e in DEPENDENCY_EDGES if e["to"]   == tid]
    return {**ticket, "estimate": est, "similar_tickets": similar,
            "blocks": deps_out, "blocked_by": deps_in}
