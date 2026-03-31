import { useEffect, useRef } from "react";

import type { ChatMessage, ToolActivityEvent } from "@/features/chat/chatTypes";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { MessageBubble } from "./MessageBubble";
import { ToolCallEvent } from "./ToolCallEvent";

interface MessageListProps {
  messages: ChatMessage[];
  toolEvents: ToolActivityEvent[];
}

export function MessageList({ messages, toolEvents }: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, toolEvents]);

  return (
    <ScrollArea className="h-[min(68vh,760px)] rounded-xl border border-border/80 bg-card/40">
      <div className="space-y-4 p-4">
        {!messages.length ? (
          <Card className="rounded-lg border-dashed p-6 text-center text-sm text-muted-foreground">
            Ask the calculator agent to assess Gen-AI suitability for a business process.
          </Card>
        ) : null}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {toolEvents.length ? (
          <>
            <Separator />
            <section className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tool Activity
              </p>
              <div className="space-y-2">
                {toolEvents.map((event) => (
                  <ToolCallEvent key={event.id} event={event} />
                ))}
              </div>
            </section>
          </>
        ) : null}

        <div ref={endRef} />
      </div>
    </ScrollArea>
  );
}
