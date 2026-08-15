"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BellRing,
  FileWarning,
  LayoutDashboard,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { MyShuleBrand, MyShuleMark } from "@/components/brand/myshule-brand";
import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import {
  requestDashboardApi,
  type ObservabilityAlert,
  type ObservabilityAlertsResponse,
  type ObservabilityHealthResponse,
} from "@/lib/dashboard/api-client";

type RouteMode = "hosted" | "public";
type ViewId = "overview" | "services" | "alerts" | "api-failures";
type HealthStatus = ObservabilityHealthResponse["overall_status"];

interface RecentApiFailure {
  timestamp: string;
  method: string;
  path: string;
  status_code: number;
  event: string;
  duration_ms: number | null;
}

interface RecentApiFailuresResponse {
  failures: RecentApiFailure[];
}

interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Live platform health" },
  { id: "services", label: "Services", icon: ServerCog, desc: "Subsystem status" },
  { id: "alerts", label: "Alerts", icon: BellRing, desc: "Open observability alerts" },
  { id: "api-failures", label: "API Failures", icon: FileWarning, desc: "Recent failed requests" },
];

const statusClasses: Record<HealthStatus, string> = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  degraded: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-600",
};

function StatusChip({ status }: { status: HealthStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold capitalize ${statusClasses[status]}`}>
      {status}
    </span>
  );
}

function Panel({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-[#071D49]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-[#C7D2E1] bg-[#F8FAFC] px-5 py-8 text-center text-sm text-[#64748B]">
      {children}
    </div>
  );
}

function metricValue(value: number | undefined) {
  return value === undefined ? "Not reported" : value.toLocaleString("en-KE");
}

function formatGeneratedAt(value: string | undefined) {
  if (!value) return "Not reported";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-KE");
}

function OverviewWorkspace({ health }: { health: ObservabilityHealthResponse | null }) {
  if (!health) {
    return <EmptyState>No authoritative platform health snapshot has been returned.</EmptyState>;
  }

  const metrics = [
    { label: "Overall status", value: health.overall_status, helper: "Computed by the live observability service" },
    { label: "Active alerts", value: metricValue(health.active_alert_count), helper: "Open SLO alerts" },
    { label: "Failed jobs", value: metricValue(health.failed_jobs), helper: "Reported by the queue monitor" },
    { label: "Sync queue", value: metricValue(health.sync_queue), helper: "Pending offline sync work" },
    { label: "API errors (1h)", value: metricValue(health.api_errors_1h), helper: "Recent API failures" },
    { label: "Generated", value: formatGeneratedAt(health.generated_at), helper: "Snapshot time from the API" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#64748B]">{metric.label}</p>
          <p className="mt-2 break-words text-xl font-black capitalize text-[#071D49]">{metric.value}</p>
          <p className="mt-2 text-xs leading-5 text-[#64748B]">{metric.helper}</p>
        </div>
      ))}
    </div>
  );
}

function ServicesWorkspace({ health }: { health: ObservabilityHealthResponse | null }) {
  const services = health?.subsystem_statuses ?? [];

  if (services.length === 0) {
    return <EmptyState>No live subsystem status records have been returned.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.08em] text-[#64748B]">
          <tr>
            <th className="px-4 py-3">Subsystem</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {services.map((service) => (
            <tr key={service.subsystem}>
              <td className="px-4 py-3 font-bold uppercase text-[#071D49]">{service.subsystem}</td>
              <td className="px-4 py-3"><StatusChip status={service.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlertsWorkspace({ alerts }: { alerts: ObservabilityAlert[] }) {
  if (alerts.length === 0) {
    return <EmptyState>No open observability alerts were returned.</EmptyState>;
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <article key={alert.id} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${alert.severity === "critical" ? "text-rose-600" : "text-amber-600"}`} />
              <h3 className="font-bold text-[#071D49]">{alert.title}</h3>
            </div>
            <span className="rounded-full border border-[#D8E0EC] bg-white px-2.5 py-1 text-xs font-bold uppercase text-[#64748B]">
              {alert.subsystem} · {alert.severity}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#475569]">{alert.message}</p>
          <p className="mt-2 text-xs text-[#64748B]">Triggered {formatGeneratedAt(alert.triggered_at)}</p>
        </article>
      ))}
    </div>
  );
}

