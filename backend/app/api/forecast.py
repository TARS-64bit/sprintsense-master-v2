from fastapi import APIRouter, Header
from typing import Optional
from app.data.seed_data import (
    BURNDOWN, SPRINT_HISTORY,
    BACKLOG_TICKETS, LLM_ESTIMATES, DEPENDENCY_EDGES
)
from app.services.monte_carlo import run_simulation
from app.api.sprint import get_active_tickets

router = APIRouter()

@router.get("/slippage")
async def get_slippage_forecast(x_llm_key: Optional[str] = Header(default=None)):
    tickets = await get_active_tickets()

    # We dynamically run the monte-carlo simulation based on current actual burndown
    actual_burndown = [v for v in BURNDOWN.get("actual", []) if v is not None]
    current_day = len(actual_burndown)
    remaining_points = actual_burndown[-1] if actual_burndown else 0
    total_days = len(BURNDOWN.get("ideal", [])) - 1 # assuming 14 days, 0..14 indices
    days_left = max(1, total_days - current_day + 1)

    result = run_simulation(
        sprint_history=SPRINT_HISTORY,
        remaining_points=remaining_points,
        days_left=days_left,
        num_simulations=1000
    )

    return {
        "success_probability": result["success_probability"],
        "simulations_run": result["simulations_run"],
        "histogram": result["histogram"],
        "estimated_completion_days": result.get("estimated_completion_days", days_left + 1),
    }
