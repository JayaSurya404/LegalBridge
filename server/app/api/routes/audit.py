"""Organisation-scoped case audit history."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal
from app.api.routes.cases import get_organization_case
from app.db.session import get_session
from app.models.audit import AuditEvent
from app.schemas.audit import AuditEventResponse

router = APIRouter(prefix="/cases/{case_id}/audit-events", tags=["audit"])


@router.get("", response_model=list[AuditEventResponse])
async def list_audit_events(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[AuditEvent]:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    statement = (
        select(AuditEvent)
        .where(
            AuditEvent.organization_id == principal.organization.id,
            AuditEvent.case_id == case_id,
        )
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
    )
    return list((await session.scalars(statement)).all())
