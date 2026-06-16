from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.schemas.user import SocialUserSummary


class DateProposalCreate(BaseModel):
    username: str
    scheduled_at: datetime
    location_label: Optional[str] = Field(None, max_length=128)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    note: Optional[str] = Field(None, max_length=500)


class DateProposalResponse(BaseModel):
    id: int
    status: str
    scheduled_at: datetime
    location_label: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    note: Optional[str] = None
    is_mine: bool
    peer: SocialUserSummary
    created_at: datetime
    updated_at: datetime
    responded_at: Optional[datetime] = None


class DateProposalListResponse(BaseModel):
    dates: list[DateProposalResponse]
