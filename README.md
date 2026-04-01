# End-to-End Vite Chatbot (Agentic Calculator)

This project is a full-stack chatbot with:

- **Frontend**: Vite + React + Tailwind + shadcn/ui
- **Backend**: FastAPI + OpenAI Agents SDK streaming
- **Agent**: `Agents/Agentic_Calculator.py`
- **Database**: Neon Postgres for durable chat-run logging
- **Capabilities**: token streaming, markdown/code rendering, tool lifecycle UI events, model selector (OpenAI allowlist), message history persistence, server-side run metrics

## Project Layout

- `Agents/Agentic_Calculator.py` — calculator agent definition and output schema
- `backend/app/main.py` — FastAPI app + CORS
- `backend/app/db/` — Neon connection config + schema bootstrap
- `backend/app/routes/chat.py` — `/api/models` and `/api/chat/stream`
- `backend/app/services/agent_stream.py` — SSE event mapping + per-run metrics capture
- `backend/app/services/chat_logging.py` — persistent `chat_runs` inserts
- `frontend/src/components/chat/` — chat primitives (shell, toolbar, composer, message list/bubble, markdown, tool event)
- `frontend/src/features/chat/` — reducer + local storage state management
- `frontend/src/lib/sseChatClient.ts` — SSE stream parser/client
- `run-local.sh` — one-command local startup that kills old runs, bootstraps the database, and starts backend + frontend
- `vercel.json` — Vercel Services routing for the frontend + FastAPI backend
- `backend/main.py` — Vercel Python service entrypoint

## Provision Neon Postgres

This app now expects a **Neon Postgres** database for local development and for Vercel deployment.

Recommended flow:

1. Provision Neon through Vercel Marketplace or `vercel integration add neon`.
2. Copy the provided `DATABASE_URL`.
3. Use the same `DATABASE_URL` locally in the project root `.env`.
4. Add the same `DATABASE_URL` to your Vercel environment variables for deployment.

## Deploy On Vercel

This repo is designed to deploy as a **single Vercel project using Services**:

- `web` service → `frontend`
- `api` service → `backend/main.py`

Required Vercel project settings:

1. Set the **Framework Preset** to **Services**
2. Add the required environment variables in Vercel project settings
3. Ensure Neon environment variables are available in the same project

Important routing behavior:

- The backend service is mounted at `/api` by Vercel Services
- FastAPI routes are therefore declared without the outer `/api` prefix
- The frontend uses relative `/api/...` calls in deployed environments

## Environment Setup

### Backend env

Copy `backend/.env.example` to `.env` in the project root (or export the variables):

```bash
DATABASE_URL=postgresql://user:password@your-neon-host.neon.tech/database?sslmode=require
OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=
OPENAI_ADVANCE_LLM_MODEL=gpt-5
OPENAI_MEDIUM_LLM_MODEL=gpt-5-mini
OPENAI_LOW_LLM_MODEL=gpt-4.1-mini
OPENAI_MODELS=
FRONTEND_ORIGIN=http://localhost:5173
DB_POOL_MAX_SIZE=5
```

Notes:

- `DATABASE_URL` is preferred, but the backend also accepts `POSTGRES_URL` and `POSTGRES_PRISMA_URL`
- `LLM_MODEL` is optional; if omitted, the app derives its OpenAI model behavior from the tiered `OPENAI_*_LLM_MODEL` variables
- `OPENAI_MODELS` is optional; if omitted, `/models` is synthesized from the tiered OpenAI env values

### Frontend env

Copy `frontend/.env.example` to `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

This variable is for local Vite development only. In deployed Vercel environments, the frontend uses relative `/api` calls automatically.

## Install Dependencies

From project root:

```bash
./.venv/bin/pip install -r requirements.txt
cd frontend && npm install
```

## Run Locally

Primary command:

```bash
./run-local.sh
```

What it does:

- kills stale listeners on ports `8000` and `5173`
- validates required environment variables
- bootstraps the Neon schema (`chat_runs`)
- starts FastAPI and Vite together
- cleans both processes up on exit

Manual fallback:

### Terminal 1 — Initialize DB + Backend

```bash
./.venv/bin/python -m backend.app.db.init_db
./.venv/bin/uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Then open:

- Frontend: <http://localhost:5173>
- Backend health: <http://localhost:8000/health>

## API Contract

### `GET /api/models`

Deployed path:

- `/api/models` on Vercel Services

Direct backend path when calling the backend service itself locally:

- `/models`

Returns:

```json
{
  "models": ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4o-mini"],
  "default_model": "gpt-5"
}
```

### `POST /api/chat/stream`

Deployed path:

- `/api/chat/stream` on Vercel Services

Direct backend path when calling the backend service itself locally:

- `/chat/stream`

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

## Database Logging

Each streamed chat run is persisted to the `chat_runs` table in Neon Postgres.

Stored fields include:

- timestamps (`created_at`, `completed_at`) and total latency
- success/error status and error message
- user question text
- selected OpenAI model
- history message count and prompt character count
- streamed token event count
- tool event count and tool event names
- final response text and response length
- structured final output JSON
- extracted `score` and `hallucination_score`

## Verification Checklist

- Model dropdown loads from `/api/models` (`OPENAI_MODELS` allowlist)
- Assistant output streams token-by-token
- Markdown/code render in assistant messages
- Tool lifecycle events appear in the UI
- Message history persists after refresh (local storage)
- Backend rejects non-allowlisted model IDs
- `chat_runs` is created automatically if missing
- Successful and failed chat runs are logged to Neon
