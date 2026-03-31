import { CheckCircle2, Wrench } from "lucide-react";

import type { ToolActivityEvent } from "@/features/chat/chatTypes";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ToolCallEventProps {
  event: ToolActivityEvent;
}

function stringifyOutput(output: unknown): string | null {
  if (output === undefined || output === null) {
    return null;
  }

  if (typeof output === "string") {
    return output;
  }

  try {
    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function ToolCallEvent({ event }: ToolCallEventProps) {
  const isStart = event.type === "tool_start";
  const output = stringifyOutput(event.output);
  const timestamp = new Date(event.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      data-event-state={isStart ? "start" : "end"}
      className={cn(
        "tool-event-strip ml-2 rounded-none p-4 text-xs",
        isStart ? "border-primary/40 bg-primary/8" : "border-accent/45 bg-accent/7",
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 grid h-10 w-10 shrink-0 place-items-center border-2",
            isStart ? "border-primary/40 bg-primary/15 text-primary" : "border-accent/50 bg-accent/12 text-accent",
          )}
        >
          {isStart ? (
            <Wrench className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("panel-kicker", isStart ? "text-primary/85" : "text-accent/85")}>
                {event.eventName || "tool event"}
              </p>
              <h3 className="display-title truncate text-[2rem] text-foreground">
                {event.toolName || event.title || "Tool action"}
              </h3>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge
                className={cn(
                  "rounded-none border px-2 py-1 text-[10px] uppercase tracking-[0.24em]",
                  isStart
                    ? "border-primary/40 bg-primary/15 text-primary hover:bg-primary/15"
                    : "border-accent/40 bg-accent/15 text-accent hover:bg-accent/15",
                )}
              >
                {isStart ? "armed" : "resolved"}
              </Badge>
              <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {timestamp}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {event.itemType ? (
              <span className="border border-border/60 bg-background/55 px-2 py-1">{event.itemType}</span>
            ) : null}
            {event.description ? (
              <span className="border border-border/60 bg-background/55 px-2 py-1">{event.description}</span>
            ) : null}
          </div>

          {output ? (
            <pre className="output-surface mt-3 overflow-x-auto p-3 text-[11px] leading-5 text-muted-foreground">
              {output}
            </pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
