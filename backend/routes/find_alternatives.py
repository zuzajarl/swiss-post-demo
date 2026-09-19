"""
Tool: find_alternatives

Nearest usable access points around a location, live from the Swiss Post API,
ranked by distance and optionally filtered by the service the caller needs.

The search widens if nothing is close: a rural caller has nothing within walking
distance and still needs an answer.
"""

from fastapi import APIRouter, HTTPException, Request

from backend import store
from backend.models import FindAlternativesRequest, FindAlternativesResponse, ToolError
from backend.routes.utils import get_conversation_id, verify_signature
from backend.services import locations as loc_service
from backend.services import post_api

router = APIRouter()

MAX_LIMIT = 5


@router.post("/find_alternatives", response_model=FindAlternativesResponse)
async def find_alternatives(request: Request):
    raw_body = await request.body()
    if not verify_signature(raw_body, request.headers.get("ElevenLabs-Signature")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = FindAlternativesRequest.model_validate_json(raw_body)
    conversation_id = get_conversation_id(request, data.conversation_id)
    language = data.language
    limit = max(1, min(data.limit, MAX_LIMIT))

    try:
        origin = _resolve_origin(data, language)
    except post_api.PostApiError as exc:
        store.log_event(conversation_id, "find_alternatives", "upstream error")
        return FindAlternativesResponse(
            found=False,
            error=ToolError(code="upstream_unavailable", message=str(exc)),
        )

    if not origin or origin.get("lat") is None:
        store.log_event(conversation_id, "find_alternatives", "no origin resolved")
        return FindAlternativesResponse(found=False, searched_service=data.service)

    try:
        nearby = loc_service.alternatives_near(
            origin["lat"], origin["lon"],
            language=language,
            service=data.service,
            limit=limit,
            exclude_id=origin.get("id"),
        )
    except post_api.PostApiError as exc:
        store.log_event(conversation_id, "find_alternatives", "upstream error on nearby search")
        return FindAlternativesResponse(
            found=False,
            error=ToolError(code="upstream_unavailable", message=str(exc)),
        )

    origin_summary = loc_service.to_summary(origin, language)
    alternatives = [loc_service.to_summary(r, language) for r in nearby]

    store.log_event(
        conversation_id,
        "find_alternatives",
        f"{origin_summary['name']} → {len(alternatives)} option(s)"
        + (f", nearest {alternatives[0]['name']}" if alternatives else ""),
        {"origin": origin_summary, "alternatives": alternatives, "service": data.service},
    )

    return FindAlternativesResponse(
        found=bool(alternatives),
        origin=origin_summary,
        alternatives=alternatives,
        searched_service=data.service,
    )


def _resolve_origin(data: FindAlternativesRequest, language: str):
    """Locate the point to search around, from an id or from free text."""
    if data.location_id:
        detail = post_api.poi_detail(data.location_id, language=language)
        if detail:
            detail["type"] = "branch" if detail.get("poi_type_id") == "001PST" else "other"
            return detail

    if data.query:
        result = loc_service.resolve(data.query, language=language, limit=1)
        if result["found"] and result["locations"]:
            return result["locations"][0]
        # The caller named a place with no access point in it; search around the
        # place itself rather than giving up.
        if result.get("places"):
            place = result["places"][0]
            return {
                "id": None, "name": place["name"], "type": "other",
                "city": place["name"], "lat": place["lat"], "lon": place["lon"],
            }

    return None
