# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Gen-AI appropriateness assessor that scores business activities on how suitable they are for Generative AI automation. Built with the OpenAI Agents SDK (`openai-agents`) and Pydantic for structured output.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Dependencies: `openai-agents`, `openai` (via requirements.txt). Requires a `.env` file with API keys and model configuration (see `.env` for expected variables).

## Architecture

- **`Agents/Agentic_Calculator.py`** — The sole agent module. Defines:
  - `Agentic_Calculator_Tool` — an `Agent` (from `openai-agents`) with a detailed rubric prompt that scores use cases across five dimensions (Data Input Nature, Process Logic, Decision Complexity, Regulatory Scrutiny, Error Impact) on a 1-5 scale.
  - `Agentic_Calculator_Tool_Output` — Pydantic model enforcing structured output: `score` (float), `reasoning` (str), `hallucination_score` (Literal "Low"/"Medium"/"High").
  - The agent's LLM model is configured via the `LLM_MODEL` env var.

## Environment Variables

- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — Provider API keys
- `LLM_MODEL` — Model string used by the agent (not set by default in `.env`; must be set to one of the configured model env vars or a model string directly)
- `ANTHROPIC_ADVANCE_LLM_MODEL`, `ANTHROPIC_MEDIUM_LLM_MODEL`, `ANTHROPIC_LOW_LLM_MODEL` — Anthropic model tiers
- `OPENAI_ADVANCE_LLM_MODEL`, `OPENAI_MEDIUM_LLM_MODEL`, `OPENAI_LOW_LLM_MODEL` — OpenAI model tiers
