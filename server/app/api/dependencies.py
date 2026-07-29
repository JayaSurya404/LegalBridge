"""Authentication, role, and organisation dependencies."""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApplicationError
from app.core.security import TokenDecodeError, decode_token
from app.db.session import get_session
from app.models.enums import UserRole
from app.models.organization import Organization
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    user: User
    organization: Organization


async def get_current_principal(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Principal:
    unauthorized = ApplicationError(
        status_code=401,
        code="invalid_access_token",
        message="Authentication is required.",
    )
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized

    try:
        payload = decode_token(
            credentials.credentials,
            request.app.state.settings,
            expected_type="access",
        )
    except TokenDecodeError as exc:
        raise unauthorized from exc

    statement = (
        select(User, Organization)
        .join(Organization, Organization.id == User.organization_id)
        .where(User.id == payload["sub"])
    )
    row = (await session.execute(statement)).first()
    if row is None:
        raise unauthorized
    user, organization = row
    if (
        not user.is_active
        or not organization.is_active
        or user.organization_id != payload.get("org")
        or user.token_version != payload.get("tv")
        or user.role.value != payload.get("role")
    ):
        raise unauthorized
    return Principal(user=user, organization=organization)


RoleDependency = Callable[
    ...,
    Coroutine[Any, Any, Principal],
]


def require_roles(*allowed_roles: UserRole) -> RoleDependency:
    async def dependency(
        principal: Annotated[Principal, Depends(get_current_principal)],
    ) -> Principal:
        if principal.user.role not in allowed_roles:
            raise ApplicationError(
                status_code=403,
                code="insufficient_role",
                message="Your role does not permit this action.",
            )
        return principal

    return dependency
