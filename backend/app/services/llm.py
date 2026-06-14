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
# Similarity Search (Jaccard)
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> set:
    if not text:
        return set()
    import re
    words = re.findall(r'\b\w+\b', text.lower())
    # simplistic stop words
    stop = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "is", "are", "this"}
    return {w for w in words if w not in stop}

def find_similar_tickets(target: dict, historical: list[dict], top_k: int = 3) -> list[str]:
    """
    Computes Jaccard similarity based on title, description, and labels between
    the target ticket and all historical tickets.
    Returns a list of up to `top_k` historical ticket IDs that are most similar.
    """
    target_text = f"{target.get('title', '')} {target.get('description', '')} {' '.join(target.get('labels', []))}"
    target_tokens = _tokenize(target_text)

    if not target_tokens:
        return []

    scores = []
    for h in historical:
        h_text = f"{h.get('title', '')} {h.get('description', '')} {' '.join(h.get('labels', []))}"
        h_tokens = _tokenize(h_text)

        if not h_tokens:
            continue

        intersection = target_tokens.intersection(h_tokens)
        union = target_tokens.union(h_tokens)
        score = len(intersection) / len(union) if len(union) > 0 else 0
        scores.append((score, h["id"]))

    # Sort descending by score
    scores.sort(key=lambda x: x[0], reverse=True)

    # Return top_k ids that have score > 0
    return [s[1] for s in scores[:top_k] if s[0] > 0]


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

    if not similar_tickets:
        similar_summary = "No similar tickets found."
    else:
        similar_summary = "\n".join(
            f"- {t['id']}: \"{t['title']}\" — {t.get('story_points', '?')} pts, {t.get('actual_cycle_days', '?')} days"
            for t in similar_tickets
        )

    user_msg = f"Ticket: {ticket['id']} — \"{ticket['title']}\"\nDescription: {ticket['description']}\n\nSimilar completed tickets:\n{similar_summary}\n\nEstimate story points for this ticket."

    try:
        raw, is_real = await call_llm(ESTIMATE_SYSTEM, user_msg, api_key=api_key, max_tokens=256)
        if not is_real:
            return {**(mock_estimate or {}), "source": "mock"}

        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)
        return {**parsed, "source": "llm"}
    except Exception as e:
        logger.warning(f"Error parsing LLM estimate response: {e}")
        return {**(mock_estimate or {}), "source": "mock"}


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

    tickets_summary_list = []
    for t in sprint_state.get("tickets", []):
        tickets_summary_list.append(f"  - {t['id']} ({t.get('title', '')}): status={t['status']}, assignee={t['assignee']}, pts={t.get('points', '?')}")
    tickets_summary = "\n".join(tickets_summary_list) if tickets_summary_list else "  - None"

    if not at_risk:
        at_risk_summary = "  - None"
    else:
        at_risk_summary = "\n".join(
            f"  - {r['ticket_id']} [{r['risk_level']}]: {r['reason']}" for r in at_risk
        )

    remaining = None
    for val in reversed(burndown.get("actual", [])):
        if val is not None:
            remaining = val
            break

    total_points = burndown.get("total_points", "?")
    sprint_number = sprint_state.get("sprint_number", "?")

    user_msg = f"Sprint {sprint_number}, Day {day} ({date_str})\nRemaining points: {remaining} of {total_points}\n\nTickets:\n{tickets_summary}\n\nAt-risk:\n{at_risk_summary}\n\nWrite the daily standup digest."

    raw, is_real = await call_llm(DIGEST_SYSTEM, user_msg, api_key=api_key, max_tokens=512)
    if not is_real:
        return mock_digest or "", "mock"

    return raw.strip(), "llm"
