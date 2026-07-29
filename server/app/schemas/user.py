"""User provisioning and response schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import validate_password_strength
from app.models.enums import UserRole
from app.schemas.base import ORMResponse


class UserResponse(ORMResponse):
    id: str
    organization_id: str
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=200)
    role: UserRole
    temporary_password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        return value.strip()

    @field_validator("temporary_password")
    @classmethod
    def validate_temporary_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserStatusUpdate(BaseModel):
    is_active: bool
