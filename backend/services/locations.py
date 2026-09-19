"""
Turning live Swiss Post API records into the shapes the agent's tools return.

Labels, service mapping, opening-hours resolution and the closure-overlay join
live here. No phrasing: the tools return structured facts and the agent's prompt
decides how to say them.
"""

import re
import unicodedata
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from backend import store
from backend.services import post_api

# ─── Labels ───────────────────────────────────────────────────────────────────

TYPE_LABELS = {
    "branch": {"de": "Filiale", "fr": "filiale", "it": "filiale", "en": "branch"},
    "partner_branch": {"de": "Filiale mit Partner", "fr": "filiale en partenariat", "it": "filiale in partenariato", "en": "partner branch"},
    "mypost24": {"de": "My-Post-24-Automat", "fr": "automate My Post 24", "it": "automat My Post 24", "en": "My Post 24 terminal"},
    "postomat": {"de": "Postomat", "fr": "Postomat", "it": "Postomat", "en": "Postomat cash machine"},
    "home_service": {"de": "Hausservice", "fr": "service à domicile", "it": "servizio a domicilio", "en": "home service"},
    "po_box": {"de": "Postfachanlage", "fr": "case postale", "it": "casella postale", "en": "PO box installation"},
    "postfinance": {"de": "PostFinance-Standort", "fr": "site PostFinance", "it": "sede PostFinance", "en": "PostFinance location"},
    "other": {"de": "Standort", "fr": "site", "it": "sede", "en": "location"},
}

STATUS_LABELS = {
    "open": {"de": "geöffnet", "fr": "ouverte", "it": "aperta", "en": "open"},
    "closing": {"de": "Schliessung angekündigt", "fr": "fermeture annoncée", "it": "chiusura annunciata", "en": "closure announced"},
    "closed": {"de": "geschlossen", "fr": "fermée", "it": "chiusa", "en": "closed"},
    "converted": {"de": "in eine Filiale mit Partner umgewandelt", "fr": "transformée en filiale en partenariat", "it": "trasformata in filiale in partenariato", "en": "converted to a partner branch"},
}

SERVICE_LABELS = {
    "letters_parcels": {"de": "Briefe und Pakete", "fr": "lettres et colis", "it": "lettere e pacchi", "en": "letters and parcels"},
    "payments": {"de": "Zahlungsverkehr", "fr": "trafic des paiements", "it": "traffico dei pagamenti", "en": "payments"},
    "telco_philately": {"de": "Telecom und Philatelie", "fr": "télécom et philatélie", "it": "telecom e filatelia", "en": "telecom and philately"},
    "extras": {"de": "Zusatzangebot", "fr": "offre complémentaire", "it": "offerta supplementare", "en": "additional services"},
}

WEEKDAY_ELEMENTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

# What a caller can ask for, mapped onto the API's service flags and the POI
# types that can satisfy it.
SERVICE_REQUESTS = {
    "letters": ("letters_parcels", ["T9", "T1"]),
    "parcels": ("letters_parcels", ["T9", "T1", "T6"]),
    "payments": ("payments", ["T9", "T1"]),
    "cash": ("payments", ["T9", "T1", "T13"]),
    "philately": ("telco_philately", ["T9"]),
}

_ZIP_RE = re.compile(r"\b(\d{4})\b")

# Filler that appears in spoken queries and stops the geocoder matching. The
# upstream service expects a place or branch name, not a sentence.
_STOPWORDS = {
    # de
    "die", "der", "das", "post", "poststelle", "postamt", "filiale", "in", "von", "am",
    "bei", "zu", "ist", "es", "gibt", "noch", "eine", "meine", "unsere", "wo", "was",
    # fr
    "la", "le", "les", "poste", "postal", "postale", "bureau", "de", "du", "des", "a",
    "au", "en", "est", "il", "y", "une", "un", "mon", "ma", "ou", "que",
    # it
    "il", "lo", "posta", "postali", "ufficio", "sportello", "di", "del", "al", "e", "c",
    "mio", "mia", "dove", "cosa",
    # en
    "the", "office", "branch", "at", "of", "is", "there", "an", "my", "our", "where", "what",
}


def label(table: Dict[str, Dict[str, str]], key: str, language: str) -> str:
    return table.get(key, {}).get(language) or table.get(key, {}).get("en") or key


def normalize(text: str) -> str:
    """Lowercase, strip accents and punctuation, collapse whitespace.

    A speech transcript may spell 'Genève' or 'geneve'; these must compare equal.
    """
    folded = (text or "").replace("ß", "ss")
    decomposed = unicodedata.normalize("NFKD", folded)
    ascii_text = "".join(c for c in decomposed if not unicodedata.combining(c)).lower()
    ascii_text = re.sub(r"[^a-z0-9\s]", " ", ascii_text)
    return re.sub(r"\s+", " ", ascii_text).strip()


# ─── Closure overlay ──────────────────────────────────────────────────────────

