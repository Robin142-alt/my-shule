import React from "react";
import Link from "next/link";
import { resolveDashboardActionHref } from "@/lib/dashboard/action-routes";

type UnifiedActionButton = {
  id: string;
  label: string;
  action: string;
  href?: string;
  executionType?: "ROUTE";
  state: "ACTIVE" | "DEGRADED" | "FAILED" | "LOCKED";
};

type UnifiedWidget = {
  widget_id?: string;
  widgetId?: string;
  payload?: unknown;
  state?: "ACTIVE" | "DEGRADED" | "FAILED" | "LOCKED" | "LOADING" | "EMPTY";
};

type UnifiedLayoutPayload = {
  role?: string;
  buttons?: UnifiedActionButton[];
  widgets?: UnifiedWidget[];
};

export function UnifiedLayoutRenderer({ layoutPayload }: { layoutPayload: UnifiedLayoutPayload | null | undefined }) {
  if (!layoutPayload) return <div className="p-8">Failed to load dashboard layout.</div>;

  const { widgets = [], buttons = [], role = "admin" } = layoutPayload;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Welcome back to your workspace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {buttons.map((btn) => {
            const href = btn.href ?? resolveDashboardActionHref(role, btn.action);

            if (btn.state === "ACTIVE" && href) {
              return (
                <Link
                  key={btn.id}
                  href={href}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
                  title={btn.label}
                >
                  {btn.label}
                </Link>
              );
            }

            return (
              <button
                key={btn.id}
                disabled
                className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400 shadow-sm transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                title={btn.state === "LOCKED" ? "Capability Required" : "Action unavailable in the current workflow state"}
              >
                {btn.label}
                {btn.state === "LOCKED" && <span className="ml-2 text-xs">Locked</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {widgets.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Widgets Assigned</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Your role does not have any active dashboard widgets.</p>
          </div>
        ) : (
          widgets.map((widget, i) => (
            <div key={i} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">{widget.widget_id ?? widget.widgetId ?? "Widget"}</h3>
              <div className="flex-1 overflow-auto">
                <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {JSON.stringify(widget.payload, null, 2)}
                </pre>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  widget.state === "ACTIVE" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                  widget.state === "DEGRADED" ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" :
                  "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                }`}>
                  {widget.state}
                </span>
                <span className="text-xs text-slate-400">Governance: AGP Bound</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
