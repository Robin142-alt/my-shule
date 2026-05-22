import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-semibold transition-all duration-150 focus-ring disabled:cursor-not-allowed disabled:opacity-50";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "ui-button-primary hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    secondary:
      "ui-button-secondary shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]",
    danger:
      "bg-danger text-white hover:bg-danger-hover active:scale-[0.98] shadow-[0_10px_28px_rgba(220,38,38,0.16)]",
    ghost:
      "bg-transparent text-muted hover:bg-primary-soft hover:text-primary",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-[12px]",
    md: "h-10 px-4 text-[13px]",
    lg: "h-11 px-5 text-sm",
  };

  return [base, variantClasses[variant], sizeClasses[size], block ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  size,
  block,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, block, className })}
      {...props}
    />
  );
}