function ApiFailuresWorkspace({ failures }: { failures: RecentApiFailure[] }) {
  if (failures.length === 0) {
    return <EmptyState>No recent API failures were returned.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.08em] text-[#64748B]">
          <tr>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Request</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Duration</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {failures.map((failure, index) => (
            <tr key={`${failure.timestamp}-${failure.method}-${failure.path}-${index}`}>
              <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">{formatGeneratedAt(failure.timestamp)}</td>
              <td className="px-4 py-3 font-mono text-xs text-[#071D49]">{failure.method} {failure.path}</td>
              <td className="px-4 py-3 font-bold text-rose-700">{failure.status_code}</td>
              <td className="px-4 py-3 text-[#475569]">{failure.event}</td>
              <td className="whitespace-nowrap px-4 py-3 text-[#64748B]">
                {failure.duration_ms === null ? "Not reported" : `${failure.duration_ms} ms`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SystemMonitorDashboard({ routeMode }: { routeMode: RouteMode }) {
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const [health, setHealth] = useState<ObservabilityHealthResponse | null>(null);
  const [alerts, setAlerts] = useState<ObservabilityAlert[]>([]);
  const [failures, setFailures] = useState<RecentApiFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLiveMonitor = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [healthResult, alertsResult, failuresResult] = await Promise.allSettled([
      requestDashboardApi<ObservabilityHealthResponse>("/api/observability/health?audience=superadmin"),
      requestDashboardApi<ObservabilityAlertsResponse>("/api/observability/alerts?audience=superadmin"),
      requestDashboardApi<RecentApiFailuresResponse>("/api/observability/api-failures?audience=superadmin&limit=20"),
    ]);

    if (healthResult.status === "fulfilled") {
      setHealth(healthResult.value);
    } else {
      setHealth(null);
    }

    setAlerts(alertsResult.status === "fulfilled" ? alertsResult.value.alerts ?? [] : []);
    setFailures(failuresResult.status === "fulfilled" ? failuresResult.value.failures ?? [] : []);

    const failuresBySource = [healthResult, alertsResult, failuresResult].filter(
      (result) => result.status === "rejected",
    ).length;

    if (failuresBySource > 0) {
      setError(
        failuresBySource === 3
          ? "Live System Monitor data could not be loaded. No fallback school or incident records are shown."
          : `${failuresBySource} live monitor source${failuresBySource === 1 ? "" : "s"} could not be loaded; unavailable sections remain empty.`,
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadLiveMonitor(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadLiveMonitor]);

  const activeItem = navItems.find((item) => item.id === activeView) ?? navItems[0];

  return (
    <div className="flex min-h-dvh bg-[#F3F6FA] font-sans">
      <aside className="hidden h-dvh w-[260px] shrink-0 overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <MyShuleBrand markSize={38} nameClassName="text-base" />
          <h2 className="mt-2 text-xl font-black">System Monitor</h2>
          <p className="mt-2 text-sm leading-6 text-white/65">Live platform observability</p>
        </div>
        <nav className="space-y-1" aria-label="System Monitor navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  activeView === item.id ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  <span className="block text-sm font-bold">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{item.desc}</span>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="flex h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 shrink-0 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <MyShuleMark size={40} />
              <div>
                <h1 className="text-lg font-black text-[#071D49]">{activeItem.label}</h1>
                <p className="text-xs text-[#64748B]">{activeItem.desc}</p>
              </div>
              <span className="rounded-full border border-[#D8E0EC] bg-[#F8FAFC] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#64748B]">
                {routeMode}
              </span>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {health ? <StatusChip status={health.overall_status} /> : null}
              <button
                type="button"
                onClick={() => void loadLiveMonitor()}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#071D49] px-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-3 lg:hidden">
            <MobileWorkspaceNavigation
              label="System monitor workspace"
              items={navItems}
              value={activeView}
              onValueChange={(value) => setActiveView(value as ViewId)}
              testId="system-monitor-mobile-workspace-nav"
            />
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-4 lg:p-6">
          {error ? (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {loading && !health ? (
            <EmptyState>Loading live platform observability…</EmptyState>
          ) : (
            <Panel
              title={activeItem.label}
              description={`${activeItem.desc}. Values are rendered only from the current observability API response.`}
              action={
                health ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Live API snapshot
                  </div>
                ) : undefined
              }
            >
              {activeView === "overview" ? <OverviewWorkspace health={health} /> : null}
              {activeView === "services" ? <ServicesWorkspace health={health} /> : null}
              {activeView === "alerts" ? <AlertsWorkspace alerts={alerts} /> : null}
              {activeView === "api-failures" ? <ApiFailuresWorkspace failures={failures} /> : null}
            </Panel>
          )}

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <Activity className="h-4 w-4" />
            School names, learner records, and fabricated incidents are never used as monitor fallbacks.
          </div>
        </div>
      </main>
    </div>
  );
}
