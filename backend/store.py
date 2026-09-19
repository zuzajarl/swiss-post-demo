"""
Local state: the closure overlay, programme facts, digital services, and a short
log of tool calls for the web demo.

Locations themselves are not stored here — they come live from the Swiss Post
location API on every request (via `backend.services.post_api`, which caches).
The only location-shaped data in this process is the closure overlay, because
the public API carries no closure status.
"""

import json
import os
import threading
import time
from collections import deque
from pathlib import Path
from typing import Any, Deque, Dict, List, Optional

DATA_DIR = Path(__file__).parent.parent / "data"

MAX_EVENTS_PER_CONVERSATION = 50
MAX_CONVERSATIONS = 200


_closures: Dict[str, Any] = {}
_digital: Dict[str, Any] = {}
_overlay_by_poi: Dict[str, Dict[str, Any]] = {}


def load() -> None:
    global _closures, _digital, _overlay_by_poi

    with open(DATA_DIR / "closures.json", encoding="utf-8") as f:
        _closures = json.load(f)
    with open(DATA_DIR / "digital_services.json", encoding="utf-8") as f:
        _digital = json.load(f)

    if overlay_enabled():
        _overlay_by_poi = {c["poi_id"]: c for c in _closures.get("closures", [])}
        print(f"[store] Closure overlay: {len(_overlay_by_poi)} locations")
    else:
        _overlay_by_poi = {}
        print("[store] Closure overlay disabled (CLOSURE_OVERLAY=off)")

    print(f"[store] Locations served live from {os.getenv('SWISSPOST_API_BASE', 'places.post.ch')}")


def overlay_enabled() -> bool:
    return os.getenv("CLOSURE_OVERLAY", "on").lower() not in ("off", "0", "false")


# ─── Closure overlay ──────────────────────────────────────────────────────────

def closure_for(poi_id: str) -> Optional[Dict[str, Any]]:
    """The announced closure for a POI, or None when it is not affected."""
    return _overlay_by_poi.get(poi_id)


def closures() -> List[Dict[str, Any]]:
    return _closures.get("closures", [])


def programme() -> Dict[str, Any]:
    return _closures["programme"]


def commitments() -> List[Dict[str, Any]]:
    return _closures["commitments"]


def phases() -> List[Dict[str, Any]]:
    return _closures["phases"]


def digital_services() -> List[Dict[str, Any]]:
    return _digital["services"]


# ─── Tool-call event log ──────────────────────────────────────────────────────

_events: Dict[str, Deque[Dict[str, Any]]] = {}
_order: Deque[str] = deque()
# Most-recently-active conversations, oldest first.
_recent: Deque[str] = deque(maxlen=MAX_CONVERSATIONS)
_lock = threading.Lock()


def log_event(conversation_id: str, tool: str, label: str, detail: Any = None) -> None:
    """Record one tool call so the web demo can show what the agent just did."""
    if not conversation_id:
        conversation_id = "unknown"

    with _lock:
        if conversation_id not in _events:
            _events[conversation_id] = deque(maxlen=MAX_EVENTS_PER_CONVERSATION)
            _order.append(conversation_id)
            while len(_order) > MAX_CONVERSATIONS:
                _events.pop(_order.popleft(), None)

        _events[conversation_id].append({
            "tool": tool,
            "label": label,
            "detail": detail,
            "seq": len(_events[conversation_id]),
            # When the agent performed this lookup. The page shows it as the
            # age of the data, so it has to come from the server, not the
            # browser clock.
            "ts": int(time.time() * 1000),
        })

        if not _recent or _recent[-1] != conversation_id:
            _recent.append(conversation_id)

    print(f"[tool] {conversation_id[:12]} {tool}: {label}")


def events(conversation_id: str) -> List[Dict[str, Any]]:
    with _lock:
        return list(_events.get(conversation_id, []))


def latest_conversation() -> Optional[str]:
    """The conversation that most recently called a tool.

    The web demo polls this rather than a specific id, so the tool panel works
    whether or not the platform passes `conversation_id` through.
    """
    with _lock:
        return _recent[-1] if _recent else None
