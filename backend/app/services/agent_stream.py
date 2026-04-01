from __future__ import annotations

import json
import time
from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Iterable

from agents import RunConfig, Runner
from agents.stream_events import AgentUpdatedStreamEvent, RawResponsesStreamEvent, RunItemStreamEvent
from fastapi.encoders import jsonable_encoder
from openai.types.responses.response_text_delta_event import ResponseTextDeltaEvent
from pydantic import BaseModel

from Agents.Agentic_Calculator import Agentic_Calculator_Tool

from ..config.env import get_allowed_openai_models, get_default_openai_model
from ..schemas.chat import ChatHistoryMessage, ChatStreamRequest
from .chat_logging import ChatRunLogEntry, insert_chat_run


def load_allowed_models() -> list[str]:
    return get_allowed_openai_models()


def resolve_selected_model(requested_model: str | None) -> str | None:
    if not requested_model:
        return None

    allowed_models = load_allowed_models()
    if requested_model not in allowed_models:
        raise ValueError(
            f"Model '{requested_model}' is not allowed. Allowed models: {', '.join(allowed_models)}"
        )
    return requested_model


def build_agent_input(history: Iterable[ChatHistoryMessage], message: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for chat_message in history:
        content = chat_message.content.strip()
        if content:
            items.append({"role": chat_message.role, "content": content})

    items.append({"role": "user", "content": message.strip()})
    return items


def encode_sse(data: dict[str, Any]) -> bytes:
    payload = json.dumps(data, ensure_ascii=False)
    return f"data: {payload}\n\n".encode("utf-8")


def to_serializable(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, BaseModel):
        return value.model_dump(mode="json")
    if is_dataclass(value):
        return asdict(value)
    if isinstance(value, dict):
        return {str(key): to_serializable(inner) for key, inner in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_serializable(inner) for inner in value]
    try:
        return jsonable_encoder(value)
    except Exception:
        return str(value)


def _extract_tool_name(raw_item: Any) -> str:
    candidate_keys = ("name", "tool_name", "type")
    if isinstance(raw_item, dict):
        for key in candidate_keys:
            value = raw_item.get(key)
            if value:
                return str(value)
        return "tool"

    for key in candidate_keys:
        value = getattr(raw_item, key, None)
        if value:
            return str(value)
    return "tool"


def _resolve_effective_model(selected_model: str | None) -> str:
    if selected_model:
        return selected_model
    return get_default_openai_model()


def _count_prompt_chars(history: Iterable[ChatHistoryMessage], message: str) -> int:
    history_chars = sum(len(chat_message.content.strip()) for chat_message in history)
    return history_chars + len(message.strip())


def _extract_output_metrics(final_output: Any) -> tuple[float | None, str | None]:
    if not isinstance(final_output, dict):
        return None, None

    raw_score = final_output.get("score")
    score = float(raw_score) if isinstance(raw_score, (int, float)) else None

    raw_hallucination_score = final_output.get("hallucination_score")
    hallucination_score = (
        raw_hallucination_score
        if isinstance(raw_hallucination_score, str)
        else None
    )
    return score, hallucination_score


async def _safe_insert_chat_run(entry: ChatRunLogEntry) -> None:
    try:
        await insert_chat_run(entry)
    except Exception as exc:
        print(f"Warning: failed to persist chat run: {exc}", flush=True)


async def stream_agent_events(payload: ChatStreamRequest) -> AsyncIterator[bytes]:
    selected_model = resolve_selected_model(payload.model)
    effective_model = _resolve_effective_model(selected_model)
    run_config = RunConfig(model=selected_model) if selected_model else None
    run_input = build_agent_input(payload.history, payload.message)
    started_at = datetime.now(timezone.utc)
    started_perf = time.perf_counter()
    prompt_chars = _count_prompt_chars(payload.history, payload.message)

    result = Runner.run_streamed(
        Agentic_Calculator_Tool,
        input=run_input,
        run_config=run_config,
    )

    tokens: list[str] = []
    token_event_count = 0
    tool_event_count = 0
    tool_event_names: list[str] = []

    try:
        async for event in result.stream_events():
            if isinstance(event, RawResponsesStreamEvent) and isinstance(
                event.data, ResponseTextDeltaEvent
            ):
                delta = event.data.delta or ""
                if delta:
                    tokens.append(delta)
                    token_event_count += 1
                    yield encode_sse({"type": "token", "data": {"delta": delta}})
                continue

            if isinstance(event, RunItemStreamEvent):
                if event.name in {"tool_called", "tool_search_called", "mcp_list_tools"}:
                    raw_item = getattr(event.item, "raw_item", None)
                    tool_name = _extract_tool_name(raw_item)
                    tool_event_count += 1
                    tool_event_names.append(f"{event.name}:{tool_name}")
                    yield encode_sse(
                        {
                            "type": "tool_start",
                            "data": {
                                "event_name": event.name,
                                "item_type": getattr(event.item, "type", "unknown"),
                                "tool_name": tool_name,
                                "title": getattr(event.item, "title", None),
                                "description": getattr(event.item, "description", None),
                                "raw_item": to_serializable(raw_item),
                            },
                        }
                    )
                elif event.name in {
                    "tool_output",
                    "tool_search_output_created",
                    "mcp_approval_response",
                }:
                    raw_item = getattr(event.item, "raw_item", None)
                    tool_name = _extract_tool_name(raw_item)
                    tool_event_count += 1
                    tool_event_names.append(f"{event.name}:{tool_name}")
                    yield encode_sse(
                        {
                            "type": "tool_end",
                            "data": {
                                "event_name": event.name,
                                "item_type": getattr(event.item, "type", "unknown"),
                                "tool_name": tool_name,
                                "output": to_serializable(getattr(event.item, "output", None)),
                                "raw_item": to_serializable(raw_item),
                            },
                        }
                    )
                continue

            if isinstance(event, AgentUpdatedStreamEvent):
                yield encode_sse(
                    {"type": "agent_updated", "data": {"agent_name": event.new_agent.name}}
                )
    except Exception as exc:
        completed_at = datetime.now(timezone.utc)
        partial_text = "".join(tokens)
        latency_ms = int((time.perf_counter() - started_perf) * 1000)

        await _safe_insert_chat_run(
            ChatRunLogEntry(
                created_at=started_at,
                completed_at=completed_at,
                latency_ms=latency_ms,
                status="error",
                error_message=str(exc),
                question_text=payload.message.strip(),
                selected_model=effective_model,
                history_message_count=len(payload.history),
                prompt_chars=prompt_chars,
                streamed_token_event_count=token_event_count,
                tool_event_count=tool_event_count,
                tool_event_names=tool_event_names,
                final_response_text=partial_text or None,
                final_response_chars=len(partial_text),
                final_output=None,
                score=None,
                hallucination_score=None,
            )
        )
        yield encode_sse({"type": "error", "data": {"message": str(exc)}})
        return

    final_output = to_serializable(result.final_output)
    final_text = "".join(tokens)
    if not final_text and isinstance(final_output, str):
        final_text = final_output
    score, hallucination_score = _extract_output_metrics(final_output)
    completed_at = datetime.now(timezone.utc)
    latency_ms = int((time.perf_counter() - started_perf) * 1000)

    yield encode_sse({"type": "final", "data": {"output": final_output, "text": final_text}})

    await _safe_insert_chat_run(
        ChatRunLogEntry(
            created_at=started_at,
            completed_at=completed_at,
            latency_ms=latency_ms,
            status="success",
            error_message=None,
            question_text=payload.message.strip(),
            selected_model=effective_model,
            history_message_count=len(payload.history),
            prompt_chars=prompt_chars,
            streamed_token_event_count=token_event_count,
            tool_event_count=tool_event_count,
            tool_event_names=tool_event_names,
            final_response_text=final_text or None,
            final_response_chars=len(final_text),
            final_output=final_output,
            score=score,
            hallucination_score=hallucination_score,
        )
    )

    yield encode_sse({"type": "done", "data": {"model": effective_model}})
