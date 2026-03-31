import { Bot, Sparkles } from "lucide-react";

import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { ModelToolbar } from "./ModelToolbar";
import type { ChatState } from "@/features/chat/chatTypes";

interface ChatShellProps {
  state: ChatState;
  isBusy: boolean;
  onSendMessage: (message: string) => Promise<void> | void;
  onCancelStreaming: () => void;
  onSelectModel: (model: string) => void;
  onClearChat: () => void;
}

export function ChatShell({
  state,
  isBusy,
  onSendMessage,
  onCancelStreaming,
  onSelectModel,
  onClearChat,
}: ChatShellProps) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:py-8">
      <header className="rounded-xl border border-border/80 bg-card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Agentic Calculator Chatbot</h1>
          <Sparkles className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Streamed responses, markdown and code rendering, and tool activity traces from
          `Agentic_Calculator_Tool`.
        </p>
      </header>

      <ModelToolbar
        availableModels={state.availableModels}
        selectedModel={state.selectedModel}
        disabled={isBusy}
        onModelChange={onSelectModel}
        onClearChat={onClearChat}
      />

      <MessageList messages={state.messages} toolEvents={state.toolEvents} />

      <Composer
        disabled={isBusy || !state.availableModels.length}
        isStreaming={state.sessionStatus === "streaming" || state.sessionStatus === "submitted"}
        onSend={onSendMessage}
        onCancel={onCancelStreaming}
      />

      {state.error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
