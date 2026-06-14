"""
SprintSense — Integration Status & Sync Endpoints
===================================================
GET  /api/integrations/status      — which integrations are configured
POST /api/integrations/config      — save integration config for this session
POST /api/integrations/jira/sync   — pull tickets + sprint history from Jira (TODO stub)
POST /api/integrations/github/sync — pull issues from GitHub (TODO stub)
POST /api/integrations/slack/test  — send a test Slack message (TODO stub)
"""
import os
import logging
from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional

from app.services import jira_client, github_client
from app.api.backlog import clear_llm_cache
from app.api.team import _integration_team_cache

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory config store — holds credentials saved via POST /api/integrations/config.
# Frontend config saved here takes precedence over environment variables.
_config: dict = {}


def _get(key: str) -> str:
    """Return in-memory config value, falling back to env var."""
    return _config.get(key) or os.getenv(key, "")


# ── Request models ──────────────────────────────────────────────────────────

class IntegrationConfig(BaseModel):
    jira_url:          Optional[str] = None
    jira_email:        Optional[str] = None
    jira_api_token:    Optional[str] = None
    jira_project_key:  Optional[str] = None
    jira_board_id:     Optional[str] = None
    slack_webhook_url: Optional[str] = None
    slack_bot_token:   Optional[str] = None
    github_token:      Optional[str] = None
    github_owner:      Optional[str] = None
    github_repo:       Optional[str] = None
    linear_api_key:    Optional[str] = None
    linear_team_id:    Optional[str] = None


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/status")
def get_integration_status():
    """Return which integrations are fully configured (env vars or saved config)."""
    return {
        "jira": {
            "configured": all([
                _get("JIRA_URL"), _get("JIRA_EMAIL"),
                _get("JIRA_API_TOKEN"), _get("JIRA_PROJECT_KEY"),
            ]),
            "fields": {
                "JIRA_URL":          bool(_get("JIRA_URL")),
                "JIRA_EMAIL":        bool(_get("JIRA_EMAIL")),
                "JIRA_API_TOKEN":    bool(_get("JIRA_API_TOKEN")),
                "JIRA_PROJECT_KEY":  bool(_get("JIRA_PROJECT_KEY")),
                "JIRA_BOARD_ID":     bool(_get("JIRA_BOARD_ID")),
            },
        },
        "slack": {
            "configured": bool(_get("SLACK_WEBHOOK_URL") or _get("SLACK_BOT_TOKEN")),
            "fields": {
                "SLACK_WEBHOOK_URL": bool(_get("SLACK_WEBHOOK_URL")),
                "SLACK_BOT_TOKEN":   bool(_get("SLACK_BOT_TOKEN")),
            },
        },
        "github": {
            "configured": all([
                _get("GITHUB_TOKEN"), _get("GITHUB_OWNER"), _get("GITHUB_REPO"),
            ]),
            "fields": {
                "GITHUB_TOKEN": bool(_get("GITHUB_TOKEN")),
                "GITHUB_OWNER": bool(_get("GITHUB_OWNER")),
                "GITHUB_REPO":  bool(_get("GITHUB_REPO")),
            },
        },
        "linear": {
            "configured": all([_get("LINEAR_API_KEY"), _get("LINEAR_TEAM_ID")]),
            "fields": {
                "LINEAR_API_KEY": bool(_get("LINEAR_API_KEY")),
                "LINEAR_TEAM_ID": bool(_get("LINEAR_TEAM_ID")),
            },
        },
    }


@router.post("/config")
def save_integration_config(cfg: IntegrationConfig):
    """
    Persist integration credentials in-memory for this server session.
    Env vars always take precedence over values saved here.
    """
    mapping = {
        "JIRA_URL":          cfg.jira_url,
        "JIRA_EMAIL":        cfg.jira_email,
        "JIRA_API_TOKEN":    cfg.jira_api_token,
        "JIRA_PROJECT_KEY":  cfg.jira_project_key,
        "JIRA_BOARD_ID":     cfg.jira_board_id,
        "SLACK_WEBHOOK_URL": cfg.slack_webhook_url,
        "SLACK_BOT_TOKEN":   cfg.slack_bot_token,
        "GITHUB_TOKEN":      cfg.github_token,
        "GITHUB_OWNER":      cfg.github_owner,
        "GITHUB_REPO":       cfg.github_repo,
        "LINEAR_API_KEY":    cfg.linear_api_key,
        "LINEAR_TEAM_ID":    cfg.linear_team_id,
    }
    for key, val in mapping.items():
        if val is not None:
            _config[key] = val
    return {"saved": True, "status": get_integration_status()}


from app.data.seed_data import BACKLOG_TICKETS, SPRINT_HISTORY

@router.post("/jira/sync")
async def sync_jira(
    x_jira_url: Optional[str] = Header(default=None),
    x_jira_email: Optional[str] = Header(default=None),
    x_jira_api_token: Optional[str] = Header(default=None),
    x_jira_project_key: Optional[str] = Header(default=None),
    x_jira_board_id: Optional[str] = Header(default=None),
):
    tickets = await jira_client.fetch_issues(
        project_key=x_jira_project_key,
        url_override=x_jira_url,
        email_override=x_jira_email,
        token_override=x_jira_api_token
    )
    history = await jira_client.fetch_sprint_history(
        board_id=x_jira_board_id,
        url_override=x_jira_url,
        email_override=x_jira_email,
        token_override=x_jira_api_token
    )

    # Merge into BACKLOG_TICKETS
    existing_ids = {t["id"]: i for i, t in enumerate(BACKLOG_TICKETS)}
    for t in tickets:
        if t["id"] in existing_ids:
            BACKLOG_TICKETS[existing_ids[t["id"]]] = t
        else:
            BACKLOG_TICKETS.append(t)
            existing_ids[t["id"]] = len(BACKLOG_TICKETS) - 1

    # Overwrite sprint history for simplicity, or merge
    if history:
        SPRINT_HISTORY.clear()
        SPRINT_HISTORY.extend(history)

    clear_llm_cache()

    return {"synced_tickets": len(tickets), "synced_sprints": len(history)}

@router.post("/github/sync")
async def sync_github(
    x_github_token: Optional[str] = Header(default=None),
    x_github_owner: Optional[str] = Header(default=None),
    x_github_repo: Optional[str] = Header(default=None),
):
    issues = await github_client.fetch_issues(
        owner=x_github_owner,
        repo=x_github_repo,
        token_override=x_github_token
    )

    collaborators = await github_client.fetch_collaborators(
        owner=x_github_owner,
        repo=x_github_repo,
        token_override=x_github_token
    )

    BACKLOG_TICKETS.clear()

    for issue in issues:
        BACKLOG_TICKETS.append(issue)

    _integration_team_cache.clear()
    if collaborators:
        _integration_team_cache.extend(collaborators)

    clear_llm_cache()

    return {"synced": len(issues)}

@router.post("/slack/test")
async def test_slack():
    import httpx

    webhook_url = _get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        return {"ok": False, "error": "SLACK_WEBHOOK_URL not configured"}

    payload = {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*SprintSense* connected ✅"
                }
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(webhook_url, json=payload)
            return {"ok": resp.status_code == 200}
    except Exception as e:
        logger.exception(f"Error testing Slack: {e}")
        return {"ok": False, "error": str(e)}
