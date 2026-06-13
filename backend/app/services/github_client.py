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


def _get(key: str) -> str:
    from app.api.integrations import _get as get_config
    return get_config(key)

def _auth_header(token_override: Optional[str] = None) -> dict:
    token = token_override or _get("GITHUB_TOKEN")
    return {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"}


def is_configured() -> bool:
    return all([
        _get("GITHUB_TOKEN"),
        _get("GITHUB_OWNER"),
        _get("GITHUB_REPO"),
    ])

async def fetch_issues(
    owner: Optional[str] = None,
    repo: Optional[str] = None,
    token_override: Optional[str] = None,
    max_results: int = 50,
) -> list:
    gh_owner = owner or _get("GITHUB_OWNER")
    gh_repo = repo or _get("GITHUB_REPO")
    token = token_override or _get("GITHUB_TOKEN")

    if not (gh_owner and gh_repo and token):
        logger.warning("GitHub config missing (owner, repo, or token)")
        return []

    url = f"{GITHUB_API_URL}/repos/{gh_owner}/{gh_repo}/issues"
    params = {"state": "open", "per_page": max_results}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_auth_header(token), params=params)
            resp.raise_for_status()
            data = resp.json()

            issues = []
            for issue in data:
                # Filter out PRs
                if issue.get("pull_request") is not None:
                    continue

                assignee = None
                if issue.get("assignee"):
                    assignee = issue["assignee"].get("login")

                issues.append({
                    "id": f"GH-{issue['number']}",
                    "title": issue.get("title", ""),
                    "description": issue.get("body") or "",
                    "labels": [l.get("name", "") for l in issue.get("labels", []) if isinstance(l, dict)],
                    "status": "todo",
                    "assignee": assignee,
                })

            return issues
    except Exception as e:
        logger.exception(f"Error fetching GitHub issues: {e}")
        return []

async def fetch_collaborators(
    owner: Optional[str] = None,
    repo: Optional[str] = None,
    token_override: Optional[str] = None,
) -> list:
    gh_owner = owner or _get("GITHUB_OWNER")
    gh_repo = repo or _get("GITHUB_REPO")
    token = token_override or _get("GITHUB_TOKEN")

    if not (gh_owner and gh_repo and token):
        return []

    url = f"{GITHUB_API_URL}/repos/{gh_owner}/{gh_repo}/collaborators"

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_auth_header(token))
            resp.raise_for_status()
            data = resp.json()

            members = []
            for user in data:
                members.append({
                    "id": user.get("login"),
                    "name": user.get("login"),
                    "role": "Engineer",
                    "capacity_hours": 40,
                    "avatar": user.get("login")[:2].upper() if user.get("login") else "??"
                })
            return members
    except httpx.HTTPStatusError as e:
        # 403 or 404 often happens if token lacks admin/push permissions to view collaborators.
        logger.warning(f"Failed to fetch collaborators (status {e.response.status_code}). Token might lack permissions.")
        return []
    except Exception as e:
        logger.exception(f"Error fetching GitHub collaborators: {e}")
        return []
