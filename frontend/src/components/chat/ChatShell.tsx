import { Activity, Bot, Gauge, Radar, Sparkles, Workflow } from "lucide-react";

import { Composer } from "./Composer";
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

  const sessionStatusLabel =
    state.sessionStatus === "submitted"
      ? "PRIMED"
      : state.sessionStatus === "streaming"
        ? "LIVE"
        : state.sessionStatus === "error"
          ? "FAULT"
          : "IDLE";

  const marqueeItems = [
    "streaming responses",
    "tool telemetry",
    "markdown rendering",
    "openai model deck",
    "follow-up context",
    "agentic scoring",
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-6 md:px-6 md:py-8">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_340px]">
        <header className="panel-surface panel-heavy relative min-h-[24rem] px-5 py-5 sm:px-6 sm:py-6">
          <div className="absolute right-4 top-4 rotate-[-4deg] border-2 border-primary bg-primary px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-primary-foreground">
            live sse
          </div>

          <div className="relative z-10 flex h-full flex-col justify-between gap-8">
            <div className="max-w-4xl space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-none border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-primary hover:bg-primary/15">
                  OpenAI Only
                </Badge>
                <Badge className="rounded-none border border-border bg-background/30 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:bg-background/30">
                  Agentic_Calculator_Tool
                </Badge>
              </div>

              <div className="space-y-3">
                <p className="panel-kicker text-primary/90">
                  Gen-AI suitability assessor / brutalist experimental control surface
                </p>
                <div className="flex items-start gap-3">
                  <Bot className="mt-2 h-6 w-6 text-primary" />
                  <div className="space-y-3">
                    <h1 className="display-title text-[clamp(4.8rem,12vw,9.5rem)] text-foreground">
                      Assess
                      <br />
                      The
                      <br />
                      Process
                    </h1>
                    <p className="max-w-2xl text-sm uppercase leading-6 tracking-[0.16em] text-muted-foreground">
                      A streaming evaluation rig for interrogating business workflows through the
                      `Agentic_Calculator_Tool`, with live token flow, model switching, markdown
                      output, and visible tool telemetry.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden border-y-2 border-border/70 py-2">
              <div className="motion-marquee flex min-w-max items-center gap-8 pr-8 font-mono text-[10px] uppercase tracking-[0.4em] text-primary/90">
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
              <p className="display-title text-[3.1rem] text-foreground">{state.messages.length}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                {userMessageCount} user / {assistantMessageCount} assistant
              </p>
            </div>
          </div>

          <div className="metric-slab px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="panel-kicker text-primary/85">runtime state</p>
              <Activity className="h-4 w-4 text-accent" />
            </div>
            <div className="space-y-1">
              <p className="display-title text-[3.1rem] text-foreground">{sessionStatusLabel}</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                {isBusy ? "channel occupied" : "channel open"}
              </p>
            </div>
          </div>

          <div className="metric-slab px-4 py-4 sm:col-span-2 xl:col-span-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="panel-kicker text-primary/85">selected model</p>
              <Gauge className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-lg uppercase tracking-[0.14em] text-foreground">
                {state.selectedModel || "waiting"}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                {state.toolEvents.length} tool events tracked
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <ModelToolbar
            availableModels={state.availableModels}
            selectedModel={state.selectedModel}
            disabled={isBusy}
            onModelChange={onSelectModel}
            onClearChat={onClearChat}
          />

          <MessageList messages={state.messages} />

          <Composer
            disabled={isBusy || !state.availableModels.length}
            isStreaming={state.sessionStatus === "streaming" || state.sessionStatus === "submitted"}
            onSend={onSendMessage}
            onCancel={onCancelStreaming}
          />

          {state.error ? (
            <div className="panel-surface border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          ) : null}
        </div>

        <aside className="panel-surface panel-heavy p-0 xl:sticky xl:top-6">
          <div className="border-b-2 border-border/70 px-4 py-4">
            <div className="mb-2 flex items-center gap-2">
              <Workflow className="h-4 w-4 text-primary" />
              <p className="panel-kicker text-primary/85">tool activity rail</p>
            </div>
            <h2 className="display-title text-[2.9rem] text-foreground">System Events</h2>
            <p className="mt-2 text-xs uppercase leading-5 tracking-[0.14em] text-muted-foreground">
              Every tool lifecycle event appears here as a live strip with output details.
            </p>
          </div>

          <ScrollArea className="h-[min(72vh,840px)]">
            <div className="activity-rail space-y-3 p-4 pl-8">
              {reversedToolEvents.length ? (
                reversedToolEvents.map((event) => <ToolCallEvent key={event.id} event={event} />)
              ) : (
                <div className="panel-surface border-dashed border-primary/35 bg-background/25 px-4 py-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="panel-kicker text-primary/85">stand by</p>
                  </div>
                  <p className="display-title text-[2rem] text-foreground">Awaiting Tool Traffic</p>
                  <p className="mt-3 text-xs uppercase leading-5 tracking-[0.14em] text-muted-foreground">
                    Tool start and completion events will populate this rail once the backend emits
                    them.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>
      </section>
    </div>
  );
}
