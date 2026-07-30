"""Add Legal Copilot embeddings, memory, artifacts, execution runs, and claim citations.

Revision ID: 0005_copilot_upgrade
Revises: 0004_phase7_11
Create Date: 2026-07-30
"""
# ruff: noqa: E501

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_copilot_upgrade"
down_revision: str | Sequence[str] | None = "0004_phase7_11"
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
    op.add_column(
        "copilot_messages",
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
    )

    op.create_table(
        "document_page_embeddings",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("document_id", "documents.id"),
        _fk("page_id", "document_pages.id"),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("embedding_json", sa.JSON(), nullable=False),
        sa.Column("embedding_model", sa.String(120), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        _created(),
        _updated(),
        sa.UniqueConstraint(
            "organization_id",
            "case_id",
            "page_id",
            "chunk_index",
            "embedding_model",
            name="uq_page_embeddings_scope_chunk_model",
        ),
    )
    op.create_index(
        "ix_page_embeddings_organization_case",
        "document_page_embeddings",
        ["organization_id", "case_id"],
    )
    op.create_index(
        "ix_page_embeddings_document",
        "document_page_embeddings",
        ["document_id"],
    )

    op.create_table(
        "case_memory",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        sa.Column("memory_key", sa.String(120), nullable=False),
        sa.Column("memory_value", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(80), nullable=False, server_default="user_note"),
        _fk("created_by_user_id", "users.id", "SET NULL", nullable=True),
        _created(),
        _updated(),
        sa.UniqueConstraint("organization_id", "case_id", "memory_key", name="uq_case_memory_key"),
    )
    op.create_index("ix_case_memory_organization_case", "case_memory", ["organization_id", "case_id"])

    op.create_table(
        "copilot_artifacts",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("thread_id", "copilot_threads.id"),
        _fk("message_id", "copilot_messages.id", "SET NULL", nullable=True),
        _fk("created_by_user_id", "users.id", "RESTRICT"),
        sa.Column("artifact_type", sa.String(80), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(120), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("source_manifest_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("status", sa.String(40), nullable=False, server_default="ready"),
        _created(),
    )
    op.create_index(
        "ix_copilot_artifacts_organization_case",
        "copilot_artifacts",
        ["organization_id", "case_id"],
    )
    op.create_index("ix_copilot_artifacts_thread", "copilot_artifacts", ["thread_id"])

    op.create_table(
        "copilot_execution_runs",
        _id(),
        _fk("organization_id", "organizations.id"),
        _fk("case_id", "cases.id"),
        _fk("thread_id", "copilot_threads.id"),
        _fk("message_id", "copilot_messages.id", "SET NULL", nullable=True),
        sa.Column("intent", sa.String(80), nullable=False),
        sa.Column("provider", sa.String(80), nullable=False),
        sa.Column("model", sa.String(120), nullable=False, server_default=""),
        sa.Column("retrieval_summary_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("tool_summary_json", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("citation_result_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(40), nullable=False, server_default="completed"),
        sa.Column("error_category", sa.String(80), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        _created(),
    )
    op.create_index("ix_copilot_execution_runs_case", "copilot_execution_runs", ["case_id"])
    op.create_index("ix_copilot_execution_runs_thread", "copilot_execution_runs", ["thread_id"])

    op.create_table(
        "copilot_claim_citations",
        _id(),
        _fk("message_id", "copilot_messages.id"),
        sa.Column("claim_text", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(80), nullable=False),
        sa.Column("case_id", sa.String(36), nullable=True),
        sa.Column("document_id", sa.String(36), nullable=True),
        sa.Column("document_filename", sa.String(300), nullable=True),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("supporting_excerpt", sa.Text(), nullable=True),
        sa.Column("support_status", sa.String(40), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1"),
        _created(),
    )
    op.create_index(
        "ix_copilot_claim_citations_message",
        "copilot_claim_citations",
        ["message_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_copilot_claim_citations_message", table_name="copilot_claim_citations")
    op.drop_table("copilot_claim_citations")
    op.drop_index("ix_copilot_execution_runs_thread", table_name="copilot_execution_runs")
    op.drop_index("ix_copilot_execution_runs_case", table_name="copilot_execution_runs")
    op.drop_table("copilot_execution_runs")
    op.drop_index("ix_copilot_artifacts_thread", table_name="copilot_artifacts")
    op.drop_index("ix_copilot_artifacts_organization_case", table_name="copilot_artifacts")
    op.drop_table("copilot_artifacts")
    op.drop_index("ix_case_memory_organization_case", table_name="case_memory")
    op.drop_table("case_memory")
    op.drop_index("ix_page_embeddings_document", table_name="document_page_embeddings")
    op.drop_index("ix_page_embeddings_organization_case", table_name="document_page_embeddings")
    op.drop_table("document_page_embeddings")
    op.drop_column("copilot_messages", "metadata_json")
