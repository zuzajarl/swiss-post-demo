"""
Tool-activity feed for the web demo.

The five tools run as server-side webhooks, so the browser never sees them
fire. This endpoint lets the demo page poll for what the agent just did and
render it beside the transcript — which is the part that makes a voice demo
legible to a room full of people.
"""

from fastapi import APIRouter

from backend import store

router = APIRouter()


@router.get("/events/latest")
def latest_events():
    """Events from whichever conversation last called a tool.

    The demo page polls this so the panel fills in even when the platform does
    not pass `conversation_id` into the tool body — which it does not by
    default, and which is not worth a fragile dynamic-variable binding.
    """
    conversation_id = store.latest_conversation()
    return {
        "conversation_id": conversation_id,
        "events": store.events(conversation_id) if conversation_id else [],
    }


@router.get("/events/{conversation_id}")
def conversation_events(conversation_id: str):
    return {
        "conversation_id": conversation_id,
        "events": store.events(conversation_id),
    }


@router.get("/programme")
def programme():
    """Programme-level facts, used by the page's static context panels."""
    return {
        "programme": store.programme(),
        "phases": store.phases(),
        "commitments": store.commitments(),
    }
