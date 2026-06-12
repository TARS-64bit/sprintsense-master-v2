from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from app.api import backlog, sprint, forecast, team, board, integrations
from app.services.llm import has_real_key

app = FastAPI(title="SprintSense API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*", "X-LLM-Key"],
    expose_headers=["*"],
)

app.include_router(backlog.router, prefix="/api/backlog", tags=["backlog"])
app.include_router(sprint.router,  prefix="/api/sprint",  tags=["sprint"])
app.include_router(forecast.router,prefix="/api/forecast",tags=["forecast"])
app.include_router(team.router,    prefix="/api/team",    tags=["team"])
app.include_router(board.router,        prefix="/api/board",        tags=["board"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "SprintSense API"}


@app.get("/api/llm-status")
def llm_status(x_llm_key: Optional[str] = Header(default=None)):
    """
    Returns whether a real LLM key is active (per-request or env-level).
    Frontend polls this after the user saves a key.
    """
    active = has_real_key(x_llm_key)
    return {"llm_active": active, "source": "header" if x_llm_key else ("env" if active else "none")}
