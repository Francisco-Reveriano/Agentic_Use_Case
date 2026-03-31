import type { StreamEventPayload, StreamRequestPayload } from "@/features/chat/chatTypes";

interface ModelsResponse {
  models: string[];
  default_model: string | null;
}

interface StreamChatOptions {
  apiBaseUrl: string;
  payload: StreamRequestPayload;
  signal?: AbortSignal;
  onEvent: (event: StreamEventPayload) => void;
}

function parseSseBlock(block: string): StreamEventPayload | null {
  const lines = block.split("\n");
  const dataLines = lines
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart());

  if (!dataLines.length) {
    return null;
  }

  const parsed = JSON.parse(dataLines.join("\n")) as StreamEventPayload;
  return parsed;
}

export async function streamChatSse(options: StreamChatOptions): Promise<void> {
  const response = await fetch(`${options.apiBaseUrl}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options.payload),
    signal: options.signal,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "Streaming request failed.");
  }

  if (!response.body) {
    throw new Error("Streaming response body is missing.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const event = parseSseBlock(block);
      if (event) {
        options.onEvent(event);
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const event = parseSseBlock(trailing);
    if (event) {
      options.onEvent(event);
    }
  }
}

export async function fetchModels(apiBaseUrl: string): Promise<ModelsResponse> {
  const response = await fetch(`${apiBaseUrl}/api/models`);
  if (!response.ok) {
    throw new Error("Could not load models.");
  }

  return (await response.json()) as ModelsResponse;
}
