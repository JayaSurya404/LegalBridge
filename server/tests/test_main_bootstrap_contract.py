"""Static jury bootstrap distribution and minimum-contract tests."""

import asyncio
from collections import Counter
from pathlib import Path

from sqlalchemy import func, select

from app.core.security import verify_password
from app.db.base import Base
from app.db.session import Database
from app.models.organization import Organization
from app.models.user import User
from app.scripts.bootstrap_main import (
    CASES,
    FLAGSHIP_SOURCES,
    MAIN_ORGANIZATION_SLUG,
    PRIMARY_EMAIL,
    STAFF,
    _provision_workspace,
    _supporting_sources,
)


def test_main_bootstrap_meets_jury_distribution_contract() -> None:
    statuses = Counter(case.status.value for case in CASES)
    total_documents = len(FLAGSHIP_SOURCES) + sum(
        len(_supporting_sources(case.number)) for case in CASES[1:]
    )

    assert MAIN_ORGANIZATION_SLUG == "legalbridge-main"
    assert PRIMARY_EMAIL == "legalbridge@legalbridge.demo"
    assert len(STAFF) == 4
    assert len(CASES) == 15
    assert statuses == {
        "active": 5,
        "review": 3,
        "draft": 3,
        "closed": 2,
        "archived": 2,
    }
    assert len(FLAGSHIP_SOURCES) == 8
    assert total_documents == 50
    assert total_documents * 3 >= 120


def test_main_workspace_and_primary_user_bootstrap_are_idempotent(
    tmp_path: Path,
) -> None:
    async def exercise() -> None:
        database = Database(f"sqlite+aiosqlite:///{(tmp_path / 'main-bootstrap.db').as_posix()}")
        try:
            async with database.engine.begin() as connection:
                await connection.run_sync(Base.metadata.create_all)
            async with database.session_factory() as session:
                first_org, first_primary, first_supporting = await _provision_workspace(session)
                second_org, second_primary, second_supporting = await _provision_workspace(session)
                organization_count = await session.scalar(select(func.count(Organization.id)))
                user_count = await session.scalar(select(func.count(User.id)))
        finally:
            await database.dispose()

        assert first_org.id == second_org.id
        assert first_primary.id == second_primary.id
        assert len(first_supporting) == len(second_supporting) == 4
        assert organization_count == 1
        assert user_count == 5
        assert first_primary.email == PRIMARY_EMAIL
        assert first_primary.role.value == "admin"
        assert first_primary.is_active is True
        assert verify_password("legalbridge@2026", first_primary.password_hash)

    asyncio.run(exercise())
