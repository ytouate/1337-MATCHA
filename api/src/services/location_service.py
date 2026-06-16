import httpx
from fastapi import HTTPException

from src.schemas.user import GeocodeRequest, GeocodeResponse

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

_LABEL_KEYS = (
    "city",
    "town",
    "village",
    "suburb",
    "neighbourhood",
    "county",
    "state",
)


def _build_location_label(result: dict, fallback: str) -> str:
    address = result.get("address") or {}
    for key in _LABEL_KEYS:
        value = address.get(key)
        if value:
            return str(value)[:128]

    display_name = result.get("display_name", fallback)
    parts = [part.strip() for part in display_name.split(",") if part.strip()]
    if len(parts) >= 2:
        return parts[-2][:128]

    return fallback[:128]


async def geocode_location(payload: GeocodeRequest) -> GeocodeResponse:
    params = {
        "q": payload.query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1,
    }
    headers = {"User-Agent": "Matcha/1.0 (dating-app)"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                NOMINATIM_URL,
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            results = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail="Geocoding service unavailable",
        ) from exc

    if not results:
        raise HTTPException(
            status_code=404,
            detail="Location not found. Try a city or neighborhood name.",
        )

    result = results[0]
    label = _build_location_label(result, payload.query)

    return GeocodeResponse(
        latitude=float(result["lat"]),
        longitude=float(result["lon"]),
        label=label,
    )
