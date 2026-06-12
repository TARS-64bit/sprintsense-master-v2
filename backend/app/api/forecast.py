from fastapi import APIRouter
from app.data.seed_data import (
    SLIPPAGE_FORECAST, AT_RISK_ITEMS, AVG_VELOCITY, SPRINT_HISTORY,
    BURNDOWN, PROPOSED_SPRINT,
)

router = APIRouter()


from app.services.monte_carlo import run_simulation

@router.get("/slippage")
def get_slippage_forecast():
    current_day = sum(1 for val in BURNDOWN["actual"] if val is not None)

    remaining_pts = None
    for val in reversed(BURNDOWN["actual"]):
        if val is not None:
            remaining_pts = val
            break

    days_left = 10 - current_day
    sprint_dates = BURNDOWN["days"][current_day:current_day+days_left]

    forecast = run_simulation(
        remaining_points=remaining_pts,
        days_left=days_left,
        sprint_history=SPRINT_HISTORY,
        sprint_dates=sprint_dates,
        burndown_actual=BURNDOWN["actual"],
    )

    if forecast:
        current_prob = forecast[0]["completion_probability"]
        trend = "declining" if len(forecast) > 1 and forecast[-1]["completion_probability"] < forecast[0]["completion_probability"] else "stable"
    else:
        current_prob = None
        trend = "stable"

    return {
        "forecast": forecast,
        "current_day": current_day,
        "current_probability": current_prob,
        "trend": trend,
        "at_risk": AT_RISK_ITEMS,
    }


@router.get("/velocity")
def get_velocity_stats():
    velocities = [s["velocity"] for s in SPRINT_HISTORY]
    return {
        "average": round(AVG_VELOCITY, 1),
        "min": min(velocities),
        "max": max(velocities),
        "last_sprint": velocities[-1],
        "history": velocities,
    }
