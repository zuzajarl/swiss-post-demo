"""
Tool: find_location

Resolves whatever the caller said into real Swiss Post locations, live from the
location API. Accepts a municipality, a postcode, a branch name, or a whole
spoken sentence.

This is the entry point for nearly every call: nothing else can be answered
until the location is known.
"""

from fastapi import APIRouter, HTTPException, Request

from backend import store
from backend.models import FindLocationResponse, FindLocationRequest, ToolError
from backend.routes.utils import get_conversation_id, verify_signature
from backend.services import locations as loc_service
from backend.services import post_api

router = APIRouter()


@router.post("/find_location", response_model=FindLocationResponse)
async def find_location(request: Request):
    raw_body = await request.body()
    if not verify_signature(raw_body, request.headers.get("ElevenLabs-Signature")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = FindLocationRequest.model_validate_json(raw_body)
    conversation_id = get_conversation_id(request, data.conversation_id)
    language = data.language

    try:
        result = loc_service.resolve(data.query, language=language, limit=5)
    except post_api.PostApiError as exc:
        store.log_event(conversation_id, "find_location", f"“{data.query}” → upstream error")
        return FindLocationResponse(
            found=False,
            error=ToolError(code="upstream_unavailable", message=str(exc)),
        )

    if not result["found"]:
        store.log_event(conversation_id, "find_location", f"“{data.query}” → no match")
        return FindLocationResponse(
            found=False,
            ask_for_postcode=not result.get("postcode_hint", False),
        )

    summaries = [loc_service.to_summary(r, language) for r in result["locations"]]

    # Several access points in one municipality are not a choice the caller has
    # to make — the partner branch and the terminal are the answer, not rival
    # readings. Two staffed branches, or two municipalities, genuinely are.
    branches = [s for s in summaries if s["type"] == "branch"]
    cities = {s["city"] for s in summaries if s["city"]}
    ambiguous = len(branches) > 1 or len(cities) > 1

    store.log_event(
        conversation_id,
        "find_location",
        f"“{data.query}” → {summaries[0]['name']}"
        + (f" (+{len(summaries) - 1} more)" if len(summaries) > 1 else ""),
        {"location": summaries[0], "alternatives": summaries[1:], "ambiguous": ambiguous},
    )

    return FindLocationResponse(
        found=True,
        ambiguous=ambiguous,
        matched_via=result["matched_via"],
        locations=summaries,
        places=result.get("places", []),
    )
