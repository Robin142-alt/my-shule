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
        ["school", activeTenantId, '/admin-command/principal/overview'],
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Students</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalStudents}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Staff</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalStaff}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Approvals</div>
          <div className="mt-2 text-2xl font-black text-rose-400">{data.pendingApprovals}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Active Issues</div>
          <div className="mt-2 text-2xl font-black text-yellow-500">{data.activeIssues}</div>
        </Card>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-6">Operational Dashboard</h2>
        <DashboardEngine role="principal" />
      </div>
    </div>
  );
}
