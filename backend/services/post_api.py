"""
Client for the live Swiss Post location service.

Base: https://places.post.ch/StandortSuche/StaoCacheServiceV2/api/v1

This is the service behind Swiss Post's own public location finder at
places.post.ch. It needs no API key. Three endpoints carry this demo:

    /Geocode?query=&pois=&lang=&limit=   text → matching POIs, cities, regions
    /Find?extent=&query=&agglevel=&lod=  POIs inside a bounding box
    /Poi?id=                             one POI in full, as XML

`/Find` returns municipality-level *aggregates* unless `query` names POI type
tags, in which case it returns individual POIs — hence the explicit tag list on
every call here.

What the API does NOT carry is closure status. It describes the network as it
stands today: a branch that has closed is simply absent, and a closure announced
for next year is indistinguishable from any other open branch. Planned closures
come from the branch network publication instead, and are joined on by POI id in
`backend.store`.
"""

import math
import os
import threading
import time
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional, Tuple

import requests

API_BASE = os.getenv(
    "SWISSPOST_API_BASE",
    "https://places.post.ch/StandortSuche/StaoCacheServiceV2/api/v1",
)

REQUEST_TIMEOUT_SECONDS = float(os.getenv("SWISSPOST_API_TIMEOUT", "8"))

# A voice agent is waiting on these calls, so responses are cached. Location
# data changes on the order of weeks; the short TTL is about bounding staleness
# within a demo session, not about correctness.
GEOCODE_TTL_SECONDS = 600
FIND_TTL_SECONDS = 600
POI_TTL_SECONDS = 3600

# POI type tags, from /Types.
TYPE_TAGS = {
    "T1": "partner_branch",    # 001AG-PICK — My Post Service (partner counter in a shop)
    "T5": "home_service",      # 001HS      — Hausservice
    "T6": "mypost24",          # 001MP24    — My Post 24 parcel terminal
    "T9": "branch",            # 001PST     — staffed Swiss Post branch
    "T13": "postomat",         # 004PSTMAT  — cash machine
    "T8": "po_box",            # 001PFST    — post box installation
    "T7": "postfinance",       # 001PFFIL   — PostFinance location
}

# What the agent should normally see: staffed branches, partner counters and
# parcel terminals. Letterboxes and PO box installations are noise on a call.
DEFAULT_TYPES = ["T9", "T1", "T6"]
TYPES_WITH_CASH = ["T9", "T1", "T13"]

# Service flags carried on each POI, from /Types.
FLAG_LETTERS_PARCELS = "001BRPA"   # Briefe und Pakete
FLAG_PAYMENTS = "001ZAVK"          # Zahlungsverkehr
FLAG_EXTRAS = "001ZUAN"            # Zusatzangebot
FLAG_TELCO_PHILATELY = "TELCO_AND_PHILATELY"

EARTH_RADIUS_KM = 6371.0


class PostApiError(RuntimeError):
    """The upstream location service failed or returned something unusable."""


# ─── Cache ────────────────────────────────────────────────────────────────────

_cache: Dict[str, Tuple[float, Any]] = {}
_cache_lock = threading.Lock()


def _cached(key: str, ttl: float, produce):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]

    value = produce()

    with _cache_lock:
        _cache[key] = (now, value)
    return value


def clear_cache() -> None:
    with _cache_lock:
        _cache.clear()


# ─── HTTP ─────────────────────────────────────────────────────────────────────

_session = requests.Session()
_session.headers.update({"Accept": "application/json, text/xml, */*"})


