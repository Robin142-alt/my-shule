import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "ghost" | "link" | "default";
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
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:active:scale-100";

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      "bg-gradient-to-b from-[#09275e] to-[#071D49] text-white shadow-[0_2px_10px_rgba(7,29,73,0.15)] border border-[#061638] hover:shadow-[0_4px_15px_rgba(7,29,73,0.25)] hover:from-[#0a2e70] hover:to-[#082255] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] active:shadow-sm",
    default:
      "bg-gradient-to-b from-[#09275e] to-[#071D49] text-white shadow-[0_2px_10px_rgba(7,29,73,0.15)] border border-[#061638] hover:shadow-[0_4px_15px_rgba(7,29,73,0.25)] hover:from-[#0a2e70] hover:to-[#082255] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] active:shadow-sm",
    secondary:
      "bg-white text-slate-700 border border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0 active:scale-[0.98]",
    danger:
      "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_2px_10px_rgba(220,38,38,0.2)] border border-red-700 hover:shadow-[0_4px_15px_rgba(220,38,38,0.3)] hover:from-red-400 hover:to-red-500 hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
    ghost:
      "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-[0.98]",
    outline:
      "border border-slate-200 bg-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98]",
    link:
      "text-primary underline-offset-4 hover:underline hover:text-primary/80",
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-[12px]",
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
