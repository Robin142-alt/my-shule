
"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  FlaskConical,
  LucideIcon,
  PackagePlus,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";

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

export function LabQuickActions({ compact = false }: { compact?: boolean }) {
  const actions = [
    { label: "Add Item", section: "lab-inventory", action: "add-item", icon: PackagePlus },
    { label: "Add Stock", section: "lab-inventory", action: "add-stock", icon: PackagePlus },
    { label: "Prepare a Practical", section: "lab-timetable", action: "prepare", icon: FlaskConical },
    { label: "Issue Items", section: "apparatus-issue", action: "issue", icon: Send },
    { label: "Receive Returns", section: "apparatus-issue", action: "return", icon: RotateCcw },
    { label: "Record Breakage or Loss", section: "safety-incidents", action: "breakage", icon: ShieldAlert },
    { label: "Start Stocktake", section: "stocktake", action: "start", icon: ClipboardCheck },
  ];

  const navigate = (section: string, action: string) => {
    const segments = window.location.pathname.split("/").filter(Boolean);
    const roleIndex = segments.findIndex((segment) => segment === "laboratory-technician");
    const next = roleIndex >= 0
      ? `/${segments.slice(0, roleIndex + 1).join("/")}/${section}`
      : `/school/laboratory-technician/${section}`;
    window.location.assign(`${next}?action=${encodeURIComponent(action)}`);
  };

  return (
    <div className={cn("grid gap-2", compact ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-4")} aria-label="Laboratory quick actions">
      {actions.map(({ label, section, action, icon: Icon }) => (
        <button
          key={label}
          type="button"
          onClick={() => navigate(section, action)}
          className="flex min-h-12 items-center gap-3 rounded-xl border border-[#C8D5EA] bg-white px-3 py-2.5 text-left text-sm font-black text-[#071D49] shadow-sm transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-200"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#EEF5FF] text-[#1D4ED8]">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          {label}
        </button>
      ))}
    </div>
  );
}

export function WorkspaceError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-black">Laboratory records could not be loaded</p>
          <p className="mt-1 leading-6">{message}</p>
          {onRetry ? (
            <button type="button" onClick={onRetry} className="mt-3 min-h-10 rounded-lg bg-rose-900 px-4 font-black text-white">
              Retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function WorkspaceEmpty({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#B8C7DB] bg-[#F8FAFC] px-5 py-10 text-center">
      <p className="font-black text-[#071D49]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">{description}</p>
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function SaveState({ state }: { state: "saved" | "saving" | "failed" | "pending_sync" | null }) {
  const [displayState, setDisplayState] = useState(state);
  useEffect(() => setDisplayState(state), [state]);
  useEffect(() => {
    if (state !== "pending_sync") return;
    const complete = () => setDisplayState("saved");
    const failed = () => setDisplayState("failed");
    window.addEventListener("myshule:lab-sync-complete", complete);
    window.addEventListener("myshule:lab-sync-failed", failed);
    return () => {
      window.removeEventListener("myshule:lab-sync-complete", complete);
      window.removeEventListener("myshule:lab-sync-failed", failed);
    };
  }, [state]);
  if (!displayState) return null;
  const labels = {
    saved: "Saved",
    saving: "Saving…",
    failed: "Failed — your entered information is still here. Retry when ready.",
    pending_sync: "Pending Sync — saved on this device and waiting for a confirmed server response.",
  };
  const tone: Tone = displayState === "failed" ? "danger" : displayState === "pending_sync" ? "warning" : displayState === "saved" ? "success" : "info";
  return <div role="status" className={cn("rounded-lg border px-3 py-2 text-sm font-bold", toneClasses[tone].card)}>{labels[displayState]}</div>;
}
