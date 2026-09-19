"""
Request and response models for the five agent tools.

Responses are structured facts only. The agent's prompt decides the wording —
these tools do not phrase anything.
"""

import unicodedata
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

Status = Literal["open", "closing", "closed", "converted"]

# An LLM fills these in, so the accepted set has to be wider than the canonical
# one: it will say "german" or "Bargeld" sooner or later. Normalising here is
# cheaper than a hard failure mid-call, and lets the tool schemas drop their
# enums — which the platform does not reliably accept.
_LANGUAGE_ALIASES = {
    "de": "de", "deu": "de", "ger": "de", "german": "de", "deutsch": "de", "allemand": "de",
    "tedesco": "de", "swiss german": "de", "schweizerdeutsch": "de", "gsw": "de",
    "fr": "fr", "fra": "fr", "fre": "fr", "french": "fr", "francais": "fr", "franzosisch": "fr",
    "francese": "fr",
    "it": "it", "ita": "it", "italian": "it", "italiano": "it", "italienisch": "it",
    "italien": "it",
    "en": "en", "eng": "en", "english": "en", "englisch": "en", "anglais": "en", "inglese": "en",
}

_SERVICE_ALIASES = {
    "letters": "letters", "letter": "letters", "brief": "letters", "briefe": "letters",
    "lettre": "letters", "lettres": "letters", "lettera": "letters", "lettere": "letters",
    "parcels": "parcels", "parcel": "parcels", "paket": "parcels", "pakete": "parcels",
    "colis": "parcels", "pacco": "parcels", "pacchi": "parcels",
    "payments": "payments", "payment": "payments", "einzahlung": "payments",
    "einzahlungen": "payments", "zahlungsverkehr": "payments", "versement": "payments",
    "versements": "payments", "paiement": "payments", "versamento": "payments",
    "versamenti": "payments",
    "cash": "cash", "bargeld": "cash", "bargeldbezug": "cash", "especes": "cash",
    "espece": "cash", "contanti": "cash", "money": "cash",
    "philately": "philately", "philatelie": "philately", "filatelia": "philately",
}


def _normalise(value: Optional[str], table: dict, default=None):
    if not value:
        return default
    # Accents must go: the model answers a French caller with 'espèces', and the
    # table is keyed on ASCII.
    folded = unicodedata.normalize("NFKD", str(value).strip().lower())
    key = "".join(c for c in folded if not unicodedata.combining(c))
    key = key.replace("_", " ").replace("-", " ")
    if key in table:
        return table[key]
    # 'de CH', 'en US', 'french (fr)' — try the leading token too.
    first = key.split()[0] if key.split() else ""
    return table.get(first, default)


# ─── Shared shapes ────────────────────────────────────────────────────────────

class LocationSummary(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    type: str
    type_label: str
    street: Optional[str] = None
    zip: Optional[str] = None
    city: Optional[str] = None
    canton: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    note: Optional[str] = Field(None, description="Extra descriptor from the API, e.g. the host shop")
    services: List[str] = Field(default_factory=list)
    service_labels: List[str] = Field(default_factory=list)
    open_now: Optional[bool] = None
    open_until: Optional[str] = None
    opens_again: Optional[str] = None
    distance_km: Optional[float] = None
    walking_minutes: Optional[int] = None
    status: Status = "open"
    status_label: str = "open"
    closure_date: Optional[str] = None
    days_until_closure: Optional[int] = None


class PlaceSuggestion(BaseModel):
    name: str
    kind: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None


class ToolError(BaseModel):
    """Set when the upstream Swiss Post API could not be reached. The agent
    should say it cannot look that up right now, not invent an answer."""
    code: str
    message: str


# ─── find_location ────────────────────────────────────────────────────────────

class LanguageMixin(BaseModel):
    """Accepts whatever the model sends and normalises it to de/fr/it/en."""

    language: str = "de"

    @field_validator("language", mode="before")
    @classmethod
    def _coerce_language(cls, value):
        return _normalise(value, _LANGUAGE_ALIASES, "de")


class FindLocationRequest(LanguageMixin):
    query: str = Field(..., description="Municipality, postcode or branch name as spoken by the caller")
    conversation_id: Optional[str] = None


class FindLocationResponse(BaseModel):
    found: bool
    ambiguous: bool = False
    matched_via: Optional[str] = Field(None, description="'poi' when a named location matched, 'place' when a municipality did")
    locations: List[LocationSummary] = Field(default_factory=list)
    places: List[PlaceSuggestion] = Field(default_factory=list)
    ask_for_postcode: bool = False
    error: Optional[ToolError] = None


# ─── get_branch_status ────────────────────────────────────────────────────────

class BranchStatusRequest(LanguageMixin):
    location_id: str
    conversation_id: Optional[str] = None


class BranchStatusResponse(BaseModel):
    found: bool
    location: Optional[LocationSummary] = None
    status: Optional[Status] = None
    closure_date: Optional[str] = None
    days_until_closure: Optional[int] = None
    successors: List[LocationSummary] = Field(default_factory=list)
    commitment_note: Optional[str] = None
    error: Optional[ToolError] = None


# ─── find_alternatives ────────────────────────────────────────────────────────

class FindAlternativesRequest(LanguageMixin):
    location_id: Optional[str] = Field(None, description="Id of the branch the caller is asking about")
    query: Optional[str] = Field(None, description="Municipality or postcode, when no location_id is known")
    service: Optional[str] = None
    limit: int = 3
    conversation_id: Optional[str] = None

    @field_validator("service", mode="before")
    @classmethod
    def _coerce_service(cls, value):
        return _normalise(value, _SERVICE_ALIASES, None)

    @field_validator("limit", mode="before")
    @classmethod
    def _coerce_limit(cls, value):
        # The model may send "3" as a string, or nothing at all.
        try:
            return int(value)
        except (TypeError, ValueError):
            return 3


class FindAlternativesResponse(BaseModel):
    found: bool
    origin: Optional[LocationSummary] = None
    alternatives: List[LocationSummary] = Field(default_factory=list)
    searched_service: Optional[str] = None
    error: Optional[ToolError] = None


# ─── get_opening_hours ────────────────────────────────────────────────────────

class OpeningWindow(BaseModel):
    from_: Optional[str] = Field(None, alias="from")
    to: Optional[str] = None

    model_config = {"populate_by_name": True}


class OpeningHoursRequest(LanguageMixin):
    location_id: str
    date: Optional[str] = Field(None, description="ISO date (YYYY-MM-DD); defaults to today")
    conversation_id: Optional[str] = None


class OpeningHoursResponse(BaseModel):
    found: bool
    location: Optional[LocationSummary] = None
    date: Optional[str] = None
    open: bool = False
    windows: List[Dict[str, Any]] = Field(default_factory=list)
    holiday: Optional[str] = None
    week: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    upcoming_holidays: List[Dict[str, Any]] = Field(default_factory=list)
    error: Optional[ToolError] = None


# ─── get_digital_alternative ──────────────────────────────────────────────────

class DigitalAlternativeRequest(LanguageMixin):
    intent: str = Field(..., description="send_letter | send_parcel | receive_parcel | track_shipment | pay_bill | redirect_mail | hold_mail | buy_stamps | collect_registered | cash_withdrawal | change_address")
    conversation_id: Optional[str] = None


class DigitalService(BaseModel):
    id: str
    name: str
    channel: str
    url: str
    replaces_counter_visit: bool
    description: str


class DigitalAlternativeResponse(BaseModel):
    found: bool
    intent: str
    services: List[DigitalService] = Field(default_factory=list)
