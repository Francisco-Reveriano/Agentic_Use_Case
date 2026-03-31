from __future__ import annotations

import asyncio

from .config import close_pool, get_pool

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS chat_runs (
        id UUID PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ NOT NULL,
        latency_ms INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'error')),
        error_message TEXT,
        question_text TEXT NOT NULL,
        selected_model TEXT NOT NULL,
        history_message_count INTEGER NOT NULL DEFAULT 0,
        prompt_chars INTEGER NOT NULL DEFAULT 0,
        streamed_token_event_count INTEGER NOT NULL DEFAULT 0,
        tool_event_count INTEGER NOT NULL DEFAULT 0,
        tool_event_names_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        final_response_text TEXT,
        final_response_chars INTEGER NOT NULL DEFAULT 0,
        final_output_json JSONB,
        score DOUBLE PRECISION,
        hallucination_score TEXT
    )
    """,
    "CREATE INDEX IF NOT EXISTS chat_runs_created_at_idx ON chat_runs (created_at DESC)",
    "CREATE INDEX IF NOT EXISTS chat_runs_status_idx ON chat_runs (status)",
    "CREATE INDEX IF NOT EXISTS chat_runs_selected_model_idx ON chat_runs (selected_model)",
]


async def ensure_database_ready() -> None:
    pool = await get_pool()
    async with pool.acquire() as connection:
        for statement in SCHEMA_STATEMENTS:
            await connection.execute(statement)


async def _main() -> None:
    await ensure_database_ready()
    await close_pool()
    print("Database schema is ready.")


if __name__ == "__main__":
    asyncio.run(_main())
