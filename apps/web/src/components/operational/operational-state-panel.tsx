import { AlertTriangle, CheckCircle2, Clock3, Lock, RotateCcw, WifiOff } from "lucide-react";

export type OperationalPanelState =
  | "ACTIVE"
  | "LOADING"
  | "EMPTY"
  | "LOCKED"
  | "DEGRADED"
  | "FAILED"
  | "RETRY"
  | "OFFLINE_DRAFT";

const panelMap: Record<OperationalPanelState, { icon: typeof CheckCircle2; className: string; label: string }> = {
  ACTIVE: {
    icon: CheckCircle2,
    label: "Active",
    className: "border-success/20 bg-success-soft/50 text-success",
  },
  LOADING: {
    icon: Clock3,
    label: "Loading",
    className: "border-border bg-surface-muted text-muted",
  },
  EMPTY: {
    icon: CheckCircle2,
    label: "Empty",
    className: "border-border bg-primary-soft/40 text-muted",
  },
  LOCKED: {
    icon: Lock,
    label: "Locked",
    className: "border-border bg-surface-muted text-muted",
  },
  DEGRADED: {
    icon: AlertTriangle,
    label: "Degraded",
    className: "border-warning/20 bg-warning-soft/50 text-warning",
  },
  FAILED: {
    icon: AlertTriangle,
    label: "Failed",
    className: "border-danger/20 bg-danger-soft/50 text-danger",
  },
  RETRY: {
    icon: RotateCcw,
    label: "Retry",
    className: "border-warning/20 bg-warning-soft/50 text-warning",
  },
  OFFLINE_DRAFT: {
    icon: WifiOff,
    label: "Offline draft",
    className: "border-border bg-primary-soft/40 text-muted",
  },
};

export function OperationalStatePanel({
  state,
  title,
  message,
  actionLabel = "Retry",
  onAction,
}: {
  state: OperationalPanelState;
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const entry = panelMap[state];
  const Icon = entry.icon;

  return (
    <div className={`rounded-[var(--radius-sm)] border px-4 py-3 text-sm ${entry.className}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em]">{state}</p>
          <h3 className="mt-1 text-sm font-bold">{title ?? entry.label}</h3>
          <p className="mt-1 text-xs leading-5 text-current/80">{message}</p>
          {state === "FAILED" || state === "DEGRADED" || state === "RETRY" ? (
            <button
              type="button"
              onClick={onAction}
              className="mt-3 rounded-[var(--radius-xs)] border border-current/25 px-3 py-1.5 text-xs font-bold transition hover:-translate-y-0.5"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
