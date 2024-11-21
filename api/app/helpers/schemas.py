from pydantic import BaseModel, Field, EmailStr
from datetime import date, datetime
from typing import Optional, List
from enum import Enum


class Gender(Enum):
    MALE = "Male"
    FEMALE = "female"


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
    gender: Gender = Field(...)
    birthdate: date = Field()


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
    aptitude: float
    birthdate: date
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class Enum(BaseModel):
    name: str
    value: Optional[List[str]] = None


class Type(BaseModel):
    type: str
    enum: Enum


class Column(BaseModel):
    name: str
    type: Type
    is_null: bool = False
    is_blank: bool = False
    is_primary: bool = False
    default: Optional[str] = None
