"""
Shared helpers for the tool webhook routes.
"""

import hashlib
import hmac
import os
import time
from typing import Optional

from fastapi import Request

WEBHOOK_SECRET = os.getenv("ELEVENLABS_WEBHOOK_SECRET", "")

# ElevenLabs signs with a timestamp; reject anything older than this to stop
# a captured request being replayed.
MAX_SIGNATURE_AGE_SECONDS = 300


def verify_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """HMAC-SHA256 validation of the ElevenLabs-Signature header."""
    if not WEBHOOK_SECRET:
        return True  # Skipped in local dev when no secret is configured.
    if not signature_header:
        return False
    try:
        parts = dict(p.split("=", 1) for p in signature_header.split(","))
        timestamp = parts.get("t", "")
        provided = parts.get("v0", "")
        message = f"{timestamp}.{raw_body.decode()}"
        expected = hmac.new(WEBHOOK_SECRET.encode(), message.encode(), hashlib.sha256).hexdigest()
        if abs(time.time() - int(timestamp)) > MAX_SIGNATURE_AGE_SECONDS:
            return False
        return hmac.compare_digest(expected, provided)
    except Exception:
        return False


def get_conversation_id(request: Request, body_value: Optional[str] = None) -> str:
    return body_value or request.headers.get("X-Conversation-Id", "unknown")


def pick(translations: dict, language: str) -> str:
    """Read a {de, fr, it, en} block, falling back to English."""
    return translations.get(language) or translations.get("en") or ""
