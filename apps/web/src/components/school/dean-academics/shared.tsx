import { type ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export const toneClasses: Record<
  Tone,
  { card: string; chip: string; dot: string; text: string }
> = {
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

export function listFromData<T>(data: unknown, listKey: string): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const record = data as Record<string, unknown>;
  const directList = record[listKey];

  if (Array.isArray(directList)) {
    return directList as T[];
  }

  const firstArray = Object.values(record).find(Array.isArray);
  return Array.isArray(firstArray) ? (firstArray as T[]) : [];
}

export function metricFromData(data: unknown, key: string, fallback = 0) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return fallback;
  }

  const metrics = (data as { metrics?: Record<string, unknown> }).metrics;
  const value = metrics?.[key];
  return typeof value === "number" || typeof value === "string"
    ? value
    : fallback;
}

export function fieldValue(record: unknown, keys: string[], fallback = "-") {
  if (!record || typeof record !== "object") {
    return fallback;
  }

  const row = record as Record<string, unknown>;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      if (typeof value === "object") {
        const nested = value as Record<string, unknown>;
        const nestedValue =
          nested.name ?? nested.title ?? nested.label ?? nested.id;
        if (
          nestedValue !== undefined &&
          nestedValue !== null &&
          nestedValue !== ""
        ) {
          return String(nestedValue);
        }
      }

      return String(value);
    }
  }

  return fallback;
}

export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium whitespace-nowrap",
        toneClasses[tone].chip,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full shrink-0",
          toneClasses[tone].dot,
        )}
      />
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
    <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="mt-0.5 text-slate-500">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-5 text-slate-500">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export const deanButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

export function QueryNotice({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <span>Could not load these records. {error.message}</span>
      <button type="button" onClick={onRetry} className={deanButtonClass}>
        Retry
      </button>
    </div>
  );
}
