"""
Tool: get_opening_hours

Opening hours for one location on one date, live from the Swiss Post API.

The API resolves hours per date itself with the holiday calendar already
applied, so those values are used directly where available rather than being
re-derived from the weekly pattern.
"""

from datetime import date, datetime

from fastapi import APIRouter, HTTPException, Request

from backend import store
from backend.models import OpeningHoursRequest, OpeningHoursResponse, ToolError
from backend.routes.utils import get_conversation_id, verify_signature
from backend.services import locations as loc_service
from backend.services import post_api

router = APIRouter()


@router.post("/opening_hours", response_model=OpeningHoursResponse)
async def opening_hours(request: Request):
    raw_body = await request.body()
    if not verify_signature(raw_body, request.headers.get("ElevenLabs-Signature")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = OpeningHoursRequest.model_validate_json(raw_body)
    conversation_id = get_conversation_id(request, data.conversation_id)
    language = data.language

    try:
        detail = post_api.poi_detail(data.location_id, language=language)
    except post_api.PostApiError as exc:
        store.log_event(conversation_id, "get_opening_hours", f"{data.location_id} → upstream error")
        return OpeningHoursResponse(
            found=False,
            error=ToolError(code="upstream_unavailable", message=str(exc)),
        )

    if not detail:
        store.log_event(conversation_id, "get_opening_hours", f"unknown id {data.location_id}")
        return OpeningHoursResponse(found=False)

    try:
        day = datetime.strptime(data.date, "%Y-%m-%d").date() if data.date else date.today()
    except ValueError:
        day = date.today()

    hours = loc_service.hours_on(detail, day)
    summary = loc_service.to_summary(detail, language)

    store.log_event(
        conversation_id,
        "get_opening_hours",
        f"{summary['name']} {hours['date']} → "
        + (", ".join(f"{w['from']}–{w['to']}" for w in hours["windows"]) if hours["open"] else "closed"),
        {"location": summary},
    )

    return OpeningHoursResponse(
        found=True,
        location=summary,
        date=hours["date"],
        open=hours["open"],
        windows=hours["windows"],
        holiday=hours["holiday"],
        week=loc_service.week_hours(detail),
        upcoming_holidays=loc_service.upcoming_holidays(detail),
    )
