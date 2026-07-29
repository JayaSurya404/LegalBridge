"""Organisation-scoped extracted source pages."""

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class DocumentPage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_pages"
    __table_args__ = (
        Index(
            "uq_document_pages_document_id_page_number",
            "document_id",
            "page_number",
            unique=True,
        ),
        Index("ix_document_pages_organization_id", "organization_id"),
        Index("ix_document_pages_case_id", "case_id"),
        Index("ix_document_pages_document_id", "document_id"),
        CheckConstraint("page_number >= 1", name="positive_page_number"),
        CheckConstraint("character_count >= 0", name="nonnegative_character_count"),
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
    document_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    page_number: Mapped[int] = mapped_column(nullable=False)
    page_label: Mapped[str] = mapped_column(String(200), nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, nullable=False, default="")
    character_count: Mapped[int] = mapped_column(nullable=False, default=0)
    extraction_method: Mapped[str] = mapped_column(String(100), nullable=False)
