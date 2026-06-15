from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator

from src.core.password_policy import validate_password
from src.schemas.user import Gender


class SignupData(BaseModel):
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    gender: Gender
    birthdate: date

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        validate_password(value)
        return value


class SignInData(BaseModel):
    login: str | EmailStr
    password: str = Field(min_length=8)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        validate_password(value)
        return value
