"""Idempotently repair the production casework organisation access accounts.

This intentionally reuses the established workspace bootstrap so the organisation,
three Argon2-hashed users, roles, and active status stay consistent without deleting
any casework records.
"""

from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.db.session import Database
from app.scripts.bootstrap_casework_workspace import _organization_and_users


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
        async with database.session_factory() as session:
            organization, users = await _organization_and_users(session)
            print(f"organization_slug: {organization.slug}")
            print(f"organization_id: {organization.id}")
            for email, user in users.items():
                print(f"user[{email}]: {user.id} role={user.role.value}")
    finally:
        await database.dispose()


if __name__ == "__main__":
    asyncio.run(main())
