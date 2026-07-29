"""Async engine, session factory, and FastAPI session dependency."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from fastapi import Request
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def _enable_sqlite_foreign_keys(
    dbapi_connection: Any,
    connection_record: Any,
) -> None:
    del connection_record
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


class Database:
    """Application-owned async engine and session factory."""

    def __init__(
        self,
        database_url: str,
        *,
        echo: bool = False,
        ssl_mode: str = "disable",
        pool_size: int = 5,
        max_overflow: int = 5,
        pool_timeout: int = 30,
        pool_recycle: int = 300,
    ) -> None:
        engine_options: dict[str, Any] = {
            "echo": echo,
            "pool_pre_ping": True,
        }
        if database_url.startswith("postgresql+asyncpg://"):
            if ssl_mode != "require":
                raise ValueError("PostgreSQL connections require SSL.")
            engine_options.update(
                {
                    "connect_args": {"ssl": "require"},
                    "pool_size": pool_size,
                    "max_overflow": max_overflow,
                    "pool_timeout": pool_timeout,
                    "pool_recycle": pool_recycle,
                }
            )
        self.engine: AsyncEngine = create_async_engine(
            database_url,
            **engine_options,
        )
        if database_url.startswith("sqlite+aiosqlite://"):
            event.listen(self.engine.sync_engine, "connect", _enable_sqlite_foreign_keys)
        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    async def ping(self) -> bool:
        try:
            async with self.engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        except Exception:
            return False
        return True

    async def dispose(self) -> None:
        await self.engine.dispose()


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    database: Database = request.app.state.database
    async with database.session_factory() as session:
        yield session
