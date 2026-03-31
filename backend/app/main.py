from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db.config import close_pool
from .db.init_db import ensure_database_ready
from .routes.chat import router as chat_router

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await ensure_database_ready()
    try:
        yield
    finally:
        await close_pool()


app = FastAPI(title="Agentic Calculator Chat API", version="1.0.0", lifespan=lifespan)

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
