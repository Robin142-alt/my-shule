"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, Activity, Users, FileText } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalOverviewData = {
  status: "active" | "degraded" | "setup_required";
  totalStudents: number;
  totalStaff: number;
  activeIssues: number;
  pendingApprovals: number;
  recentActivity: Array<{ label: string; time: string }>;
};

export function PrincipalOverviewWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalOverviewData>('/admin-command/principal/overview');

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
          </div>
          
          {(!data.recentActivity || data.recentActivity.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <Activity className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent activity detected</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {data.recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <Activity className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{activity.label}</p>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-white/60">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="grid gap-4 grid-rows-2">
          <Card className="border border-white/10 bg-white/5 p-6 flex items-center justify-center cursor-pointer hover:bg-white/10 transition">
            <div className="text-center">
              <Users className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
              <h3 className="font-bold text-white">Admissions Center</h3>
              <p className="text-xs text-white/60">Manage incoming students</p>
            </div>
          </Card>
          <Card className="border border-white/10 bg-white/5 p-6 flex items-center justify-center cursor-pointer hover:bg-white/10 transition">
            <div className="text-center">
              <FileText className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <h3 className="font-bold text-white">Compliance & Audits</h3>
              <p className="text-xs text-white/60">Review system logs</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
