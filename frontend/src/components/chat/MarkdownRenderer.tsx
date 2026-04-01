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
    <div className="space-y-4 text-[0.95rem] leading-7 text-foreground/95">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ className, ...props }) => (
            <p className={cn("whitespace-pre-wrap text-inherit", className)} {...props} />
          ),
          h1: ({ className, ...props }) => (
            <h1 className={cn("display-title text-[2.4rem] text-foreground", className)} {...props} />
          ),
          h2: ({ className, ...props }) => (
            <h2 className={cn("display-title text-[2rem] text-foreground", className)} {...props} />
          ),
          h3: ({ className, ...props }) => (
            <h3 className={cn("font-semibold uppercase tracking-[0.14em] text-foreground", className)} {...props} />
          ),
          ul: ({ className, ...props }) => (
            <ul className={cn("ml-5 list-disc space-y-2", className)} {...props} />
          ),
          ol: ({ className, ...props }) => (
            <ol className={cn("ml-5 list-decimal space-y-2", className)} {...props} />
          ),
          blockquote: ({ className, ...props }) => (
            <blockquote
              className={cn("border-l-4 border-primary pl-4 text-muted-foreground italic", className)}
              {...props}
            />
          ),
          table: ({ className, ...props }) => (
            <div className="overflow-x-auto">
              <table className={cn("markdown-table min-w-full border-collapse", className)} {...props} />
            </div>
          ),
          thead: ({ className, ...props }) => (
            <thead className={cn("bg-primary/10 text-foreground", className)} {...props} />
          ),
          tbody: ({ className, ...props }) => (
            <tbody className={cn("divide-y divide-border/60", className)} {...props} />
          ),
          tr: ({ className, ...props }) => (
            <tr className={cn("border-b border-border/60", className)} {...props} />
          ),
          th: ({ className, ...props }) => (
            <th
              className={cn(
                "border border-border/60 px-3 py-2 text-left text-xs uppercase tracking-[0.14em]",
                className,
              )}
              {...props}
            />
          ),
          td: ({ className, ...props }) => (
            <td className={cn("border border-border/60 px-3 py-3 align-top text-sm leading-6", className)} {...props} />
          ),
          pre: ({ className, ...props }) => (
            <pre
              className={cn(
                "output-surface overflow-x-auto rounded-none p-4 text-xs shadow-[8px_8px_0_rgba(203,255,92,0.08)]",
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
                  "rounded-none border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-xs",
                  className,
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          a: ({ className, ...props }) => (
            <a className={cn("text-primary underline decoration-2 underline-offset-4", className)} {...props} />
          ),
          hr: ({ className, ...props }) => (
            <hr className={cn("border-border/70", className)} {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
