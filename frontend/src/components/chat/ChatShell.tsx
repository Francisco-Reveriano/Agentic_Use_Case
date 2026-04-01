import { useState } from "react";
import { Activity, Bot, Gauge, Radar, Workflow } from "lucide-react";

import { Composer } from "./Composer";
import { ConversationToolbar } from "./ConversationToolbar";
import { MessageList } from "./MessageList";
import { ModelToolbar } from "./ModelToolbar";
import { ToolCallEvent } from "./ToolCallEvent";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const userMessageCount = state.messages.filter((message) => message.role === "user").length;
  const assistantMessageCount = state.messages.filter((message) => message.role === "assistant").length;
  const reversedToolEvents = [...state.toolEvents].reverse();
  const hasToolActivity = reversedToolEvents.length > 0;
  const [draftValue, setDraftValue] = useState("");
  const [focusToken, setFocusToken] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const suggestedUseCases = [
    "Call transcript summary in a call center",
    "First-pass contract analysis for legal operations",
    "Support ticket categorization for customer service",
    "Loan document review and issue flagging",
  ];

  const sessionStatusLabel =
    state.sessionStatus === "submitted"
      ? "PRIMED"
      : state.sessionStatus === "streaming"
        ? "LIVE"
        : state.sessionStatus === "error"
          ? "FAULT"
          : "IDLE";

  const marqueeItems = [
    "consulting-grade assessments",
    "dimension-by-dimension review",
    "follow-up context",
    "structured markdown output",
    "operating-model analysis",
  ];

  const handleSuggestionSelect = (suggestion: string) => {
    if (isBusy) {
      return;
    }
    setDraftValue(suggestion);
    setFocusToken((token) => token + 1);
  };

  const handleMessageSelect = (messageId: string) => {
    setHighlightedMessageId(messageId);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_320px]">
        <header className="panel-surface panel-heavy relative min-h-[22rem] px-5 py-5 sm:px-6 sm:py-6">
          <div className="absolute right-4 top-4 border border-primary/35 bg-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary">
            live analysis
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-none border border-primary/35 bg-primary/12 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-primary hover:bg-primary/12">
                  OpenAI Only
                </Badge>
                <Badge className="rounded-none border border-border bg-background/30 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:bg-background/30">
                  Agentic_Calculator_Tool
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="panel-kicker text-primary/90">Generative AI suitability review desk</p>
                <div className="flex items-start gap-3">
                  <Bot className="mt-2 h-6 w-6 text-primary" />
                  <div className="space-y-3">
                    <h1 className="display-title text-[clamp(4.5rem,11vw,8.4rem)] text-foreground">
                      Assess the
                      <br />
                      use case
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 tracking-[0.04em] text-muted-foreground">
                      A consulting-style workspace for interrogating business processes through the
                      `Agentic_Calculator_Tool`, with live analysis, model switching, structured
                      markdown output, and contextual follow-up.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border-y border-border/60 py-2">
              <div className="motion-marquee flex min-w-max items-center gap-8 pr-8 font-mono text-[10px] uppercase tracking-[0.32em] text-primary/90">
                {[...marqueeItems, ...marqueeItems].map((item, index) => (
                  <span key={`${item}-${index}`}>{item}</span>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <div className="metric-slab px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="panel-kicker text-primary/85">conversation load</p>
              <Radar className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="display-title text-[3rem] text-foreground">{state.messages.length}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {userMessageCount} prompt / {assistantMessageCount} response
              </p>
            </div>
          </div>

          <div className="metric-slab px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="panel-kicker text-primary/85">runtime state</p>
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="display-title text-[3rem] text-foreground">{sessionStatusLabel}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {isBusy ? "analysis in progress" : "ready for review"}
              </p>
            </div>
          </div>

          <div className="metric-slab px-4 py-4 sm:col-span-2 xl:col-span-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="panel-kicker text-primary/85">selected model</p>
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-lg uppercase tracking-[0.12em] text-foreground">
                {state.selectedModel || "waiting"}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {hasToolActivity ? `${state.toolEvents.length} tool events visible` : "streamlined review mode"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={hasToolActivity ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" : "grid gap-4"}>
        <div className="space-y-4">
          <ModelToolbar
            availableModels={state.availableModels}
            selectedModel={state.selectedModel}
            disabled={isBusy}
            onModelChange={onSelectModel}
            onClearChat={onClearChat}
          />

          <ConversationToolbar
            messages={state.messages}
            activeMessageId={highlightedMessageId}
            onMessageSelect={handleMessageSelect}
          />

          <MessageList
            messages={state.messages}
            highlightedMessageId={highlightedMessageId}
            suggestedUseCases={suggestedUseCases}
            onSuggestionSelect={handleSuggestionSelect}
          />

          <Composer
            value={draftValue}
            disabled={isBusy || !state.availableModels.length}
            isStreaming={state.sessionStatus === "streaming" || state.sessionStatus === "submitted"}
            focusToken={focusToken}
            onValueChange={setDraftValue}
            onSend={onSendMessage}
            onCancel={onCancelStreaming}
          />

          {state.error ? (
            <div className="panel-surface border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : null}
        </div>

        {hasToolActivity ? (
          <aside className="panel-surface panel-heavy p-0 xl:sticky xl:top-6">
            <div className="border-b border-border/70 px-4 py-4">
              <div className="mb-2 flex items-center gap-2">
                <Workflow className="h-4 w-4 text-primary" />
                <p className="panel-kicker text-primary/85">tool activity</p>
              </div>
              <h2 className="display-title text-[2.7rem] text-foreground">Execution Trail</h2>
              <p className="mt-2 text-xs leading-5 tracking-[0.06em] text-muted-foreground">
                Live tool lifecycle updates are shown here only when the backend emits them.
              </p>
            </div>

            <ScrollArea className="h-[min(72vh,840px)]">
              <div className="activity-rail space-y-3 p-4 pl-8">
                {reversedToolEvents.map((event) => (
                  <ToolCallEvent key={event.id} event={event} />
                ))}
              </div>
            </ScrollArea>
          </aside>
        ) : null}
      </section>
    </div>
  );
}
