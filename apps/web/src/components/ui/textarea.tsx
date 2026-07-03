import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`flex min-h-24 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3.5 py-2.5 text-[14px] text-foreground outline-none transition-all duration-200 placeholder:text-muted-strong hover:not(:focus):border-border-strong hover:not(:focus):bg-white focus:border-accent focus:shadow-[0_0_0_4px_rgba(255,122,26,0.16)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
