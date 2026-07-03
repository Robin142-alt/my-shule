"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, Activity, Users, FileText } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { useEffect } from "react";
import { DashboardEngine } from "@/components/dashboard/dashboard-engine";

type PrincipalOverviewData = {
  status: "active" | "degraded" | "setup_required";
  totalStudents: number;
  totalStaff: number;
  activeIssues: number;
  pendingApprovals: number;
  recentActivity: Array<{ label: string; time: string }>;
};

import { useQueryClient } from "@tanstack/react-query";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

export function PrincipalOverviewWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalOverviewData>('/admin-command/principal/overview');
  const queryClient = useQueryClient();
  const eventBus = useDashboardEventBus();

  useEffect(() => {
    // Subscribe to the global Event Bus
    const unsubscribe = eventBus.subscribe("STUDENT_ADMITTED", (event) => {
      // When a student is admitted somewhere else in the app, instantly update the metric
      const activeTenantId = getCurrentSchoolId();
      queryClient.setQueryData<PrincipalOverviewData>(
        ["school", activeTenantId || "session", '/admin-command/principal/overview'],
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
  }, [eventBus, queryClient]);

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
      </Card>
    );
  }

  const totalStudents = Number(data.totalStudents ?? 0);
  const totalStaff = Number(data.totalStaff ?? 0);
  const pendingApprovals = Number(data.pendingApprovals ?? 0);
  const activeIssues = Number(data.activeIssues ?? 0);

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
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-6">Operational Dashboard</h2>
        <DashboardEngine role="principal" />
      </div>
    </div>
  );
}
