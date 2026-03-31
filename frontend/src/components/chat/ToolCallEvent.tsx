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

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-xs",
        isStart ? "border-amber-500/50 bg-amber-500/10" : "border-emerald-500/40 bg-emerald-500/10",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isStart ? (
            <Wrench className="h-3.5 w-3.5 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          )}
          <span className="font-medium text-foreground">
            {event.toolName || event.title || "Tool action"}
          </span>
        </div>
        <Badge variant={isStart ? "secondary" : "default"}>
          {isStart ? "started" : "completed"}
        </Badge>
      </div>

      <div className="space-y-1 text-muted-foreground">
        {event.eventName ? <p>event: {event.eventName}</p> : null}
        {event.itemType ? <p>item: {event.itemType}</p> : null}
        {event.description ? <p>{event.description}</p> : null}
        {output ? (
          <pre className="mt-2 overflow-x-auto rounded-md border border-border/60 bg-background/70 p-2 text-[11px]">
            {output}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
