"""Align the stored-document table name with the public API terminology.

Revision ID: 0003_postgresql
Revises: 0002_phase5_6
Create Date: 2026-07-29
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_postgresql"
down_revision: str | Sequence[str] | None = "0002_phase5_6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.rename_table("document_records", "documents")


def downgrade() -> None:
    op.rename_table("documents", "document_records")
