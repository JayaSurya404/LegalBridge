"""Extended Legal Copilot persistence models."""

from datetime import datetime

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin, utc_now
from app.db.types import JSON


class DocumentPageEmbedding(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "document_page_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "case_id",
            "page_id",
            "chunk_index",
            "embedding_model",
            name="uq_page_embeddings_scope_chunk_model",
        ),
        Index("ix_page_embeddings_organization_case", "organization_id", "case_id"),
        Index("ix_page_embeddings_document", "document_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False
    )
    page_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="CASCADE"), nullable=False
    )
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_json: Mapped[list[float]] = mapped_column(JSON, nullable=False, default=list)
    embedding_model: Mapped[str] = mapped_column(String(120), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    metadata_json: Mapped[dict[str, str]] = mapped_column(JSON, nullable=False, default=dict)


class CaseMemory(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "case_memory"
    __table_args__ = (
        UniqueConstraint("organization_id", "case_id", "memory_key", name="uq_case_memory_key"),
        Index("ix_case_memory_organization_case", "organization_id", "case_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    memory_key: Mapped[str] = mapped_column(String(120), nullable=False)
    memory_value: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(80), nullable=False, default="user_note")
    created_by_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class CopilotArtifact(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "copilot_artifacts"
    __table_args__ = (
        Index("ix_copilot_artifacts_organization_case", "organization_id", "case_id"),
        Index("ix_copilot_artifacts_thread", "thread_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    thread_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("copilot_threads.id", ondelete="CASCADE"), nullable=False
    )
    message_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("copilot_messages.id", ondelete="SET NULL"), nullable=True
    )
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    artifact_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(120), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    source_manifest_json: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="ready")
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class CopilotExecutionRun(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "copilot_execution_runs"
    __table_args__ = (
        Index("ix_copilot_execution_runs_case", "case_id"),
        Index("ix_copilot_execution_runs_thread", "thread_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    thread_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("copilot_threads.id", ondelete="CASCADE"), nullable=False
    )
    message_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("copilot_messages.id", ondelete="SET NULL"), nullable=True
    )
    intent: Mapped[str] = mapped_column(String(80), nullable=False)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    model: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    retrieval_summary_json: Mapped[dict[str, object]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    tool_summary_json: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    citation_result_json: Mapped[dict[str, object]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="completed")
    error_category: Mapped[str | None] = mapped_column(String(80), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class CopilotClaimCitation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "copilot_claim_citations"
    __table_args__ = (Index("ix_copilot_claim_citations_message", "message_id"),)

    message_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("copilot_messages.id", ondelete="CASCADE"), nullable=False
    )
    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(80), nullable=False)
    case_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    document_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    document_filename: Mapped[str | None] = mapped_column(String(300), nullable=True)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    supporting_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    support_status: Mapped[str] = mapped_column(String(40), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )
