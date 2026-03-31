import { RefreshCw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">OpenAI Models</Badge>
        <span className="text-xs text-muted-foreground">
          {availableModels.length ? `${availableModels.length} available` : "No models configured"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={selectedModel}
          onValueChange={onModelChange}
          disabled={disabled || availableModels.length === 0}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select an OpenAI model" />
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={onClearChat} disabled={disabled}>
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Clear chat</span>
        </Button>
        <Button variant="outline" size="icon" disabled>
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Models sync status</span>
        </Button>
      </div>
    </div>
  );
}
