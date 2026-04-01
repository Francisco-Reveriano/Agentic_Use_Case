from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..schemas.chat import ChatStreamRequest, ModelsResponse
from ..services.agent_stream import load_allowed_models, resolve_selected_model, stream_agent_events

router = APIRouter(tags=["chat"])


@router.get("/models", response_model=ModelsResponse)
def get_models() -> ModelsResponse:
    models = load_allowed_models()
    return ModelsResponse(models=models, default_model=models[0] if models else None)


@router.post("/chat/stream")
async def chat_stream(payload: ChatStreamRequest) -> StreamingResponse:
    try:
        resolve_selected_model(payload.model)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        stream_agent_events(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
