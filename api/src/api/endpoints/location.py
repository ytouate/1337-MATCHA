from fastapi import APIRouter, Depends

from src.core.deps import get_current_user
from src.schemas.user import GeocodeRequest, GeocodeResponse
from src.services import location_service

router = APIRouter(
    prefix="/api/location",
    tags=["Location"],
)


@router.post("/geocode", response_model=GeocodeResponse)
async def geocode_location(
    payload: GeocodeRequest,
    _current_user=Depends(get_current_user),
):
    return await location_service.geocode_location(payload)
