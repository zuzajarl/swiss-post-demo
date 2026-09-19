"""
Tool: get_digital_alternative

Maps what the caller wants to do onto the digital or doorstep services that
remove the need for a counter visit entirely.

This is the deflection path: for a caller whose branch has closed, "you can do
that from the app" is often a better answer than the address of a branch two
villages away.
"""

from fastapi import APIRouter, HTTPException, Request

from backend import store
from backend.models import DigitalAlternativeRequest, DigitalAlternativeResponse, DigitalService
from backend.routes.utils import get_conversation_id, pick, verify_signature
from backend.services.locations import normalize

router = APIRouter()

# Free-text phrasings the agent may pass through instead of a canonical intent.
_INTENT_ALIASES = {
    "letter": "send_letter", "brief": "send_letter", "lettre": "send_letter", "lettera": "send_letter",
    "parcel": "send_parcel", "paket": "send_parcel", "colis": "send_parcel", "pacco": "send_parcel",
    "stamp": "buy_stamps", "stamps": "buy_stamps", "briefmarke": "buy_stamps", "timbre": "buy_stamps", "francobollo": "buy_stamps",
    "track": "track_shipment", "tracking": "track_shipment", "sendungsverfolgung": "track_shipment",
    "bill": "pay_bill", "rechnung": "pay_bill", "einzahlung": "pay_bill", "facture": "pay_bill", "fattura": "pay_bill",
    "cash": "cash_withdrawal", "bargeld": "cash_withdrawal", "especes": "cash_withdrawal", "contanti": "cash_withdrawal",
    "umzug": "change_address", "nachsendung": "redirect_mail", "demenagement": "change_address",
    "pickup": "receive_parcel", "abholen": "receive_parcel", "retrait": "receive_parcel", "ritiro": "receive_parcel",
}


_CHANNEL_RANK = {"app": 0, "web": 1, "terminal": 2, "doorstep": 3, "counter": 4}


def _resolve_intent(raw: str) -> str:
    key = normalize(raw).replace(" ", "_")
    if key in _INTENT_ALIASES:
        return _INTENT_ALIASES[key]
    for word in normalize(raw).split():
        if word in _INTENT_ALIASES:
            return _INTENT_ALIASES[word]
    return key


@router.post("/digital_alternatives", response_model=DigitalAlternativeResponse)
async def digital_alternatives(request: Request):
    raw_body = await request.body()
    if not verify_signature(raw_body, request.headers.get("ElevenLabs-Signature")):
        raise HTTPException(status_code=401, detail="Invalid signature")

    data = DigitalAlternativeRequest.model_validate_json(raw_body)
    conversation_id = get_conversation_id(request, data.conversation_id)
    language = data.language
    intent = _resolve_intent(data.intent)

    matched = [s for s in store.digital_services() if intent in s["intents"]]
    # Counter-free options first, then genuinely digital channels before
    # doorstep and counter ones: a caller asking how to pay a bill should hear
    # about eBill before the postman, even though both would work.
    matched.sort(key=lambda s: (not s["replaces_counter_visit"], _CHANNEL_RANK.get(s["channel"], 9), s["name"]))

    if not matched:
        store.log_event(conversation_id, "get_digital_alternative", f"{intent} → no match")
        return DigitalAlternativeResponse(found=False, intent=intent)

    services = [
        DigitalService(
            id=s["id"],
            # Brand names have no localised form and fall back to `name`.
            name=pick(s["name_i18n"], language) if s.get("name_i18n") else s["name"],
            channel=s["channel"],
            url=s["url"],
            replaces_counter_visit=s["replaces_counter_visit"],
            description=pick(s["description"], language),
        )
        for s in matched
    ]


    store.log_event(
        conversation_id,
        "get_digital_alternative",
        f"{intent} → {', '.join(s.name for s in services[:2])}",
        {"intent": intent, "ids": [s.id for s in services]},
    )

    return DigitalAlternativeResponse(found=True, intent=intent, services=services)
