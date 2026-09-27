import type { InputHTMLAttributes } from "react";

export function AuthCheckbox({
  label,
  description,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  description?: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2">
      <input
        {...props}
        type="checkbox"
        className="h-4 w-4 shrink-0 rounded border-border bg-surface-muted text-accent focus:ring-accent"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-sm leading-6 text-muted">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
