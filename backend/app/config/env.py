from __future__ import annotations

import os

DEFAULT_OPENAI_MODEL = "gpt-4.1-mini"

_DB_ENV_NAMES = ("DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL")
_OPENAI_TIER_ENV_NAMES = (
    "OPENAI_MEDIUM_LLM_MODEL",
    "OPENAI_ADVANCE_LLM_MODEL",
    "OPENAI_LOW_LLM_MODEL",
)


def _read_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def _is_openai_model(model: str) -> bool:
    normalized = model.strip().lower()
    return normalized.startswith(("gpt-", "o1", "o3", "o4", "openai/"))


def get_database_url_from_env() -> str:
    return _read_env(*_DB_ENV_NAMES)


def get_default_openai_model() -> str:
    configured = _read_env("LLM_MODEL", *_OPENAI_TIER_ENV_NAMES)
    if configured and _is_openai_model(configured):
        return configured
    return DEFAULT_OPENAI_MODEL


def get_allowed_openai_models() -> list[str]:
    raw_models = _read_env("OPENAI_MODELS")
    configured_models: list[str] = []

    if raw_models:
        configured_models.extend(model.strip() for model in raw_models.split(","))
    else:
        configured_models.extend(_read_env(name) for name in _OPENAI_TIER_ENV_NAMES)

    configured_models.append(get_default_openai_model())

    seen: set[str] = set()
    deduped_models: list[str] = []
    for model in configured_models:
        if not model or not _is_openai_model(model) or model in seen:
            continue
        seen.add(model)
        deduped_models.append(model)

    return deduped_models or [DEFAULT_OPENAI_MODEL]
