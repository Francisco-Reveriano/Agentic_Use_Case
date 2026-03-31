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
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-border/80 bg-card p-3">
      <Textarea
        placeholder="Describe a business activity to evaluate Gen-AI appropriateness..."
        className="min-h-24 resize-none"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Press Enter to send, Shift+Enter for newline.
        </p>

        {isStreaming ? (
          <Button type="button" variant="destructive" onClick={onCancel}>
            <Square className="mr-2 h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={disabled || !value.trim()}>
            {disabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send
          </Button>
        )}
      </div>
    </form>
  );
}
