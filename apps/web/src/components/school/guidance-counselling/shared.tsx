
import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    card: "border-blue-200 bg-blue-50 text-blue-950",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50 text-rose-950",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-white text-[#071D49]",
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

export function toneForStatus(status: string): Tone {
  const normalized = status.trim().toLowerCase();
  if (["active", "accepted", "closed", "completed", "done", "notified", "resolved"].includes(normalized)) return "success";
  if (["open", "pending", "scheduled", "logged", "in progress"].includes(normalized)) return "warning";
  if (["critical", "declined", "flagged", "missed", "overdue"].includes(normalized)) return "danger";
  if (["queued", "submitted", "sent"].includes(normalized)) return "info";
  return "neutral";
}

export function MetricCard({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className={cn("rounded-xl border p-4", toneClasses[tone].card)}>
      <div className="text-sm font-semibold opacity-80">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}

export function WorkspaceFailure({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p className="font-black">{title}</p>
      <p className="mt-1 break-words">{error.message}</p>
      <button type="button" onClick={onRetry} className="mt-3 font-black underline underline-offset-2">
        Retry
      </button>
    </div>
  );
}

export function WorkspaceEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C8D5EA] bg-[#F8FAFC] px-5 py-8 text-center text-sm leading-6 text-[#64748B]">
      {children}
    </div>
  );
}

export const fieldClassName = "mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm text-[#071D49] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

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
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
