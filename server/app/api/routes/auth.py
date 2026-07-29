"""Login, refresh rotation, logout, identity, and password-change routes."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal
from app.core.errors import ApplicationError
from app.core.security import (
    TokenDecodeError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_session
from app.models.auth_session import AuthSession
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services.audit import add_audit_event

router = APIRouter(prefix="/auth", tags=["authentication"])


def _invalid_login() -> ApplicationError:
    return ApplicationError(
        status_code=401,
        code="invalid_credentials",
        message="Invalid organisation, email, or password.",
    )


def _invalid_refresh() -> ApplicationError:
    return ApplicationError(
        status_code=401,
        code="invalid_refresh_token",
        message="The refresh token is invalid or no longer active.",
    )


def _issue_token_response(user: User, request: Request) -> tuple[TokenResponse, AuthSession]:
    settings = request.app.state.settings
    access = create_access_token(user, settings)
    refresh = create_refresh_token(user, settings)
    response = TokenResponse(
        access_token=access.token,
        refresh_token=refresh.token,
        expires_in=settings.access_token_minutes * 60,
        user=UserResponse.model_validate(user),
    )
    auth_session = AuthSession(
        id=refresh.jti,
        user_id=user.id,
        expires_at=refresh.expires_at,
    )
    return response, auth_session


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    statement = (
        select(User, Organization)
        .join(Organization, Organization.id == User.organization_id)
        .where(
            Organization.slug == payload.organization_slug,
            User.email == str(payload.email),
        )
    )
    row = (await session.execute(statement)).first()
    if row is None:
        raise _invalid_login()
    user, organization = row
    if (
        not organization.is_active
        or not user.is_active
        or not verify_password(payload.password, user.password_hash)
    ):
        raise _invalid_login()

    response, auth_session = _issue_token_response(user, request)
    session.add(auth_session)
    add_audit_event(
        session,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        event_type="successful_sign_in",
        message="User signed in successfully.",
        entity_type="user",
        entity_id=user.id,
    )
    await session.commit()
    return response


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> TokenResponse:
    settings = request.app.state.settings
    try:
        claims = decode_token(
            payload.refresh_token,
            settings,
            expected_type="refresh",
        )
    except TokenDecodeError as exc:
        raise _invalid_refresh() from exc

    statement = (
        select(AuthSession, User, Organization)
        .join(User, User.id == AuthSession.user_id)
        .join(Organization, Organization.id == User.organization_id)
        .where(AuthSession.id == claims["jti"])
    )
    row = (await session.execute(statement)).first()
    now = datetime.now(timezone.utc)
    if row is None:
        raise _invalid_refresh()
    current_session, user, organization = row
    if (
        current_session.revoked_at is not None
        or current_session.expires_at <= now
        or not user.is_active
        or not organization.is_active
        or user.id != claims["sub"]
        or user.organization_id != claims.get("org")
        or user.token_version != claims.get("tv")
    ):
        raise _invalid_refresh()

    response, replacement = _issue_token_response(user, request)
    session.add(replacement)
    await session.flush()
    current_session.revoked_at = now
    current_session.replaced_by_id = replacement.id
    await session.commit()
    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: LogoutRequest,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    try:
        claims = decode_token(
            payload.refresh_token,
            request.app.state.settings,
            expected_type="refresh",
        )
    except TokenDecodeError:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    auth_session = await session.get(AuthSession, claims["jti"])
    if auth_session is not None and auth_session.revoked_at is None:
        auth_session.revoked_at = datetime.now(timezone.utc)
        await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
async def me(
    principal: Annotated[Principal, Depends(get_current_principal)],
) -> User:
    return principal.user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    user = principal.user
    if not verify_password(payload.current_password, user.password_hash):
        raise ApplicationError(
            status_code=400,
            code="invalid_current_password",
            message="The current password is incorrect.",
        )
    if verify_password(payload.new_password, user.password_hash):
        raise ApplicationError(
            status_code=400,
            code="password_unchanged",
            message="The new password must differ from the current password.",
        )

    now = datetime.now(timezone.utc)
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1
    await session.execute(
        update(AuthSession)
        .where(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=now, updated_at=now)
    )
    add_audit_event(
        session,
        organization_id=user.organization_id,
        actor_user_id=user.id,
        event_type="password_change",
        message="User changed their password.",
        entity_type="user",
        entity_id=user.id,
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