def status_for(poi_id: Optional[str]) -> Dict[str, Any]:
    """Closure status for a POI.

    The live API has no closure field, so anything not named in the overlay is
    reported as open — which is what the API itself is asserting by listing it.
    """
    closure = store.closure_for(poi_id) if poi_id else None
    if not closure:
        return {"status": "open", "closure_date": None, "days_until_closure": None}

    closure_date = closure.get("closure_date")
    days = days_until(closure_date)
    status = closure.get("status", "closing")

    # An announced closure whose date has passed is simply closed, whatever the
    # overlay still says.
    if status == "closing" and days is not None and days < 0:
        status = "closed"

    return {"status": status, "closure_date": closure_date, "days_until_closure": days}


def days_until(iso_date: Optional[str]) -> Optional[int]:
    if not iso_date:
        return None
    try:
        target = datetime.strptime(iso_date, "%Y-%m-%d").date()
    except ValueError:
        return None
    return (target - date.today()).days


# ─── Summaries ────────────────────────────────────────────────────────────────

def to_summary(
    record: Dict[str, Any],
    language: str,
    distance_km: Optional[float] = None,
) -> Dict[str, Any]:
    """Shape a live API record into the tool response model."""
    poi_type = record.get("type") or "other"
    status = status_for(record.get("id"))
    distance = record.get("distance_km") if distance_km is None else distance_km

    street = record.get("street")
    zip_code = record.get("zip")
    city = record.get("city")
    address = ", ".join(part for part in [street, " ".join(filter(None, [zip_code, city]))] if part)

    return {
        "id": record.get("id"),
        "name": record.get("name"),
        "type": poi_type,
        "type_label": label(TYPE_LABELS, poi_type, language),
        "street": street,
        "zip": zip_code,
        "city": city,
        "canton": record.get("canton"),
        "address": address or None,
        "lat": record.get("lat"),
        "lon": record.get("lon"),
        "note": record.get("note"),
        "services": record.get("services", []),
        "service_labels": [label(SERVICE_LABELS, s, language) for s in record.get("services", [])],
        "open_now": record.get("open_now"),
        "open_until": record.get("open_until"),
        "opens_again": record.get("opens_again"),
        "distance_km": round(distance, 2) if distance is not None else None,
        "walking_minutes": walking_minutes(distance),
        "status": status["status"],
        "status_label": label(STATUS_LABELS, status["status"], language),
        "closure_date": status["closure_date"],
        "days_until_closure": status["days_until_closure"],
    }


# Swiss urban walking pace, used only to convert a distance into something a
# caller can act on.
WALKING_KMH = 4.8
WALKABLE_KM = 2.0


def walking_minutes(distance_km: Optional[float]) -> Optional[int]:
    if distance_km is None or distance_km > WALKABLE_KM:
        return None
    return max(1, round(distance_km / WALKING_KMH * 60))


# ─── Opening hours ────────────────────────────────────────────────────────────

def hours_on(detail: Dict[str, Any], day: date) -> Dict[str, Any]:
    """Opening hours for one date.

    The API resolves hours per date itself in `CalculatedOpeningHours`, holidays
    already applied, so that is preferred over re-deriving them from the weekly
    pattern.
    """
    iso = day.isoformat()
    holiday = next((h for h in detail.get("holidays", []) if h["date"] == iso), None)

    calculated = detail.get("calculated", {}).get(iso)
    if calculated is not None:
        windows = calculated
    elif holiday:
        windows = [] if holiday["closed"] else [{"from": holiday["from"], "to": holiday["to"]}]
    else:
        windows = detail.get("week", {}).get(WEEKDAY_ELEMENTS[day.weekday()], [])

    return {
        "date": iso,
        "open": bool(windows),
        "windows": windows,
        "holiday": holiday["name"] if holiday else None,
        "source": "api_calculated" if calculated is not None else "weekly_pattern",
    }


def week_hours(detail: Dict[str, Any]) -> Dict[str, List[Dict[str, str]]]:
    week = detail.get("week", {})
    return {key: week.get(element, []) for key, element in zip(WEEKDAY_KEYS, WEEKDAY_ELEMENTS)}


def upcoming_holidays(detail: Dict[str, Any], limit: int = 5) -> List[Dict[str, Any]]:
    today = date.today().isoformat()
    ahead = [h for h in detail.get("holidays", []) if h["date"] >= today]
    return sorted(ahead, key=lambda h: h["date"])[:limit]


# ─── Search ───────────────────────────────────────────────────────────────────

