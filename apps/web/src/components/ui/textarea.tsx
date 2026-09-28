import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`flex min-h-24 w-full rounded-[var(--radius-sm)] border border-border-control bg-surface px-3.5 py-2.5 text-base text-foreground outline-none transition-all duration-200 placeholder:text-muted-strong hover:not(:focus):border-primary hover:not(:focus):bg-white focus:border-focus focus:shadow-[var(--shadow-focus)] aria-invalid:border-danger aria-invalid:focus:border-danger disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm ${className}`}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea };
