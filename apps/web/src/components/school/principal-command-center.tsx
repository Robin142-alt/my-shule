"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, BrainCircuit, RadioTower, ShieldCheck } from "lucide-react";

import { MetricGrid } from "@/components/experience/metric-grid";
import { ApprovalCommandPanel } from "@/components/workflows/approval-command-panel";
import { Card } from "@/components/ui/card";
import {
  CommandInsightCard,
  LiveIndicator,
  OperationalTimeline,
  ProgressRing,
  RiskHeatmap,
  SignalStrip,
} from "@/components/ui/command-primitives";
import { DataTable } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill } from "@/components/ui/status-pill";
import { redirectOnExpiredSessionResponse } from "@/lib/auth/session-expiry-client";
import { getVisibleApprovalWorkflows, isModuleCodeEnabled } from "@/lib/workflows/workflow-catalog";

type PrincipalCommandView = "dashboard" | "analytics" | "risks" | "approvals" | "staff" | "audit";

type PrincipalDashboardWidget = {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  status: "normal" | "warning" | "critical";
};

type PrincipalDashboardSection = {
  id: string;
  module_code: string;
  title: string;
  category: string;
  confidentiality?: "summary_only" | "restricted" | "standard";
  widgets: PrincipalDashboardWidget[];
  alerts: Array<{
    id: string;
    title: string;
    message: string;
    severity: "warning" | "critical";
  }>;
  reports: string[];
};

type PrincipalDashboardResponse = {
  tenant_id: string;
  generated_at: string;
  enabled_modules: string[];
  overview: {
    total_students: number;
    total_teachers: number;
    total_support_staff: number;
    active_classes_streams: number;
    student_attendance_today: number;
    teacher_attendance_today: number;
    parent_engagement_rate: number;
    active_users_online: number;
  };
  sections: PrincipalDashboardSection[];
  alerts: Array<{
    id: string;
    module_code: string;
    title: string;
    message: string;
    severity: "warning" | "critical";
  }>;
  realtime_channels: string[];
  report_exports: string[];
};

