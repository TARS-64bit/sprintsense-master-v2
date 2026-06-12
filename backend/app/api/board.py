from fastapi import APIRouter
from pydantic import BaseModel
from app.data.seed_data import SPRINT_BOARD, BACKLOG_TICKETS, LLM_ESTIMATES

router = APIRouter()


class MoveRequest(BaseModel):
    ticket_id: str
    status: str   # "todo" | "in_progress" | "review" | "done"


# ---------------------------------------------------------------------------
# TODO — POST /api/board/move
# ---------------------------------------------------------------------------
# Move a ticket to a different Kanban column and return the updated board.
#
# Parameters (request body):
#   ticket_id : str — e.g. "TKT-101"
#   status    : str — target column: "todo" | "in_progress" | "review" | "done"
#
# Steps:
#   a. Validate that status is one of the four valid columns; raise HTTP 400 otherwise.
#   b. Search all four columns in SPRINT_BOARD for ticket_id; raise HTTP 404 if not found.
#   c. Remove ticket_id from its current column list.
#   d. Append ticket_id to the target column list.
#   e. Find the ticket dict in BACKLOG_TICKETS and update its "status" field.
#   f. Return get_board() — the full updated board state.
#
# Acceptance:
#   - Ticket appears in exactly one column after the move.
#   - Board state is consistent with SPRINT_BOARD after update.
#   - Returns HTTP 400 for invalid status, HTTP 404 for unknown ticket_id.

@router.post("/move")
def move_ticket(body: MoveRequest):
    # TODO — implement this endpoint
    raise NotImplementedError("POST /api/board/move not implemented — see board.py TODO")


@router.get("/")
def get_board():
    def enrich(ids, column):
        result = []
        for tid in ids:
            t = next((x for x in BACKLOG_TICKETS if x["id"] == tid), {})
            est = LLM_ESTIMATES.get(tid, {})
            result.append({**t, "status": column, "estimate": est})
        return result

    return {
        "todo":        enrich(SPRINT_BOARD["todo"],        "todo"),
        "in_progress": enrich(SPRINT_BOARD["in_progress"], "in_progress"),
        "review":      enrich(SPRINT_BOARD["review"],      "review"),
        "done":        enrich(SPRINT_BOARD["done"],        "done"),
    }
