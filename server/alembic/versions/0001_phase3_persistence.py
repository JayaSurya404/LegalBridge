"""Create Phase 3 persistence and authentication tables.

Revision ID: 0001_phase3
Revises:
Create Date: 2026-07-29
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_phase3"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

user_role = sa.Enum(
    "admin",
    "attorney",
    "reviewer",
    name="user_role",
    native_enum=False,
    create_constraint=True,
)
case_status = sa.Enum(
    "draft",
    "active",
    "review",
    "closed",
    "archived",
    name="case_status",
    native_enum=False,
    create_constraint=True,
)


def timestamp_columns() -> list[sa.Column]:
    return [
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
    ]


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("slug", sa.String(length=100), nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        *timestamp_columns(),
        sa.PrimaryKeyConstraint("id", name="pk_organizations"),
    )
    op.create_index(
        "ix_organizations_slug",
        "organizations",
        ["slug"],
        unique=True,
    )

    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=200), nullable=False),
        sa.Column("password_hash", sa.String(length=512), nullable=False),
        sa.Column("role", user_role, nullable=False),
        sa.Column(
            "is_active",
            sa.Boolean(),
            nullable=False,
            server_default=sa.true(),
        ),
        sa.Column(
            "token_version",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_users_organization_id_organizations",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
    )
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index(
        "uq_users_organization_id_email",
        "users",
        ["organization_id", "email"],
        unique=True,
    )

    op.create_table(
        "auth_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replaced_by_id", sa.String(length=36), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["replaced_by_id"],
            ["auth_sessions.id"],
            name="fk_auth_sessions_replaced_by_id_auth_sessions",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_auth_sessions_user_id_users",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_auth_sessions"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])

    op.create_table(
        "cases",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("case_number", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("court_name", sa.String(length=300), nullable=True),
        sa.Column("jurisdiction", sa.String(length=200), nullable=True),
        sa.Column("allegation_type", sa.String(length=200), nullable=True),
        sa.Column(
            "status",
            case_status,
            nullable=False,
            server_default="draft",
        ),
        sa.Column("created_by_id", sa.String(length=36), nullable=False),
        sa.Column("assigned_attorney_id", sa.String(length=36), nullable=True),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["assigned_attorney_id"],
            ["users.id"],
            name="fk_cases_assigned_attorney_id_users",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name="fk_cases_created_by_id_users",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_cases_organization_id_organizations",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_cases"),
    )
    op.create_index(
        "ix_cases_assigned_attorney_id",
        "cases",
        ["assigned_attorney_id"],
    )
    op.create_index("ix_cases_organization_id", "cases", ["organization_id"])
    op.create_index(
        "uq_cases_organization_id_case_number",
        "cases",
        ["organization_id", "case_number"],
        unique=True,
    )

    op.create_table(
        "document_records",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=150), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="metadata_only",
        ),
        sa.Column("created_by_id", sa.String(length=36), nullable=False),
        *timestamp_columns(),
        sa.CheckConstraint(
            "size_bytes > 0 AND size_bytes <= 52428800",
            name="ck_document_records_valid_size_bytes",
        ),
        sa.CheckConstraint(
            "length(sha256) = 64",
            name="ck_document_records_valid_sha256_length",
        ),
        sa.CheckConstraint(
            "status = 'metadata_only'",
            name="ck_document_records_metadata_only_status",
        ),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["cases.id"],
            name="fk_document_records_case_id_cases",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            name="fk_document_records_created_by_id_users",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_document_records_organization_id_organizations",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_document_records"),
    )
    op.create_index(
        "ix_document_records_case_id",
        "document_records",
        ["case_id"],
    )
    op.create_index(
        "ix_document_records_organization_id",
        "document_records",
        ["organization_id"],
    )
    op.create_index(
        "uq_document_records_case_id_sha256",
        "document_records",
        ["case_id", "sha256"],
        unique=True,
    )

    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("organization_id", sa.String(length=36), nullable=False),
        sa.Column("case_id", sa.String(length=36), nullable=True),
        sa.Column("actor_user_id", sa.String(length=36), nullable=True),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("entity_id", sa.String(length=36), nullable=False),
        sa.Column(
            "metadata_json",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'{}'"),
        ),
        *timestamp_columns(),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name="fk_audit_events_actor_user_id_users",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["case_id"],
            ["cases.id"],
            name="fk_audit_events_case_id_cases",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_audit_events_organization_id_organizations",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_audit_events"),
    )
    op.create_index(
        "ix_audit_events_actor_user_id",
        "audit_events",
        ["actor_user_id"],
    )
    op.create_index(
        "ix_audit_events_case_id_created_at",
        "audit_events",
        ["case_id", "created_at"],
    )
    op.create_index(
        "ix_audit_events_organization_id",
        "audit_events",
        ["organization_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_events_organization_id", table_name="audit_events")
    op.drop_index("ix_audit_events_case_id_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_actor_user_id", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_index(
        "uq_document_records_case_id_sha256",
        table_name="document_records",
    )
    op.drop_index(
        "ix_document_records_organization_id",
        table_name="document_records",
    )
    op.drop_index("ix_document_records_case_id", table_name="document_records")
    op.drop_table("document_records")
    op.drop_index("uq_cases_organization_id_case_number", table_name="cases")
    op.drop_index("ix_cases_organization_id", table_name="cases")
    op.drop_index("ix_cases_assigned_attorney_id", table_name="cases")
    op.drop_table("cases")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.drop_index("uq_users_organization_id_email", table_name="users")
    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_table("users")
    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_table("organizations")
