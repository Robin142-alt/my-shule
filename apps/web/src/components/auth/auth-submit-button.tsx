import { LoaderCircle, ShieldCheck } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

export function AuthSubmitButton({
  busy,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={`group relative inline-flex h-14 w-full items-center justify-center overflow-hidden rounded-[var(--radius)] bg-accent px-4 text-sm font-bold text-white shadow-[0_18px_46px_rgba(255,122,26,0.24)] transition duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-[0_22px_56px_rgba(255,122,26,0.3)] disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:bg-surface-strong disabled:text-muted-strong disabled:shadow-none ${className}`}
    >
      <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
      <span className="relative inline-flex items-center gap-2">
        {busy ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        {children}
      </span>
    </button>
  );
}
