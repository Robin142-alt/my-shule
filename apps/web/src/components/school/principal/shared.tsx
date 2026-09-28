
import { type ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-success-border bg-success-soft text-emerald-900",
    chip: "border-success-border bg-success-soft text-success",
    dot: "bg-emerald-500",
    text: "text-success",
  },
  info: {
    card: "border-info-border bg-info-soft text-blue-950",
    chip: "border-info-border bg-info-soft text-info",
    dot: "bg-blue-500",
    text: "text-info",
  },
  warning: {
    card: "border-warning-border bg-warning-soft text-amber-950",
    chip: "border-warning-border bg-warning-soft text-warning",
    dot: "bg-amber-500",
    text: "text-warning",
  },
  danger: {
    card: "border-danger-border bg-danger-soft text-rose-950",
    chip: "border-danger-border bg-danger-soft text-danger",
    dot: "bg-rose-500",
    text: "text-danger",
  },
  neutral: {
    card: "border-slate-200 bg-white text-foreground",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

export function MetricCard({ label, value, icon: Icon, tone = "neutral" }: { label: string; value: string | number; icon?: LucideIcon; tone?: Tone }) {
  const border = tone === "danger" ? "border-danger-border bg-danger-soft" : tone === "warning" ? "border-warning-border bg-warning-soft" : tone === "success" ? "border-success-border bg-success-soft" : "border-border bg-surface-muted";
  const valColor = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className={cn("rounded-xl border p-4 flex flex-col justify-between", border)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-muted">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </div>
      <div className={cn("mt-2 text-3xl font-black", valColor)}>{value}</div>
    </div>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="app-workspace-panel rounded-2xl border border-border bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info-soft text-info">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-foreground">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
