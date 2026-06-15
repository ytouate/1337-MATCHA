from fastapi import APIRouter

from src.schemas.user import GeocodeRequest, GeocodeResponse
from src.services import location_service

router = APIRouter(
    prefix="/api/location",
    tags=["Location"],
)


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_location(payload: GeocodeRequest):
    return await location_service.geocode_location(payload)
