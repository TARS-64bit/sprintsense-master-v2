from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import (
    BURNDOWN, SPRINT_HISTORY,
    BACKLOG_TICKETS, LLM_ESTIMATES, DEPENDENCY_EDGES
)
from app.services.monte_carlo import run_simulation
from app.api.backlog import get_active_tickets
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/slippage")
async def get_slippage_forecast(
    x_llm_key: Optional[str] = Header(default=None),
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None)
):
    tickets = await get_active_tickets(x_github_token, x_github_owner, x_github_repo)

    # We dynamically run the monte-carlo simulation based on current actual burndown
    actual_burndown = BURNDOWN.get("actual", [])
    past_days = [v for v in actual_burndown if v is not None]
    current_day = len(past_days)
    remaining_points = past_days[-1] if past_days else 0
    total_days = len(BURNDOWN.get("ideal", [])) - 1 # assuming 14 days, 0..14 indices
    days_left = max(1, total_days - current_day + 1)

    start_date = datetime.strptime("2025-02-04", "%Y-%m-%d")
    sprint_dates = [(start_date + timedelta(days=current_day+i)).strftime("%Y-%m-%d") for i in range(days_left)]

    result = run_simulation(
        remaining_points=remaining_points,
        days_left=days_left,
        sprint_history=SPRINT_HISTORY,
        sprint_dates=sprint_dates,
        burndown_actual=actual_burndown,
        n_simulations=1000
    )

    return result
