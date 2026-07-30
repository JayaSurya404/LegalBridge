"""Database-backed Phase 7-11 analysis, motion, review, and Copilot models."""

from __future__ import annotations

from datetime import date, datetime, time

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UTCDateTime, UUIDPrimaryKeyMixin, utc_now


class AnalysisRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "analysis_runs"
    __table_args__ = (
        Index("ix_analysis_runs_organization_case", "organization_id", "case_id"),
        Index("ix_analysis_runs_case_status", "case_id", "status"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    provider: Mapped[str] = mapped_column(String(50), nullable=False)
    started_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    failure_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False, default="")


class AgentRun(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "agent_runs"
    __table_args__ = (
        Index(
            "uq_agent_runs_analysis_agent",
            "analysis_run_id",
            "agent_key",
            unique=True,
        ),
        Index("ix_agent_runs_organization_case", "organization_id", "case_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    agent_key: Mapped[str] = mapped_column(String(80), nullable=False)
    agent_name: Mapped[str] = mapped_column(String(150), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    input_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    output_summary: Mapped[str] = mapped_column(Text, nullable=False, default="")
    started_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class CaseFact(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "case_facts"
    __table_args__ = (
        Index("ix_case_facts_organization_case", "organization_id", "case_id"),
        Index("ix_case_facts_analysis_run", "analysis_run_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    fact_type: Mapped[str] = mapped_column(String(80), nullable=False)
    fact_text: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    source_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_page_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="requires_attorney_review"
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class TimelineEventRecord(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "timeline_events"
    __table_args__ = (
        Index("ix_timeline_events_organization_case", "organization_id", "case_id"),
        Index(
            "ix_timeline_events_run_sequence", "analysis_run_id", "sequence_number"
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    event_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(80), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    source_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_page_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class ContradictionRecord(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "contradictions"
    __table_args__ = (
        Index("ix_contradictions_organization_case", "organization_id", "case_id"),
        Index("ix_contradictions_analysis_run", "analysis_run_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="detected")
    source_a_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_a_page_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True
    )
    source_a_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    source_b_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_b_page_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True
    )
    source_b_excerpt: Mapped[str] = mapped_column(Text, nullable=False)
    reviewer_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class ProceduralFinding(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "procedural_findings"
    __table_args__ = (
        Index(
            "ix_procedural_findings_organization_case", "organization_id", "case_id"
        ),
        Index("ix_procedural_findings_analysis_run", "analysis_run_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    review_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending"
    )
    defence_opportunity: Mapped[str] = mapped_column(Text, nullable=False)
    source_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_page_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True
    )
    authority_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("legal_authorities.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class LegalAuthority(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "legal_authorities"
    __table_args__ = (
        Index(
            "uq_legal_authorities_organization_citation",
            "organization_id",
            "citation",
            unique=True,
        ),
        Index("ix_legal_authorities_source_status", "source_status"),
    )

    organization_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True
    )
    authority_type: Mapped[str] = mapped_column(String(80), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    citation: Mapped[str] = mapped_column(String(200), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(200), nullable=False)
    court: Mapped[str] = mapped_column(String(250), nullable=False)
    decision_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    full_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    source_status: Mapped[str] = mapped_column(String(32), nullable=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class AuthorityChunk(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "authority_chunks"
    __table_args__ = (
        Index(
            "uq_authority_chunks_authority_number",
            "authority_id",
            "chunk_number",
            unique=True,
        ),
        Index("ix_authority_chunks_search_text", "search_text"),
    )

    authority_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("legal_authorities.id", ondelete="CASCADE"), nullable=False
    )
    chunk_number: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    search_text: Mapped[str] = mapped_column(Text, nullable=False)
    vector_json: Mapped[list[float]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class ResearchResult(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "research_results"
    __table_args__ = (
        Index("ix_research_results_organization_case", "organization_id", "case_id"),
        Index(
            "uq_research_results_run_authority",
            "analysis_run_id",
            "authority_id",
            unique=True,
        ),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    authority_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("legal_authorities.id", ondelete="CASCADE"), nullable=False
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    lexical_score: Mapped[float] = mapped_column(Float, nullable=False)
    semantic_score: Mapped[float] = mapped_column(Float, nullable=False)
    combined_score: Mapped[float] = mapped_column(Float, nullable=False)
    applicability_summary: Mapped[str] = mapped_column(Text, nullable=False)
    limitation_summary: Mapped[str] = mapped_column(Text, nullable=False)
    source_status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class StrategyRecommendation(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "strategy_recommendations"
    __table_args__ = (
        Index(
            "ix_strategy_recommendations_organization_case",
            "organization_id",
            "case_id",
        ),
        Index("ix_strategy_recommendations_analysis_run", "analysis_run_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    rationale: Mapped[str] = mapped_column(Text, nullable=False)
    risk: Mapped[str] = mapped_column(Text, nullable=False)
    next_action: Mapped[str] = mapped_column(Text, nullable=False)
    supporting_source_ids_json: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class EthicsFinding(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "ethics_findings"
    __table_args__ = (
        Index("ix_ethics_findings_organization_case", "organization_id", "case_id"),
        Index("ix_ethics_findings_analysis_run", "analysis_run_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    title: Mapped[str] = mapped_column(String(250), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    required_action: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class MotionDraft(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "motion_drafts"
    __table_args__ = (
        Index("ix_motion_drafts_organization_case", "organization_id", "case_id"),
        Index("ix_motion_drafts_analysis_run", "analysis_run_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    analysis_run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    motion_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    current_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )


class MotionVersion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "motion_versions"
    __table_args__ = (
        Index(
            "uq_motion_versions_draft_number",
            "motion_draft_id",
            "version_number",
            unique=True,
        ),
    )

    motion_draft_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("motion_drafts.id", ondelete="CASCADE"), nullable=False
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    content_json: Mapped[dict[str, object]] = mapped_column(JSON, nullable=False)
    rendered_text: Mapped[str] = mapped_column(Text, nullable=False)
    citation_check_status: Mapped[str] = mapped_column(String(32), nullable=False)
    ethics_check_status: Mapped[str] = mapped_column(String(32), nullable=False)
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class CitationCheckRecord(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "citation_checks"
    __table_args__ = (
        Index("ix_citation_checks_organization_case", "organization_id", "case_id"),
        Index("ix_citation_checks_motion_version", "motion_version_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    motion_version_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("motion_versions.id", ondelete="CASCADE"), nullable=True
    )
    citation_text: Mapped[str] = mapped_column(Text, nullable=False)
    authority_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("legal_authorities.id", ondelete="SET NULL"), nullable=True
    )
    source_document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    source_page_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("document_pages.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class AttorneyReview(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "attorney_reviews"
    __table_args__ = (
        Index("ix_attorney_reviews_organization_case", "organization_id", "case_id"),
        Index("ix_attorney_reviews_motion", "motion_draft_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    motion_draft_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("motion_drafts.id", ondelete="CASCADE"), nullable=True
    )
    reviewer_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    decision: Mapped[str] = mapped_column(String(32), nullable=False)
    comments: Mapped[str] = mapped_column(Text, nullable=False, default="")
    review_pin_verified: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )


class CopilotThread(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "copilot_threads"
    __table_args__ = (
        Index("ix_copilot_threads_organization_case", "organization_id", "case_id"),
    )

    organization_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    case_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    created_by_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(250), nullable=False)


class CopilotMessage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "copilot_messages"
    __table_args__ = (
        Index("ix_copilot_messages_thread_created", "thread_id", "created_at"),
    )

    thread_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("copilot_threads.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_references_json: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    metadata_json: Mapped[dict[str, object]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime(), default=utc_now, nullable=False
    )
