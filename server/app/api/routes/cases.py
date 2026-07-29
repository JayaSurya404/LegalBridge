"""Organisation-isolated case CRUD and archive routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal, require_roles
from app.core.errors import ApplicationError
from app.db.session import get_session
from app.models.case import LegalCase
from app.models.enums import CaseStatus, UserRole
from app.models.user import User
from app.schemas.case import CaseCreate, CaseResponse, CaseUpdate
from app.services.audit import add_audit_event

router = APIRouter(prefix="/cases", tags=["cases"])
case_editor = require_roles(UserRole.ADMIN, UserRole.ATTORNEY)


async def get_organization_case(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
) -> LegalCase:
    statement = select(LegalCase).where(
        LegalCase.id == case_id,
        LegalCase.organization_id == organization_id,
    )
    legal_case = (await session.scalars(statement)).one_or_none()
    if legal_case is None:
        raise ApplicationError(
            status_code=404,
            code="case_not_found",
            message="Case not found.",
        )
    return legal_case


async def validate_assigned_attorney(
    session: AsyncSession,
    *,
    organization_id: str,
    assigned_attorney_id: str | None,
) -> None:
    if assigned_attorney_id is None:
        return
    statement = select(User.id).where(
        User.id == assigned_attorney_id,
        User.organization_id == organization_id,
        User.role == UserRole.ATTORNEY,
        User.is_active.is_(True),
    )
    if (await session.scalar(statement)) is None:
        raise ApplicationError(
            status_code=422,
            code="invalid_assigned_attorney",
            message="Assigned attorney must be active and belong to this organisation.",
        )


@router.get("", response_model=list[CaseResponse])
async def list_cases(
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[LegalCase]:
    statement = (
        select(LegalCase)
        .where(LegalCase.organization_id == principal.organization.id)
        .order_by(LegalCase.updated_at.desc())
    )
    return list((await session.scalars(statement)).all())


@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CaseCreate,
    principal: Annotated[Principal, Depends(case_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LegalCase:
    await validate_assigned_attorney(
        session,
        organization_id=principal.organization.id,
        assigned_attorney_id=payload.assigned_attorney_id,
    )
    legal_case = LegalCase(
        organization_id=principal.organization.id,
        case_number=payload.case_number,
        title=payload.title,
        description=payload.description,
        court_name=payload.court_name,
        jurisdiction=payload.jurisdiction,
        allegation_type=payload.allegation_type,
        status=payload.status,
        created_by_id=principal.user.id,
        assigned_attorney_id=payload.assigned_attorney_id,
    )
    session.add(legal_case)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationError(
            status_code=409,
            code="duplicate_case_number",
            message="This case number already exists in the organisation.",
        ) from exc

    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="case_creation",
        message="Case created.",
        entity_type="case",
        entity_id=legal_case.id,
        case_id=legal_case.id,
    )
    await session.commit()
    await session.refresh(legal_case)
    return legal_case


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LegalCase:
    return await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    payload: CaseUpdate,
    principal: Annotated[Principal, Depends(case_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LegalCase:
    legal_case = await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("title", legal_case.title) is None:
        raise ApplicationError(
            status_code=422,
            code="invalid_case_update",
            message="Case title cannot be null.",
        )
    if "status" in updates and updates["status"] is None:
        raise ApplicationError(
            status_code=422,
            code="invalid_case_update",
            message="Case status cannot be null.",
        )
    if "assigned_attorney_id" in updates:
        await validate_assigned_attorney(
            session,
            organization_id=principal.organization.id,
            assigned_attorney_id=updates["assigned_attorney_id"],
        )
    for field, value in updates.items():
        setattr(legal_case, field, value)

    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="case_update",
        message="Case updated.",
        entity_type="case",
        entity_id=legal_case.id,
        case_id=legal_case.id,
        metadata={"fields": sorted(updates)},
    )
    await session.commit()
    await session.refresh(legal_case)
    return legal_case


@router.post("/{case_id}/archive", response_model=CaseResponse)
async def archive_case(
    case_id: str,
    principal: Annotated[Principal, Depends(case_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> LegalCase:
    legal_case = await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    if legal_case.status == CaseStatus.ARCHIVED:
        return legal_case
    legal_case.status = CaseStatus.ARCHIVED
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="case_archive",
        message="Case archived.",
        entity_type="case",
        entity_id=legal_case.id,
        case_id=legal_case.id,
    )
    await session.commit()
    await session.refresh(legal_case)
    return legal_case
