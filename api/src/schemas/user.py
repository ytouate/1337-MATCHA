from datetime import date, datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"


class UserImage(BaseModel):
    url: str
    is_profile_picture: bool = False


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    bio: Optional[str] = Field(None, min_length=10, max_length=255)
    gender: Optional[Gender] = None
    sexual_preference: Optional[Gender] = None
    interests: Optional[List[str]] = Field(None, max_length=5)
    images: Optional[List[str]] = Field(None, max_length=5)
    profile_picture: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = Field(None, max_length=128)


class UserPut(UserUpdate):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    gender: Gender
    sexual_preference: Gender
    bio: str = Field(..., min_length=10, max_length=255)
    latitude: float
    longitude: float
    interests: Optional[List[str]] = Field(None, max_length=5)
    images: Optional[List[str]] = Field(None, max_length=5)
    location_label: Optional[str] = Field(None, max_length=128)


class UserProfileResponse(BaseModel):
    id: int
    email: Optional[str] = None
    username: str
    first_name: str
    last_name: str
    gender: Optional[str] = None
    bio: Optional[str] = None
    sexual_preference: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_label: Optional[str] = None
    is_verified: bool
    is_profile_completed: bool
    fame_rating: int = 0
    images: List[UserImage] = []
    interests: List[str] = []
    profile_picture: Optional[str] = None
    age: Optional[int] = None
    is_liked_by_viewer: bool = False
    has_liked_viewer: bool = False
    is_connected: bool = False
    is_blocked: bool = False
    is_online: bool = False
    last_seen_at: Optional[datetime] = None


class GeocodeRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=128)


class GeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    label: str


class SocialUserSummary(BaseModel):
    username: str
    first_name: str
    last_name: str
    profile_picture: Optional[str] = None
    fame_rating: int = 0
    viewed_at: Optional[datetime] = None
    liked_at: Optional[datetime] = None
    is_online: bool = False
    last_seen_at: Optional[datetime] = None


class ReportRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=512)


class ChatMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    id: int
    body: str
    created_at: datetime
    read_at: Optional[datetime] = None
    is_mine: bool
    sender_username: str


class NotificationActor(BaseModel):
    username: str
    first_name: str
    last_name: str
    profile_picture: Optional[str] = None


class NotificationResponse(BaseModel):
    id: int
    type: str
    payload: dict = {}
    read_at: Optional[datetime] = None
    created_at: datetime
    actor: NotificationActor


class Type(BaseModel):
    type: str
    enum: Optional[List[str]] = None


class Column(BaseModel):
    name: str
    type: Type
    is_null: bool = False
    is_blank: bool = False
    is_primary: bool = False
    default: Optional[str] = None


class User(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    gender: Gender
    bio: str
    password: str
    sexual_preference: Gender
    latitude: float
    longitude: float
    birthdate: date
    is_verified: bool
    is_profile_completed: bool = False
    created_at: datetime
    updated_at: datetime
