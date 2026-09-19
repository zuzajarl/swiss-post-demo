"""
Swiss Post — Branch Closure Redirect & FAQ Agent
Python FastAPI backend.

Serves the five read-only tools the ElevenLabs agent calls during a
conversation, plus a small feed the web demo polls to visualise them.

Locations come live from Swiss Post's own public location service at
places.post.ch — real branches, addresses, opening hours and holiday calendars,
no API key. The one thing that service does not carry is closure status, so
planned closures are joined on from data/closures.json by POI id.

Everything here reads public information. There are no writes, no customer
records and no transactional integration — which is the point: it is the
shortest path through procurement for a first production voice agent.

Run:
    uvicorn backend.main:app --reload --port 8000

Expose publicly so ElevenLabs can reach the webhooks:
    ngrok http 8000
    → set NEXT_PUBLIC_PYTHON_BACKEND_URL and the tool URLs in the platform
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from backend import store
from backend.services import post_api
from backend.routes import (
    branch_status,
    digital_alternatives,
    events,
    find_alternatives,
    find_location,
    opening_hours,
)

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    store.load()
    yield


app = FastAPI(
    title="Swiss Post Branch Agent Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Agent tools (one file per tool) ──────────────────────────────────────────
app.include_router(find_location.router,         prefix="/webhook", tags=["tools"])
app.include_router(branch_status.router,         prefix="/webhook", tags=["tools"])
app.include_router(find_alternatives.router,     prefix="/webhook", tags=["tools"])
app.include_router(opening_hours.router,         prefix="/webhook", tags=["tools"])
app.include_router(digital_alternatives.router,  prefix="/webhook", tags=["tools"])

# ─── Demo support ─────────────────────────────────────────────────────────────
app.include_router(events.router, tags=["demo"])


@app.exception_handler(ValidationError)
async def malformed_tool_body(request: Request, exc: ValidationError):
    """A tool call with a missing or unusable field answers 200 with an error
    field, not a 500.

    The agent is mid-conversation with a caller: it can say "I can't look that
    up" gracefully, but a transport-level failure just stalls the call.
    """
    fields = ", ".join(".".join(str(p) for p in e["loc"]) for e in exc.errors()) or "request body"
    return JSONResponse(status_code=200, content={
        "found": False,
        "error": {"code": "bad_request", "message": f"Invalid or missing: {fields}"},
    })


@app.get("/health", tags=["system"])
def health():
    """Reports whether the upstream Swiss Post location API is reachable — the
    tools are useless without it, and that failure is otherwise only visible
    mid-call."""
    upstream = post_api.health()
    return {
        "status": "ok" if upstream.get("reachable") else "degraded",
        "service": "swisspost-branch-agent-backend",
        "location_source": post_api.API_BASE,
        "upstream": upstream,
        "closure_overlay": {
            "enabled": store.overlay_enabled(),
            "locations": len(store.closures()) if store.overlay_enabled() else 0,
        },
    }
