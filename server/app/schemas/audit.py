"""Audit event response schemas."""

from datetime import datetime
from typing import Any

from app.schemas.base import ORMResponse


class AuditEventResponse(ORMResponse):
    id: str
    organization_id: str
    case_id: str | None
    actor_user_id: str | None
    event_type: str
    message: str
    entity_type: str
    entity_id: str
    metadata_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime
