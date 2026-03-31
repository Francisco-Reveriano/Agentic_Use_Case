export type ChatRole = "user" | "assistant";
export type ChatMessageStatus = "idle" | "submitted" | "streaming" | "error" | "done";
export type ChatSessionStatus = "idle" | "submitted" | "streaming" | "error";

export type StreamEventType =
  | "token"
  | "tool_start"
  | "tool_end"
  | "agent_updated"
  | "final"
  | "done"
  | "error";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  status: ChatMessageStatus;
  createdAt: string;
  error?: string;
}

export interface ToolActivityEvent {
  id: string;
  type: "tool_start" | "tool_end";
  eventName?: string;
  itemType?: string;
  toolName?: string;
  title?: string | null;
  description?: string | null;
  output?: unknown;
  createdAt: string;
}

export interface StreamEventPayload {
  type: StreamEventType;
  data?: Record<string, unknown>;
}

export interface StreamRequestPayload {
  message: string;
  model?: string;
  history: Array<{
    role: ChatRole;
    content: string;
  }>;
}

export interface ChatState {
  messages: ChatMessage[];
  toolEvents: ToolActivityEvent[];
  availableModels: string[];
  selectedModel: string;
  sessionStatus: ChatSessionStatus;
  error: string | null;
  activeRequestId: string | null;
  activeAssistantMessageId: string | null;
}

export interface PersistedChatState {
  messages: ChatMessage[];
  toolEvents: ToolActivityEvent[];
  selectedModel: string;
}
