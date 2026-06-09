"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { resolveWidgetState, type WidgetState } from "@/lib/capability-engine/school-capability-engine";
import type { StatusTone } from "@/lib/dashboard/types";
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
  principal_name?: string;
  school_name?: string;
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

type PrincipalExecutiveZoneConfig = {
  id: string;
  title: string;
  category: string;
  description: string;
  moduleCodes: string[];
  fallbackMetrics: string[];
};

type PrincipalExecutiveZone = PrincipalExecutiveZoneConfig & {
  section?: PrincipalDashboardSection;
  state: WidgetState;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function unwrapPrincipalDashboardPayload(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  if (
    isRecord(value.data)
    && (
      "tenant_id" in value.data
      || "enabled_modules" in value.data
      || "overview" in value.data
    )
  ) {
    return value.data;
  }

  return value;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : metricNumber(value as number | string | undefined);
}

function dashboardSectionConfidentiality(value: unknown): PrincipalDashboardSection["confidentiality"] {
  return value === "summary_only" || value === "restricted" || value === "standard"
    ? value
    : "standard";
}

function dashboardWidgetStatus(value: unknown): PrincipalDashboardWidget["status"] {
  return value === "warning" || value === "critical" || value === "normal"
    ? value
    : "normal";
}

function dashboardAlertSeverity(value: unknown): "warning" | "critical" {
  return value === "critical" ? "critical" : "warning";
}

function normalizePrincipalDashboardPayload(value: unknown): PrincipalDashboardResponse {
  const source = unwrapPrincipalDashboardPayload(value);
  const overview = isRecord(source.overview) ? source.overview : {};
  const sections: PrincipalDashboardSection[] = Array.isArray(source.sections)
    ? source.sections.filter(isRecord).map((section) => ({
      id: typeof section.id === "string" ? section.id : crypto.randomUUID(),
      module_code: typeof section.module_code === "string" ? section.module_code : "principal_dashboard",
      title: typeof section.title === "string" ? section.title : "Dashboard insight",
      category: typeof section.category === "string" ? section.category : "Overview",
      confidentiality: dashboardSectionConfidentiality(section.confidentiality),
      widgets: Array.isArray(section.widgets)
        ? section.widgets.filter(isRecord).map((widget) => ({
          id: typeof widget.id === "string" ? widget.id : crypto.randomUUID(),
          title: typeof widget.title === "string" ? widget.title : "Metric",
          value: typeof widget.value === "number" || typeof widget.value === "string" ? widget.value : 0,
          unit: typeof widget.unit === "string" ? widget.unit : undefined,
          status: dashboardWidgetStatus(widget.status),
        }))
        : [],
      alerts: Array.isArray(section.alerts)
        ? section.alerts.filter(isRecord).map((alert) => ({
          id: typeof alert.id === "string" ? alert.id : crypto.randomUUID(),
          title: typeof alert.title === "string" ? alert.title : "Module alert",
          message: typeof alert.message === "string" ? alert.message : "Review this module.",
          severity: dashboardAlertSeverity(alert.severity),
        }))
        : [],
      reports: stringArray(section.reports),
    }))
    : [];
  const alerts = Array.isArray(source.alerts)
    ? source.alerts.filter(isRecord).map((alert) => ({
      id: typeof alert.id === "string" ? alert.id : crypto.randomUUID(),
      module_code: typeof alert.module_code === "string" ? alert.module_code : "principal_dashboard",
      title: typeof alert.title === "string" ? alert.title : "Dashboard alert",
      message: typeof alert.message === "string" ? alert.message : "Review this dashboard signal.",
      severity: dashboardAlertSeverity(alert.severity),
    }))
    : [];

  return {
    tenant_id: typeof source.tenant_id === "string" ? source.tenant_id : "",
    generated_at: typeof source.generated_at === "string" ? source.generated_at : "",
    principal_name: typeof source.principal_name === "string" ? source.principal_name : undefined,
    school_name: typeof source.school_name === "string" ? source.school_name : undefined,
    enabled_modules: stringArray(source.enabled_modules),
    overview: {
      total_students: numberValue(overview.total_students),
      total_teachers: numberValue(overview.total_teachers),
      total_support_staff: numberValue(overview.total_support_staff),
      active_classes_streams: numberValue(overview.active_classes_streams),
      student_attendance_today: numberValue(overview.student_attendance_today),
      teacher_attendance_today: numberValue(overview.teacher_attendance_today),
      parent_engagement_rate: numberValue(overview.parent_engagement_rate),
      active_users_online: numberValue(overview.active_users_online),
    },
    sections,
    alerts,
    realtime_channels: stringArray(source.realtime_channels),
    report_exports: stringArray(source.report_exports),
  };
}

function getPrincipalGreeting(date: Date | null) {
  if (!date) {
    return "Welcome Back";
  }

  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "Good Morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good Afternoon";
  }

  if (hour >= 17 && hour < 22) {
    return "Good Evening";
  }

  return "Welcome Back";
}

