from fastapi import APIRouter
from pydantic import BaseModel
from app.data.seed_data import SPRINT_BOARD, BACKLOG_TICKETS
from app.services import github_client

router = APIRouter()

class MoveRequest(BaseModel):
    ticket_id: str
    from_column: str
    to_column: str

@router.get("/")
def get_board():
    return SPRINT_BOARD


@router.post("/move")
def move_ticket(req: MoveRequest):
    tid = req.ticket_id
    from_col = req.from_column
    to_col = req.to_column

    # Remove from origin column
    if tid in SPRINT_BOARD.get(from_col, []):
        SPRINT_BOARD[from_col].remove(tid)

    # Add to target column
    if to_col in SPRINT_BOARD and tid not in SPRINT_BOARD[to_col]:
        SPRINT_BOARD[to_col].append(tid)

    # Also update the ticket status in BACKLOG_TICKETS or Github issue cache if possible
    # (Since GitHub issues might be read-only for now, we just update BACKLOG_TICKETS mock)
    for t in BACKLOG_TICKETS:
        if t["id"] == tid:
            t["status"] = to_col
            break

    return {"status": "ok", "board": SPRINT_BOARD}
