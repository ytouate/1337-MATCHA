from fastapi import APIRouter

from src.services import user_service

router = APIRouter(
    prefix="/api/interests",
    tags=["Interests"],
)


@router.get("")
async def list_interests():
    return {"interests": user_service.list_interests()}
