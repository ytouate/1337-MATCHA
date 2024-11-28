from pydantic import BaseModel, Field, EmailStr
from datetime import date, datetime
from typing import Optional, List
from enum import Enum


class Gender(Enum):
    MALE = "Male"
    FEMALE = "Female"


class SexualPreference(Enum):
    MALE = "Male"
    FEMALE = "Female"


class SignupData(BaseModel):
    first_name: str = Field(
        pattern="^[a-zA-Z]+(?: [a-zA-Z]+)*$", min_length=3, max_length=28
    )
    last_name: str = Field(
        pattern="^[a-zA-Z]+(?: [a-zA-Z]+)*$", min_length=3, max_length=28
    )
    username: str = Field(pattern="^[a-z][a-z0-9._]*$", min_length=3, max_length=28)
    email: EmailStr
    password: str = Field(min_length=8)
    gender: Gender
    birthdate: date = Field()


class User(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    gender: Gender
    bio: str
    password: str
    sexual_preference: SexualPreference
    latitude: float
    aptitude: float
    birthdate: date
    is_verified: bool
    created_at: datetime
    updated_at: datetime


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
