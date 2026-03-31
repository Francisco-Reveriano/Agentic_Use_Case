# End-to-End Vite Chatbot (Agentic Calculator)

This project is a full-stack chatbot with:

- **Frontend**: Vite + React + Tailwind + shadcn/ui
- **Backend**: FastAPI + OpenAI Agents SDK streaming
- **Agent**: `Agents/Agentic_Calculator.py`
- **Capabilities**: token streaming, markdown/code rendering, tool lifecycle UI events, model selector (OpenAI allowlist), message history persistence

## Project Layout

- `Agents/Agentic_Calculator.py` — calculator agent definition and output schema
- `backend/app/main.py` — FastAPI app + CORS
- `backend/app/routes/chat.py` — `/api/models` and `/api/chat/stream`
- `backend/app/services/agent_stream.py` — event mapping (`token`, `tool_start`, `tool_end`, `final`, `error`)
- `frontend/src/components/chat/` — chat primitives (shell, toolbar, composer, message list/bubble, markdown, tool event)
- `frontend/src/features/chat/` — reducer + local storage state management
- `frontend/src/lib/sseChatClient.ts` — SSE stream parser/client

## Environment Setup

### Backend env

Copy `backend/.env.example` to `.env` in the project root (or export the variables):

```bash
OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-4.1-mini
OPENAI_MODELS=gpt-5,gpt-5-mini,gpt-4.1,gpt-4.1-mini,gpt-4o-mini
FRONTEND_ORIGIN=http://localhost:5173
```

### Frontend env

Copy `frontend/.env.example` to `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

## Install Dependencies

From project root:

```bash
./.venv/bin/pip install -r requirements.txt
cd frontend && npm install
```

## Run Locally

Open two terminals from project root.

### Terminal 1 — Backend

```bash
./.venv/bin/uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

Then open:

- Frontend: <http://localhost:5173>
- Backend health: <http://localhost:8000/health>

## API Contract

### `GET /api/models`

Returns:

```json
{
  "models": ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"],
  "default_model": "gpt-5"
}
```

### `POST /api/chat/stream`

Request body:

```json
{
  "message": "Assess Gen-AI suitability for invoice review",
  "model": "gpt-5-mini",
  "history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

Server-sent events stream payloads with `type`:

- `token` → incremental response text
- `tool_start` / `tool_end` → tool action lifecycle updates
- `final` → structured final output (`score`, `reasoning`, `hallucination_score`)
- `error` → stream failure details
- `done` → stream completion marker

## Verification Checklist

- Model dropdown loads from `/api/models` (`OPENAI_MODELS` allowlist)
- Assistant output streams token-by-token
- Markdown/code render in assistant messages
- Tool lifecycle events appear in the UI
- Message history persists after refresh (local storage)
- Backend rejects non-allowlisted model IDs
