from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from enum import Enum
from datetime import date, datetime


class Gender(str, Enum):
    MALE = "Male"
    FEMALE = "Female"


class SignupData(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    gender: Gender


class SignInData(BaseModel):
    login: str | EmailStr
    password: str = Field(min_length=8)


class UserUpdate(BaseModel):
    bio: Optional[str] = Field(None, min_length=10, max_length=500)
    gender: Optional[Gender] = None
    sexual_preference: Optional[str] = None
    interests: Optional[List[str]] = Field(None, max_items=5)
    images: Optional[List[str]] = Field(None, max_items=5)
    profile_picture: Optional[str] = None


class UserPut(UserUpdate):
    username: str
    email: EmailStr
    first_name: str
    last_name: str


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


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    new_password: str


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
