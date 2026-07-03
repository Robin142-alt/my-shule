import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "destructive" | "outline" | "link" | "default";
type ButtonSize = "sm" | "md" | "lg" | "icon";

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
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-b from-primary to-primary-hover text-white shadow-sm border border-black/10 hover:shadow-md hover:from-primary-hover hover:to-primary-hover hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] active:shadow-sm",
    default:
      "bg-gradient-to-b from-primary to-primary-hover text-white shadow-sm border border-black/10 hover:shadow-md hover:from-primary-hover hover:to-primary-hover hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] active:shadow-sm",
    secondary:
      "bg-white text-foreground border border-border shadow-sm hover:bg-surface-strong hover:text-foreground hover:-translate-y-[1px] hover:shadow-md hover:border-border-strong active:translate-y-0 active:scale-[0.98]",
    danger:
      "bg-gradient-to-b from-danger to-danger-hover text-white shadow-sm border border-red-700/50 hover:shadow-md hover:from-danger-hover hover:to-danger-hover hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
    destructive:
      "bg-gradient-to-b from-danger to-danger-hover text-white shadow-sm border border-red-700/50 hover:shadow-md hover:from-danger-hover hover:to-danger-hover hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
    ghost:
      "bg-transparent text-muted-strong hover:bg-surface-strong hover:text-foreground active:scale-[0.98]",
    outline:
      "border border-border bg-transparent text-foreground hover:bg-surface-strong active:scale-[0.98]",
    link:
      "text-accent underline-offset-4 hover:underline hover:text-accent-hover",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-[13px]",
    lg: "h-11 px-5 text-sm",
    icon: "h-10 w-10 p-0 flex items-center justify-center",
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
