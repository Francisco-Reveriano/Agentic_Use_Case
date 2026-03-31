from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class ChatStreamRequest(BaseModel):
    message: str = Field(min_length=1)
    model: str | None = None
    history: list[ChatHistoryMessage] = Field(default_factory=list)


class ModelsResponse(BaseModel):
    models: list[str]
    default_model: str | None = None
