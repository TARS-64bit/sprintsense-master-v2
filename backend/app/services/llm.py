"""
LLM service for SprintSense.

Priority:
  1. API key passed per-request via X-LLM-Key header (supports any bearer key)
  2. OPENAI_API_KEY environment variable (OpenAI)
  3. ANTHROPIC_API_KEY environment variable (Anthropic / Claude)
  4. Mock fallback — returns pre-computed seed data (no key required)

The caller decides which provider by key prefix:
  - sk-ant-*  → Anthropic Messages API
  - sk-*      → OpenAI Chat Completions API
  - everything else → treated as OpenAI-compatible (custom base URL possible)
"""

import os
import json
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider detection
# ---------------------------------------------------------------------------

def _detect_provider(key: str) -> str:
    """Return 'anthropic' or 'openai' based on key prefix."""
    if key.startswith("sk-ant-"):
        return "anthropic"
    return "openai"


# ---------------------------------------------------------------------------
# Key resolution
# ---------------------------------------------------------------------------

def resolve_key(request_key: Optional[str] = None) -> Optional[str]:
    """
    Return the first available API key, or None if none configured.
    Order: request header → OPENAI_API_KEY → ANTHROPIC_API_KEY
    """
    if request_key:
        return request_key.strip()
    k = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
    return k.strip() if k else None


def has_real_key(request_key: Optional[str] = None) -> bool:
    return resolve_key(request_key) is not None


# ---------------------------------------------------------------------------
# OpenAI call
# ---------------------------------------------------------------------------

async def _call_openai(key: str, system: str, user: str, max_tokens: int = 512) -> str:
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": "gpt-4o-mini",
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# Anthropic call
# ---------------------------------------------------------------------------

async def _call_anthropic(key: str, system: str, user: str, max_tokens: int = 512) -> str:
    headers = {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
    }
    body = {
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=body,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]


# ---------------------------------------------------------------------------
# Unified call
# ---------------------------------------------------------------------------

async def call_llm(
    system: str,
    user: str,
    api_key: Optional[str] = None,
    max_tokens: int = 512,
) -> tuple[str, bool]:
    """
    Call the LLM and return (text, is_real).
    is_real=True means a real API was used; False means mock data.
    """
    key = resolve_key(api_key)
    if not key:
        return "", False  # caller should use mock

    provider = _detect_provider(key)
    try:
        if provider == "anthropic":
            text = await _call_anthropic(key, system, user, max_tokens)
        else:
            text = await _call_openai(key, system, user, max_tokens)
        return text, True
    except httpx.HTTPStatusError as e:
        logger.warning("LLM API error %s: %s — falling back to mock", e.response.status_code, e.response.text[:200])
        return "", False
    except Exception as e:
        logger.warning("LLM call failed (%s) — falling back to mock", e)
        return "", False


# ---------------------------------------------------------------------------
# High-level: ticket estimation
# ---------------------------------------------------------------------------

ESTIMATE_SYSTEM = """You are an agile estimation assistant.
Given a ticket description and a list of similar completed tickets (with story points and cycle days),
estimate the story points for the new ticket.

Respond with ONLY valid JSON in exactly this shape:
{
  "points": <integer>,
  "low": <integer>,
  "high": <integer>,
  "rationale": "<one sentence>"
}
No markdown, no extra keys."""

