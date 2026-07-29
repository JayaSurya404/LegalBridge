"""Audit-event creation shared by mutation routes and bootstrap."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditEvent


def add_audit_event(
    session: AsyncSession,
    *,
    organization_id: str,
    actor_user_id: str | None,
    event_type: str,
    message: str,
    entity_type: str,
    entity_id: str,
    case_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        organization_id=organization_id,
        case_id=case_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata or {},
    )
    session.add(event)
    return event
