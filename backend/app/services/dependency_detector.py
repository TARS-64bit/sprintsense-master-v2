"""
SprintSense — Implicit Dependency Detector
===========================================
TASK  ★★★

Replace the hardcoded DEPENDENCY_EDGES with LLM-inferred edges so the app
detects implicit blocking relationships developers forgot to link in the tracker.

Problem
-------
Developers miss dependencies constantly. TKT-103 (rate-limiting) blocking TKT-108
(Jira integration) was implicit — neither ticket linked the other. An LLM that reads
both descriptions can infer the relationship and insert it into the DAG automatically.

Algorithm
---------
1. For every ordered pair (A, B) in the backlog, ask the LLM:
     "Does ticket A block ticket B?"
2. Merge LLM-inferred edges with existing explicit tracker links.
3. Remove any edge that would create a cycle in the DAG.
4. Return the merged edge list.

API reference
-------------
- app.services.llm.call_llm(system, user, api_key)  →  (text, is_real)
  call_llm returns ("", False) when no key is set — use this to short-circuit.

Concurrency note: use asyncio.Semaphore to limit to MAX_CONCURRENT LLM calls.
"""
import asyncio
import json
import logging
from typing import Optional

from app.services.llm import call_llm

logger = logging.getLogger(__name__)
MAX_CONCURRENT = 5   # max parallel LLM calls to avoid rate-limiting

CLASSIFY_SYSTEM = """You are a software dependency analyser.
Given two Jira-style tickets A and B, decide whether A BLOCKS B.
A blocks B when B cannot begin (or cannot be merged) until A is complete.

Respond with ONLY valid JSON — no markdown, no extra keys:
{
  "blocks": true | false,
  "confidence": 0.0-1.0,
  "reason": "<one concise sentence>"
}"""


# ---------------------------------------------------------------------------
# TODO 1 — has_path()
# ---------------------------------------------------------------------------
# Depth-first reachability check used for cycle detection.
#
# Parameters:
#   adj   : dict[str, list[str]]  — adjacency list of the current DAG
#   start : str
#   goal  : str
#
# Steps:
#   a. Standard iterative DFS using a stack and a visited set.
#   b. Return True if goal is reachable from start, False otherwise.
#
# Acceptance: O(V + E), no recursion depth issues for up to 200 tickets.

def has_path(adj: dict, start: str, goal: str) -> bool:
    if start == goal:
        return True

    visited = set()
    stack = [start]

    while stack:
        node = stack.pop()
        if node == goal:
            return True

        if node not in visited:
            visited.add(node)
            for neighbor in adj.get(node, []):
                if neighbor not in visited:
                    stack.append(neighbor)

    return False


# ---------------------------------------------------------------------------
# TODO 2 — classify_pair()
# ---------------------------------------------------------------------------
# Ask the LLM whether ticket_a blocks ticket_b.
#
# Parameters:
#   ticket_a, ticket_b     : dict   — each has id, title, description, labels
#   api_key                : str | None
#   confidence_threshold   : float  — only emit edge if confidence >= this (default 0.7)
#
# Steps:
#   a. Build user message:
#        "Ticket A: {id} — {title}\nDescription: {description}\n\n
#         Ticket B: {id} — {title}\nDescription: {description}\n\n
#         Does A block B?"
#   b. Call:  raw, is_real = await call_llm(CLASSIFY_SYSTEM, user_msg, api_key=api_key)
#      If not is_real, return None immediately.
#   c. Strip markdown fences and parse JSON.
#   d. If parsed["blocks"] is True and parsed["confidence"] >= confidence_threshold:
#        return {
#          "from": ticket_a["id"],
#          "to":   ticket_b["id"],
#          "reason": parsed["reason"],
#          "source": "llm",
#        }
#   e. Otherwise return None.
#   f. On any exception (JSON parse, key error, …): log the error, return None.
#
# Acceptance: never raises; returns None on every error path.