function getPrincipalDisplayName(dashboard: PrincipalDashboardResponse | null) {
  return dashboard?.principal_name?.trim() || "Principal";
}

function getPrincipalContextLine(dashboard: PrincipalDashboardResponse | null) {
  const schoolName = dashboard?.school_name?.trim();
  const criticalAlerts = dashboard?.alerts.filter((alert) => alert.severity === "critical").length ?? 0;
  const warningAlerts = dashboard?.alerts.filter((alert) => alert.severity === "warning").length ?? 0;

  if (criticalAlerts > 0) {
    return `${criticalAlerts} urgent ${criticalAlerts === 1 ? "issue requires" : "issues require"} your attention today.`;
  }

  if (warningAlerts > 0) {
    return `${warningAlerts} executive ${warningAlerts === 1 ? "signal is" : "signals are"} ready for review.`;
  }

  return schoolName
    ? `Here's what's happening at ${schoolName} today.`
    : "Here's what's happening across the school today.";
}

function dashboardRealtimeSnapshotHasEvents(value: unknown) {
  const source = isRecord(value) && isRecord(value.data) ? value.data : value;

  return isRecord(source) && Array.isArray(source.events) && source.events.length > 0;
}

function dashboardRealtimeErrorMessage(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    const source = isRecord(parsed) && isRecord(parsed.data) ? parsed.data : parsed;

    if (isRecord(source) && typeof source.message === "string" && source.message.trim()) {
      return source.message.trim();
    }
  } catch {
    return value || "Dashboard event stream is unavailable.";
  }

  return value || "Dashboard event stream is unavailable.";
}

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

function widgetTone(status: PrincipalDashboardWidget["status"]): StatusTone {
  return status === "critical" ? "critical" : status === "warning" ? "warning" : "ok";
}

function widgetStateTone(state: WidgetState): StatusTone {
  return state === "FAILED" ? "critical" : state === "ACTIVE" ? "ok" : "warning";
}

function widgetStateLabel(state: WidgetState) {
  return state.charAt(0) + state.slice(1).toLowerCase();
}

