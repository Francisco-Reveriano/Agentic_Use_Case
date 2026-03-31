import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/features/chat/chatTypes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./MessageBubble";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <ScrollArea className="panel-surface panel-heavy min-h-[34rem] max-h-[72vh] p-0">
      <div className="border-b-2 border-border/70 px-4 py-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="panel-kicker text-primary/85">conversation feed</p>
            <h2 className="display-title text-[2.8rem] text-foreground">Live Transcript</h2>
          </div>
          <div className="text-right font-mono text-[10px] uppercase tracking-[0.26em] text-muted-foreground">
            <p>{messages.length} frames</p>
            <p>auto-scroll armed</p>
          </div>
        </div>
      </div>

      <div className="relative p-4 md:p-5">
        {!messages.length ? (
          <div className="panel-surface border-dashed border-primary/35 bg-background/30 px-5 py-6">
            <p className="panel-kicker text-primary/85">awaiting first process</p>
            <h3 className="display-title mt-2 text-[2.2rem] text-foreground">
              Drop a workflow into the engine
            </h3>
            <p className="mt-3 max-w-2xl text-sm uppercase leading-6 tracking-[0.14em] text-muted-foreground">
              Try a repetitive business activity with clear inputs, compliance constraints, and
              error risk to see how the scoring agent responds.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                "invoice review triage",
                "first-pass contract analysis",
                "support ticket categorization",
              ].map((example) => (
                <span
                  key={example}
                  className="border-2 border-border/70 bg-background/60 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {example}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {messages.length ? (
          <>
            <div className="absolute bottom-0 left-[1.45rem] top-0 w-px bg-[linear-gradient(180deg,var(--signal),rgba(255,255,255,0.12),transparent)] opacity-70" />
            <div className="space-y-5">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className="feed-entry relative pl-8"
                  style={{ animationDelay: `${Math.min(index, 10) * 80}ms` }}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-6 h-3.5 w-3.5 border-2 bg-background",
                      message.role === "assistant"
                        ? "border-primary shadow-[0_0_0_4px_var(--signal-soft)]"
                        : "border-accent shadow-[0_0_0_4px_rgba(255,122,0,0.12)]",
                    )}
                  />
                  <MessageBubble message={message} />
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
