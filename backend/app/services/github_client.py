"""
SprintSense — GitHub Issues API Client
========================================
TODO  ★★

Pull open issues from a GitHub repository so SprintSense can use
GitHub Issues as a backlog source instead of seed data.

Environment variables
---------------------
  GITHUB_TOKEN — Personal Access Token (classic) with repo:read scope
                 Generate at https://github.com/settings/tokens
  GITHUB_OWNER — Repository owner (user or org name), e.g. "acme-corp"
  GITHUB_REPO  — Repository name, e.g. "backend-api"

GitHub REST API docs:
  Issues:  GET /repos/{owner}/{repo}/issues?state=open&per_page=50
  Authentication: Authorization: Bearer {token}
  https://docs.github.com/en/rest/issues/issues
"""
import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

GITHUB_API_URL = "https://api.github.com"


def _auth_header() -> dict:
    token = os.getenv("GITHUB_TOKEN", "")
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"}


def is_configured() -> bool:
    return all([
        os.getenv("GITHUB_TOKEN"),
        os.getenv("GITHUB_OWNER"),
        os.getenv("GITHUB_REPO"),
    ])


# ---------------------------------------------------------------------------
# TODO 1 — fetch_issues()
# ---------------------------------------------------------------------------
# Pull open issues from a GitHub repo and return them in SprintSense schema.
#
# Parameters:
#   owner      : str | None — overrides GITHUB_OWNER env var
#   repo       : str | None — overrides GITHUB_REPO env var
#   max_results: int        — page size (default 50)
#
# Steps:
#   a. Resolve owner, repo, token; if any missing → log warning + return [].
#   b. GET {GITHUB_API_URL}/repos/{owner}/{repo}/issues with:
#        headers: _auth_header()
#        params:  {"state": "open", "per_page": max_results}
#   c. Filter out pull requests: skip items where issue.get("pull_request") is not None.
#   d. Map each issue to:
#        {
#          "id":          f"GH-{issue['number']}",
#          "title":       issue["title"],
#          "description": issue["body"] or "",
#          "labels":      [l["name"] for l in issue.get("labels", [])],
#          "status":      "todo",
#          "assignee":    issue["assignee"]["login"] if issue.get("assignee") else None,
#        }
#   e. Return mapped list.
#   f. On any exception → logger.exception(...); return [].
#
# Acceptance:
#   - Returns [] when env vars are missing (never raises).
#   - Pull requests are excluded from the result.
#   - Returned dicts match the Ticket schema used by BACKLOG_TICKETS.

async def fetch_issues(
    owner: Optional[str] = None,
    repo: Optional[str] = None,
    max_results: int = 50,
) -> list:
    # TODO 1 — implement this function
    raise NotImplementedError("github_client.fetch_issues not implemented")