async def classify_pair(
    ticket_a: dict,
    ticket_b: dict,
    api_key: Optional[str] = None,
    confidence_threshold: float = 0.7,
) -> Optional[dict]:
    user_msg = f"""Ticket A: {ticket_a['id']} — {ticket_a['title']}
Description: {ticket_a['description']}

Ticket B: {ticket_b['id']} — {ticket_b['title']}
Description: {ticket_b['description']}

Does A block B?"""

    try:
        raw, is_real = await call_llm(CLASSIFY_SYSTEM, user_msg, api_key=api_key)
        if not is_real:
            return None

        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        parsed = json.loads(cleaned)

        if parsed.get("blocks") is True and parsed.get("confidence", 0) >= confidence_threshold:
            return {
                "from": ticket_a["id"],
                "to": ticket_b["id"],
                "reason": parsed.get("reason", "Inferred dependency"),
                "source": "llm",
            }

        return None
    except Exception as e:
        logger.error(f"Error classifying pair {ticket_a['id']} and {ticket_b['id']}: {e}")
        return None


# ---------------------------------------------------------------------------
# TODO 3 — detect_implicit_dependencies()
# ---------------------------------------------------------------------------
# Orchestrate all pair classifications and merge with explicit edges.
#
# Parameters:
#   tickets        : list[dict]  — backlog tickets (id, title, description, labels)
#   explicit_edges : list[dict]  — from seed_data.DEPENDENCY_EDGES
#   api_key        : str | None
#
# Steps:
#   a. If api_key is None, return explicit_edges unchanged (mock fallback).
#   b. Build a set of already-known (from, to) pairs from explicit_edges.
#   c. Build an adjacency list from explicit_edges for cycle detection.
#   d. Create a semaphore: sem = asyncio.Semaphore(MAX_CONCURRENT)
#   e. For every ordered pair (a, b) where a["id"] != b["id"] and
#      (a["id"], b["id"]) is NOT already in the known-pairs set:
#        async with sem:
#            edge = await classify_pair(a, b, api_key=api_key)
#   f. Collect non-None edges. For each candidate edge:
#        - Check: would adding (edge["from"], edge["to"]) create a cycle?
#          Use has_path(adj, edge["to"], edge["from"]) to check reverse reachability.
#        - If no cycle: add to adj and to the result list.
#        - If cycle: log and discard.
#   g. Return explicit_edges + accepted inferred edges.
#
# Acceptance:
#   - Result DAG has no cycles.
#   - Falls back to explicit_edges when api_key is None.
#   - Total concurrent LLM calls at any time ≤ MAX_CONCURRENT.

async def detect_implicit_dependencies(
    tickets: list,
    explicit_edges: list,
    api_key: Optional[str] = None,
) -> list:
    if not api_key:
        return explicit_edges

    known_pairs = set((e["from"], e["to"]) for e in explicit_edges)

    adj = {}
    for e in explicit_edges:
        if e["from"] not in adj:
            adj[e["from"]] = []
        adj[e["from"]].append(e["to"])

    sem = asyncio.Semaphore(MAX_CONCURRENT)

    tasks = []

    async def process_pair(a, b):
        async with sem:
            return await classify_pair(a, b, api_key=api_key)

    for a in tickets:
        for b in tickets:
            if a["id"] != b["id"] and (a["id"], b["id"]) not in known_pairs:
                tasks.append(process_pair(a, b))

    results = await asyncio.gather(*tasks)

    inferred_edges = []
    for edge in results:
        if edge is not None:
            # Check for cycle: would adding edge create a cycle?
            # i.e., is there already a path from edge["to"] to edge["from"]?
            if has_path(adj, edge["to"], edge["from"]):
                logger.warning(f"Cycle detected, ignoring edge from {edge['from']} to {edge['to']}")
            else:
                if edge["from"] not in adj:
                    adj[edge["from"]] = []
                adj[edge["from"]].append(edge["to"])
                inferred_edges.append(edge)

    return explicit_edges + inferred_edges
