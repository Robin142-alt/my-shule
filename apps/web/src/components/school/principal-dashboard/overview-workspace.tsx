"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { Card } from "@/components/ui/card";
import { isSchoolQueryForPath, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, AlertCircle, ArrowUpRight, ClipboardCheck, GraduationCap, ShieldAlert, Users } from "lucide-react";
import { useEffect } from "react";

type PrincipalOverviewData = {
  status: "active" | "degraded" | "setup_required";
  totalStudents: number;
  totalStaff: number;
  activeIssues: number;
  pendingApprovals: number;
  recentActivity: Array<{ label: string; time: string }>;
};

export type PrincipalDashboardAlert = {
  id: string;
  module_code: string;
  title: string;
  message: string;
  severity: "warning" | "critical";
  action_hint?: string;
};

export type PrincipalExecutiveDashboardSummary = {
  tenant_id: string;
  generated_at: string;
  enabled_modules: string[];
  alerts: PrincipalDashboardAlert[];
  notifications: PrincipalDashboardAlert[];
  realtime_channels: string[];
};

export function PrincipalOverviewWorkspace({
  executiveDashboard,
  executiveDashboardLoading = false,
  executiveDashboardStreamDegraded = false,
  riskCenterLabel = "Alerts and risk center",
  onNavigate,
}: {
  executiveDashboard?: PrincipalExecutiveDashboardSummary | null;
  executiveDashboardLoading?: boolean;
  executiveDashboardStreamDegraded?: boolean;
  riskCenterLabel?: string;
  onNavigate?: (section: "students" | "approvals") => void;
}) {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalOverviewData>('/admin-command/principal/overview');
  const queryClient = useQueryClient();
  const eventBus = useDashboardEventBus();
  const tenantId = useOptionalSchoolTenantId();

  useEffect(() => {
    // Subscribe to the global Event Bus
    const unsubscribe = eventBus.subscribe("STUDENT_ADMITTED", () => {
      // When a student is admitted somewhere else in the app, instantly update the metric
      queryClient.setQueriesData<PrincipalOverviewData>(
        {
          predicate: (query) => isSchoolQueryForPath(
            query.queryKey,
            tenantId,
            '/admin-command/principal/overview',
          ),
        },
        (currentData) => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            totalStudents: currentData.totalStudents + 1,
            recentActivity: [
              {
                label: "New Student Admitted",
                time: "Just now"
              },
              ...currentData.recentActivity
            ]
          };
        }
      );
    });

    return () => unsubscribe();
  }, [eventBus, queryClient, tenantId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <section className="app-overview-banner rounded-2xl p-6 text-white sm:p-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-200">School activity today</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Live principal operations</h2>
          </div>
        </section>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-slate-200/60 rounded-xl border border-slate-200" />
          <div className="h-64 bg-slate-200/60 rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Principal Overview</h2>
        </div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Card>
    );
  }

  const totalStudents = Number(data.totalStudents ?? 0);
  const totalStaff = Number(data.totalStaff ?? 0);
  const pendingApprovals = Number(data.pendingApprovals ?? 0);
  const activeIssues = Number(data.activeIssues ?? 0);
  const enabledModules = Array.isArray(executiveDashboard?.enabled_modules)
    ? executiveDashboard.enabled_modules
    : [];
  const riskAlerts = Array.isArray(executiveDashboard?.alerts)
    ? executiveDashboard.alerts
    : [];
  const recentActivity = Array.isArray(data.recentActivity) ? data.recentActivity : [];
  const metrics = [
    { label: "Total Students", value: totalStudents, detail: "School enrolment", icon: GraduationCap, tone: "text-info bg-info-soft" },
    { label: "Total Staff", value: totalStaff, detail: "School team", icon: Users, tone: "text-success bg-success-soft" },
    { label: "Pending Approvals", value: pendingApprovals, detail: "Awaiting a decision", icon: ClipboardCheck, tone: "text-warning bg-warning-soft" },
    { label: "Active Issues", value: activeIssues, detail: "Open school issues", icon: ShieldAlert, tone: "text-violet-700 bg-violet-50" },
  ];

  return (
    <div className="space-y-6">
      <section className="app-overview-banner flex flex-col gap-5 rounded-2xl p-6 text-white sm:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-200">School activity today</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Live principal operations</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-slate-200">A clear view of your school. The people, priorities, and decisions that matter today.</p>
        </div>
        {onNavigate ? <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
          <button type="button" onClick={() => onNavigate("approvals")} className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-orange-50">Review approvals <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
          <button type="button" onClick={() => onNavigate("students")} className="inline-flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/25 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">View students <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></button>
        </div> : null}
      </section>
      <div className="app-metric-grid grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {metrics.map(({ label, value, detail, icon: Icon, tone }) => <Card key={label} className="bg-white p-5">
          <span className={`mb-4 grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-1 text-3xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted">{detail}</p>
        </Card>)}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Card className="bg-white p-5 text-foreground sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-semibold">{riskCenterLabel}</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Updates from your school&apos;s enabled services.
            </p>
          </div>
          <span className="w-fit rounded-full border border-blue-100 bg-info-soft px-3 py-1 text-[10px] font-semibold text-info">
            {executiveDashboardStreamDegraded
              ? "Live updates reconnecting"
              : executiveDashboardLoading && !executiveDashboard
                ? "Loading modules"
                : `${enabledModules.length} modules enabled`}
          </span>
        </div>

        {executiveDashboard ? (
          <p className="mt-3 text-xs leading-5 text-muted">
            Enabled modules: {enabledModules.join(", ") || "No optional insight modules enabled"}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {riskAlerts.length > 0 ? (
            riskAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black">{alert.title}</p>
                  <span
                    className={
                      alert.severity === "critical"
                        ? "rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-danger"
                        : "rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase text-warning"
                    }
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted">{alert.message}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-info">
                  {alert.module_code}
                </p>
                {alert.action_hint ? (
                  <p className="mt-2 text-xs font-medium text-foreground">Next: {alert.action_hint}</p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="md:col-span-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-muted">
              {executiveDashboardLoading && !executiveDashboard
                ? "Loading live executive risk signals."
                : executiveDashboard
                  ? "No current warning or critical risk alerts for this school."
                  : "Executive risk signals are temporarily unavailable; operational metrics remain visible."}
            </div>
          )}
        </div>
      </Card>
      <Card className="bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-blue-600" aria-hidden="true" /><h3 className="text-base font-semibold text-foreground">Recent school activity</h3></div>
        <p className="mt-1 text-xs text-muted">The latest updates in your school.</p>
        {recentActivity.length ? <ol className="mt-5 space-y-4">{recentActivity.slice(0, 6).map((item, index) => <li key={`${item.label}-${item.time}-${index}`} className="flex gap-3">
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-400 ring-4 ring-blue-50" aria-hidden="true" />
          <div><p className="text-sm font-medium text-foreground">{item.label}</p><p className="mt-1 text-xs text-muted">{item.time}</p></div>
        </li>)}</ol> : <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs leading-6 text-muted">No recent activity has been recorded. Admissions and other school updates will appear here as your team works.</p>}
      </Card>
      </div>
    </div>
  );
}
