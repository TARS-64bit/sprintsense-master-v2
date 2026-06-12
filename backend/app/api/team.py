from fastapi import APIRouter
from app.data.seed_data import TEAM_MEMBERS

router = APIRouter()


@router.get("/")
def get_team():
    return {"members": TEAM_MEMBERS}
