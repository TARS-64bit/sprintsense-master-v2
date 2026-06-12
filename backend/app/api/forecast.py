from fastapi import APIRouter
from app.data.seed_data import (
    SLIPPAGE_FORECAST, AT_RISK_ITEMS, AVG_VELOCITY, SPRINT_HISTORY,
    BURNDOWN, PROPOSED_SPRINT,
)

router = APIRouter()


@router.get("/slippage")
def get_slippage_forecast():
    # -------------------------------------------------------------------------
    # TODO — replace static seed data with live Monte-Carlo forecast
    # -------------------------------------------------------------------------
    # Currently this endpoint returns the hardcoded SLIPPAGE_FORECAST list.
    # Implement the real forecast by calling monte_carlo.run_simulation().
    #
    # Steps:
    #   1. Import run_simulation from app.services.monte_carlo.
    #
    #   2. Read current state:
    #        current_day     = number of non-None values in BURNDOWN["actual"]
    #        remaining_pts   = last non-None value in BURNDOWN["actual"]
    #        days_left       = BURNDOWN["total_points"] — already 10 total days,
    #                          so days_left = 10 - current_day
    #        sprint_dates    = BURNDOWN["days"][current_day:]   (future dates)
    #        burndown_actual = BURNDOWN["actual"]
    #
    #   3. Call (note: run_simulation is sync in this implementation):
    #        forecast = run_simulation(
    #            remaining_points = remaining_pts,
    #            days_left        = days_left,
    #            sprint_history   = SPRINT_HISTORY,
    #            sprint_dates     = sprint_dates,
    #            burndown_actual  = burndown_actual,
    #        )
    #
    #   4. Derive:
    #        current_prob = forecast[0]["completion_probability"]  if forecast else None
    #        trend = "declining" if len(forecast) > 1 and
    #                forecast[-1]["prob"] < forecast[0]["prob"] else "stable"
    #
    #   5. Return the same shape as below but with live forecast data.
    #
    # Until implemented, the endpoint falls back to static seed data.
    # -------------------------------------------------------------------------

    current_day = 6
    current_prob = next(
        (f["completion_probability"] for f in SLIPPAGE_FORECAST if f["day"] == current_day), None
    )
    trend = "declining"
    return {
        "forecast": SLIPPAGE_FORECAST,
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
