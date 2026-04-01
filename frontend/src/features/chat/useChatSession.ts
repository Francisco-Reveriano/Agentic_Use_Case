import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { chatReducer, CHAT_STORAGE_KEY, createInitialChatState } from "./chatReducer";
import type {
  ChatMessage,
  ChatRole,
  ChatState,
  PersistedChatState,
  StreamEventPayload,
  ToolActivityEvent,
} from "./chatTypes";
import { fetchModels, streamChatSse } from "@/lib/sseChatClient";

const DEFAULT_API_BASE_URL = "http://localhost:8000";
const DEPLOYED_API_BASE_URL = "/api";
const LOCAL_VITE_PORTS = new Set(["5173", "4173"]);
type StructuredAssessment = Record<string, unknown>;
const ASSESSMENT_DIMENSIONS = [
  "Data Input Nature",
  "Process Logic & Repetitiveness",
  "Decision Complexity & Human Judgement",
  "Regulatory & Compliance Scrutiny",
  "Impact of Error & Risk Severity",
] as const;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined" && LOCAL_VITE_PORTS.has(window.location.port)) {
    return DEFAULT_API_BASE_URL;
  }

  return DEPLOYED_API_BASE_URL;
}

function safeReadStoredState(): PersistedChatState | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const rawValue = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as PersistedChatState;
    if (!Array.isArray(parsed.messages) || !Array.isArray(parsed.toolEvents)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildInitialState(): ChatState {
  const state = createInitialChatState();
  const persisted = safeReadStoredState();
  if (!persisted) {
    return state;
  }
  return {
    ...state,
    messages: normalizePersistedMessages(persisted.messages),
    toolEvents: persisted.toolEvents,
    selectedModel: persisted.selectedModel,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value);
    if (Number.isFinite(normalized)) {
      return normalized;
    }
  }

  return null;
}

function parseStructuredAssessment(value: unknown): StructuredAssessment | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as StructuredAssessment;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as StructuredAssessment)
      : null;
  } catch {
    return null;
  }
}

function getSuitabilityLabel(score: number | null): string | null {
  if (score === null) {
    return null;
  }

  if (score >= 4.0) {
    return "Highly suitable for Gen-AI automation / augmentation";
  }

  if (score >= 3.0) {
    return "Moderately suitable - pilot recommended with guardrails";
  }

  if (score >= 2.0) {
    return "Low suitability - limited Gen-AI benefit without significant redesign";
  }

  return "Unsuitable - traditional automation or human execution preferred";
}

type DimensionRow = {
  label: string;
  score: string | null;
  reasoning: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeMarkdownTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n+/g, " ").trim();
}

function extractDimensionRows(reasoning: string): {
  rows: DimensionRow[];
  summary: string | null;
} {
  const normalized = reasoning.replace(/\r\n/g, "\n").trim();
  const positions = ASSESSMENT_DIMENSIONS.map((label) => {
    const match = new RegExp(
      `(?:Dimension\s*\d+\s*:\s*)?${escapeRegExp(label)}\s*(?:[—-]|:)\s*`,
      "i",
    ).exec(normalized);

    return match
      ? {
          label,
          index: match.index,
          marker: match[0],
        }
      : null;
  })
    .filter(
      (entry): entry is { label: (typeof ASSESSMENT_DIMENSIONS)[number]; index: number; marker: string } =>
        Boolean(entry),
    )
    .sort((left, right) => left.index - right.index);

  if (!positions.length) {
    return {
      rows: [],
      summary: normalized || null,
    };
  }

  const rows: DimensionRow[] = [];
  const summaryParts: string[] = [];
  const preface = normalized.slice(0, positions[0].index).trim();
  if (preface) {
    summaryParts.push(preface);
  }

  positions.forEach((entry, index) => {
    const start = entry.index + entry.marker.length;
    const end = index < positions.length - 1 ? positions[index + 1].index : normalized.length;
    let body = normalized.slice(start, end).trim();

    if (index === positions.length - 1) {
      const summaryMatch = body.match(/(?:^|\n\n)(Overall[^\n]*|Classification:[\s\S]*|Chain of Thought[\s\S]*)$/i);
      if (summaryMatch && summaryMatch.index !== undefined) {
        const trailingSummary = summaryMatch[0].trim();
        body = body.slice(0, summaryMatch.index).trim();
        if (trailingSummary) {
          summaryParts.push(trailingSummary);
        }
      }
    }

    let score: string | null = null;
    const scoreMatch = body.match(/^(?:\*\*Dimension score:\*\*\s*)?([0-5](?:\.\d+)?\/5(?:\.0)?)\.?\s*(.*)$/s);
    if (scoreMatch) {
      score = scoreMatch[1];
      body = scoreMatch[2].trim();
    }

    rows.push({
      label: entry.label,
      score,
      reasoning: body || "No reasoning provided.",
    });
  });

  return {
    rows,
    summary: summaryParts.join("\n\n").trim() || null,
  };
}

