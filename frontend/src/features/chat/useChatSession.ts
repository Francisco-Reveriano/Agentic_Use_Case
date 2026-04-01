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

function formatReasoningSections(reasoning: string): string[] {
  const blocks = reasoning
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const lines: string[] = [];
  let sawDimensionSection = false;
  let insertedSummaryHeading = false;

  for (const block of blocks) {
    const sectionMatch = block.match(/^([^:\n]{2,80}):\s*(.+)$/s);
    if (sectionMatch) {
      sawDimensionSection = true;
      const label = sectionMatch[1].trim();
      let body = sectionMatch[2].trim();
      let dimensionScore: string | null = null;

      const scoreMatch = body.match(/^([0-5](?:\.\d+)?\/5(?:\.\d+)?)\.?\s*(.*)$/s);
      if (scoreMatch) {
        dimensionScore = scoreMatch[1];
        body = scoreMatch[2].trim();
      }

      lines.push(`#### ${label}`);
      if (dimensionScore) {
        lines.push(`**Dimension score:** ${dimensionScore}`);
        lines.push("");
      }
      lines.push(body);
      lines.push("");
      continue;
    }

    if (sawDimensionSection && !insertedSummaryHeading) {
      lines.push("### Summary");
      lines.push("");
      insertedSummaryHeading = true;
    }

    lines.push(block);
    lines.push("");
  }

  return lines;
}

function buildAssessmentMarkdown(outputRecord: StructuredAssessment): string {
  const score = asNumber(outputRecord.score);
  const hallucination = asString(outputRecord.hallucination_score);
  const reasoning = asString(outputRecord.reasoning);
  const suitability = getSuitabilityLabel(score);

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

  if (reasoning) {
    lines.push("### Detailed Analysis");
    lines.push("");
    lines.push(...formatReasoningSections(reasoning));
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