function getModuleLabel(moduleCode: string) {
  return moduleCode
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLiveUpdateLabel(channel: string) {
  return getModuleLabel(channel.replace(/^principal[._-]?/i, ""))
    .replace(/\bSms\b/g, "SMS")
    .replace(/\bMpesa\b/g, "M-Pesa");
}

const PRINCIPAL_EXECUTIVE_ZONES: PrincipalExecutiveZoneConfig[] = [
  {
    id: "academic",
    title: "Academic Progress",
    category: "Academic quality",
    description: "Exam performance, CBC/CBE progress, missing marks, and teacher follow-up.",
    moduleCodes: ["exams", "academics"],
    fallbackMetrics: ["Mean score trends", "CBC/CBE progress", "Classes needing follow-up"],
  },
  {
    id: "finance",
    title: "Fee Collection",
    category: "Financial health",
    description: "Fee collection, arrears, budget pressure, receipts, and payment follow-up.",
    moduleCodes: ["finance"],
    fallbackMetrics: ["Fee collection today", "Budget monitoring", "Payroll status"],
  },
  {
    id: "student",
    title: "Student Welfare",
    category: "Student confidence",
    description: "Enrollment, attendance, discipline, sick bay, and parent follow-up.",
    moduleCodes: ["students", "student_management", "discipline", "clinic_health", "guidance_counselling"],
    fallbackMetrics: ["Enrollment overview", "Attendance concerns", "Discipline follow-up"],
  },
  {
    id: "operations",
    title: "School Operations",
    category: "Operational resilience",
    description: "Transport, inventory, maintenance, ICT, visitors, and facility readiness.",
    moduleCodes: ["transport", "inventory", "assets", "procurement"],
    fallbackMetrics: ["Transport status", "Inventory health", "Maintenance alerts"],
  },
  {
    id: "communications",
    title: "Communications & Parent Confidence",
    category: "Communication",
    description: "Parent communication, SMS delivery, announcements, and school confidence signals.",
    moduleCodes: ["communication_sms", "sms", "communications"],
    fallbackMetrics: ["SMS delivery status", "Parent engagement", "Upcoming announcements"],
  },
  {
    id: "ai",
    title: "School Insights",
    category: "Principal briefing",
    description: "Plain-language school patterns, concern areas, and recommended follow-ups.",
    moduleCodes: ["ai_insights"],
    fallbackMetrics: ["Fee collection concern", "Academic follow-up", "Operations concern"],
  },
];

function findPrincipalZoneSection(
  config: PrincipalExecutiveZoneConfig,
  sections: PrincipalDashboardSection[],
) {
  return sections.find((section) => config.moduleCodes.includes(section.module_code));
}

function resolvePrincipalExecutiveZone(
  config: PrincipalExecutiveZoneConfig,
  sections: PrincipalDashboardSection[],
  enabledModuleCodes: ReadonlySet<string>,
): PrincipalExecutiveZone {
  const section = findPrincipalZoneSection(config, sections);
  const moduleCode =
    config.moduleCodes.find((code) => enabledModuleCodes.has(code))
    ?? config.moduleCodes[0]
    ?? null;
  const capability = resolveWidgetState({
    widget: {
      id: config.id,
      moduleCode,
      hasData: Boolean(section && (section.widgets.length > 0 || section.alerts.length > 0 || section.reports.length > 0)),
    },
    moduleEntitlements: enabledModuleCodes,
  });

  return {
    ...config,
    section,
    state: capability.state,
    message: capability.message,
  };
}

function zoneRiskTone(zone: PrincipalExecutiveZone): StatusTone {
  if (zone.state === "FAILED") {
    return "critical";
  }

  if (zone.state !== "ACTIVE") {
    return "warning";
  }

  return zone.section?.alerts.some((alert) => alert.severity === "critical")
    ? "critical"
    : zone.section?.alerts.length
      ? "warning"
      : "ok";
}

function principalZoneMessage(zone: PrincipalExecutiveZone) {
  if (zone.state === "LOCKED") {
    return "This school area is not active yet.";
  }

  if (zone.state === "FAILED") {
    return "This school area needs attention before live data can appear.";
  }

  if (zone.state === "EMPTY") {
    return "No records have been received for this school area yet.";
  }

  return zone.message;
}

function PrincipalExecutiveZoneCard({ zone }: { zone: PrincipalExecutiveZone }) {
  const activeWidgets = zone.section?.widgets.slice(0, 4) ?? [];
  const reports = zone.section?.reports.slice(0, 3) ?? [];
  const isLocked = zone.state === "LOCKED";
  const showFallback = zone.state !== "ACTIVE" || activeWidgets.length === 0;

  return (
    <Card className="flex min-h-[260px] flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{zone.category}</p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">{zone.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{zone.description}</p>
        </div>
        <StatusPill label={widgetStateLabel(zone.state)} tone={widgetStateTone(zone.state)} />
      </div>

      {zone.state === "ACTIVE" && zone.section ? (
        <div className="mt-5 rounded-[var(--radius-sm)] border border-border bg-primary-soft/30 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{zone.section.title}</p>
            <StatusPill label={zoneRiskTone(zone)} tone={zoneRiskTone(zone)} compact />
          </div>
          <p className="mt-1 text-xs text-muted">{getModuleLabel(zone.section.module_code)}</p>
        </div>
      ) : (
        <div className="mt-5 rounded-[var(--radius-sm)] border border-border bg-surface-muted/75 px-3 py-3">
          <p className="text-sm font-semibold text-foreground">{principalZoneMessage(zone)}</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            This school area stays visible so the Principal can see what is available.
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {showFallback
          ? zone.fallbackMetrics.map((metric) => (
            <div key={metric} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted/75 p-3">
              <p className="text-xs font-semibold text-muted">{metric}</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {isLocked ? "Locked" : "Awaiting data"}
              </p>
            </div>
          ))
          : activeWidgets.map((widget) => (
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

      <div className="mt-auto pt-4">
        {isLocked ? (
          <button
            type="button"
            className="inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent/40 hover:bg-primary-soft/50"
          >
            Request Access
          </button>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(reports.length > 0 ? reports : zone.fallbackMetrics.slice(0, 2)).map((report) => (
              <span key={report} className="rounded-full border border-border bg-primary-soft/40 px-2.5 py-1 text-xs font-semibold text-muted">
                {report}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

async function readPrincipalDashboardError(response: Response) {
  const fallback =
    response.status === 402
      ? "This school workspace is restricted by billing status. Billing, renewal, support, and data export are still available."
      : "Principal dashboard is not available.";

  try {
    const payload = await response.json() as unknown;

    if (payload && typeof payload === "object" && "message" in payload) {
      const message = (payload as { message?: unknown }).message;

      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }

    if (payload && typeof payload === "object" && "error" in payload) {
      const message = (payload as { error?: unknown }).error;

      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
    }
  } catch {
    try {
      const text = await response.text();

      if (text.trim()) {
        return text.trim();
      }
    } catch {
      return fallback;
    }
  }

  return fallback;
}

const viewCopy: Record<PrincipalCommandView, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Principal Desk",
    title: "Principal Command Center",
    description: "Live school attendance, fees, welfare, approvals, staff activity, and urgent alerts in one place.",
  },
  analytics: {
    eyebrow: "School Overview",
    title: "School performance overview",
    description: "Trend and department summaries for principal oversight without operational clutter.",
  },
  risks: {
    eyebrow: "Alerts & Risks",
    title: "Urgent alerts center",
    description: "Critical school signals and warning items that need principal attention.",
  },
  approvals: {
    eyebrow: "Approvals",
    title: "Approval queue",
    description: "School approvals, escalations, and decisions waiting for principal action.",
  },
  staff: {
    eyebrow: "Users & Staff",
    title: "Access and accountability",
    description: "Staff coverage, active sessions, permission posture, and user access signals for the school.",
  },
  audit: {
    eyebrow: "Audit Logs",
    title: "Action record summary",
    description: "Important school actions and decisions summarized for principal review.",
  },
};

export function PrincipalCommandCenter({
  tenantSlug,
  view = "dashboard",
  liveDataEnabled = true,
}: {
  tenantSlug?: string | null;
  view?: PrincipalCommandView;
  liveDataEnabled?: boolean;
}) {
  const router = useRouter();
  const replaceRoute = router.replace;
  const [dashboard, setDashboard] = useState<PrincipalDashboardResponse | null>(null);
  const [loading, setLoading] = useState(liveDataEnabled);
  const [error, setError] = useState<string | null>(null);
  const [greetingDate, setGreetingDate] = useState<Date | null>(null);
  const lastDashboardLoadRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;
    const query = tenantSlug ? `?tenantSlug=${encodeURIComponent(tenantSlug)}` : "";

    if (!liveDataEnabled) {
      return () => {
        cancelled = true;
      };
    }

    async function loadDashboard(showLoading = true) {
      if (showLoading) {
        setLoading(true);
      }
      lastDashboardLoadRef.current = Date.now();
      setError(null);

      try {
        const response = await fetch(`/api/admin-command/principal/dashboard${query}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (redirectOnExpiredSessionResponse(response, "school", (href) => replaceRoute(href))) {
          return;
        }

        if (!response.ok) {
          throw new Error(await readPrincipalDashboardError(response));
        }

        const payload = normalizePrincipalDashboardPayload(await response.json());

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
    const refreshWhenUserReturns = () => {
      if (document.visibilityState === "hidden") {
        return;
      }

      if (Date.now() - lastDashboardLoadRef.current > 60_000) {
        void loadDashboard(false);
      }
    };

    window.addEventListener("focus", refreshWhenUserReturns);
    document.addEventListener("visibilitychange", refreshWhenUserReturns);

    if (typeof EventSource !== "undefined") {
      eventSource = new EventSource(`/api/events/dashboard/stream${query}`, {
        withCredentials: true,
      });
      eventSource.addEventListener("dashboard.events", (event) => {
        try {
          const snapshot = JSON.parse((event as MessageEvent<string>).data) as unknown;

          if (!cancelled && dashboardRealtimeSnapshotHasEvents(snapshot)) {
            void loadDashboard(false);
          }
        } catch {
          if (!cancelled) {
            setError("Dashboard event stream sent an unreadable update.");
          }
        }
      });
      eventSource.addEventListener("dashboard.events.error", (event) => {
        if (!cancelled) {
          setError(dashboardRealtimeErrorMessage((event as MessageEvent<string>).data));
        }
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshWhenUserReturns);
      document.removeEventListener("visibilitychange", refreshWhenUserReturns);
      eventSource?.close();
    };
  }, [liveDataEnabled, replaceRoute, tenantSlug]);

  useEffect(() => {
    const updateGreetingDate = () => setGreetingDate(new Date());
    const initialUpdate = window.setTimeout(updateGreetingDate, 0);
    const interval = window.setInterval(updateGreetingDate, 60_000);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, []);

  const enabledModuleCodes = useMemo(
    () => new Set(dashboard?.enabled_modules ?? []),
    [dashboard?.enabled_modules],
  );
  const copy = viewCopy[view];
  const principalGreeting = getPrincipalGreeting(greetingDate);
  const principalDisplayName = getPrincipalDisplayName(dashboard);
  const principalContextLine = getPrincipalContextLine(dashboard);
  const overview = dashboard?.overview;
  const sections = dashboard?.sections ?? [];
  const executiveZones = PRINCIPAL_EXECUTIVE_ZONES.map((zone) =>
    resolvePrincipalExecutiveZone(zone, sections, enabledModuleCodes),
  );
  const academicFinanceZones = executiveZones.filter((zone) => zone.id === "academic" || zone.id === "finance");
  const operationsZones = executiveZones.filter((zone) => zone.id === "student" || zone.id === "operations");
  const communicationsZone = executiveZones.find((zone) => zone.id === "communications");
  const aiZone = executiveZones.find((zone) => zone.id === "ai");
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
    : [{ id: "none", title: "No critical alerts", module_code: "all", message: "All active school areas are within normal range.", severity: "warning" as const }];
  const auditRows = [
    {
      id: "audit-generated",
      action: "Principal dashboard updated",
      module: "Principal dashboard",
      actor: "MyShule",
      state: dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString("en-KE") : "pending",
      tone: "ok" as const,
    },
    ...alerts.slice(0, 5).map((alert) => ({
      id: `audit-${alert.id}`,
      action: alert.title,
      module: getModuleLabel(alert.module_code),
      actor: "MyShule alerts",
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
      posture: "School-linked access",
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
            <StatusPill label={`${dashboard?.enabled_modules?.length ?? 0} areas active`} tone="ok" />
          </div>
        }
        meta={
          <span className="badge badge-neutral">
            Updated {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleTimeString("en-KE") : "pending"}
          </span>
        }
      />

      {error ? (
        <Card className="border-warning/25 bg-warning-soft p-4">
          <p className="text-sm font-semibold text-foreground">{error}</p>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-border bg-surface-muted/80 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              Daily briefing
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {principalGreeting}, {principalDisplayName}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {principalContextLine}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-primary-soft/40 px-3 py-2 text-xs font-semibold text-muted">
            <span>{dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" }) : "Today"}</span>
            <span className="h-1 w-1 rounded-full bg-accent" aria-hidden="true" />
            <span>Term view</span>
          </div>
        </div>
      </Card>

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
            <ProgressRing value={healthScore} label="School readiness" tone={healthScore < 60 ? "critical" : healthScore < 80 ? "warning" : "ok"} />
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
        <>
          <section aria-label="Academic and finance overview" className="grid gap-4 xl:grid-cols-2">
            {academicFinanceZones.map((zone) => (
              <PrincipalExecutiveZoneCard key={zone.id} zone={zone} />
            ))}
          </section>
          <section aria-label="School operations overview" className="grid gap-4 xl:grid-cols-2">
            {operationsZones.map((zone) => (
              <PrincipalExecutiveZoneCard key={zone.id} zone={zone} />
            ))}
          </section>
        </>
      ) : null}

      {view === "dashboard" || view === "risks" || view === "approvals" ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px_360px]">
          <DataTable
          title="Alerts and risk center"
          subtitle="Critical and warning signals from active school areas only."
          columns={[
            { id: "title", header: "Alert", render: (row) => row.title },
            { id: "module", header: "School area", render: (row) => getModuleLabel(row.module_code) },
            { id: "severity", header: "Severity", render: (row) => <StatusPill label={row.severity} tone={row.severity} /> },
          ]}
          rows={alertRows}
          getRowKey={(row) => row.id}
          />
          <ApprovalCommandPanel workflows={approvalWorkflows} />
          {communicationsZone ? <PrincipalExecutiveZoneCard zone={communicationsZone} /> : null}
        </section>
      ) : null}

      {view === "staff" ? (
        <DataTable
          title="Users and staff accountability"
          subtitle="Staff and active-session posture for this school."
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
          title="Action record summary"
          subtitle="Important school actions surfaced without crowding the daily dashboard."
          columns={[
            { id: "action", header: "Action", render: (row) => row.action },
            { id: "module", header: "School area", render: (row) => row.module },
            { id: "actor", header: "Actor", render: (row) => row.actor },
            { id: "state", header: "State", render: (row) => <StatusPill label={row.state} tone={row.tone} /> },
          ]}
          rows={auditRows}
          getRowKey={(row) => row.id}
        />
      ) : null}

      {view === "dashboard" || view === "analytics" ? (
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <CommandInsightCard
            title="School Insights"
            description={aiZone?.description ?? "Plain-language school patterns and recommended follow-ups from active school areas."}
            value={aiZone?.state === "LOCKED" ? "Needs access" : "Ready"}
            tone={aiZone ? widgetStateTone(aiZone.state === "LOCKED" ? "LOCKED" : "ACTIVE") : "warning"}
          >
            {aiZone?.state === "LOCKED" ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{principalZoneMessage(aiZone)}</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  School insight summaries stay in the Principal layout and open when access is enabled.
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition hover:border-accent/40 hover:bg-primary-soft/50"
                >
                  Request Access
                </button>
              </div>
            ) : (
              <OperationalTimeline
                items={[
                  { id: "ai-fees", title: "High fee-balance concern", detail: "Based on collection pace and arrears age.", timeLabel: "now", tone: "warning", icon: <BrainCircuit className="h-3.5 w-3.5 text-accent" /> },
                  { id: "ai-attendance", title: "Attendance concern", detail: "Repeated morning absence pattern requires deputy review.", timeLabel: "12m", tone: "warning", icon: <Activity className="h-3.5 w-3.5 text-warning" /> },
                  { id: "ai-audit", title: "Source checked", detail: "Recommendations keep source school area, time, and reason.", timeLabel: "live", tone: "ok", icon: <ShieldCheck className="h-3.5 w-3.5 text-success" /> },
                ]}
              />
            )}
          </CommandInsightCard>

          <CommandInsightCard
          title="Live school updates"
          description="School updates refresh when important activity changes."
          value="Live"
          tone="ok"
        >
          <OperationalTimeline
            items={(dashboard?.realtime_channels ?? ["principal.alerts"]).map((channel) => ({
              id: channel,
              title: getLiveUpdateLabel(channel),
              detail: "Receiving school updates.",
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
