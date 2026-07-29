"""Append-oriented audit event persistence model."""

from __future__ import annotations

from typing import Any

from sqlalchemy import JSON, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AuditEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_organization_id", "organization_id"),
        Index("ix_audit_events_case_id_created_at", "case_id", "created_at"),
        Index("ix_audit_events_actor_user_id", "actor_user_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    case_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=True,
    )
    actor_user_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
