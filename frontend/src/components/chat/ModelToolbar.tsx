import { Radar, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ModelToolbarProps {
  availableModels: string[];
  selectedModel: string;
  disabled: boolean;
  onModelChange: (model: string) => void;
  onClearChat: () => void;
}

export function ModelToolbar({
  availableModels,
  selectedModel,
  disabled,
  onModelChange,
  onClearChat,
}: ModelToolbarProps) {
  return (
    <div className="panel-surface panel-heavy px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-none border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-primary hover:bg-primary/15">
              OpenAI Model Deck
            </Badge>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {availableModels.length ? `${availableModels.length} nodes online` : "no models configured"}
            </span>
          </div>

          <div>
            <p className="panel-kicker text-primary/85">control surface</p>
            <h2 className="display-title text-[2.7rem] text-foreground">Select The Brain</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            <span className={cn("status-pulse h-2.5 w-2.5 rounded-full", disabled ? "bg-accent" : "bg-primary")} />
            <span>{disabled ? "console locked" : "console armed"}</span>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={onClearChat}
            disabled={disabled}
            className="rounded-none border-2 border-border/80 bg-background/40 px-3 py-2 uppercase tracking-[0.14em] hover:-translate-x-1 hover:-translate-y-1"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <ScrollArea className="mt-4 w-full whitespace-nowrap">
        <div className="flex min-w-max gap-2 pb-2">
          {availableModels.map((model, index) => {
            const isActive = model === selectedModel;

            return (
              <Button
                key={model}
                type="button"
                variant="ghost"
                data-active={isActive}
                disabled={disabled}
                onClick={() => onModelChange(model)}
                className={cn(
                  "control-chip h-auto min-w-[13rem] rounded-none px-3 py-3 text-left hover:bg-transparent",
                  isActive ? "text-primary-foreground hover:text-primary-foreground" : "text-foreground",
                )}
              >
                <div className="flex flex-col items-start">
                  <span className="panel-kicker text-[9px] text-muted-foreground">node {index + 1}</span>
                  <span className="mt-2 font-mono text-xs uppercase tracking-[0.18em] sm:text-sm">
                    {model}
                  </span>
                </div>
              </Button>
            );
          })}

          {!availableModels.length ? (
            <div className="border-2 border-dashed border-primary/35 bg-background/30 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Configure `OPENAI_MODELS` to arm the deck.
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-border/70 pt-3">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            active node: {selectedModel || "none"}
          </span>
        </div>

        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          allowlist locked to OpenAI models
        </span>
      </div>
    </div>
  );
}
