"""
SprintSense — Jira Cloud API Client
=====================================
TODO  ★★

Pull tickets and sprint history from a Jira Cloud project so SprintSense
can run analysis on real data instead of seed data.

Environment variables
---------------------
  JIRA_URL          — Jira Cloud base URL, e.g. https://yourorg.atlassian.net
  JIRA_EMAIL        — Atlassian account email used to generate the token
  JIRA_API_TOKEN    — API token from https://id.atlassian.com/manage-profile/security/api-tokens
  JIRA_PROJECT_KEY  — Jira project key, e.g. "PROJ"
  JIRA_BOARD_ID     — Agile board ID (integer); needed for sprint history

Jira Cloud REST API docs:
  Issue search:   GET /rest/api/3/search?jql=...
  Sprint list:    GET /rest/agile/1.0/board/{boardId}/sprint
  Authentication: HTTP Basic auth — base64(email:token) in Authorization header
  https://developer.atlassian.com/cloud/jira/platform/rest/v3/
"""
import os
import base64
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)


def _get(key: str) -> str:
    from app.api.integrations import _get as get_config
    return get_config(key)

def _auth_header(email_override: Optional[str] = None, token_override: Optional[str] = None) -> str:
    email = email_override or _get("JIRA_EMAIL")
    token = token_override or _get("JIRA_API_TOKEN")
    encoded = base64.b64encode(f"{email}:{token}".encode()).decode()
    return f"Basic {encoded}"


def is_configured() -> bool:
    return all([
        _get("JIRA_URL"),
        _get("JIRA_EMAIL"),
        _get("JIRA_API_TOKEN"),
        _get("JIRA_PROJECT_KEY"),
    ])


# ---------------------------------------------------------------------------
# TODO 1 — fetch_issues()
# ---------------------------------------------------------------------------
# Pull open issues from a Jira project and return them in SprintSense schema.
#
# Parameters:
#   project_key : str | None — overrides JIRA_PROJECT_KEY env var
#   max_results : int        — page size (default 50)
#
# Steps:
#   a. Resolve base_url = os.getenv("JIRA_URL"); if empty → log warning + return [].
#   b. Resolve key = project_key or os.getenv("JIRA_PROJECT_KEY").
#   c. Build JQL: "project={key} AND status != Done ORDER BY created DESC"
#   d. GET {base_url}/rest/api/3/search with:
#        headers: {"Authorization": _auth_header(), "Accept": "application/json"}
#        params:  {"jql": jql, "maxResults": max_results,
#                  "fields": "summary,description,labels,status,assignee,priority,story_points"}
#   e. Parse response["issues"] → map each issue to:
#        {
#          "id":          f"JIRA-{issue['key']}",
#          "title":       issue["fields"]["summary"],
#          "description": (issue["fields"].get("description") or {}).get("plain_text", ""),
#          "labels":      issue["fields"].get("labels", []),
#          "status":      _map_status(issue["fields"]["status"]["name"]),
#          "assignee":    issue["fields"]["assignee"]["displayName"] if issue["fields"].get("assignee") else None,
#        }
#   f. Return mapped list.
#   g. On any exception → logger.exception(...); return [].
#
# Status mapping (_map_status helper):
#   "To Do"       → "todo"
#   "In Progress" → "in_progress"
#   "In Review"   → "review"
#   "Done"        → "done"
#   anything else → "todo"
#
# Acceptance:
#   - Returns [] when env vars are missing (never raises).
#   - Returned dicts match the Ticket schema used by BACKLOG_TICKETS.

def _map_status(status_name: str) -> str:
    s = status_name.lower()
    if s == "to do":
        return "todo"
    elif s == "in progress":
        return "in_progress"
    elif s == "in review":
        return "review"
    elif s == "done":
        return "done"
    return "todo"

