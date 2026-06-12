"""
SprintSense — Monte-Carlo Slippage Forecast Engine
====================================================
TASK  ★★★

Replace the hardcoded SLIPPAGE_FORECAST seed data with a real probabilistic model.

Algorithm overview
------------------
1. Read the team's historical velocity distribution from SPRINT_HISTORY.
2. Run N simulations (default 10 000). Each simulation samples a daily throughput
   from a normal distribution until remaining story-points reach zero or days run out.
3. For every sprint day d, completion_probability[d] = fraction of simulations
   that finished on or before day d.
4. Return a list of { day, date, completion_probability, remaining_points } dicts.

Acceptance criteria (tested by the 218-check suite)
----------------------------------------------------
- Probabilities are monotonically non-increasing.
- All probability values in [0.0, 1.0].
- List length == len(sprint_dates).
- Runs in < 2 s for n_simulations=10_000.
- remaining_points uses burndown actuals for past days, projected mean burn for future.
"""
import random
import statistics
from typing import Optional


# ---------------------------------------------------------------------------
# TODO 1 — build_velocity_distribution()
# ---------------------------------------------------------------------------
# Derive a per-day (mean, stdev) velocity from sprint history.
#
# Parameters:
#   sprint_history : list[dict]  — each dict has "velocity" (points per sprint)
#   sprint_days    : int         — working days per sprint (default 10)
#
# Steps:
#   a. Extract the list of velocity values: [s["velocity"] for s in sprint_history]
#   b. Convert to daily rate: daily = velocity / sprint_days
#   c. Compute mean  = statistics.mean(daily_rates)
#      Compute stdev = statistics.stdev(daily_rates)   # sample stdev, n-1
#   d. Return (mean_daily, stdev_daily)
#
# Example: sprint velocities [28,34,30,38,36,40,38,42] and sprint_days=10
#   → daily rates ≈ [2.8, 3.4, 3.0, 3.8, 3.6, 4.0, 3.8, 4.2]
#   → mean ≈ 3.575, stdev ≈ 0.46
#
# Acceptance: mean ≈ AVG_VELOCITY / sprint_days (within 0.01)

def build_velocity_distribution(
    sprint_history: list,
    sprint_days: int = 10,
) -> tuple:
    daily_rates = [s["velocity"] / sprint_days for s in sprint_history]
    if not daily_rates:
        return 0.0, 0.0
    mean = statistics.mean(daily_rates)
    stdev = statistics.stdev(daily_rates) if len(daily_rates) > 1 else 0.0
    return mean, stdev


# ---------------------------------------------------------------------------
# TODO 2 — project_remaining_points()
# ---------------------------------------------------------------------------
# For future days, project the expected remaining points using the mean burn rate.
#
# Parameters:
#   burndown_actual : list        — actual remaining points; None for future days
#   mean_daily      : float       — mean daily burn rate from build_velocity_distribution
#
# Steps:
#   a. Find the last non-None value and its index.
#   b. For each subsequent index, subtract mean_daily from the previous value.
#      Clamp to 0 (remaining cannot go negative).
#   c. Return the full list with None values replaced by projected integers.
#
# Acceptance: list length unchanged, no None values in output.

def project_remaining_points(
    burndown_actual: list,
    mean_daily: float,
) -> list:
    # Find the last non-None value and its index.
    last_val = None
    last_idx = -1
    for i, val in enumerate(burndown_actual):
        if val is not None:
            last_val = val
            last_idx = i

    if last_val is None:
        return []

    projected = list(burndown_actual)
    current = last_val
    for i in range(last_idx + 1, len(projected)):
        current = max(0.0, current - mean_daily)
        projected[i] = int(round(current))

    return projected


# ---------------------------------------------------------------------------
# TODO 3 — run_simulation()
# ---------------------------------------------------------------------------
# Core Monte-Carlo engine. Called by GET /api/forecast/slippage.
#
# Parameters:
#   remaining_points : int        — story points still to burn
#   days_left        : int        — calendar days remaining in sprint
#   sprint_history   : list[dict] — from seed_data.SPRINT_HISTORY
#   sprint_dates     : list[str]  — ISO date strings, one per remaining day
#   burndown_actual  : list       — from BURNDOWN["actual"], may contain None
#   n_simulations    : int        — default 10_000
#
# Steps:
#   a. Call build_velocity_distribution(sprint_history) → (mean, stdev).
#   b. For each simulation i in range(n_simulations):
#        remaining = remaining_points
#        for day d in range(days_left):
#          daily_burn = max(0.0, random.gauss(mean, stdev))
#          remaining  = max(0.0, remaining - daily_burn)
#          if remaining == 0:
#            record finish[i] = d
#            break
#        else:
#          record finish[i] = days_left  # did not finish
#   c. For each day d in 0..days_left-1:
#        prob = len([f for f in finish if f <= d]) / n_simulations
#   d. Call project_remaining_points(burndown_actual, mean) for the output.
#   e. Build and return list of dicts:
#        [
#          {
#            "day": d + 1,
#            "date": sprint_dates[d],
#            "completion_probability": round(prob, 2),
#            "remaining_points": projected[d],
#          }
#          for d in range(days_left)
#        ]
#
# Acceptance:
#   - probs[i] >= probs[i+1] for all i  (monotonically non-increasing)
#   - all(0.0 <= p <= 1.0 for p in probs)
#   - len(result) == len(sprint_dates)
#   - Completes in < 2 s for n_simulations=10_000

def run_simulation(
    remaining_points: int,
    days_left: int,
    sprint_history: list,
    sprint_dates: list,
    burndown_actual: list,
    n_simulations: int = 10_000,
) -> list:
    if days_left <= 0:
        return []

    mean, stdev = build_velocity_distribution(sprint_history)

    finish = []
    for _ in range(n_simulations):
        remaining = float(remaining_points)
        for d in range(days_left):
            daily_burn = max(0.0, random.gauss(mean, stdev))
            remaining = max(0.0, remaining - daily_burn)
            if remaining == 0:
                finish.append(d)
                break
        else:
            finish.append(days_left)

    projected = project_remaining_points(burndown_actual, mean)

    # burndown_actual contains values for all days. The future days correspond to the
    # elements in burndown_actual that are originally None.
    # We want to match the days_left with sprint_dates length.
    # Note that sprint_dates length is days_left.
    # The projected remaining points for future days corresponds to the last days_left items in projected.

    projected_remaining = projected[-days_left:] if projected else []

    result = []
    current_day = sum(1 for val in burndown_actual if val is not None)

    for d in range(days_left):
        prob = len([f for f in finish if f <= d]) / n_simulations

        rem_pts = projected_remaining[d] if d < len(projected_remaining) else 0

        result.append({
            "day": current_day + d + 1,
            "date": sprint_dates[d],
            "completion_probability": round(prob, 2),
            "remaining_points": rem_pts,
        })
    return result
