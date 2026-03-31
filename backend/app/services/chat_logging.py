from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from ..db.config import get_pool


@dataclass(slots=True)
class ChatRunLogEntry:
    created_at: datetime
    completed_at: datetime
    latency_ms: int
    status: Literal["success", "error"]
    error_message: str | None
    question_text: str
    selected_model: str
    history_message_count: int
    prompt_chars: int
    streamed_token_event_count: int
    tool_event_count: int
    tool_event_names: list[str]
    final_response_text: str | None
    final_response_chars: int
    final_output: Any
    score: float | None
    hallucination_score: str | None


def _to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


async def insert_chat_run(entry: ChatRunLogEntry) -> UUID:
    pool = await get_pool()
    chat_run_id = uuid4()

    async with pool.acquire() as connection:
        await connection.execute(
            """
            INSERT INTO chat_runs (
                id,
                created_at,
                completed_at,
                latency_ms,
                status,
                error_message,
                question_text,
                selected_model,
                history_message_count,
                prompt_chars,
                streamed_token_event_count,
                tool_event_count,
                tool_event_names_json,
                final_response_text,
                final_response_chars,
                final_output_json,
                score,
                hallucination_score
            )
            VALUES (
                $1::uuid,
                $2::timestamptz,
                $3::timestamptz,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                $12,
                $13::jsonb,
                $14,
                $15,
                $16::jsonb,
                $17,
                $18
            )
            """,
            chat_run_id,
            entry.created_at,
            entry.completed_at,
            entry.latency_ms,
            entry.status,
            entry.error_message,
            entry.question_text,
            entry.selected_model,
            entry.history_message_count,
            entry.prompt_chars,
            entry.streamed_token_event_count,
            entry.tool_event_count,
            _to_json(entry.tool_event_names),
            entry.final_response_text,
            entry.final_response_chars,
            _to_json(entry.final_output) if entry.final_output is not None else None,
            entry.score,
            entry.hallucination_score,
        )

    return chat_run_id
