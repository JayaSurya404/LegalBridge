"""Temporary SQLite application fixtures for focused Phase 3 tests."""

from __future__ import annotations

import asyncio
from collections.abc import Generator
from dataclasses import dataclass
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.security import hash_password
from app.db.base import Base, new_uuid
from app.main import create_app
from app.models.case import LegalCase
from app.models.enums import CaseStatus, UserRole
from app.models.organization import Organization
from app.models.user import User

TEST_PASSWORD = "LegalBridgeTest@2026"
TEST_PASSWORD_HASH = hash_password(TEST_PASSWORD)


@dataclass(frozen=True)
class ApiContext:
    client: TestClient
    admin_id: str
    admin_email: str
    attorney_id: str
    attorney_email: str
    reviewer_id: str
    reviewer_email: str
    other_admin_email: str
    other_case_id: str

    def login(self, email: str, password: str = TEST_PASSWORD) -> dict[str, object]:
        response = self.client.post(
            "/api/v1/auth/login",
            json={
                "organization_slug": "test-legal-aid",
                "email": email,
                "password": password,
            },
        )
        assert response.status_code == 200
        return response.json()

    def access_headers(self, email: str) -> dict[str, str]:
        tokens = self.login(email)
        return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _prepare_database(application) -> dict[str, str]:
    database = application.state.database
    async with database.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    organization = Organization(
        id=new_uuid(),
        name="Test Legal Aid",
        slug="test-legal-aid",
    )
    other_organization = Organization(
        id=new_uuid(),
        name="Other Legal Aid",
        slug="other-legal-aid",
    )
    admin = User(
        id=new_uuid(),
        organization_id=organization.id,
        email="admin@test.legalbridge",
        full_name="Test Administrator",
        password_hash=TEST_PASSWORD_HASH,
        role=UserRole.ADMIN,
    )
    attorney = User(
        id=new_uuid(),
        organization_id=organization.id,
        email="attorney@test.legalbridge",
        full_name="Test Attorney",
        password_hash=TEST_PASSWORD_HASH,
        role=UserRole.ATTORNEY,
    )
    reviewer = User(
        id=new_uuid(),
        organization_id=organization.id,
        email="reviewer@test.legalbridge",
        full_name="Test Reviewer",
        password_hash=TEST_PASSWORD_HASH,
        role=UserRole.REVIEWER,
    )
    other_admin = User(
        id=new_uuid(),
        organization_id=other_organization.id,
        email="admin@other.legalbridge",
        full_name="Other Administrator",
        password_hash=TEST_PASSWORD_HASH,
        role=UserRole.ADMIN,
    )
    other_case = LegalCase(
        id=new_uuid(),
        organization_id=other_organization.id,
        case_number="OTHER-001",
        title="Other organisation matter",
        status=CaseStatus.ACTIVE,
        created_by_id=other_admin.id,
    )

    async with database.session_factory() as session:
        session.add_all([organization, other_organization])
        await session.flush()
        session.add_all([admin, attorney, reviewer, other_admin])
        await session.flush()
        session.add(other_case)
        await session.commit()
    await database.dispose()
    return {
        "admin_id": admin.id,
        "attorney_id": attorney.id,
        "reviewer_id": reviewer.id,
        "other_case_id": other_case.id,
    }


@pytest.fixture
def context(tmp_path: Path) -> Generator[ApiContext, None, None]:
    database_path = (tmp_path / "legalbridge-test.db").as_posix()
    settings = Settings(
        environment="test",
        database_url=f"sqlite+aiosqlite:///{database_path}",
        cors_origins=["http://localhost:3000"],
        jwt_secret="test-only-jwt-secret-that-is-longer-than-thirty-two-characters",
    )
    application = create_app(settings)
    identifiers = asyncio.run(_prepare_database(application))
    with TestClient(application) as client:
        yield ApiContext(
            client=client,
            admin_id=identifiers["admin_id"],
            admin_email="admin@test.legalbridge",
            attorney_id=identifiers["attorney_id"],
            attorney_email="attorney@test.legalbridge",
            reviewer_id=identifiers["reviewer_id"],
            reviewer_email="reviewer@test.legalbridge",
            other_admin_email="admin@other.legalbridge",
            other_case_id=identifiers["other_case_id"],
        )
