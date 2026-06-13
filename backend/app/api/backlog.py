from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from app.data.seed_data import (
    BACKLOG_TICKETS, HISTORICAL_TICKETS, LLM_ESTIMATES,
    SIMILARITY_MATCHES, DEPENDENCY_EDGES, AT_RISK_ITEMS
)
from app.services.llm import estimate_ticket
from app.services.dependency_detector import detect_implicit_dependencies
from app.services import github_client

router = APIRouter()

async def get_active_tickets(x_github_token: Optional[str] = None, x_github_owner: Optional[str] = None, x_github_repo: Optional[str] = None):
    # Try fetching explicitly with headers
    try:
        if x_github_token and x_github_owner and x_github_repo:
            issues = await github_client.fetch_issues(owner=x_github_owner, repo=x_github_repo, token_override=x_github_token)
            if issues:
                return issues
    except Exception:
        pass

    # Fallback to configured environment
    if github_client.is_configured():
        try:
            issues = await github_client.fetch_issues()
            if issues:
                return issues
        except Exception:
            pass

    return BACKLOG_TICKETS

@router.get("/")
async def get_backlog(
    x_llm_key: Optional[str] = Header(default=None),
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None)
):
    tickets = await get_active_tickets(x_github_token, x_github_owner, x_github_repo)

    result = []
    for t in tickets:
        mock_est = LLM_ESTIMATES.get(t["id"], {})
        similar_ids = SIMILARITY_MATCHES.get(t["id"], [])
        hist = [h for h in HISTORICAL_TICKETS if h["id"] in similar_ids]
        est = await estimate_ticket(t, hist, api_key=x_llm_key, mock_estimate=mock_est)
        result.append({**t, "estimate": est, "similar_tickets": hist})
    return {"tickets": result, "total": len(result)}


@router.get("/history")
def get_history():
    return {"tickets": HISTORICAL_TICKETS, "total": len(HISTORICAL_TICKETS)}


@router.get("/dependencies")
async def get_dependencies(
    x_llm_key: Optional[str] = Header(default=None),
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None)
):
    tickets = await get_active_tickets(x_github_token, x_github_owner, x_github_repo)
    edges = await detect_implicit_dependencies(
        tickets=tickets,
        explicit_edges=DEPENDENCY_EDGES,
        api_key=x_llm_key
    )
    return {"edges": edges, "total": len(edges)}


@router.get("/at-risk")
def get_at_risk():
    return {"items": AT_RISK_ITEMS}


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    x_llm_key: Optional[str] = Header(default=None),
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None)
):
    tid = ticket_id.upper()
    tickets = await get_active_tickets(x_github_token, x_github_owner, x_github_repo)
    ticket = next((t for t in tickets if t["id"] == tid), None)

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
