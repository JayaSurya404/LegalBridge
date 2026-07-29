"""Add the complete database-backed analysis, motion, review, and Copilot platform.

Revision ID: 0004_phase7_11
Revises: 0003_postgresql
Create Date: 2026-07-29
"""
# ruff: noqa: E501

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_phase7_11"
down_revision: str | Sequence[str] | None = "0003_postgresql"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _id() -> sa.Column[str]:
    return sa.Column("id", sa.String(36), primary_key=True)


def _fk(name: str, target: str, ondelete: str = "CASCADE", nullable: bool = False) -> sa.Column[str]:
    return sa.Column(
        name,
        sa.String(36),
        sa.ForeignKey(target, ondelete=ondelete),
        nullable=nullable,
    )


def _created() -> sa.Column[object]:
    return sa.Column("created_at", sa.DateTime(timezone=True), nullable=False)


def _updated() -> sa.Column[object]:
    return sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False)


def upgrade() -> None:
    op.create_table(
        "analysis_runs",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("provider", sa.String(50), nullable=False),
        _fk("started_by_user_id", "users.id", "RESTRICT"),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("failure_message", sa.Text),
        sa.Column("summary", sa.Text, nullable=False),
        _created(),
        _updated(),
    )
    op.create_index("ix_analysis_runs_organization_case", "analysis_runs", ["organization_id", "case_id"])
    op.create_index("ix_analysis_runs_case_status", "analysis_runs", ["case_id", "status"])

    op.create_table(
        "agent_runs",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("agent_key", sa.String(80), nullable=False),
        sa.Column("agent_name", sa.String(150), nullable=False),
        sa.Column("sequence_number", sa.Integer, nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("input_summary", sa.Text, nullable=False),
        sa.Column("output_summary", sa.Text, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("completed_at", sa.DateTime(timezone=True)),
        sa.Column("error_message", sa.Text),
        _created(),
        sa.UniqueConstraint("analysis_run_id", "agent_key", name="uq_agent_runs_analysis_agent"),
    )
    op.create_index("ix_agent_runs_organization_case", "agent_runs", ["organization_id", "case_id"])

    op.create_table(
        "case_facts",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("fact_type", sa.String(80), nullable=False),
        sa.Column("fact_text", sa.Text, nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        _fk("source_document_id", "documents.id", "SET NULL", True),
        _fk("source_page_id", "document_pages.id", "SET NULL", True),
        sa.Column("status", sa.String(32), nullable=False),
        _created(),
    )
    op.create_index("ix_case_facts_organization_case", "case_facts", ["organization_id", "case_id"])
    op.create_index("ix_case_facts_analysis_run", "case_facts", ["analysis_run_id"])

    op.create_table(
        "timeline_events",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("event_date", sa.Date),
        sa.Column("event_time", sa.Time),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("event_type", sa.String(80), nullable=False),
        sa.Column("confidence", sa.Float, nullable=False),
        _fk("source_document_id", "documents.id", "SET NULL", True),
        _fk("source_page_id", "document_pages.id", "SET NULL", True),
        sa.Column("sequence_number", sa.Integer, nullable=False),
        _created(),
    )
    op.create_index("ix_timeline_events_organization_case", "timeline_events", ["organization_id", "case_id"])
    op.create_index("ix_timeline_events_run_sequence", "timeline_events", ["analysis_run_id", "sequence_number"])

    op.create_table(
        "contradictions",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        _fk("source_a_document_id", "documents.id", "SET NULL", True),
        _fk("source_a_page_id", "document_pages.id", "SET NULL", True),
        sa.Column("source_a_excerpt", sa.Text, nullable=False),
        _fk("source_b_document_id", "documents.id", "SET NULL", True),
        _fk("source_b_page_id", "document_pages.id", "SET NULL", True),
        sa.Column("source_b_excerpt", sa.Text, nullable=False),
        sa.Column("reviewer_note", sa.Text),
        _created(),
    )
    op.create_index("ix_contradictions_organization_case", "contradictions", ["organization_id", "case_id"])
    op.create_index("ix_contradictions_analysis_run", "contradictions", ["analysis_run_id"])

    op.create_table(
        "legal_authorities",
        _id(),
        _fk("organization_id", "organizations.id", "CASCADE", True),
        sa.Column("authority_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("citation", sa.String(200), nullable=False),
        sa.Column("jurisdiction", sa.String(200), nullable=False),
        sa.Column("court", sa.String(250), nullable=False),
        sa.Column("decision_date", sa.Date),
        sa.Column("summary", sa.Text, nullable=False),
        sa.Column("full_text", sa.Text, nullable=False),
        sa.Column("source_url", sa.String(1000)),
        sa.Column("source_status", sa.String(32), nullable=False),
        sa.Column("is_synthetic", sa.Boolean, nullable=False),
        _created(),
        _updated(),
        sa.UniqueConstraint("organization_id", "citation", name="uq_legal_authorities_organization_citation"),
    )
    op.create_index("ix_legal_authorities_source_status", "legal_authorities", ["source_status"])

    op.create_table(
        "authority_chunks",
        _id(),
        _fk("authority_id", "legal_authorities.id"),
        sa.Column("chunk_number", sa.Integer, nullable=False),
        sa.Column("chunk_text", sa.Text, nullable=False),
        sa.Column("search_text", sa.Text, nullable=False),
        sa.Column("vector_json", sa.JSON, nullable=False),
        _created(),
        sa.UniqueConstraint("authority_id", "chunk_number", name="uq_authority_chunks_authority_number"),
    )
    op.create_index("ix_authority_chunks_search_text", "authority_chunks", ["search_text"])

    op.create_table(
        "procedural_findings",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("review_status", sa.String(32), nullable=False),
        sa.Column("defence_opportunity", sa.Text, nullable=False),
        _fk("source_document_id", "documents.id", "SET NULL", True),
        _fk("source_page_id", "document_pages.id", "SET NULL", True),
        _fk("authority_id", "legal_authorities.id", "SET NULL", True),
        _created(),
    )
    op.create_index("ix_procedural_findings_organization_case", "procedural_findings", ["organization_id", "case_id"])
    op.create_index("ix_procedural_findings_analysis_run", "procedural_findings", ["analysis_run_id"])

    op.create_table(
        "research_results",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        _fk("authority_id", "legal_authorities.id"),
        sa.Column("rank", sa.Integer, nullable=False),
        sa.Column("lexical_score", sa.Float, nullable=False),
        sa.Column("semantic_score", sa.Float, nullable=False),
        sa.Column("combined_score", sa.Float, nullable=False),
        sa.Column("applicability_summary", sa.Text, nullable=False),
        sa.Column("limitation_summary", sa.Text, nullable=False),
        sa.Column("source_status", sa.String(32), nullable=False),
        _created(),
        sa.UniqueConstraint("analysis_run_id", "authority_id", name="uq_research_results_run_authority"),
    )
    op.create_index("ix_research_results_organization_case", "research_results", ["organization_id", "case_id"])

    op.create_table(
        "strategy_recommendations",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("priority", sa.String(20), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("rationale", sa.Text, nullable=False),
        sa.Column("risk", sa.Text, nullable=False),
        sa.Column("next_action", sa.Text, nullable=False),
        sa.Column("supporting_source_ids_json", sa.JSON, nullable=False),
        _created(),
    )
    op.create_index("ix_strategy_recommendations_organization_case", "strategy_recommendations", ["organization_id", "case_id"])
    op.create_index("ix_strategy_recommendations_analysis_run", "strategy_recommendations", ["analysis_run_id"])

    op.create_table(
        "ethics_findings",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("title", sa.String(250), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("severity", sa.String(20), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("required_action", sa.Text, nullable=False),
        _created(),
    )
    op.create_index("ix_ethics_findings_organization_case", "ethics_findings", ["organization_id", "case_id"])
    op.create_index("ix_ethics_findings_analysis_run", "ethics_findings", ["analysis_run_id"])

    op.create_table(
        "motion_drafts",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("analysis_run_id", "analysis_runs.id"),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("motion_type", sa.String(100), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("current_version", sa.Integer, nullable=False),
        _fk("created_by_user_id", "users.id", "RESTRICT"),
        _created(),
        _updated(),
    )
    op.create_index("ix_motion_drafts_organization_case", "motion_drafts", ["organization_id", "case_id"])
    op.create_index("ix_motion_drafts_analysis_run", "motion_drafts", ["analysis_run_id"])

    op.create_table(
        "motion_versions",
        _id(),
        _fk("motion_draft_id", "motion_drafts.id"),
        sa.Column("version_number", sa.Integer, nullable=False),
        sa.Column("content_json", sa.JSON, nullable=False),
        sa.Column("rendered_text", sa.Text, nullable=False),
        sa.Column("citation_check_status", sa.String(32), nullable=False),
        sa.Column("ethics_check_status", sa.String(32), nullable=False),
        _fk("created_by_user_id", "users.id", "RESTRICT"),
        _created(),
        sa.UniqueConstraint("motion_draft_id", "version_number", name="uq_motion_versions_draft_number"),
    )

    op.create_table(
        "citation_checks",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("motion_version_id", "motion_versions.id", "CASCADE", True),
        sa.Column("citation_text", sa.Text, nullable=False),
        _fk("authority_id", "legal_authorities.id", "SET NULL", True),
        _fk("source_document_id", "documents.id", "SET NULL", True),
        _fk("source_page_id", "document_pages.id", "SET NULL", True),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        _created(),
    )
    op.create_index("ix_citation_checks_organization_case", "citation_checks", ["organization_id", "case_id"])
    op.create_index("ix_citation_checks_motion_version", "citation_checks", ["motion_version_id"])

    op.create_table(
        "attorney_reviews",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("motion_draft_id", "motion_drafts.id", "CASCADE", True),
        _fk("reviewer_user_id", "users.id", "RESTRICT"),
        sa.Column("decision", sa.String(32), nullable=False),
        sa.Column("comments", sa.Text, nullable=False),
        sa.Column("review_pin_verified", sa.Boolean, nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        _created(),
    )
    op.create_index("ix_attorney_reviews_organization_case", "attorney_reviews", ["organization_id", "case_id"])
    op.create_index("ix_attorney_reviews_motion", "attorney_reviews", ["motion_draft_id"])

    op.create_table(
        "copilot_threads",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("created_by_user_id", "users.id", "RESTRICT"),
        sa.Column("title", sa.String(250), nullable=False),
        _created(),
        _updated(),
    )
    op.create_index("ix_copilot_threads_organization_case", "copilot_threads", ["organization_id", "case_id"])

    op.create_table(
        "copilot_messages",
        _id(),
        _fk("thread_id", "copilot_threads.id"),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("source_references_json", sa.JSON, nullable=False),
        _created(),
    )
    op.create_index("ix_copilot_messages_thread_created", "copilot_messages", ["thread_id", "created_at"])


def downgrade() -> None:
    for index_name, table_name in (
        ("ix_copilot_messages_thread_created", "copilot_messages"),
        ("ix_copilot_threads_organization_case", "copilot_threads"),
        ("ix_attorney_reviews_motion", "attorney_reviews"),
        ("ix_attorney_reviews_organization_case", "attorney_reviews"),
        ("ix_citation_checks_motion_version", "citation_checks"),
        ("ix_citation_checks_organization_case", "citation_checks"),
        ("ix_motion_drafts_analysis_run", "motion_drafts"),
        ("ix_motion_drafts_organization_case", "motion_drafts"),
        ("ix_ethics_findings_analysis_run", "ethics_findings"),
        ("ix_ethics_findings_organization_case", "ethics_findings"),
        ("ix_strategy_recommendations_analysis_run", "strategy_recommendations"),
        ("ix_strategy_recommendations_organization_case", "strategy_recommendations"),
        ("ix_research_results_organization_case", "research_results"),
        ("ix_procedural_findings_analysis_run", "procedural_findings"),
        ("ix_procedural_findings_organization_case", "procedural_findings"),
        ("ix_authority_chunks_search_text", "authority_chunks"),
        ("ix_legal_authorities_source_status", "legal_authorities"),
        ("ix_contradictions_analysis_run", "contradictions"),
        ("ix_contradictions_organization_case", "contradictions"),
        ("ix_timeline_events_run_sequence", "timeline_events"),
        ("ix_timeline_events_organization_case", "timeline_events"),
        ("ix_case_facts_analysis_run", "case_facts"),
        ("ix_case_facts_organization_case", "case_facts"),
        ("ix_agent_runs_organization_case", "agent_runs"),
        ("ix_analysis_runs_case_status", "analysis_runs"),
        ("ix_analysis_runs_organization_case", "analysis_runs"),
    ):
        op.drop_index(index_name, table_name=table_name)
    for table_name in (
        "copilot_messages",
        "copilot_threads",
        "attorney_reviews",
        "citation_checks",
        "motion_versions",
        "motion_drafts",
        "ethics_findings",
        "strategy_recommendations",
        "research_results",
        "procedural_findings",
        "authority_chunks",
        "legal_authorities",
        "contradictions",
        "timeline_events",
        "case_facts",
        "agent_runs",
        "analysis_runs",
    ):
        op.drop_table(table_name)