def _get(path: str, params: Dict[str, Any]) -> requests.Response:
    try:
        response = _session.get(
            f"{API_BASE}/{path}",
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        return response
    except requests.RequestException as exc:
        raise PostApiError(f"Swiss Post location API request failed: {exc}") from exc


def _get_json(path: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """GET and decode JSON.

    A gateway or error page can answer 200 with HTML, so a decode failure is an
    upstream failure like any other and must surface as PostApiError — the
    routes turn that into a clean `error` field rather than a 500.
    """
    response = _get(path, params)
    try:
        return response.json()
    except ValueError as exc:
        raise PostApiError(
            f"Swiss Post location API returned non-JSON from /{path}: {response.text[:120]}"
        ) from exc


# ─── /Geocode — text to locations ─────────────────────────────────────────────

def geocode(
    query: str,
    language: str = "de",
    limit: int = 8,
    types: Optional[List[str]] = None,
) -> Dict[str, List[Dict[str, Any]]]:
    """Resolve free text into POIs and place names.

    Returns `{"pois": [...], "places": [...]}`. A POI is an actual access point;
    a place is a city or postcode region, which is what you get for a query like
    "Burgdorf" where the caller named a municipality rather than a branch.
    """
    tags = ",".join(types or DEFAULT_TYPES)
    key = f"geocode:{query}:{language}:{limit}:{tags}"

    def produce():
        data = _get_json("Geocode", {
            "query": query,
            "pois": tags,
            "lang": language,
            "limit": limit,
        })
        if not data.get("ok"):
            raise PostApiError(f"Geocode returned not-ok: {data.get('info')}")

        pois, places = [], []
        for item in data.get("locations", []):
            point = item.get("pt") or [None, None]
            record = {
                "id": item.get("id"),
                "name": item.get("name"),
                "lon": point[0],
                "lat": point[1],
            }
            if item.get("type") == "poi":
                record["type"] = TYPE_TAGS.get(item.get("subtype"), "other")
                record["tag"] = item.get("subtype")
                pois.append(record)
            else:
                record["kind"] = item.get("type")  # city | region
                places.append(record)
        return {"pois": pois, "places": places}

    return _cached(key, GEOCODE_TTL_SECONDS, produce)


# ─── /Find — locations in an area ─────────────────────────────────────────────

def _bbox(lat: float, lon: float, radius_km: float) -> str:
    d_lat = radius_km / 111.2
    d_lon = radius_km / max(0.1, 111.2 * math.cos(math.radians(lat)))
    return f"{lon - d_lon:.5f},{lat - d_lat:.5f},{lon + d_lon:.5f},{lat + d_lat:.5f}"


def find_near(
    lat: float,
    lon: float,
    radius_km: float = 3.0,
    language: str = "de",
    types: Optional[List[str]] = None,
    limit: int = 30,
) -> List[Dict[str, Any]]:
    """Access points within `radius_km` of a point, nearest first.

    `query` must name POI type tags or the service answers with municipality
    aggregates instead of individual locations.
    """
    tags = ",".join(types or DEFAULT_TYPES)
    key = f"find:{lat:.4f}:{lon:.4f}:{radius_km}:{language}:{tags}:{limit}"

    def produce():
        data = _get_json("Find", {
            "extent": _bbox(lat, lon, radius_km),
            "query": tags,
            "clusterdist": 0,
            "agglevel": 5,
            "lod": 3,
            "lang": language,
            "encoding": "UTF-8",
            "maxpois": limit,
        })
        if not data.get("ok"):
            raise PostApiError(f"Find returned not-ok: {data.get('info')}")

        results = []
        for poi in data.get("pois", []):
            record = _from_find_poi(poi)
            record["distance_km"] = round(
                haversine_km(lat, lon, record["lat"], record["lon"]), 2
            )
            results.append(record)

        results.sort(key=lambda r: r["distance_km"])
        return results

    return _cached(key, FIND_TTL_SECONDS, produce)


def _from_find_poi(poi: Dict[str, Any]) -> Dict[str, Any]:
    info = poi.get("info", {}) or {}
    counters = info.get("counters") or []
    first_counter = counters[0] if counters else {}

    return {
        "id": poi.get("id"),
        "name": poi.get("name"),
        "tag": poi.get("type"),
        "type": TYPE_TAGS.get(poi.get("type"), "other"),
        "lat": poi.get("y"),
        "lon": poi.get("x"),
        "street": info.get("Street"),
        "zip": info.get("Zip"),
        "city": info.get("City"),
        "note": info.get("AdditionalDescription"),
        "services": _service_keys(info),
        # `openUntil` is present only while the counter is open right now, so it
        # doubles as the live open/closed signal.
        "open_now": bool(first_counter.get("openUntil")),
        "open_until": _short_time(first_counter.get("openUntil")),
        "opens_again": first_counter.get("openAgain"),
    }


def _service_keys(info: Dict[str, Any]) -> List[str]:
    services = []
    if info.get(FLAG_LETTERS_PARCELS):
        services.append("letters_parcels")
    if info.get(FLAG_PAYMENTS):
        services.append("payments")
    if info.get(FLAG_TELCO_PHILATELY):
        services.append("telco_philately")
    if info.get(FLAG_EXTRAS):
        services.append("extras")
    return services


def _short_time(value: Optional[str]) -> Optional[str]:
    """'18:00:00' → '18:00'."""
    if not value:
        return None
    return value[:5]


# ─── /Poi — one location in full ──────────────────────────────────────────────

_WEEKDAY_ELEMENTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def poi_detail(poi_id: str, language: str = "de") -> Optional[Dict[str, Any]]:
    """Full record for one POI: address, coordinates, weekly hours, holidays,
    and the service's own resolved opening hours per date."""
    key = f"poi:{poi_id}:{language}"

    def produce():
        try:
            response = _get("Poi", {"id": poi_id, "lang": language})
        except PostApiError:
            raise
        text = response.text.strip()
        if not text.startswith("<"):
            return None
        try:
            root = ET.fromstring(text)
        except ET.ParseError as exc:
            raise PostApiError(f"Could not parse POI XML for {poi_id}: {exc}") from exc
        return _parse_poi(root, language)

    return _cached(key, POI_TTL_SECONDS, produce)


def _localised(parent: Optional[ET.Element], tag: str, language: str) -> Optional[str]:
    """Pick the <tag lang="xx"> child matching the language, else English, else
    the first one present."""
    if parent is None:
        return None
    candidates = parent.findall(tag)
    if not candidates:
        return None
    for element in candidates:
        if element.get("lang") == language:
            return (element.text or "").strip()
    for element in candidates:
        if element.get("lang") == "en":
            return (element.text or "").strip()
    return (candidates[0].text or "").strip()


def _text(parent: Optional[ET.Element], path: str) -> Optional[str]:
    if parent is None:
        return None
    element = parent.find(path)
    return (element.text or "").strip() if element is not None and element.text else None


def _parse_poi(root: ET.Element, language: str) -> Dict[str, Any]:
    address = root.find("Address")
    geo = root.find("GeoLocation")
    contact = root.find("Contact")

    latitude = _text(geo, "CoordinateLat")
    longitude = _text(geo, "CoordinateLng")

    record: Dict[str, Any] = {
        "id": root.get("Id"),
        "poi_type_id": root.get("POITypeId"),
        "name": _localised(root, "Description", language),
        "street": _text(address, "Street"),
        "zip": _text(address, "Zip"),
        "city": _text(address, "City"),
        "canton": _text(address, "KantonCode"),
        "municipality_id": _text(address, "GemeindeID"),
        "lat": float(latitude) if latitude else None,
        "lon": float(longitude) if longitude else None,
        "phone": _text(contact, "Phone"),
        "email": _text(contact, "EMail"),
        "week": {day: [] for day in _WEEKDAY_ELEMENTS},
        "holidays": [],
        "calculated": {},
        "info_texts": [],
    }

    # Counters carry the hours. The public counter (C1 Normalschalter, or the
    # access counter C7 for terminals) is the one a caller cares about; merging
    # every counter would blend business-customer desks into the answer.
    for counter in root.findall("Counter"):
        _merge_counter(counter, record, language)

    for info_text in root.findall(".//InfoText"):
        text = _localised(info_text, "Text", language)
        if text:
            record["info_texts"].append(text)

    return record


def _merge_counter(counter: ET.Element, record: Dict[str, Any], language: str) -> None:
    for period in counter.findall("OpeningPeriods"):
        for hours in period.findall("OpeningHours"):
            slice_element = hours.find("Timeslice") or hours.find("TimeSlice")
            window = {
                "from": _short_time(_text(slice_element, "TimeFrom")),
                "to": _short_time(_text(slice_element, "TimeUntil")),
            }
            if not window["from"]:
                continue
            for day in _WEEKDAY_ELEMENTS:
                if (_text(hours, day) or "").lower() == "true":
                    if window not in record["week"][day]:
                        record["week"][day].append(window)

    for holiday in counter.findall("Holiday"):
        date = _text(holiday, "Date")
        if not date:
            continue
        slice_element = holiday.find("TimeSlice") or holiday.find("Timeslice")
        record["holidays"].append({
            "date": date,
            "name": _localised(holiday, "Name", language),
            # A holiday with no time slice is a full closure; with one, it is a
            # shortened day.
            "closed": slice_element is None,
            "from": _short_time(_text(slice_element, "TimeFrom")),
            "to": _short_time(_text(slice_element, "TimeUntil")),
        })

    # The service resolves hours per date itself, holidays already applied.
    for calculated in counter.findall("CalculatedOpeningHours"):
        date = _text(calculated, "Date")
        if not date:
            continue
        windows = []
        for slice_element in calculated.findall("TimeSlice") + calculated.findall("Timeslice"):
            start = _short_time(_text(slice_element, "TimeFrom"))
            if start:
                windows.append({"from": start, "to": _short_time(_text(slice_element, "TimeUntil"))})
        record["calculated"].setdefault(date, []).extend(windows)


# ─── Geometry ─────────────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_lat = p2 - p1
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def health() -> Dict[str, Any]:
    """Cheap upstream check, used by /health."""
    try:
        data = _get_json("Types", {"lang": "de"})
        return {"reachable": bool(data.get("ok")), "types": len(data.get("types", []))}
    except PostApiError as exc:
        return {"reachable": False, "error": str(exc)}
