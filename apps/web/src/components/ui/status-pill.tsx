import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";

import type { StatusTone, SyncState } from "@/lib/dashboard/types";

const toneMap: Record<StatusTone, { icon: typeof ShieldAlert; className: string }> = {
  critical: {
    icon: ShieldAlert,
    className: "border border-danger/25 bg-danger-soft text-danger shadow-[0_0_18px_rgba(248,113,113,0.08)]",
  },
  warning: {
    icon: AlertTriangle,
    className: "border border-warning/25 bg-warning-soft text-warning shadow-[0_0_18px_rgba(251,191,36,0.08)]",
  },
  ok: {
    icon: CheckCircle2,
    className: "border border-success/25 bg-success-soft text-success shadow-[0_0_18px_rgba(52,211,153,0.08)]",
  },
};

const syncMap: Record<SyncState, StatusTone> = {
  synced: "ok",
  pending: "warning",
  failed: "critical",
};

export function StatusPill({
  label,
  tone,
  compact = false,
}: {
  label: string;
  tone: StatusTone | SyncState;
  compact?: boolean;
}) {
  const resolved = tone in syncMap ? syncMap[tone as SyncState] : (tone as StatusTone);
  const entry = toneMap[resolved];
  const Icon = entry.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-tight whitespace-nowrap ${entry.className}`}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3 w-3"} />
      {label}
    </span>
  );
}
