import { LoaderCircle } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function AuthSubmitButton({
  busy,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      disabled={busy || props.disabled}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {busy ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : null}
      {children}
    </button>
  );
}
