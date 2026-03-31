import type {
  ChatMessage,
  ChatState,
  PersistedChatState,
  ToolActivityEvent,
} from "./chatTypes";

export const CHAT_STORAGE_KEY = "agentic-calculator-chat:v1";

interface SetModelsPayload {
  models: string[];
  defaultModel: string | null;
}

interface StartRequestPayload {
  requestId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

interface RequestScopedPayload {
  requestId: string;
}

interface AppendTokenPayload extends RequestScopedPayload {
  delta: string;
}

interface AddToolEventPayload extends RequestScopedPayload {
  event: ToolActivityEvent;
}

interface FinalizeAssistantPayload extends RequestScopedPayload {
  finalText: string;
}

interface SetErrorPayload extends RequestScopedPayload {
  message: string;
}

type ChatAction =
  | { type: "hydrate"; payload: PersistedChatState }
  | { type: "set_models"; payload: SetModelsPayload }
  | { type: "select_model"; payload: string }
  | { type: "start_request"; payload: StartRequestPayload }
  | { type: "append_token"; payload: AppendTokenPayload }
  | { type: "add_tool_event"; payload: AddToolEventPayload }
  | { type: "finalize_assistant"; payload: FinalizeAssistantPayload }
  | { type: "set_stream_error"; payload: SetErrorPayload }
  | { type: "finish_request"; payload: RequestScopedPayload }
  | { type: "cancel_request"; payload: RequestScopedPayload }
  | { type: "clear_chat" };

export function createInitialChatState(): ChatState {
  return {
    messages: [],
    toolEvents: [],
    availableModels: [],
    selectedModel: "",
    sessionStatus: "idle",
    error: null,
    activeRequestId: null,
    activeAssistantMessageId: null,
  };
}

function withUpdatedActiveAssistant(
  state: ChatState,
  updater: (message: ChatMessage) => ChatMessage,
): ChatState {
  if (!state.activeAssistantMessageId) {
    return state;
  }

  return {
    ...state,
    messages: state.messages.map((message) =>
      message.id === state.activeAssistantMessageId ? updater(message) : message,
    ),
  };
}

function isActiveRequest(state: ChatState, requestId: string): boolean {
  return state.activeRequestId === requestId;
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "hydrate": {
      return {
        ...state,
        messages: action.payload.messages,
        toolEvents: action.payload.toolEvents,
        selectedModel: action.payload.selectedModel,
      };
    }
    case "set_models": {
      const { models, defaultModel } = action.payload;
      const fallback = defaultModel ?? models[0] ?? "";
      const currentSelectedModel = state.selectedModel && models.includes(state.selectedModel)
        ? state.selectedModel
        : fallback;

      return {
        ...state,
        availableModels: models,
        selectedModel: currentSelectedModel,
      };
    }
    case "select_model":
      return {
        ...state,
        selectedModel: action.payload,
      };
    case "start_request":
      return {
        ...state,
        sessionStatus: "submitted",
        error: null,
        activeRequestId: action.payload.requestId,
        activeAssistantMessageId: action.payload.assistantMessage.id,
        messages: [...state.messages, action.payload.userMessage, action.payload.assistantMessage],
      };
    case "append_token":
      if (!isActiveRequest(state, action.payload.requestId)) {
        return state;
      }
      return withUpdatedActiveAssistant(
        {
          ...state,
          sessionStatus: "streaming",
        },
        (message) => ({
          ...message,
          status: "streaming",
          content: `${message.content}${action.payload.delta}`,
        }),
      );
    case "add_tool_event":
      if (!isActiveRequest(state, action.payload.requestId)) {
        return state;
      }
      return {
        ...state,
        toolEvents: [...state.toolEvents, action.payload.event],
      };
    case "finalize_assistant":
      if (!isActiveRequest(state, action.payload.requestId)) {
        return state;
      }
      return withUpdatedActiveAssistant(state, (message) => ({
        ...message,
        status: "done",
        content: action.payload.finalText || message.content,
      }));
    case "set_stream_error":
      if (!isActiveRequest(state, action.payload.requestId)) {
        return state;
      }
      return withUpdatedActiveAssistant(
        {
          ...state,
          sessionStatus: "error",
          error: action.payload.message,
          activeRequestId: null,
          activeAssistantMessageId: null,
        },
        (message) => ({
          ...message,
          status: "error",
          error: action.payload.message,
          content: message.content || `Error: ${action.payload.message}`,
        }),
      );
    case "finish_request":
      if (!isActiveRequest(state, action.payload.requestId)) {
        return state;
      }
      return {
        ...state,
        sessionStatus: "idle",
        error: null,
        activeRequestId: null,
        activeAssistantMessageId: null,
      };
    case "cancel_request":
      if (!isActiveRequest(state, action.payload.requestId)) {
        return state;
      }
      return withUpdatedActiveAssistant(
        {
          ...state,
          sessionStatus: "idle",
          activeRequestId: null,
          activeAssistantMessageId: null,
        },
        (message) => ({
          ...message,
          status: message.content ? "done" : "error",
          error: message.content ? undefined : "Canceled by user.",
          content: message.content || "Canceled by user.",
        }),
      );
    case "clear_chat":
      return {
        ...state,
        messages: [],
        toolEvents: [],
        sessionStatus: "idle",
        error: null,
        activeRequestId: null,
        activeAssistantMessageId: null,
      };
    default:
      return state;
  }
}
