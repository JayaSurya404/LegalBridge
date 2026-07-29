"""Print credential-safe hosted PostgreSQL identity and table counts."""

from __future__ import annotations

import asyncio
import json

from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import Database

TABLES = (
    "organizations",
    "users",
    "auth_sessions",
    "cases",
    "documents",
    "document_pages",
    "audit_events",
)


async def main() -> None:
    settings = get_settings()
    if not settings.database_url.startswith("postgresql+asyncpg://"):
        raise RuntimeError("Hosted database verification requires PostgreSQL.")
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
        async with database.session_factory() as session:
            identity = (
                await session.execute(
                    text("SELECT current_database(), current_schema(), version()")
                )
            ).one()
            counts = {
                table: int(
                    (await session.execute(text(f'SELECT count(*) FROM "{table}"'))).scalar_one()
                )
                for table in TABLES
            }
            revision = (
                await session.execute(text("SELECT version_num FROM alembic_version"))
            ).scalar_one()
    finally:
        await database.dispose()

    print(
        json.dumps(
            {
                "engine": "PostgreSQL",
                "database": identity[0],
                "schema": identity[1],
                "version": identity[2].split(",")[0],
                "alembic_revision": revision,
                "table_counts": counts,
            },
            sort_keys=True,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
