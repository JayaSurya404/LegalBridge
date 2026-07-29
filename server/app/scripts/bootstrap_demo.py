"""Idempotently create the local LegalBridge demonstration organisation."""

from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import Database
from app.models.audit import AuditEvent
from app.models.case import LegalCase
from app.models.enums import CaseStatus, UserRole
from app.models.organization import Organization
from app.models.user import User
from app.services.audit import add_audit_event

DEMO_ORGANIZATION_NAME = "LegalBridge Demo Legal Aid"
DEMO_ORGANIZATION_SLUG = "legalbridge-demo"
DEMO_ADMIN_EMAIL = "admin@legalbridge.demo"
DEMO_ADMIN_PASSWORD = "LegalBridgeAdmin@2026"
DEMO_ATTORNEY_EMAIL = "attorney@legalbridge.demo"
DEMO_ATTORNEY_PASSWORD = "LegalBridge@2026"
DEMO_CASE_NUMBER = "LB-DEMO-2026-001"
DEMO_CASE_TITLE = "Synthetic Property Allegation Demonstration"


async def _get_or_create_user(
    session,
    *,
    organization_id: str,
    email: str,
    full_name: str,
    password: str,
    role: UserRole,
) -> User:
    user = await session.scalar(
        select(User).where(
            User.organization_id == organization_id,
            User.email == email,
        )
    )
    if user is None:
        user = User(
            organization_id=organization_id,
            email=email,
            full_name=full_name,
            password_hash=hash_password(password),
            role=role,
        )
        session.add(user)
        await session.flush()
    return user


async def bootstrap_demo(database: Database) -> None:
    async with database.session_factory() as session:
        organization = await session.scalar(
            select(Organization).where(Organization.slug == DEMO_ORGANIZATION_SLUG)
        )
        if organization is None:
            organization = Organization(
                name=DEMO_ORGANIZATION_NAME,
                slug=DEMO_ORGANIZATION_SLUG,
            )
            session.add(organization)
            await session.flush()

        admin = await _get_or_create_user(
            session,
            organization_id=organization.id,
            email=DEMO_ADMIN_EMAIL,
            full_name="LegalBridge Demo Administrator",
            password=DEMO_ADMIN_PASSWORD,
            role=UserRole.ADMIN,
        )
        attorney = await _get_or_create_user(
            session,
            organization_id=organization.id,
            email=DEMO_ATTORNEY_EMAIL,
            full_name="LegalBridge Demo Attorney",
            password=DEMO_ATTORNEY_PASSWORD,
            role=UserRole.ATTORNEY,
        )

        legal_case = await session.scalar(
            select(LegalCase).where(
                LegalCase.organization_id == organization.id,
                LegalCase.case_number == DEMO_CASE_NUMBER,
            )
        )
        if legal_case is None:
            legal_case = LegalCase(
                organization_id=organization.id,
                case_number=DEMO_CASE_NUMBER,
                title=DEMO_CASE_TITLE,
                description="Closed synthetic demonstration matter; no real client data.",
                court_name="Synthetic Civil Court",
                jurisdiction="Synthetic Indian jurisdiction",
                allegation_type="Property allegation demonstration",
                status=CaseStatus.ACTIVE,
                created_by_id=admin.id,
                assigned_attorney_id=attorney.id,
            )
            session.add(legal_case)
            await session.flush()

        bootstrap_event = await session.scalar(
            select(AuditEvent.id).where(
                AuditEvent.organization_id == organization.id,
                AuditEvent.event_type == "demo_case_bootstrap",
                AuditEvent.entity_id == legal_case.id,
            )
        )
        if bootstrap_event is None:
            add_audit_event(
                session,
                organization_id=organization.id,
                actor_user_id=admin.id,
                event_type="demo_case_bootstrap",
                message="Synthetic demonstration case bootstrapped.",
                entity_type="case",
                entity_id=legal_case.id,
                case_id=legal_case.id,
            )
        await session.commit()


async def main() -> None:
    settings = get_settings()
    database = Database(
        settings.database_url,
        echo=settings.sql_echo,
        ssl_mode=settings.database_ssl,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_timeout=settings.database_pool_timeout,
        pool_recycle=settings.database_pool_recycle,
    )
    try:
        await bootstrap_demo(database)
    finally:
        await database.dispose()
    print("LegalBridge demo data is ready.")


if __name__ == "__main__":
    asyncio.run(main())
