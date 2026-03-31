import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

import "highlight.js/styles/github-dark.css";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ className, ...props }) => (
            <p className={cn("whitespace-pre-wrap", className)} {...props} />
          ),
          ul: ({ className, ...props }) => (
            <ul className={cn("ml-5 list-disc space-y-1", className)} {...props} />
          ),
          ol: ({ className, ...props }) => (
            <ol className={cn("ml-5 list-decimal space-y-1", className)} {...props} />
          ),
          pre: ({ className, ...props }) => (
            <pre
              className={cn(
                "overflow-x-auto rounded-lg border border-border/70 bg-black/85 p-4 text-xs shadow-sm",
                className,
              )}
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const hasLanguage = Boolean(className?.includes("language-"));
            if (hasLanguage) {
              return (
                <code className={cn("font-mono text-xs text-white", className)} {...props}>
                  {children}
                </code>
              );
            }

            return (
              <code
                className={cn(
                  "rounded-md border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-xs",
                  className,
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ className, ...props }) => (
            <a className={cn("text-primary underline underline-offset-2", className)} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