function buildAssessmentMarkdown(outputRecord: StructuredAssessment): string {
  const score = asNumber(outputRecord.score);
  const hallucination = asString(outputRecord.hallucination_score);
  const reasoning = asString(outputRecord.reasoning);
  const suitability = getSuitabilityLabel(score);
  const { rows, summary } = reasoning
    ? extractDimensionRows(reasoning)
    : { rows: [], summary: null as string | null };

  const lines = [
    "## Agentic Calculator Assessment",
    "",
    `- **Overall score:** ${score !== null ? `${score.toFixed(1)} / 5.0` : "N/A"}`,
  ];

  if (suitability) {
    lines.push(`- **Suitability:** ${suitability}`);
  }

  lines.push(`- **Hallucination risk:** ${hallucination ?? "N/A"}`);
  lines.push("");

  if (rows.length) {
    lines.push("### Dimension Review");
    lines.push("");
    lines.push("| Dimension | Reasoning |");
    lines.push("| --- | --- |");
    rows.forEach((row) => {
      const dimensionLabel = row.score ? `${row.label} (${row.score})` : row.label;
      lines.push(`| ${escapeMarkdownTableCell(dimensionLabel)} | ${escapeMarkdownTableCell(row.reasoning)} |`);
    });
    lines.push("");
  }

  if (summary) {
    lines.push("### Executive Summary");
    lines.push("");
    lines.push(summary);
  } else if (reasoning) {
    lines.push("### Detailed Analysis");
    lines.push("");
    lines.push(reasoning);
  } else {
    lines.push("### Structured Result");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(outputRecord, null, 2));
    lines.push("```");
  }

  return lines.join("\n").trim();
}

function normalizePersistedMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) => {
    if (message.role !== "assistant") {
      return message;
    }

    const structuredOutput = parseStructuredAssessment(message.content);
    if (!structuredOutput) {
      return message;
    }

    return {
      ...message,
      content: buildAssessmentMarkdown(structuredOutput),
    };
  });
}

function composeFinalText(
  event: StreamEventPayload,
  existingAssistantText: string,
): string {
  const data = event.data ?? {};

  const structuredOutput =
    parseStructuredAssessment(data.output) ??
    parseStructuredAssessment(data.text) ??
    parseStructuredAssessment(existingAssistantText);

  if (structuredOutput) {
    return buildAssessmentMarkdown(structuredOutput);
  }

  const eventText = asString(data.text);
  if (eventText && eventText.trim()) {
    return eventText.trim();
  }

  return existingAssistantText || "No response output was returned.";
}

