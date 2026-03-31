from __future__ import annotations

import os

import asyncpg

DEFAULT_DB_APPLICATION_NAME = "agentic-calculator-chatbot"

_pool: asyncpg.Pool | None = None


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL is required. Provision a Neon Postgres database and add it to the root .env."
        )
    return database_url


def get_db_pool_max_size() -> int:
    raw_value = os.getenv("DB_POOL_MAX_SIZE", "5").strip()
    try:
        return max(1, int(raw_value))
    except ValueError:
        return 5


async def get_pool() -> asyncpg.Pool:
    global _pool

    if _pool is None:
        _pool = await asyncpg.create_pool(
            dsn=get_database_url(),
            min_size=1,
            max_size=get_db_pool_max_size(),
            command_timeout=60,
            server_settings={
                "application_name": os.getenv(
                    "DB_APPLICATION_NAME",
                    DEFAULT_DB_APPLICATION_NAME,
                )
            },
        )

    return _pool


async def close_pool() -> None:
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None
