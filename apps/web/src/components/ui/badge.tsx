import * as React from "react"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-primary-muted bg-primary-soft text-primary",
  secondary: "border-border bg-surface-strong text-muted-strong",
  destructive: "border-danger-border bg-danger-soft text-danger",
  outline: "border-border-strong text-muted-strong",
  success: "border-success-border bg-success-soft text-success",
  warning: "border-warning-border bg-warning-soft text-warning",
};

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props} />
  )
}
