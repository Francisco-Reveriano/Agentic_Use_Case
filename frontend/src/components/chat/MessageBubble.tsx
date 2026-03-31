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
    return "thinking";
  }
  if (message.status === "streaming") {
    return "streaming";
  }
  if (message.status === "error") {
    return "error";
  }
  return null;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";
  const status = formatStatus(message);

  return (
    <div className={cn("flex w-full", isAssistant ? "justify-start" : "justify-end")}>
      <Card
        className={cn(
          "max-w-[85%] space-y-2 p-3 shadow-sm",
          isAssistant ? "border-border/80 bg-card" : "border-primary/20 bg-primary/10",
        )}
      >
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>{isAssistant ? "Assistant" : "You"}</span>
          {status === "streaming" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          {status === "error" ? <TriangleAlert className="h-3 w-3 text-destructive" /> : null}
          {status ? <span>{status}</span> : null}
        </div>

        {isAssistant ? (
          <MarkdownRenderer content={message.content || "_Awaiting response..._"} />
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.content}</p>
        )}

        {message.error ? <p className="text-xs text-destructive">{message.error}</p> : null}
      </Card>
    </div>
  );
}
