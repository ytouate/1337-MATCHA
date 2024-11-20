from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class User(BaseModel):
    first_name: str
    last_name: str
    username: str
    email: str
    gender: str
    bio: str
    password: str
    sexual_preference: str
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
