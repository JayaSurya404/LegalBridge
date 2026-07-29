"""Metadata-only document persistence model."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

MAX_DOCUMENT_BYTES = 50 * 1024 * 1024


class DocumentRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_records"
    __table_args__ = (
        Index(
            "uq_document_records_case_id_sha256",
            "case_id",
            "sha256",
            unique=True,
        ),
        Index("ix_document_records_organization_id", "organization_id"),
        Index("ix_document_records_case_id", "case_id"),
        CheckConstraint(
            f"size_bytes > 0 AND size_bytes <= {MAX_DOCUMENT_BYTES}",
            name="valid_size_bytes",
        ),
        CheckConstraint("length(sha256) = 64", name="valid_sha256_length"),
        CheckConstraint("status = 'metadata_only'", name="metadata_only_status"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    case_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size_bytes: Mapped[int] = mapped_column(nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        default="metadata_only",
        nullable=False,
    )
    created_by_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
