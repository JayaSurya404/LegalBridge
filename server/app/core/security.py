"""Password hashing and signed access/refresh token helpers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal
from uuid import uuid4

import jwt
from jwt import InvalidTokenError
from pwdlib import PasswordHash

from app.core.config import Settings
from app.models.user import User

PASSWORD_HASH = PasswordHash.recommended()
TokenType = Literal["access", "refresh"]


class TokenDecodeError(Exception):
    """A token is invalid, expired, or not of the expected type."""


@dataclass(frozen=True)
class IssuedToken:
    token: str
    jti: str
    expires_at: datetime


def hash_password(password: str) -> str:
    return PASSWORD_HASH.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return PASSWORD_HASH.verify(password, password_hash)


def validate_password_strength(password: str) -> str:
    failures: list[str] = []
    if len(password) < 12:
        failures.append("at least 12 characters")
    if not any(character.isupper() for character in password):
        failures.append("an uppercase letter")
    if not any(character.islower() for character in password):
        failures.append("a lowercase letter")
    if not any(character.isdigit() for character in password):
        failures.append("a digit")
    if not any(not character.isalnum() for character in password):
        failures.append("a special character")
    if failures:
        requirements = ", ".join(failures)
        raise ValueError(f"Password must contain {requirements}.")
    return password


def _encode_token(
    user: User,
    settings: Settings,
    *,
    token_type: TokenType,
    lifetime: timedelta,
) -> IssuedToken:
    issued_at = datetime.now(timezone.utc)
    expires_at = issued_at + lifetime
    jti = str(uuid4())
    payload: dict[str, Any] = {
        "sub": user.id,
        "org": user.organization_id,
        "role": user.role.value,
        "tv": user.token_version,
        "type": token_type,
        "jti": jti,
        "iat": issued_at,
        "exp": expires_at,
    }
    encoded = jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return IssuedToken(token=encoded, jti=jti, expires_at=expires_at)


def create_access_token(user: User, settings: Settings) -> IssuedToken:
    return _encode_token(
        user,
        settings,
        token_type="access",
        lifetime=timedelta(minutes=settings.access_token_minutes),
    )


def create_refresh_token(user: User, settings: Settings) -> IssuedToken:
    return _encode_token(
        user,
        settings,
        token_type="refresh",
        lifetime=timedelta(days=settings.refresh_token_days),
    )


def decode_token(
    token: str,
    settings: Settings,
    *,
    expected_type: TokenType,
) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={
                "require": ["exp", "iat", "sub", "org", "role", "tv", "type", "jti"],
            },
        )
    except InvalidTokenError as exc:
        raise TokenDecodeError from exc

    if payload.get("type") != expected_type:
        raise TokenDecodeError
    if not isinstance(payload.get("sub"), str) or not isinstance(
        payload.get("jti"),
        str,
    ):
        raise TokenDecodeError
    if not isinstance(payload.get("tv"), int):
        raise TokenDecodeError
    return payload
