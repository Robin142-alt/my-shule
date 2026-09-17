"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { DashboardEngine } from "@/components/dashboard/dashboard-engine";
import { Card } from "@/components/ui/card";
import { isSchoolQueryForPath, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
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
}: {
  executiveDashboard?: PrincipalExecutiveDashboardSummary | null;
  executiveDashboardLoading?: boolean;
  executiveDashboardStreamDegraded?: boolean;
  riskCenterLabel?: string;
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
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">School activity today</p>
          <h2 className="mt-1 text-2xl font-black text-white">Live principal operations</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">School activity today</p>
        <h2 className="mt-1 text-2xl font-black text-white">Live principal operations</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Students</div>
          <div className="mt-2 text-2xl font-black text-white">{totalStudents}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Staff</div>
          <div className="mt-2 text-2xl font-black text-white">{totalStaff}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Approvals</div>
          <div className="mt-2 text-2xl font-black text-rose-400">{pendingApprovals}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Active Issues</div>
          <div className="mt-2 text-2xl font-black text-yellow-500">{activeIssues}</div>
        </Card>
      </div>
      <Card className="border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-black">{riskCenterLabel}</h3>
            <p className="mt-1 text-xs font-semibold text-white/65">
              Module-aware executive signals from this school&apos;s enabled services.
            </p>
          </div>
          <span className="w-fit rounded-full border border-cyan-200/30 bg-cyan-200/10 px-3 py-1 text-xs font-black text-cyan-100">
            {executiveDashboardStreamDegraded
              ? "Live updates reconnecting"
              : executiveDashboardLoading && !executiveDashboard
                ? "Loading modules"
                : `${enabledModules.length} modules enabled`}
          </span>
        </div>

        {executiveDashboard ? (
          <p className="mt-3 text-xs font-semibold text-white/65">
            Enabled modules: {enabledModules.join(", ") || "No optional insight modules enabled"}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {riskAlerts.length > 0 ? (
            riskAlerts.slice(0, 4).map((alert) => (
              <div key={alert.id} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-black">{alert.title}</p>
                  <span
                    className={
                      alert.severity === "critical"
                        ? "rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-red-200"
                        : "rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-amber-200"
                    }
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-white/65">{alert.message}</p>
                <p className="mt-2 text-[11px] font-black uppercase tracking-[0.14em] text-cyan-100">
                  {alert.module_code}
                </p>
                {alert.action_hint ? (
                  <p className="mt-2 text-xs font-semibold text-white/75">Next: {alert.action_hint}</p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="md:col-span-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-4 py-4 text-sm font-semibold text-white/65">
              {executiveDashboardLoading && !executiveDashboard
                ? "Loading live executive risk signals."
                : executiveDashboard
                  ? "No current warning or critical risk alerts for this school."
                  : "Executive risk signals are temporarily unavailable; operational metrics remain visible."}
            </div>
          )}
        </div>
      </Card>
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-6">Operational Dashboard</h2>
        <DashboardEngine role="principal" />
      </div>
    </div>
  );
}