function metricNumber(value: number | string | undefined) {
  if (typeof value === "number") {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInsightValue(value: number | string | undefined, unit?: string) {
  if (unit === "KES cents") {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(metricNumber(value) / 100);
  }

  if (unit === "%") {
    return `${metricNumber(value).toFixed(0)}%`;
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("en-KE").format(value);
  }

  return value ?? "0";
}

function widgetTone(status: PrincipalDashboardWidget["status"]) {
  return status === "critical" ? "critical" : status === "warning" ? "warning" : "ok";
}

function getModuleLabel(moduleCode: string) {
  return moduleCode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const viewCopy: Record<PrincipalCommandView, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Principal Command",
    title: "Executive command center",
    description: "Oversight, approvals, risk detection, accountability, AI insights, and live governance across enabled modules only.",
  },
  analytics: {
    eyebrow: "Executive Analytics",
    title: "Institutional performance intelligence",
    description: "Trend, posture, and module-level summaries for principal oversight without operational clutter.",
  },
  risks: {
    eyebrow: "Alerts & Risks",
    title: "Risk detection center",
    description: "Critical signals, warning bands, and module-aware anomalies that need executive attention.",
  },
  approvals: {
    eyebrow: "Approvals",
    title: "Governance approval queue",
    description: "Role-based approvals, escalation visibility, and release controls from enabled workflows only.",
  },
  staff: {
    eyebrow: "Users & Staff",
    title: "Access and accountability",
    description: "Staff coverage, active sessions, RBAC posture, and user-governance signals for the school tenant.",
  },
  audit: {
    eyebrow: "Audit Logs",
    title: "Immutable accountability trail",
    description: "Critical actions, release gates, and module events summarized for principal governance.",
  },
};

export function PrincipalCommandCenter({
  tenantSlug,
  view = "dashboard",
}: {
  tenantSlug?: string | null;
  view?: PrincipalCommandView;
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<PrincipalDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;
    const query = tenantSlug ? `?tenantSlug=${encodeURIComponent(tenantSlug)}` : "";

    async function loadDashboard(showLoading = true) {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(`/api/admin-command/principal/dashboard${query}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (redirectOnExpiredSessionResponse(response, "school", (href) => router.replace(href))) {
          return;
        }

        if (!response.ok) {
          throw new Error("Principal dashboard is not available.");
        }

        const payload = await response.json() as PrincipalDashboardResponse;

        if (!cancelled) {
          setDashboard(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Principal dashboard is not available.");
        }
      } finally {
        if (!cancelled && showLoading) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    const refreshTimer = window.setInterval(() => {
      void loadDashboard(false);
    }, 45_000);

    if (typeof EventSource !== "undefined") {
      eventSource = new EventSource(`/api/admin-command/principal/dashboard/stream${query}`, {
        withCredentials: true,
      });
      eventSource.addEventListener("principal.dashboard", (event) => {
        try {
          const payload = JSON.parse((event as MessageEvent<string>).data) as PrincipalDashboardResponse;

          if (!cancelled) {
            setDashboard(payload);
            setError(null);
            setLoading(false);
          }
        } catch {
          if (!cancelled) {
            setError("Principal dashboard stream sent an unreadable update.");
          }
        }
      });
      eventSource.addEventListener("principal.error", (event) => {
        if (!cancelled) {
          setError((event as MessageEvent<string>).data || "Principal dashboard stream is unavailable.");
        }
      });
    }

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      eventSource?.close();
    };
  }, [router, tenantSlug]);

  const enabledModuleCodes = useMemo(
    () => new Set(dashboard?.enabled_modules ?? []),
    [dashboard?.enabled_modules],
  );
  const copy = viewCopy[view];
  const overview = dashboard?.overview;
  const sections = dashboard?.sections ?? [];
  const alerts = dashboard?.alerts ?? [];
  const approvalWorkflows = getVisibleApprovalWorkflows({
    role: "principal",
    enabledModuleCodes,
  });
  const overviewMetrics = [
    { id: "students", label: "Students", value: formatInsightValue(overview?.total_students), helper: "Active learner population", trend: "monitored" },
    { id: "teachers", label: "Teachers", value: formatInsightValue(overview?.total_teachers), helper: "Active teaching staff", trend: "covered" },
    { id: "classes", label: "Classes", value: formatInsightValue(overview?.active_classes_streams), helper: "Active classes and streams", trend: "scheduled" },
    { id: "parent-engagement", label: "Parent engagement", value: formatInsightValue(overview?.parent_engagement_rate, "%"), helper: "Linked active guardians", trend: "live" },
  ];
  const criticalCount = alerts.filter((alert) => alert.severity === "critical").length;
  const warningCount = alerts.filter((alert) => alert.severity === "warning").length;
  const healthScore = Math.max(44, 92 - criticalCount * 12 - warningCount * 5);
  const alertRows = alerts.length > 0
    ? alerts
    : [{ id: "none", title: "No critical alerts", module_code: "all", message: "All enabled modules are within normal range.", severity: "warning" as const }];
  const auditRows = [
    {
      id: "audit-generated",
      action: "Executive dashboard generated",
      module: "principal_dashboard",
      actor: "system",
      state: dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString("en-KE") : "pending",
      tone: "ok" as const,
    },
    ...alerts.slice(0, 5).map((alert) => ({
      id: `audit-${alert.id}`,
      action: alert.title,
      module: alert.module_code,
      actor: "risk engine",
      state: alert.severity,
      tone: alert.severity === "critical" ? "critical" as const : "warning" as const,
    })),
  ];
  const staffRows = [
    {
      id: "teachers",
      group: "Teaching staff",
      count: formatInsightValue(overview?.total_teachers),
      posture: `${formatInsightValue(overview?.teacher_attendance_today, "%")} attendance`,
      tone: metricNumber(overview?.teacher_attendance_today) < 86 ? "warning" as const : "ok" as const,
    },
    {
      id: "support",
      group: "Support staff",
      count: formatInsightValue(overview?.total_support_staff),
      posture: "Tenant-scoped access",
      tone: "ok" as const,
    },
    {
      id: "active-users",
      group: "Active sessions",
      count: formatInsightValue(overview?.active_users_online),
      posture: "Live session health",
      tone: "ok" as const,
    },
  ];

  return (
    <div className="space-y-6" data-testid="principal-command-center">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LiveIndicator label={loading ? "Syncing" : "Live"} tone={loading ? "warning" : "ok"} />
            <StatusPill label={`${dashboard?.enabled_modules.length ?? 0} modules`} tone="ok" />
          </div>
        }
        meta={
          <span className="badge badge-neutral">
            Generated {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleTimeString("en-KE") : "pending"}
          </span>
        }
      />

      {error ? (
        <Card className="border-warning/25 bg-warning-soft p-4">
          <p className="text-sm font-semibold text-foreground">{error}</p>
        </Card>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <MetricGrid items={overviewMetrics} />
          <SignalStrip
            items={[
              { id: "critical", label: "Critical risks", value: `${criticalCount}`, tone: criticalCount > 0 ? "critical" : "ok" },
              { id: "warnings", label: "Warnings", value: `${warningCount}`, tone: warningCount > 0 ? "warning" : "ok" },
              { id: "online", label: "Active users", value: formatInsightValue(overview?.active_users_online), tone: "ok" },
            ]}
          />
        </div>
        <Card className="p-5">
          <p className="eyebrow">School health</p>
          <div className="mt-5">
            <ProgressRing value={healthScore} label="Executive posture" tone={healthScore < 60 ? "critical" : healthScore < 80 ? "warning" : "ok"} />
          </div>
          <div className="mt-5">
            <RiskHeatmap
              cells={[
                { id: "fees", label: "Fees", tone: isModuleCodeEnabled("finance", enabledModuleCodes) ? "ok" : "warning", value: isModuleCodeEnabled("finance", enabledModuleCodes) ? "on" : "off" },
                { id: "exams", label: "Exams", tone: isModuleCodeEnabled("exams", enabledModuleCodes) ? "ok" : "warning", value: isModuleCodeEnabled("exams", enabledModuleCodes) ? "on" : "off" },
                { id: "clinic", label: "Clinic", tone: isModuleCodeEnabled("clinic_health", enabledModuleCodes) ? "ok" : "warning", value: isModuleCodeEnabled("clinic_health", enabledModuleCodes) ? "on" : "off" },
                { id: "transport", label: "Transport", tone: isModuleCodeEnabled("transport", enabledModuleCodes) ? "ok" : "warning", value: isModuleCodeEnabled("transport", enabledModuleCodes) ? "on" : "off" },
              ]}
            />
          </div>
        </Card>
      </section>

      {view === "dashboard" || view === "analytics" ? (
        <section className="grid gap-4 xl:grid-cols-3">
          {sections.slice(0, 12).map((section) => (
            <Card key={section.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{section.category}</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{section.title}</h3>
                <p className="mt-1 text-xs text-muted">{getModuleLabel(section.module_code)}</p>
              </div>
              <StatusPill
                label={section.confidentiality === "summary_only" ? "Summary" : "Active"}
                tone={section.alerts.length > 0 ? "warning" : "ok"}
              />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {section.widgets.slice(0, 4).map((widget) => (
                <div key={widget.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/75 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted">{widget.title}</p>
                    <StatusPill label={widget.status === "normal" ? "OK" : widget.status} tone={widgetTone(widget.status)} compact />
                  </div>
                  <p className="mt-2 text-2xl font-bold text-foreground">
                    {formatInsightValue(widget.value, widget.unit)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {section.reports.slice(0, 3).map((report) => (
                <span key={report} className="rounded-full border border-border bg-primary-soft/40 px-2.5 py-1 text-xs font-semibold text-muted">
                  {report}
                </span>
              ))}
            </div>
            </Card>
          ))}
        </section>
      ) : null}

      {view === "dashboard" || view === "risks" || view === "approvals" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <DataTable
          title="Alerts and risk center"
          subtitle="Critical and warning signals from active modules only."
          columns={[
            { id: "title", header: "Alert", render: (row) => row.title },
            { id: "module", header: "Module", render: (row) => row.module_code },
            { id: "severity", header: "Severity", render: (row) => <StatusPill label={row.severity} tone={row.severity} /> },
          ]}
          rows={alertRows}
          getRowKey={(row) => row.id}
          />
          <ApprovalCommandPanel workflows={approvalWorkflows} />
        </section>
      ) : null}

      {view === "staff" ? (
        <DataTable
          title="Users and staff accountability"
          subtitle="Staff and active-session posture for this tenant."
          columns={[
            { id: "group", header: "Group", render: (row) => row.group },
            { id: "count", header: "Count", render: (row) => row.count },
            { id: "posture", header: "Posture", render: (row) => row.posture },
            { id: "state", header: "State", render: (row) => <StatusPill label={row.tone === "ok" ? "Controlled" : "Review"} tone={row.tone} /> },
          ]}
          rows={staffRows}
          getRowKey={(row) => row.id}
        />
      ) : null}

      {view === "audit" ? (
        <DataTable
          title="Audit trail summary"
          subtitle="Immutable executive events surfaced without exposing operational clutter."
          columns={[
            { id: "action", header: "Action", render: (row) => row.action },
            { id: "module", header: "Module", render: (row) => row.module },
            { id: "actor", header: "Actor", render: (row) => row.actor },
            { id: "state", header: "State", render: (row) => <StatusPill label={row.state} tone={row.tone} /> },
          ]}
          rows={auditRows}
          getRowKey={(row) => row.id}
        />
      ) : null}

      {view === "dashboard" || view === "analytics" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {isModuleCodeEnabled("ai_insights", enabledModuleCodes) ? (
          <CommandInsightCard
            title="AI insights"
            description="Timestamped, explainable, and auditable insight stream filtered to enabled modules."
            value="Audited"
            tone="ok"
          >
            <OperationalTimeline
              items={[
                { id: "ai-fees", title: "Fee default risk", detail: "Explained by collection velocity and arrears aging.", timeLabel: "now", tone: "warning", icon: <BrainCircuit className="h-3.5 w-3.5 text-accent" /> },
                { id: "ai-attendance", title: "Attendance anomaly", detail: "Repeated morning absence pattern requires deputy review.", timeLabel: "12m", tone: "warning", icon: <Activity className="h-3.5 w-3.5 text-warning" /> },
                { id: "ai-audit", title: "Audit-ready output", detail: "All recommendations keep source modules, timestamp, and reason.", timeLabel: "live", tone: "ok", icon: <ShieldCheck className="h-3.5 w-3.5 text-success" /> },
              ]}
            />
          </CommandInsightCard>
          ) : null}

          <CommandInsightCard
          title="Realtime channels"
          description="Live dashboard streams refresh automatically for executive updates."
          value="Streaming"
          tone="ok"
        >
          <OperationalTimeline
            items={(dashboard?.realtime_channels ?? ["principal.alerts"]).map((channel) => ({
              id: channel,
              title: channel,
              detail: "Subscribed for executive updates.",
              timeLabel: "live",
              tone: "ok" as const,
              icon: <RadioTower className="h-3.5 w-3.5 text-success" />,
            }))}
          />
          </CommandInsightCard>
        </section>
      ) : null}
    </div>
  );
}
