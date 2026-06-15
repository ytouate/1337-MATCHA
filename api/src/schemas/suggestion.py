from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class SortBy(str, Enum):
    DISTANCE = "distance"
    AGE = "age"
    FAME = "fame"
    COMMON_TAGS = "common_tags"


class SortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"


class SuggestionQuery(BaseModel):
    sort_by: SortBy = SortBy.DISTANCE
    order: Optional[SortOrder] = None
    min_age: Optional[int] = Field(None, ge=18, le=120)
    max_age: Optional[int] = Field(None, ge=18, le=120)
    max_distance_km: Optional[float] = Field(None, gt=0)
    min_fame: Optional[int] = Field(None, ge=0)
    max_fame: Optional[int] = Field(None, ge=0)
    tags: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)


class SuggestedProfile(BaseModel):
    username: str
    first_name: str
    last_name: str
    age: int
    bio: Optional[str] = None
    fame_rating: int = 0
    profile_picture: Optional[str] = None
    interests: List[str] = []
    common_interests: List[str] = []
    common_interest_count: int = 0
    distance_km: Optional[float] = None
    location_label: Optional[str] = None


class SuggestionListResponse(BaseModel):
    results: List[SuggestedProfile]
    total: int
    limit: int
    offset: int
