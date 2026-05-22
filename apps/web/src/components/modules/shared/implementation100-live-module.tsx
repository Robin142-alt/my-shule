"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CheckCircle2, ClipboardList, RefreshCw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { StatusTone } from "@/lib/dashboard/types";

export type Implementation100Record = {
  id: string;
  title: string;
  category?: string | null;
  owner_name?: string | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
  metric_count?: number;
};

export type Implementation100Dashboard = {
  total_records: number;
  open_records: number;
  action_due: number;
  critical_records: number;
  records: Implementation100Record[];
  activity: Array<{ id: string; action: string; created_at?: string }>;
};

const emptyDashboard: Implementation100Dashboard = {
  total_records: 0,
  open_records: 0,
  action_due: 0,
  critical_records: 0,
  records: [],
  activity: [],
};

const fieldClassName =
  "w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/50 focus:shadow-[var(--shadow-focus)]";

function normalizeDashboard(payload: unknown): Implementation100Dashboard {
  const source = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data?: unknown }).data
    : payload;
  const value = source && typeof source === "object" ? source as Partial<Implementation100Dashboard> : {};

  return {
    ...emptyDashboard,
    ...value,
    records: Array.isArray(value.records) ? value.records : [],
    activity: Array.isArray(value.activity) ? value.activity : [],
  };
}

function toneFor(value: string | undefined): StatusTone {
  if (["critical", "blocked", "failed", "incident", "overdue"].includes(value ?? "")) {
    return "critical";
  }

  if (["submitted", "scheduled", "in_progress", "open", "high"].includes(value ?? "")) {
    return "warning";
  }

  return "ok";
}

function formatStatus(value: string | undefined) {
  return (value ?? "open").replaceAll("_", " ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  tone = "ok",
}: {
  label: string;
  value: number;
  tone?: StatusTone;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {label}
          </p>
          <p className="mt-3 text-2xl font-bold leading-none text-foreground">{value}</p>
        </div>
        <StatusPill label={tone} tone={tone} compact />
      </div>
    </Card>
  );
}

export function Implementation100LiveModuleScreen({
  apiBase,
  moduleTitle,
  entityLabel,
  tenantSlug,
  initialDashboard,
  categories,
}: {
  apiBase: string;
  moduleTitle: string;
  entityLabel: string;
  tenantSlug?: string | null;
  initialDashboard?: Implementation100Dashboard;
  categories: string[];
}) {
  const [dashboard, setDashboard] = useState<Implementation100Dashboard>(() => initialDashboard ?? emptyDashboard);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const connectedLabel = `Live ${moduleTitle.toLowerCase()} API connected`;
  const overdueTone = useMemo<StatusTone>(
    () => dashboard.critical_records > 0 ? "critical" : dashboard.action_due > 0 ? "warning" : "ok",
    [dashboard.action_due, dashboard.critical_records],
  );

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/dashboard`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`${moduleTitle} dashboard could not be loaded.`);
      }

      const payload = await response.json().catch(() => ({}));
      setDashboard(normalizeDashboard(payload));
      setMessage(connectedLabel);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : `${moduleTitle} dashboard could not be loaded.`);
    } finally {
      setRefreshing(false);
    }
  }, [apiBase, connectedLabel, moduleTitle]);

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshDashboard();
    }, 0);

    return () => window.clearTimeout(refreshTimer);
  }, [refreshDashboard]);

  function value(formData: FormData, key: string) {
    return String(formData.get(key) ?? "").trim();
  }

  async function submitRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${apiBase}/records`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),
        },
        body: JSON.stringify({
          title: value(formData, "title"),
          category: value(formData, "category") || undefined,
          owner_name: value(formData, "owner_name") || undefined,
          priority: value(formData, "priority") || "normal",
          due_date: value(formData, "due_date") || undefined,
          metric_count: Number(value(formData, "metric_count") || 0),
          notes: value(formData, "notes") || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`${moduleTitle} record was not accepted.`);
      }

      setMessage(`${entityLabel} posted`);
      event.currentTarget.reset();
      await refreshDashboard();
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : `${moduleTitle} record was not accepted.`);
    } finally {
      setSaving(false);
    }
  }

  async function closeRecord(record: Implementation100Record) {
    setSaving(true);
    setError(null);

    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`${apiBase}/records/${record.id}/status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "x-myshule-csrf": csrfToken } : {}),
        },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        throw new Error(`${entityLabel} status was not updated.`);
      }

      setMessage(`${entityLabel} completed`);
      await refreshDashboard();
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : `${entityLabel} status was not updated.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[var(--radius)] border border-border bg-surface px-5 py-5 shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={message ?? (error ? "API attention" : moduleTitle)} tone={error ? "critical" : "ok"} />
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-primary">
                {tenantSlug || "school tenant"}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-3xl">
              {moduleTitle}
            </h2>
          </div>
          <Button variant="secondary" onClick={refreshDashboard} disabled={refreshing}>
            <RefreshCw className="h-4 w-4" />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
        {error ? (
          <div className="mt-4 rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total" value={dashboard.total_records} />
        <StatCard label="Open" value={dashboard.open_records} tone={dashboard.open_records > 0 ? "warning" : "ok"} />
        <StatCard label="Action due" value={dashboard.action_due} tone={overdueTone} />
        <StatCard label="Critical" value={dashboard.critical_records} tone={overdueTone} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-accent" />
              <h3 className="text-base font-semibold text-foreground">{entityLabel} board</h3>
            </div>
            <StatusPill label={`${dashboard.records.length}`} tone={dashboard.records.length > 0 ? "ok" : "warning"} />
          </div>
          <div className="mt-4 space-y-3">
            {dashboard.records.length === 0 ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
                No records yet.
              </div>
            ) : dashboard.records.map((record) => (
              <div key={record.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{record.title}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      {record.category ?? entityLabel} - {record.owner_name ?? "Unassigned"} - {record.metric_count ?? 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill label={formatStatus(record.priority)} tone={toneFor(record.priority)} />
                    <StatusPill label={formatStatus(record.status)} tone={toneFor(record.status)} />
                    <Button size="sm" variant="secondary" onClick={() => void closeRecord(record)} disabled={saving}>
                      Complete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            <h3 className="text-base font-semibold text-foreground">New {entityLabel.toLowerCase()}</h3>
          </div>
          <form className="mt-4 space-y-4" onSubmit={submitRecord}>
            <Field label="Title">
              <input className={fieldClassName} name="title" placeholder={`${entityLabel} title`} required />
            </Field>
            <Field label="Category">
              <select className={fieldClassName} name="category" defaultValue={categories[0] ?? "general"}>
                {categories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="Owner">
              <input className={fieldClassName} name="owner_name" placeholder="Owner" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Priority">
                <select className={fieldClassName} name="priority" defaultValue="normal">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </Field>
              <Field label="Metric">
                <input className={fieldClassName} name="metric_count" type="number" min="0" placeholder="0" />
              </Field>
            </div>
            <Field label="Due date">
              <input className={fieldClassName} name="due_date" type="date" />
            </Field>
            <Field label="Notes">
              <input className={fieldClassName} name="notes" placeholder="Notes" />
            </Field>
            <Button type="submit" disabled={saving}>
              <ShieldAlert className="h-4 w-4" />
              {saving ? "Posting..." : `Post ${entityLabel.toLowerCase()}`}
            </Button>
          </form>
        </Card>
      </section>
    </div>
  );
}
