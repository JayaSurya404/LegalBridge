"""Add private document storage metadata and extracted source pages.

Revision ID: 0002_phase5_6
Revises: 0001_phase3
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_phase5_6"
down_revision: str | Sequence[str] | None = "0001_phase3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("document_records", sa.Column("storage_key", sa.String(1000)))
    op.add_column("document_records", sa.Column("storage_backend", sa.String(50)))
    op.add_column(
        "document_records",
        sa.Column(
            "extraction_status",
            sa.String(32),
            nullable=False,
            server_default="metadata_only",
        ),
    )
    op.add_column("document_records", sa.Column("parser_name", sa.String(100)))
    op.add_column("document_records", sa.Column("parser_version", sa.String(50)))
    op.add_column(
        "document_records",
        sa.Column("page_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "document_records",
        sa.Column(
            "extracted_character_count",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column("document_records", sa.Column("extraction_error", sa.Text()))
    op.add_column(
        "document_records",
        sa.Column("processed_at", sa.DateTime(timezone=True)),
    )
    op.add_column(
        "document_records",
        sa.Column("original_uploaded_at", sa.DateTime(timezone=True)),
    )

    op.create_table(
        "document_pages",
        sa.Column("id", sa.String(36), nullable=False),
        sa.Column("organization_id", sa.String(36), nullable=False),
        sa.Column("case_id", sa.String(36), nullable=False),
        sa.Column("document_id", sa.String(36), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("page_label", sa.String(200), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=False, server_default=""),
        sa.Column("character_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("extraction_method", sa.String(100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.CheckConstraint(
            "page_number >= 1",
            name="ck_document_pages_positive_page_number",
        ),
        sa.CheckConstraint(
            "character_count >= 0",
            name="ck_document_pages_nonnegative_character_count",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_document_pages_organization_id_organizations",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["cases.id"],
            name="fk_document_pages_case_id_cases",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["document_records.id"],
            name="fk_document_pages_document_id_document_records",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_document_pages"),
    )
    op.create_index(
        "ix_document_pages_organization_id",
        "document_pages",
        ["organization_id"],
    )
    op.create_index("ix_document_pages_case_id", "document_pages", ["case_id"])
    op.create_index(
        "ix_document_pages_document_id",
        "document_pages",
        ["document_id"],
    )
    op.create_index(
        "uq_document_pages_document_id_page_number",
        "document_pages",
        ["document_id", "page_number"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "uq_document_pages_document_id_page_number",
        table_name="document_pages",
    )
    op.drop_index("ix_document_pages_document_id", table_name="document_pages")
    op.drop_index("ix_document_pages_case_id", table_name="document_pages")
    op.drop_index("ix_document_pages_organization_id", table_name="document_pages")
    op.drop_table("document_pages")

    op.drop_column("document_records", "original_uploaded_at")
    op.drop_column("document_records", "processed_at")
    op.drop_column("document_records", "extraction_error")
    op.drop_column("document_records", "extracted_character_count")
    op.drop_column("document_records", "page_count")
    op.drop_column("document_records", "parser_version")
    op.drop_column("document_records", "parser_name")
    op.drop_column("document_records", "extraction_status")
    op.drop_column("document_records", "storage_backend")
    op.drop_column("document_records", "storage_key")
