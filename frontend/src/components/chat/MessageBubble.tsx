import { Loader2, TriangleAlert } from "lucide-react";

import type { ChatMessage } from "@/features/chat/chatTypes";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

function formatStatus(message: ChatMessage): string | null {
  if (message.role !== "assistant") {
    return null;
  }
  if (message.status === "submitted") {
    return "priming";
  }
  if (message.status === "streaming") {
    return "streaming";
  }
  if (message.status === "error") {
    return "fault";
  }
  return null;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const status = formatStatus(message);
  const isStreaming = message.status === "streaming" || message.status === "submitted";

  return (
    <div className={cn("flex w-full", isAssistant ? "justify-start pr-4" : "justify-end pl-4")}>
      <Card
        data-role={isAssistant ? "assistant" : "user"}
        data-streaming={isStreaming ? "true" : "false"}
        className={cn(
          "message-shell w-full max-w-[92%] rounded-none border-2 p-0 shadow-none",
          isAssistant
            ? "bg-[linear-gradient(180deg,rgba(28,31,39,0.98),rgba(17,19,25,0.98))]"
            : "rotate-[-1deg] bg-[linear-gradient(180deg,rgba(207,255,76,0.15),rgba(114,146,27,0.08))] text-foreground md:translate-x-3",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-3 border-b-2 px-4 py-3",
            isAssistant ? "border-border/70 bg-background/10" : "border-primary/40 bg-primary/8",
          )}
        >
          <div className="flex items-center gap-2">
            <span className={cn("panel-kicker", isAssistant ? "text-primary/90" : "text-accent/80")}>
              {isAssistant ? "assessment engine" : "operator input"}
            </span>
            {status === "streaming" || status === "priming" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : null}
            {status === "fault" ? <TriangleAlert className="h-3.5 w-3.5 text-destructive" /> : null}
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span>{formatTime(message.createdAt)}</span>
            <span>{status ?? (isAssistant ? "sealed" : "sent")}</span>
          </div>
        </div>

        <div className="relative space-y-3 px-4 py-4">
          {isAssistant ? (
            <MarkdownRenderer content={message.content || "_Priming stream..._"} />
          ) : (
            <p className="whitespace-pre-wrap text-[0.96rem] font-medium leading-7 text-foreground">
              {message.content}
            </p>
          )}

          {isAssistant && isStreaming ? (
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-primary/90">
              <span className="status-pulse h-2.5 w-2.5 rounded-full bg-primary" />
              <span>live token feed</span>
              <span className="stream-caret" />
            </div>
          ) : null}

          {message.error ? (
            <p className="border-t-2 border-destructive/30 pt-3 text-xs uppercase tracking-[0.14em] text-destructive">
              {message.error}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
