"""
SprintSense — Sprint Alert Notifier
=====================================
TASK  ★★

Push slippage warnings to Slack and email when the sprint completion
probability drops below ALERT_THRESHOLD.

Why this matters
----------------
The daily standup digest is reactive — someone has to open the app.
This module makes SprintSense proactive: the team is notified automatically
on day 2 if the sprint is already trending off-track, not at the retro.

Environment variables
---------------------
  SLACK_WEBHOOK_URL   — Slack Incoming Webhook URL
  SENDGRID_API_KEY    — SendGrid API key for email
  ALERT_TO_EMAIL      — recipient email (fallback: "team@sprintsense.ai")

Slack Incoming Webhook docs:
  https://api.slack.com/messaging/webhooks
  POST JSON to SLACK_WEBHOOK_URL; expect HTTP 200 "ok" on success.

SendGrid Mail Send docs:
  POST https://api.sendgrid.com/v3/mail/send
  Authorization: Bearer {SENDGRID_API_KEY}
  HTTP 202 on success.
"""
import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

ALERT_THRESHOLD = 0.70      # fire alert when probability drops below this
SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send"
SENDER_EMAIL = "noreply@sprintsense.ai"


# ---------------------------------------------------------------------------
# TODO 1 — build_slack_blocks()
# ---------------------------------------------------------------------------
# Build a Slack Block Kit payload for the slippage alert.
#
# Parameters:
#   probability : float       — current completion probability, e.g. 0.63
#   current_day : int         — sprint day number
#   at_risk     : list[dict]  — items from AT_RISK_ITEMS
#                               each has: ticket_id, title, risk_level, reason
#
# Steps:
#   a. Header block (type="header"):
#        text = "⚠️ SprintSense Alert — Day {current_day}"
#   b. Section block with completion probability:
#        text = "Sprint completion probability: *{pct}%*\n
#                Status: {declining|on-track} — {at_risk_count} items at risk"
#   c. Divider block.
#   d. For each item in at_risk, one section block:
#        text = "*[{risk_level.upper()}]* `{ticket_id}` — {title}\n>{reason}"
#   e. Return: { "blocks": [ ...all blocks... ] }
#
# Acceptance:
#   - Returns valid JSON-serialisable dict.
#   - "blocks" list is non-empty.
#   - Handles empty at_risk list gracefully (no crash).

def build_slack_blocks(
    probability: float,
    current_day: int,
    at_risk: list,
) -> dict:
    pct = round(probability * 100)
    status_text = "declining" if pct < 70 else "on-track"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"⚠️ SprintSense Alert — Day {current_day}"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"Sprint completion probability: *{pct}%*\nStatus: {status_text} — {len(at_risk)} items at risk"
            }
        },
        {
            "type": "divider"
        }
    ]

    for item in at_risk:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*[{item['risk_level'].upper()}]* `{item['ticket_id']}` — {item['title']}\n>{item['reason']}"
            }
        })

    return {"blocks": blocks}


# ---------------------------------------------------------------------------
# TODO 2 — send_slack_alert()
# ---------------------------------------------------------------------------
# POST the alert to Slack if probability < ALERT_THRESHOLD.
#
# Parameters:
#   probability : float
#   current_day : int
#   at_risk     : list[dict]
#   webhook_url : str | None  — overrides SLACK_WEBHOOK_URL env var
#
# Steps:
#   a. If probability >= ALERT_THRESHOLD → return immediately (no alert needed).
#   b. Resolve url = webhook_url or os.getenv("SLACK_WEBHOOK_URL").
#      If url is None or empty → logger.warning("SLACK_WEBHOOK_URL not set") and return.
#   c. payload = build_slack_blocks(probability, current_day, at_risk)
#   d. async with httpx.AsyncClient(timeout=10) as client:
#          resp = await client.post(url, json=payload)
#      Log "Slack alert sent (HTTP {resp.status_code})" for 200,
#          "Slack alert failed: {resp.text}" otherwise.
#   e. Wrap everything in try/except Exception → logger.exception(...); return.
#      Never raise out of this function.
#
# Acceptance: idempotent, never raises, always logs outcome.

async def send_slack_alert(
    probability: float,
    current_day: int,
    at_risk: list,
    webhook_url: Optional[str] = None,
) -> None:
    if probability >= ALERT_THRESHOLD:
        return

    url = webhook_url or os.getenv("SLACK_WEBHOOK_URL")
    if not url:
        logger.warning("SLACK_WEBHOOK_URL not set")
        return

    payload = build_slack_blocks(probability, current_day, at_risk)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                logger.info(f"Slack alert sent (HTTP {resp.status_code})")
            else:
                logger.warning(f"Slack alert failed: {resp.text}")
    except Exception as e:
        logger.exception(f"Exception sending Slack alert: {e}")


