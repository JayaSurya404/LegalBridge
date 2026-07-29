"""Organisation-scoped legal case persistence model."""

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import CaseStatus


class LegalCase(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "cases"
    __table_args__ = (
        Index(
            "uq_cases_organization_id_case_number",
            "organization_id",
            "case_number",
            unique=True,
        ),
        Index("ix_cases_organization_id", "organization_id"),
        Index("ix_cases_assigned_attorney_id", "assigned_attorney_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    case_number: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    court_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    jurisdiction: Mapped[str | None] = mapped_column(String(200), nullable=True)
    allegation_type: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[CaseStatus] = mapped_column(
        SAEnum(
            CaseStatus,
            name="case_status",
            native_enum=False,
            create_constraint=True,
            values_callable=lambda enum: [item.value for item in enum],
        ),
        default=CaseStatus.DRAFT,
        nullable=False,
    )
    created_by_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    assigned_attorney_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
