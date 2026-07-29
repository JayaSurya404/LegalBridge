"""Organisation-scoped administrator user management."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, require_roles
from app.core.errors import ApplicationError
from app.core.security import hash_password
from app.db.session import get_session
from app.models.auth_session import AuthSession
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserStatusUpdate
from app.services.audit import add_audit_event

router = APIRouter(prefix="/users", tags=["users"])
admin_only = require_roles(UserRole.ADMIN)


@router.get("", response_model=list[UserResponse])
async def list_users(
    principal: Annotated[Principal, Depends(admin_only)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[User]:
    statement = (
        select(User)
        .where(User.organization_id == principal.organization.id)
        .order_by(User.full_name, User.email)
    )
    return list((await session.scalars(statement)).all())


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    principal: Annotated[Principal, Depends(admin_only)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    user = User(
        organization_id=principal.organization.id,
        email=str(payload.email),
        full_name=payload.full_name,
        password_hash=hash_password(payload.temporary_password),
        role=payload.role,
    )
    session.add(user)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationError(
            status_code=409,
            code="duplicate_user_email",
            message="A user with this email already exists in the organisation.",
        ) from exc

    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="user_provisioning",
        message=f"Provisioned {user.role.value} user.",
        entity_type="user",
        entity_id=user.id,
        metadata={"role": user.role.value},
    )
    await session.commit()
    await session.refresh(user)
    return user


@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: str,
    payload: UserStatusUpdate,
    principal: Annotated[Principal, Depends(admin_only)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> User:
    statement = select(User).where(
        User.id == user_id,
        User.organization_id == principal.organization.id,
    )
    user = (await session.scalars(statement)).one_or_none()
    if user is None:
        raise ApplicationError(
            status_code=404,
            code="user_not_found",
            message="User not found.",
        )
    if user.id == principal.user.id and not payload.is_active:
        raise ApplicationError(
            status_code=400,
            code="self_deactivation_prohibited",
            message="Administrators cannot deactivate their own account.",
        )
    if user.is_active == payload.is_active:
        return user

    user.is_active = payload.is_active
    now = datetime.now(timezone.utc)
    if not payload.is_active:
        user.token_version += 1
        await session.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user.id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=now, updated_at=now)
        )
    action = "activation" if payload.is_active else "deactivation"
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type=f"user_{action}",
        message=f"User {action} completed.",
        entity_type="user",
        entity_id=user.id,
    )
    await session.commit()
    await session.refresh(user)
    return user
