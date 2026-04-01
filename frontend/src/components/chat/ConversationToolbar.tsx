import { History, MessageSquareQuote, UserRound } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/features/chat/chatTypes";
import { cn } from "@/lib/utils";

interface ConversationToolbarProps {
  messages: ChatMessage[];
  activeMessageId: string | null;
  onMessageSelect: (messageId: string) => void;
}

function getMessageLabel(message: ChatMessage, userIndex: number, assistantIndex: number) {
  const prefix = message.role === "user" ? `Prompt ${userIndex}` : `Response ${assistantIndex}`;
  const snippet = message.content.replace(/\s+/g, " ").trim();

  return {
    prefix,
    snippet: snippet.length > 54 ? `${snippet.slice(0, 54)}...` : snippet || "Awaiting response",
  };
}

export function ConversationToolbar({
  messages,
  activeMessageId,
  onMessageSelect,
}: ConversationToolbarProps) {
  let userCount = 0;
  let assistantCount = 0;

  return (
    <div className="panel-surface panel-heavy px-4 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <div>
            <p className="panel-kicker text-primary/85">conversation index</p>
            <h2 className="display-title text-[2.3rem] text-foreground">Previous Messages</h2>
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {messages.length ? `${messages.length} entries available` : "timeline empty"}
        </p>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex min-w-max gap-2 pb-2">
          {messages.length ? (
            messages.map((message) => {
              if (message.role === "user") {
                userCount += 1;
              } else {
                assistantCount += 1;
              }

              const { prefix, snippet } = getMessageLabel(message, userCount, assistantCount);
              const isActive = message.id === activeMessageId;

              return (
                <Button
                  key={message.id}
                  type="button"
                  variant="ghost"
                  data-active={isActive}
                  onClick={() => onMessageSelect(message.id)}
                  className={cn(
                    "history-chip h-auto min-w-[16rem] rounded-none border-2 px-3 py-3 text-left hover:bg-transparent",
                    isActive ? "border-primary text-foreground" : "border-border/80 text-foreground",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {message.role === "user" ? (
                      <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                    ) : (
                      <MessageSquareQuote className="mt-0.5 h-4 w-4 text-primary" />
                    )}
                    <div className="min-w-0 text-left">
                      <p className="panel-kicker text-[9px] text-primary/80">{prefix}</p>
                      <p className="mt-1 text-sm leading-5 whitespace-normal text-foreground/90">{snippet}</p>
                    </div>
                  </div>
                </Button>
              );
            })
          ) : (
            <div className="border-2 border-dashed border-primary/25 bg-background/40 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Previous prompts and responses will appear here.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