function buildHistory(messages: ChatMessage[]): Array<{ role: ChatRole; content: string }> {
  return messages
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

function buildToolEvent(type: "tool_start" | "tool_end", data?: Record<string, unknown>): ToolActivityEvent {
  return {
    id: createId("tool"),
    type,
    eventName: asString(data?.event_name) ?? undefined,
    itemType: asString(data?.item_type) ?? undefined,
    toolName: asString(data?.tool_name) ?? undefined,
    title: asString(data?.title),
    description: asString(data?.description),
    output: data?.output,
    createdAt: new Date().toISOString(),
  };
}

export function useChatSession() {
  const [state, dispatch] = useReducer(chatReducer, undefined, buildInitialState);
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const persisted: PersistedChatState = {
      messages: state.messages,
      toolEvents: state.toolEvents,
      selectedModel: state.selectedModel,
    };
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(persisted));
  }, [state.messages, state.selectedModel, state.toolEvents]);

  useEffect(() => {
    let isMounted = true;
    fetchModels(apiBaseUrl)
      .then((result) => {
        if (!isMounted) {
          return;
        }
        dispatch({
          type: "set_models",
          payload: {
            models: result.models,
            defaultModel: result.default_model,
          },
        });
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }
        const fallback = error instanceof Error ? error.message : "Unable to load models.";
        dispatch({
          type: "set_models",
          payload: {
            models: [],
            defaultModel: null,
          },
        });
        console.error(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  const selectModel = useCallback((model: string) => {
    dispatch({ type: "select_model", payload: model });
  }, []);

  const clearChat = useCallback(() => {
    dispatch({ type: "clear_chat" });
  }, []);

  const cancelActiveRequest = useCallback(() => {
    const requestId = stateRef.current.activeRequestId;
    if (!requestId) {
      return;
    }
    activeAbortControllerRef.current?.abort();
    dispatch({ type: "cancel_request", payload: { requestId } });
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const message = text.trim();
    if (!message) {
      return;
    }

    const currentState = stateRef.current;
    if (currentState.sessionStatus === "streaming" || currentState.sessionStatus === "submitted") {
      return;
    }

    const requestId = createId("req");
    const nowIso = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createId("msg-user"),
      role: "user",
      content: message,
      status: "done",
      createdAt: nowIso,
    };
    const assistantMessage: ChatMessage = {
      id: createId("msg-assistant"),
      role: "assistant",
      content: "",
      status: "submitted",
      createdAt: nowIso,
    };

    dispatch({
      type: "start_request",
      payload: {
        requestId,
        userMessage,
        assistantMessage,
      },
    });

    const controller = new AbortController();
    activeAbortControllerRef.current = controller;
    let finalAssistantText = "";
    let hasMarkedStreaming = false;

    try {
      await streamChatSse({
        apiBaseUrl,
        signal: controller.signal,
        payload: {
          message,
          model: currentState.selectedModel || undefined,
          history: buildHistory(currentState.messages),
        },
        onEvent: (event) => {
          switch (event.type) {
            case "token": {
              const delta = asString(event.data?.delta);
              if (delta) {
                finalAssistantText += delta;
                if (!hasMarkedStreaming) {
                  dispatch({
                    type: "mark_streaming",
                    payload: { requestId },
                  });
                  hasMarkedStreaming = true;
                }
              }
              break;
            }
            case "tool_start":
              dispatch({
                type: "add_tool_event",
                payload: {
                  requestId,
                  event: buildToolEvent("tool_start", event.data),
                },
              });
              break;
            case "tool_end":
              dispatch({
                type: "add_tool_event",
                payload: {
                  requestId,
                  event: buildToolEvent("tool_end", event.data),
                },
              });
              break;
            case "final": {
              const composed = composeFinalText(event, finalAssistantText);
              finalAssistantText = composed;
              dispatch({
                type: "finalize_assistant",
                payload: { requestId, finalText: composed },
              });
              break;
            }
            case "error": {
              const messageValue = asString(event.data?.message) ?? "Streaming request failed.";
              dispatch({
                type: "set_stream_error",
                payload: { requestId, message: messageValue },
              });
              break;
            }
            default:
              break;
          }
        },
      });

      dispatch({ type: "finish_request", payload: { requestId } });
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        dispatch({ type: "cancel_request", payload: { requestId } });
      } else {
        const messageValue =
          error instanceof Error ? error.message : "Unexpected error while streaming response.";
        dispatch({
          type: "set_stream_error",
          payload: { requestId, message: messageValue },
        });
      }
    } finally {
      if (activeAbortControllerRef.current === controller) {
        activeAbortControllerRef.current = null;
      }
    }
  }, [apiBaseUrl]);

  return {
    state,
    sendMessage,
    clearChat,
    selectModel,
    cancelActiveRequest,
    isBusy: state.sessionStatus === "submitted" || state.sessionStatus === "streaming",
  };
}
