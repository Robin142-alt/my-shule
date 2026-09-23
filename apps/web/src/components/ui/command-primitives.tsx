import type { ReactNode } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, CircleAlert } from "lucide-react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import type { StatusTone } from "@/lib/dashboard/types";

function toneClass(tone: StatusTone = "ok") {
  if (tone === "critical") {
    return "text-danger";
  }

  if (tone === "warning") {
    return "text-warning";
  }

  return "text-success";
}

export function MiniSparkline({
  values,
  tone = "warning",
}: {
  values: number[];
  tone?: StatusTone;
}) {
  const safeValues = values.length > 0 ? values : [0, 0, 0];
  const max = Math.max(...safeValues, 1);
  const points = safeValues
    .map((value, index) => {
      const x = (index / Math.max(safeValues.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={`h-10 w-full ${toneClass(tone)}`}
      aria-hidden="true"
    >
      <polygon fill="currentColor" opacity="0.1" points={`0,100 ${points} 100,100`} />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        points={points}
      />
    </svg>
  );
}

export function LiveIndicator({
  label = "Live",
  tone = "ok",
}: {
  label?: string;
  tone?: StatusTone;
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-semibold ${toneClass(tone)}`}>
      <span className="pulse-indicator relative inline-flex h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function ProgressRing({
  value,
  label,
  tone = "ok",
}: {
  value: number;
  label: string;
  tone?: StatusTone;
}) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid h-14 w-14 place-items-center rounded-full ${toneClass(tone)}`}
        style={{
          background: `conic-gradient(currentColor ${clamped * 3.6}deg, rgba(148, 163, 184, 0.16) 0deg)`,
        }}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-surface text-[11px] font-bold text-foreground">
          {clamped}%
        </div>
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </div>
  );
}

export function RiskHeatmap({
  cells,
}: {
  cells: Array<{ id: string; label: string; tone: StatusTone; value?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map((cell) => (
        <div
          key={cell.id}
        className={`rounded-[var(--radius-sm)] border px-3 py-2 ${
            cell.tone === "critical"
              ? "border-danger/25 bg-danger-soft"
              : cell.tone === "warning"
                ? "border-warning/25 bg-warning-soft"
                : "border-success/25 bg-success-soft"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {cell.label}
          </p>
          <p className={`mt-1 text-sm font-bold ${toneClass(cell.tone)}`}>
            {cell.value ?? cell.tone}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SignalStrip({
  items,
}: {
  items: Array<{ id: string; label: string; value: string; tone: StatusTone }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {item.label}
            </p>
            <StatusPill label={item.tone} tone={item.tone} compact />
          </div>
          <p className="mt-2 text-lg font-bold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function OperationalTimeline({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    detail: string;
    timeLabel?: string;
    tone?: StatusTone;
    icon?: ReactNode;
  }>;
}) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition hover:bg-surface-strong">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-xs)] border border-border bg-white">
            {item.icon ?? <Activity className={`h-3.5 w-3.5 ${toneClass(item.tone ?? "ok")}`} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[13px] font-semibold text-foreground">{item.title}</p>
              {item.timeLabel ? <p className="shrink-0 text-[11px] text-muted-strong">{item.timeLabel}</p> : null}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted">{item.detail}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommandInsightCard({
  title,
  description,
  value,
  tone = "warning",
  children,
}: {
  title: string;
  description: string;
  value?: string;
  tone?: StatusTone;
  children?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{title}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        </div>
        {value ? <StatusPill label={value} tone={tone} /> : <CircleAlert className={`h-4 w-4 ${toneClass(tone)}`} />}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </Card>
  );
}

export function CommandMetricCard({
  label,
  value,
  helper,
  trend,
  direction = "up",
  href,
  sparkline = [],
  tone = "ok",
  className = "",
}: {
  label: string;
  value: string;
  helper: string;
  trend?: string;
  direction?: "up" | "down";
  href?: string;
  sparkline?: number[];
  tone?: StatusTone;
  className?: string;
}) {
  const positive = direction === "up";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {trend ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
              positive ? "border-success/25 bg-success-soft text-success" : "border-warning/25 bg-warning-soft text-warning"
            }`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </span>
        ) : null}
      </div>
      <p data-testid="kpi-value" className="mt-3 text-3xl font-bold leading-none text-foreground finance-number">{value}</p>
      <p className="mt-2 min-h-8 text-xs leading-5 text-muted">{helper}</p>
      {sparkline.length > 0 ? <div className="mt-3">
        <MiniSparkline values={sparkline} tone={tone} />
      </div> : null}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        data-testid="kpi-card"
        className={`dashboard-card block rounded-[var(--radius)] p-4 transition hover:-translate-y-0.5 ${className}`}
      >
        {body}
      </a>
    );
  }

  return <Card className={`p-4 ${className}`}>{body}</Card>;
}
