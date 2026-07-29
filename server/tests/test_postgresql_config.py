"""Database configuration guard tests."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_postgresql_requires_ssl_and_accepts_bounded_pool_settings() -> None:
    settings = Settings(
        _env_file=None,
        database_url="postgresql+asyncpg://postgres:secret@db.example.test/postgres",
        database_ssl="require",
        database_pool_size=7,
        database_max_overflow=9,
        database_pool_timeout=45,
        database_pool_recycle=600,
    )

    assert settings.database_ssl == "require"
    assert settings.database_pool_size == 7
    assert settings.database_max_overflow == 9
    assert settings.database_pool_timeout == 45
    assert settings.database_pool_recycle == 600


def test_postgresql_without_ssl_is_rejected() -> None:
    with pytest.raises(ValidationError, match="PostgreSQL connections require"):
        Settings(
            _env_file=None,
            database_url="postgresql+asyncpg://postgres:secret@db.example.test/postgres",
            database_ssl="disable",
        )


def test_sqlite_fallback_requires_ssl_disabled() -> None:
    settings = Settings(
        _env_file=None,
        database_url="sqlite+aiosqlite:///./fallback.db",
        database_ssl="disable",
    )
    assert settings.database_url.startswith("sqlite+aiosqlite://")

    with pytest.raises(ValidationError, match="SQLite connections require"):
        Settings(
            _env_file=None,
            database_url="sqlite+aiosqlite:///./fallback.db",
            database_ssl="require",
        )
