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
                    "status": issue.get("state", "open"),
                    "assignee": assignee,
                })

            return issues
    except Exception as e:
        logger.exception(f"Error fetching GitHub issues: {e}")
        return []

async def fetch_historical_issues(
    owner: Optional[str] = None,
    repo: Optional[str] = None,
    token_override: Optional[str] = None,
    max_results: int = 50,
) -> list:
    gh_owner = owner or _get("GITHUB_OWNER")
    gh_repo = repo or _get("GITHUB_REPO")
    token = token_override or _get("GITHUB_TOKEN")

    if not (gh_owner and gh_repo and token):
        return []

    url = f"{GITHUB_API_URL}/repos/{gh_owner}/{gh_repo}/issues"
    params = {"state": "closed", "per_page": max_results}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_auth_header(token), params=params)
            resp.raise_for_status()
            data = resp.json()

            issues = []
            for issue in data:
                if issue.get("pull_request") is not None:
                    continue

                assignee = None
                if issue.get("assignee"):
                    assignee = issue["assignee"].get("login")

                issues.append({
                    "id": f"GH-{issue['number']}",
                    "title": issue.get("title", ""),
                    "labels": [l.get("name", "") for l in issue.get("labels", []) if isinstance(l, dict)],
                    "status": "done",
                    "assignee": assignee,
                })

            return issues
    except Exception as e:
        logger.exception(f"Error fetching historical GitHub issues: {e}")
        return []

async def fetch_sprint_history(
    owner: Optional[str] = None,
    repo: Optional[str] = None,
    token_override: Optional[str] = None,
) -> list:
    gh_owner = owner or _get("GITHUB_OWNER")
    gh_repo = repo or _get("GITHUB_REPO")
    token = token_override or _get("GITHUB_TOKEN")

    if not (gh_owner and gh_repo and token):
        return None

    # Fetch closed milestones
    url = f"{GITHUB_API_URL}/repos/{gh_owner}/{gh_repo}/milestones"
    params = {"state": "closed", "sort": "due_on", "direction": "desc"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=_auth_header(token), params=params)
            resp.raise_for_status()
            data = resp.json()

            history = []
            # We don't easily have 'points' or velocity from milestones without fetching all issues for each,
            # so we'll approximate based on open_issues vs closed_issues count.
            for i, ms in enumerate(reversed(data)): # reverse to get oldest first
                closed = ms.get("closed_issues", 0)
                open_iss = ms.get("open_issues", 0)
                total = closed + open_iss

                history.append({
                    "sprint": i + 1,
                    "start": ms.get("created_at", "")[:10],
                    "end": ms.get("due_on", "")[:10] if ms.get("due_on") else ms.get("closed_at", "")[:10],
                    "committed": total, # Using issue count as approximation
                    "completed": closed,
                    "velocity": closed  # Using closed issue count as velocity approximation
                })
            return history
    except Exception as e:
        logger.exception(f"Error fetching GitHub milestone history: {e}")
        return None


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
                    "capacity_hours": 400, # Set high capacity
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

async def create_milestone_and_assign_issues(
    name: str,
    description: str,
    due_on: str,
    ticket_ids: list,
    owner: Optional[str] = None,
    repo: Optional[str] = None,
    token_override: Optional[str] = None,
) -> dict:
    """
    Creates a milestone in a GitHub repository and assigns the specified issues to it.
    """
    gh_owner = owner or _get("GITHUB_OWNER")
    gh_repo = repo or _get("GITHUB_REPO")
    token = token_override or _get("GITHUB_TOKEN")

    if not (gh_owner and gh_repo and token):
        raise ValueError("GITHUB_OWNER, GITHUB_REPO, or GITHUB_TOKEN is missing")

    headers = _auth_header(token)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # 1. Create Milestone
            create_url = f"{GITHUB_API_URL}/repos/{gh_owner}/{gh_repo}/milestones"
            create_payload = {
                "title": name,
                "state": "open",
                "description": description,
                "due_on": f"{due_on}T23:59:59Z"
            }
            resp = await client.post(create_url, headers=headers, json=create_payload)
            resp.raise_for_status()
            milestone_data = resp.json()
            milestone_number = milestone_data.get("number")

            if not milestone_number:
                raise Exception("Failed to get milestone number from create response")

            # 2. Assign issues to milestone
            if ticket_ids:
                for t in ticket_ids:
                    issue_number_str = t.replace("GH-", "") if t.startswith("GH-") else t
                    try:
                        issue_number = int(issue_number_str)
                        patch_url = f"{GITHUB_API_URL}/repos/{gh_owner}/{gh_repo}/issues/{issue_number}"
                        patch_payload = {"milestone": milestone_number}
                        patch_resp = await client.patch(patch_url, headers=headers, json=patch_payload)
                        patch_resp.raise_for_status()
                    except ValueError:
                        logger.warning(f"Invalid GitHub issue number: {t}")
                    except Exception as e:
                        logger.warning(f"Failed to assign issue {t} to milestone: {e}")

            return {
                "success": True,
                "milestone_number": milestone_number,
                "milestone_url": milestone_data.get("html_url")
            }
    except Exception as e:
        logger.exception(f"Error creating GitHub milestone: {e}")
        return {"success": False, "error": str(e)}