async def estimate_ticket(
    ticket: dict,
    similar_tickets: list[dict],
    api_key: Optional[str] = None,
    mock_estimate: Optional[dict] = None,
) -> dict:
    """
    Return an estimate dict.  Falls back to mock_estimate when no key available
    or if the LLM call fails.
    """
    key = resolve_key(api_key)
    if not key:
        return {**(mock_estimate or {}), "source": "mock"}

    # -------------------------------------------------------------------------
    # TODO — implement the LLM estimation call
    # -------------------------------------------------------------------------
    # The key and similar_tickets are already resolved above.
    # Steps:
    #   1. Build similar_summary — one line per similar ticket:
    #        "- {id}: \"{title}\" — {story_points} pts, {actual_cycle_days} days"
    #      If similar_tickets is empty, use "No similar tickets found."
    #
    #   2. Build user_msg:
    #        "Ticket: {ticket['id']} — \"{ticket['title']}\"\n"
    #        "Description: {ticket['description']}\n\n"
    #        "Similar completed tickets:\n{similar_summary}\n\n"
    #        "Estimate story points for this ticket."
    #
    #   3. Call:  raw, is_real = await call_llm(ESTIMATE_SYSTEM, user_msg,
    #                                           api_key=api_key, max_tokens=256)
    #      If not is_real → return {**(mock_estimate or {}), "source": "mock"}
    #
    #   4. Strip markdown fences from raw:
    #        cleaned = raw.strip().strip("```json").strip("```").strip()
    #      Parse with json.loads(cleaned).
    #
    #   5. Return {**parsed, "source": "llm"}.
    #
    #   6. On any exception → log the raw snippet, return mock fallback.
    #
    # Expected output shape: {"points": int, "low": int, "high": int,
    #                          "rationale": str, "source": "llm"}
    # -------------------------------------------------------------------------
    raise NotImplementedError(
        "estimate_ticket LLM path not implemented — "
        "set X-LLM-Key header and implement this function to activate real estimation"
    )


# ---------------------------------------------------------------------------
# High-level: standup digest
# ---------------------------------------------------------------------------

DIGEST_SYSTEM = """You are a scrum master AI assistant writing a daily sprint digest.
Given the current sprint state (tickets, statuses, burndown, at-risk items),
write a concise standup digest in Markdown.

Structure it exactly as:
**SprintSense Daily Digest — Day {day}**

🟢 **Completed yesterday**
...

🔵 **In progress today**
...

🔴 **Blockers**
...

⚠️ **SprintSense alert**
...

Be specific and factual. Use the data provided. Keep it under 300 words."""

async def generate_digest(
    sprint_state: dict,
    burndown: dict,
    at_risk: list[dict],
    day: int,
    date_str: str,
    api_key: Optional[str] = None,
    mock_digest: Optional[str] = None,
) -> tuple[str, str]:
    """
    Return (digest_text, source) where source is 'llm' or 'mock'.
    """
    key = resolve_key(api_key)
    if not key:
        return mock_digest or "", "mock"

    # -------------------------------------------------------------------------
    # TODO — implement the LLM digest generation call
    # -------------------------------------------------------------------------
    # The key, sprint_state, burndown, and at_risk are already available.
    # Steps:
    #   1. Build tickets_summary — one line per ticket:
    #        "  - {id} ({title}): status={status}, assignee={assignee}, pts={pts}"
    #
    #   2. Build at_risk_summary — one line per item:
    #        "  - {ticket_id} [{risk_level}]: {reason}"
    #      Use "None" if at_risk is empty.
    #
    #   3. Find remaining points = last non-None value in burndown["actual"].
    #
    #   4. Build user_msg:
    #        "Sprint {sprint_number}, Day {day} ({date_str})\n"
    #        "Remaining points: {remaining} of {total_points}\n\n"
    #        "Tickets:\n{tickets_summary}\n\n"
    #        "At-risk:\n{at_risk_summary}\n\n"
    #        "Write the daily standup digest."
    #
    #   5. Call:  raw, is_real = await call_llm(DIGEST_SYSTEM, user_msg,
    #                                           api_key=api_key, max_tokens=512)
    #      If not is_real → return mock_digest or "", "mock"
    #
    #   6. Return raw.strip(), "llm"
    #
    # Expected output: (markdown_string, "llm")
    # The markdown must follow the DIGEST_SYSTEM structure:
    #   🟢 Completed yesterday / 🔵 In progress today / 🔴 Blockers / ⚠️ Alert
    # -------------------------------------------------------------------------
    raise NotImplementedError(
        "generate_digest LLM path not implemented — "
        "set X-LLM-Key header and implement this function to activate real digests"
    )