def resolve(
    query: str,
    language: str = "de",
    limit: int = 5,
    types: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Resolve a spoken query into locations.

    Returns matching POIs and, when the caller named a municipality rather than
    a branch, the access points around that place — which is what they actually
    wanted.
    """
    geo = {"pois": [], "places": []}
    for candidate in _candidate_queries(query):
        geo = post_api.geocode(candidate, language=language, limit=max(limit, 8), types=types)
        if geo["pois"] or geo["places"]:
            break

    pois = geo["pois"]
    places = geo["places"]

    if pois:
        matched_via = "poi"
        records = pois[:limit]
    elif places:
        # "Burgdorf" resolves to a city, not a branch. Look around its centre.
        matched_via = "place"
        place = places[0]
        records = post_api.find_near(
            place["lat"], place["lon"],
            radius_km=2.5, language=language, types=types, limit=limit,
        )
    else:
        return {"found": False, "matched_via": None, "locations": [], "places": [],
                "postcode_hint": bool(_ZIP_RE.search(query or ""))}

    enriched = _enrich_all(records, language)
    enriched.sort(key=_rank)

    return {
        "found": bool(enriched),
        "matched_via": matched_via,
        "locations": enriched[:limit],
        "places": places[:3],
    }


# Staffed branches answer "is my post office closing" better than a parcel
# terminal does, and an affected location outranks an untouched one.
_TYPE_RANK = {"branch": 0, "partner_branch": 1, "mypost24": 2, "postomat": 3, "home_service": 4}
_STATUS_RANK = {"closing": 0, "closed": 0, "converted": 1, "open": 2}


def _rank(record: Dict[str, Any]):
    status = status_for(record.get("id"))["status"]
    return (
        _TYPE_RANK.get(record.get("type"), 9),
        _STATUS_RANK.get(status, 9),
        record.get("distance_km") if record.get("distance_km") is not None else 0,
    )


def _enrich_all(records: List[Dict[str, Any]], language: str) -> List[Dict[str, Any]]:
    """Fill sparse /Geocode hits out with services and live open-now state.

    /Geocode returns only a name and a point. One /Find around the first result
    returns the full info payload for everything nearby, which covers the whole
    result set in a single extra call; anything it misses falls back to /Poi.
    """
    if not records or records[0].get("street"):
        return records

    anchor = next((r for r in records if r.get("lat") and r.get("lon")), None)
    by_id: Dict[str, Dict[str, Any]] = {}
    if anchor:
        try:
            nearby = post_api.find_near(
                anchor["lat"], anchor["lon"],
                radius_km=4.0, language=language,
                types=list(post_api.TYPE_TAGS.keys()), limit=60,
            )
            by_id = {r["id"]: r for r in nearby if r.get("id")}
        except post_api.PostApiError:
            by_id = {}

    merged = []
    for record in records:
        full = by_id.get(record.get("id"))
        if full:
            combined = dict(full)
            combined["name"] = record.get("name") or combined.get("name")
            combined.pop("distance_km", None)
            merged.append(combined)
        else:
            merged.append(enrich(record, language))
    return merged


def _candidate_queries(query: str) -> List[str]:
    """Progressively simpler forms of a spoken query, best first.

    The upstream geocoder matches place and branch names, not sentences, so
    'die Post in Burgdorf' has to become 'Burgdorf' before it will resolve. A
    postcode, when present, is tried first — it is the least ambiguous thing a
    caller can say and survives a bad transcript.
    """
    candidates: List[str] = []

    postcode = _ZIP_RE.search(query or "")
    if postcode:
        candidates.append(postcode.group(1))

    raw = (query or "").strip()
    if raw:
        candidates.append(raw)

    words = [w for w in normalize(raw).split() if w not in _STOPWORDS and len(w) > 1]
    if words:
        joined = " ".join(words)
        if joined not in candidates:
            candidates.append(joined)
        # Last resort: the longest single word, which is usually the place name.
        longest = max(words, key=len)
        if longest not in candidates:
            candidates.append(longest)

    return candidates


def enrich(record: Dict[str, Any], language: str) -> Dict[str, Any]:
    """Fill a sparse /Geocode hit out with its full detail record.

    Records from /Find already carry address and services and are returned
    unchanged.
    """
    if record.get("street"):
        return record

    poi_id = record.get("id")
    if not poi_id:
        return record

    try:
        detail = post_api.poi_detail(poi_id, language=language)
    except post_api.PostApiError:
        return record
    if not detail:
        return record

    merged = dict(record)
    for field in ("street", "zip", "city", "canton", "phone"):
        if detail.get(field):
            merged[field] = detail[field]
    merged.setdefault("lat", detail.get("lat"))
    merged.setdefault("lon", detail.get("lon"))
    return merged


def alternatives_near(
    lat: float,
    lon: float,
    language: str = "de",
    service: Optional[str] = None,
    limit: int = 3,
    exclude_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Usable access points near a point, nearest first.

    Locations whose own closure has already taken effect are dropped: sending a
    caller from one closed branch to another is the one answer worse than none.
    """
    required_flag, types = SERVICE_REQUESTS.get(service or "", (None, None))
    if types is None:
        types = post_api.DEFAULT_TYPES

    # Widen the search until something turns up; rural callers have nothing
    # within walking distance and still need an answer.
    found: List[Dict[str, Any]] = []
    for radius in (2.0, 5.0, 12.0):
        found = post_api.find_near(
            lat, lon, radius_km=radius, language=language, types=types, limit=40
        )
        found = [r for r in found if _usable(r, required_flag, exclude_id)]
        if len(found) >= limit:
            break

    return found[:limit]


def _usable(record: Dict[str, Any], required_flag: Optional[str], exclude_id: Optional[str]) -> bool:
    if exclude_id and record.get("id") == exclude_id:
        return False
    if required_flag and required_flag not in record.get("services", []):
        return False
    if status_for(record.get("id"))["status"] == "closed":
        return False
    return True