# ---------------------------------------------------------------------------
# TODO 3 — markdown_to_html()
# ---------------------------------------------------------------------------
# Convert the standup digest markdown to minimal HTML for email rendering.
#
# Parameters:
#   text : str — markdown digest string
#
# Transformations (apply in order):
#   1. **bold** → <strong>bold</strong>
#   2. *italic* → <em>italic</em>   (single asterisk, not already handled)
#   3. `code`   → <code>code</code>
#   4. Lines starting with "# " → <h2>...</h2>
#   5. Lines starting with "- " → <li>...</li>  (wrap groups in <ul>)
#   6. "\n\n" → </p><p>   (paragraph breaks)
#   7. Remaining "\n" → <br/>
#   8. Wrap the whole thing in <html><body><p>...</p></body></html>
#
# Acceptance: returns a non-empty HTML string; does not raise on empty input.

import re

def markdown_to_html(text: str) -> str:
    if not text:
        return "<html><body><p></p></body></html>"

    # 1. **bold** → <strong>bold</strong>
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)

    # 2. *italic* → <em>italic</em>
    html = re.sub(r'(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)', r'<em>\1</em>', html)

    # 3. `code`   → <code>code</code>
    html = re.sub(r'`(.*?)`', r'<code>\1</code>', html)

    lines = html.split('\n')
    processed_lines = []
    in_list = False

    for line in lines:
        # 4. Lines starting with "# " → <h2>...</h2>
        if line.startswith("# "):
            if in_list:
                processed_lines.append("</ul>")
                in_list = False
            processed_lines.append(f"<h2>{line[2:]}</h2>")
        # 5. Lines starting with "- " → <li>...</li>
        elif line.startswith("- "):
            if not in_list:
                processed_lines.append("<ul>")
                in_list = True
            processed_lines.append(f"<li>{line[2:]}</li>")
        else:
            if in_list:
                processed_lines.append("</ul>")
                in_list = False
            processed_lines.append(line)

    if in_list:
        processed_lines.append("</ul>")

    html = '\n'.join(processed_lines)

    # 6. "\n\n" → </p><p>
    html = html.replace('\n\n', '</p><p>')

    # 7. Remaining "\n" → <br/>
    html = html.replace('\n', '<br/>')

    # 8. Wrap
    return f"<html><body><p>{html}</p></body></html>"


# ---------------------------------------------------------------------------
# TODO 4 — send_email_digest()
# ---------------------------------------------------------------------------
# Send the daily standup digest as an HTML email via SendGrid.
#
# Parameters:
#   digest_text : str         — markdown from generate_digest()
#   to_email    : str | None  — overrides ALERT_TO_EMAIL env var
#   subject     : str         — default "SprintSense Daily Digest"
#   api_key     : str | None  — overrides SENDGRID_API_KEY env var
#
# Steps:
#   a. Resolve api_key = api_key or os.getenv("SENDGRID_API_KEY").
#      If None → logger.warning("SENDGRID_API_KEY not set") and return.
#   b. Resolve recipient = to_email or os.getenv("ALERT_TO_EMAIL", "team@sprintsense.ai").
#   c. html = markdown_to_html(digest_text)
#   d. Build payload:
#        {
#          "personalizations": [{"to": [{"email": recipient}]}],
#          "from":    {"email": SENDER_EMAIL, "name": "SprintSense"},
#          "subject": subject,
#          "content": [{"type": "text/html", "value": html}],
#        }
#   e. POST to SENDGRID_SEND_URL with header:
#        Authorization: Bearer {api_key}
#      HTTP 202 → logger.info("Email digest sent to {recipient}")
#      Other   → logger.warning("SendGrid error {status}: {resp.text[:120]}")
#   f. Catch all exceptions; never raise.
#
# Acceptance: never raises; handles all missing-config paths gracefully.

async def send_email_digest(
    digest_text: str,
    to_email: Optional[str] = None,
    subject: str = "SprintSense Daily Digest",
    api_key: Optional[str] = None,
) -> None:
    resolved_api_key = api_key or os.getenv("SENDGRID_API_KEY")
    if not resolved_api_key:
        logger.warning("SENDGRID_API_KEY not set")
        return

    recipient = to_email or os.getenv("ALERT_TO_EMAIL", "team@sprintsense.ai")

    try:
        html = markdown_to_html(digest_text)
        payload = {
            "personalizations": [{"to": [{"email": recipient}]}],
            "from": {"email": SENDER_EMAIL, "name": "SprintSense"},
            "subject": subject,
            "content": [{"type": "text/html", "value": html}],
        }

        headers = {
            "Authorization": f"Bearer {resolved_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(SENDGRID_SEND_URL, json=payload, headers=headers)
            if resp.status_code == 202:
                logger.info(f"Email digest sent to {recipient}")
            else:
                logger.warning(f"SendGrid error {resp.status_code}: {resp.text[:120]}")
    except Exception as e:
        logger.exception(f"Exception sending email digest: {e}")
