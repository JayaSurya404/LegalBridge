"""Authentication request and response schemas."""

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import validate_password_strength
from app.schemas.user import UserResponse


class LoginRequest(BaseModel):
    organization_slug: str = Field(
        default="legalbridge-demo",
        min_length=2,
        max_length=100,
    )
    email: EmailStr
    password: str = Field(min_length=1, max_length=512)

    @field_validator("organization_slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=512)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse
