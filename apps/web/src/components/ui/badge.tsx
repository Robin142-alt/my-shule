import * as React from "react"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "border-[#071D49]/20 bg-[#071D49]/10 text-[#071D49] hover:bg-[#071D49]/20 shadow-[0_0_10px_rgba(7,29,73,0.1)]",
  secondary: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-sm",
  destructive: "border-red-200 bg-red-100 text-red-700 hover:bg-red-200 shadow-[0_0_10px_rgba(220,38,38,0.15)]",
  outline: "border-slate-200 text-slate-700 hover:bg-slate-50",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
  warning: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.15)]",
};

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props} />
  )
}
