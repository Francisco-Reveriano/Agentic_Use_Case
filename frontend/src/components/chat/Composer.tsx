import { useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Loader2, Send, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ComposerProps {
  disabled: boolean;
  isStreaming: boolean;
  onSend: (message: string) => Promise<void> | void;
  onCancel: () => void;
}

export function Composer({ disabled, isStreaming, onSend, onCancel }: ComposerProps) {
  const [value, setValue] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextValue = value.trim();
    if (!nextValue || disabled) {
      return;
    }
    await onSend(nextValue);
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form onSubmit={submit} className="panel-surface panel-heavy p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-border/70 px-4 py-4">
        <div>
          <p className="panel-kicker text-primary/85">prompt bay</p>
          <h2 className="display-title text-[2.7rem] text-foreground">Deploy A New Case</h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          <span className={`h-2.5 w-2.5 rounded-full ${isStreaming ? "status-pulse bg-primary" : "bg-accent"}`} />
          <span>{isStreaming ? "stream in flight" : "ready for dispatch"}</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="space-y-3">
          <Textarea
            placeholder="Describe the business activity, the data it uses, how repetitive it is, how much judgement is required, and the risk of an error..."
            className="min-h-32 resize-none rounded-none border-2 border-border/80 bg-background/70 px-4 py-4 text-base leading-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/18"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
          />

          <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="border border-border/70 bg-background/55 px-2 py-1">enter = send</span>
            <span className="border border-border/70 bg-background/55 px-2 py-1">shift + enter = newline</span>
            <span className="border border-border/70 bg-background/55 px-2 py-1">markdown preserved</span>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3">
          <div className="border-2 border-border/70 bg-background/40 p-3">
            <p className="panel-kicker text-primary/85">transmission guidance</p>
            <p className="mt-3 text-xs uppercase leading-5 tracking-[0.14em] text-muted-foreground">
              Strong prompts mention process repetition, input shape, human judgement, compliance
              pressure, and business risk.
            </p>
          </div>

          {isStreaming ? (
            <Button
              type="button"
              variant="destructive"
              onClick={onCancel}
              className="h-auto rounded-none border-2 border-destructive bg-destructive/12 px-4 py-4 text-left uppercase tracking-[0.14em] hover:-translate-x-1 hover:-translate-y-1"
            >
              <Square className="mr-2 h-4 w-4" />
              Halt Stream
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={disabled || !value.trim()}
              className="h-auto rounded-none border-2 border-primary bg-primary px-4 py-4 text-left uppercase tracking-[0.14em] text-primary-foreground shadow-[8px_8px_0_var(--signal-soft)] transition-transform hover:-translate-x-1 hover:-translate-y-1"
            >
              {disabled ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Deploy Prompt
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
