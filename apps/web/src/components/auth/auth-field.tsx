import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

export const SecureInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    hint?: string;
  }
>(function SecureInput(
  {
    label,
    error,
    hint,
    className = "",
    id,
    ...props
  },
  ref,
) {
  const inputId =
    id ??
    `auth-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
  const helperId = `${inputId}-helper`;

  return (
    <div className="space-y-2">
      <label className="relative block" htmlFor={inputId}>
        <input
          {...props}
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? helperId : undefined}
          placeholder={props.placeholder ?? " "}
          className={`peer h-14 w-full rounded-[var(--radius)] border bg-white px-4 pb-2 pt-5 text-sm font-medium text-foreground outline-none transition duration-200 placeholder:text-transparent hover:border-accent/35 focus:border-accent focus:shadow-[var(--shadow-focus)] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-strong ${
            error ? "border-danger" : "border-border"
          } ${className}`}
        />
        <span className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold text-muted-strong transition-all duration-200 peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-accent">
          {label}
        </span>
      </label>
      {error ? (
        <p id={helperId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={helperId} className="text-sm leading-6 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export const AuthField = SecureInput;
