"""
Tool: get_branch_status

Whether a location is staying, closing, closed or converted — and what replaces
it.

Location facts come live from the Swiss Post API. The closure status itself
comes from the branch network overlay, because the public location API has no
closure field: it describes the network as it stands today.
"""

from fastapi import APIRouter, HTTPException, Request

from backend import store
from backend.models import BranchStatusRequest, BranchStatusResponse, ToolError
from backend.routes.utils import get_conversation_id, pick, verify_signature
from backend.services import locations as loc_service
from backend.services import post_api

router = APIRouter()

MAX_SUCCESSORS = 3


def _commitment(commitment_id: str, language: str) -> str:
    for commitment in store.commitments():
        if commitment["id"] == commitment_id:
            return pick(commitment, language)
    return ""


@router.post("/branch_status", response_model=BranchStatusResponse)
async def branch_status(request: Request):
    raw_body = await request.body()
    if not verify_signature(raw_body, request.headers.get("ElevenLabs-Signature")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = BranchStatusRequest.model_validate_json(raw_body)
    conversation_id = get_conversation_id(request, data.conversation_id)
    language = data.language

    try:
        detail = post_api.poi_detail(data.location_id, language=language)
    except post_api.PostApiError as exc:
        store.log_event(conversation_id, "get_branch_status", f"{data.location_id} → upstream error")
        return BranchStatusResponse(
            found=False,
            error=ToolError(code="upstream_unavailable", message=str(exc)),
        )

    if not detail:
        store.log_event(conversation_id, "get_branch_status", f"unknown id {data.location_id}")
        return BranchStatusResponse(found=False)

    detail["type"] = post_api.TYPE_TAGS.get(
        _tag_for(detail.get("poi_type_id")), "other"
    )
    summary = loc_service.to_summary(detail, language)
    status = summary["status"]

    # Only look for successors when there is something to replace.
    successors = []
    if status in ("closing", "closed", "converted") and detail.get("lat"):
        closure = store.closure_for(data.location_id) or {}
        search = closure.get("successor_search", {})
        try:
            nearby = loc_service.alternatives_near(
                detail["lat"], detail["lon"],
                language=language,
                limit=MAX_SUCCESSORS,
                exclude_id=data.location_id,
            )
            successors = [loc_service.to_summary(r, language) for r in nearby]
        except post_api.PostApiError:
            successors = []

    commitment = None
    if status in ("closing", "closed"):
        commitment = _commitment("universal_service", language)
    elif status == "converted":
        commitment = _commitment("reachability", language)

    store.log_event(
        conversation_id,
        "get_branch_status",
        f"{summary['name']} → {status}"
        + (f" ({summary['closure_date']})" if summary["closure_date"] else ""),
        {
            "location": summary,
            "successors": successors,
            "days_until_closure": summary["days_until_closure"],
        },
    )

    return BranchStatusResponse(
        found=True,
        location=summary,
        status=status,
        closure_date=summary["closure_date"],
        days_until_closure=summary["days_until_closure"],
        successors=successors,
        commitment_note=commitment,
    )


def _tag_for(poi_type_id: str) -> str:
    """POI detail returns the long type id ('001PST'); map back to its tag."""
    ids = {
        "001PST": "T9", "001AG-PICK": "T1", "001MP24": "T6",
        "001HS": "T5", "004PSTMAT": "T13", "001PFST": "T8", "001PFFIL": "T7",
    }
    return ids.get(poi_type_id, "")
