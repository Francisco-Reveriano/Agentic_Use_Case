from __future__ import annotations

import json
import os
from dataclasses import asdict, is_dataclass
from typing import Any, AsyncIterator, Iterable

from agents import RunConfig, Runner
from agents.stream_events import AgentUpdatedStreamEvent, RawResponsesStreamEvent, RunItemStreamEvent
from fastapi.encoders import jsonable_encoder
from openai.types.responses.response_text_delta_event import ResponseTextDeltaEvent
from pydantic import BaseModel

from Agents.Agentic_Calculator import Agentic_Calculator_Tool

from ..schemas.chat import ChatHistoryMessage, ChatStreamRequest


def _is_openai_model(model: str) -> bool:
    normalized = model.strip().lower()
    return normalized.startswith(("gpt-", "o1", "o3", "o4", "openai/"))


def load_allowed_models() -> list[str]:
    raw_models = os.getenv("OPENAI_MODELS", "")
    configured_models = [
        model.strip()
        for model in raw_models.split(",")
        if model.strip() and _is_openai_model(model)
    ]

    fallback_model = os.getenv("LLM_MODEL", "").strip()
    if not configured_models and fallback_model and _is_openai_model(fallback_model):
        configured_models = [fallback_model]

    if not configured_models:
        configured_models = ["gpt-4.1-mini"]

    # Keep order stable while removing duplicates.
    seen: set[str] = set()
    deduped_models: list[str] = []
    for model in configured_models:
        if model in seen:
            continue
        seen.add(model)
        deduped_models.append(model)
    return deduped_models


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


async def stream_agent_events(payload: ChatStreamRequest) -> AsyncIterator[bytes]:
    selected_model = resolve_selected_model(payload.model)
    run_config = RunConfig(model=selected_model) if selected_model else None
    run_input = build_agent_input(payload.history, payload.message)

    result = Runner.run_streamed(
        Agentic_Calculator_Tool,
        input=run_input,
        run_config=run_config,
    )

    tokens: list[str] = []

    try:
        async for event in result.stream_events():
            if isinstance(event, RawResponsesStreamEvent) and isinstance(
                event.data, ResponseTextDeltaEvent
            ):
                delta = event.data.delta or ""
                if delta:
                    tokens.append(delta)
                    yield encode_sse({"type": "token", "data": {"delta": delta}})
                continue

            if isinstance(event, RunItemStreamEvent):
                if event.name in {"tool_called", "tool_search_called", "mcp_list_tools"}:
                    raw_item = getattr(event.item, "raw_item", None)
                    yield encode_sse(
                        {
                            "type": "tool_start",
                            "data": {
                                "event_name": event.name,
                                "item_type": getattr(event.item, "type", "unknown"),
                                "tool_name": _extract_tool_name(raw_item),
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
                    yield encode_sse(
                        {
                            "type": "tool_end",
                            "data": {
                                "event_name": event.name,
                                "item_type": getattr(event.item, "type", "unknown"),
                                "tool_name": _extract_tool_name(raw_item),
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
        yield encode_sse({"type": "error", "data": {"message": str(exc)}})
        return

    final_output = to_serializable(result.final_output)
    final_text = "".join(tokens)
    if not final_text and isinstance(final_output, str):
        final_text = final_output

    yield encode_sse({"type": "final", "data": {"output": final_output, "text": final_text}})
    yield encode_sse({"type": "done", "data": {"model": selected_model or os.getenv("LLM_MODEL")}})
