from fastapi import APIRouter, Depends, Query

from src.core.deps import get_current_user
from src.schemas.date import (
    DateProposalCreate,
    DateProposalListResponse,
    DateProposalResponse,
)
from src.services import date_service

router = APIRouter(
    prefix="/api/dates",
    tags=["Dates"],
)


@router.post("", response_model=DateProposalResponse)
async def create_date_proposal(
    payload: DateProposalCreate,
    current_user=Depends(get_current_user),
):
    return date_service.create_proposal(
        current_user["user_id"],
        payload.username,
        payload.scheduled_at,
        payload.location_label,
        payload.latitude,
        payload.longitude,
        payload.note,
    )


@router.get("", response_model=DateProposalListResponse)
async def list_date_proposals(
    upcoming: bool = Query(False),
    current_user=Depends(get_current_user),
):
    dates = date_service.list_dates(current_user["user_id"], upcoming_only=upcoming)
    return {"dates": dates}


@router.get("/{date_id}", response_model=DateProposalResponse)
async def get_date_proposal(
    date_id: int,
    current_user=Depends(get_current_user),
):
    return date_service.get_date(current_user["user_id"], date_id)


@router.post("/{date_id}/accept", response_model=DateProposalResponse)
async def accept_date_proposal(
    date_id: int,
    current_user=Depends(get_current_user),
):
    return date_service.accept_date(current_user["user_id"], date_id)


@router.post("/{date_id}/decline", response_model=DateProposalResponse)
async def decline_date_proposal(
    date_id: int,
    current_user=Depends(get_current_user),
):
    return date_service.decline_date(current_user["user_id"], date_id)


@router.post("/{date_id}/cancel", response_model=DateProposalResponse)
async def cancel_date_proposal(
    date_id: int,
    current_user=Depends(get_current_user),
):
    return date_service.cancel_date(current_user["user_id"], date_id)
