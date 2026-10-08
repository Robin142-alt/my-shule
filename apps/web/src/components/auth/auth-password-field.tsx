"use client";

import { Eye, EyeOff, Keyboard } from "lucide-react";
import { forwardRef, useState } from "react";
import type { InputHTMLAttributes, KeyboardEvent } from "react";

export const PasswordField = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    hint?: string;
  }
>(function PasswordField(
  { label, error, hint, className = "", id, onKeyUp, onBlur, "aria-describedby": describedBy, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const inputId =
    id ??
    `auth-${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`;
  const helperId = `${inputId}-helper`;

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
    onKeyUp?.(event);
  }

  return (
    <div className="space-y-2">
      <div className="group relative">
        <div
          className={`flex h-14 items-center rounded-[var(--radius)] border bg-white px-4 transition duration-200 hover:border-accent/35 focus-within:border-accent focus-within:shadow-[var(--shadow-focus)] ${
            error ? "border-danger" : "border-border"
          }`}
        >
          <input
            {...props}
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={Boolean(error)}
            aria-describedby={[describedBy, error || hint ? helperId : null, capsLock ? `${inputId}-caps-lock` : null].filter(Boolean).join(" ") || undefined}
            placeholder={props.placeholder ?? " "}
            onKeyUp={handleKeyUp}
            onBlur={(event) => {
              setCapsLock(false);
              onBlur?.(event);
            }}
            className={`peer h-full min-w-0 w-full bg-transparent pb-1 pt-5 text-base font-medium text-foreground outline-none placeholder:text-transparent ${className}`}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            aria-controls={inputId}
            disabled={props.disabled}
            className="ml-3 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-strong hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <label
          htmlFor={inputId}
          className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold text-muted-strong transition duration-200 group-focus-within:text-accent"
        >
          {label}
        </label>
      </div>
      {capsLock ? (
        <p
          id={`${inputId}-caps-lock`}
          className="flex items-center gap-2 text-sm font-medium text-warning"
        >
          <Keyboard className="h-4 w-4" />
          Caps Lock is on.
        </p>
      ) : null}
      <p id={helperId} aria-live="polite" aria-atomic="true" className={error ? "text-sm font-medium text-danger" : hint ? "text-sm leading-6 text-muted" : "sr-only"}>
        {error || hint}
      </p>
    </div>
  );
});

export const AuthPasswordField = PasswordField;