async def fetch_issues(
    project_key: Optional[str] = None,
    max_results: int = 50,
    url_override: Optional[str] = None,
    email_override: Optional[str] = None,
    token_override: Optional[str] = None,
) -> list:
    base_url = url_override or _get("JIRA_URL")
    if not base_url:
        logger.warning("JIRA_URL not set")
        return []

    key = project_key or _get("JIRA_PROJECT_KEY")
    if not key:
        logger.warning("JIRA_PROJECT_KEY not set")
        return []

    jql = f"project={key} AND status != Done ORDER BY created DESC"
    url = f"{base_url}/rest/api/3/search"

    headers = {
        "Authorization": _auth_header(email_override, token_override),
        "Accept": "application/json"
    }

    params = {
        "jql": jql,
        "maxResults": max_results,
        "fields": "summary,description,labels,status,assignee,priority,story_points"
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()

            issues = []
            for issue in data.get("issues", []):
                fields = issue.get("fields", {})

                # Handle description if it's a dict (Atlassian Document Format)
                desc = fields.get("description", "")
                if isinstance(desc, dict):
                    # Simplified plain text extraction for Atlassian Document Format
                    desc_text = ""
                    for content in desc.get("content", []):
                        if content.get("type") == "paragraph":
                            for inner_content in content.get("content", []):
                                if inner_content.get("type") == "text":
                                    desc_text += inner_content.get("text", "") + " "
                            desc_text += "\n"
                    desc = desc_text.strip()

                assignee = None
                if fields.get("assignee"):
                    assignee = fields["assignee"].get("displayName")

                status_name = ""
                if fields.get("status"):
                    status_name = fields["status"].get("name", "")

                issues.append({
                    "id": f"JIRA-{issue['key']}",
                    "title": fields.get("summary", ""),
                    "description": desc,
                    "labels": fields.get("labels", []),
                    "status": _map_status(status_name),
                    "assignee": assignee,
                })

            return issues
    except Exception as e:
        logger.exception(f"Error fetching Jira issues: {e}")
        return []


# ---------------------------------------------------------------------------
# TODO 2 — fetch_sprint_history()
# ---------------------------------------------------------------------------
# Pull closed sprint records from a Jira Agile board.
#
# Parameters:
#   board_id : int | None — overrides JIRA_BOARD_ID env var
#
# Steps:
#   a. Resolve base_url and board_id; if missing → return [].
#   b. GET {base_url}/rest/agile/1.0/board/{board_id}/sprint?state=closed
#        headers: {"Authorization": _auth_header(), "Accept": "application/json"}
#   c. For each sprint in response["values"]:
#        - GET /rest/agile/1.0/sprint/{sprint_id}/issue?fields=story_points,status
#        - velocity = sum of story_points for issues with status=Done
#        - Map to SprintHistory shape:
#            {"sprint": i+1, "start": sprint["startDate"][:10],
#             "end": sprint["endDate"][:10], "committed": total_pts, "completed": done_pts, "velocity": done_pts}
#   d. Return the list.
#
# Acceptance: returns [] when env vars missing; never raises.

async def fetch_sprint_history(
    board_id: Optional[str] = None,
    url_override: Optional[str] = None,
    email_override: Optional[str] = None,
    token_override: Optional[str] = None,
) -> list:
    base_url = url_override or _get("JIRA_URL")
    b_id = board_id or _get("JIRA_BOARD_ID")

    if not base_url or not b_id:
        return []

    url = f"{base_url}/rest/agile/1.0/board/{b_id}/sprint"
    headers = {
        "Authorization": _auth_header(email_override, token_override),
        "Accept": "application/json"
    }
    params = {"state": "closed"}

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()

            history = []
            sprints = data.get("values", [])

            for i, sprint in enumerate(sprints):
                sprint_id = sprint.get("id")
                issue_url = f"{base_url}/rest/agile/1.0/sprint/{sprint_id}/issue"
                issue_params = {"fields": "story_points,status"}

                issue_resp = await client.get(issue_url, headers=headers, params=issue_params)
                issue_resp.raise_for_status()
                issue_data = issue_resp.json()

                total_pts = 0
                done_pts = 0

                for issue in issue_data.get("issues", []):
                    fields = issue.get("fields", {})
                    # Need to know custom field for story points, assume "customfield_10016" or similar
                    # For simplicity, look at "story_points" or "customfield_10016"
                    pts = fields.get("story_points") or fields.get("customfield_10016") or 0
                    try:
                        pts = float(pts)
                    except (ValueError, TypeError):
                        pts = 0

                    total_pts += pts

                    status_name = ""
                    if fields.get("status"):
                        status_name = fields["status"].get("name", "")

                    if _map_status(status_name) == "done":
                        done_pts += pts

                history.append({
                    "sprint": i + 1,
                    "start": sprint.get("startDate", "")[:10],
                    "end": sprint.get("endDate", "")[:10],
                    "committed": total_pts,
                    "completed": done_pts,
                    "velocity": done_pts
                })

            return history
    except Exception as e:
        logger.exception(f"Error fetching Jira sprint history: {e}")
        return []
