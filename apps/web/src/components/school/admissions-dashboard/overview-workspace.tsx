"use client";

import { Card } from "@/components/ui/card";
import { Users, FileText, ClipboardList, Calendar } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function AdmissionsOverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<any>('/admin-command/admissions/overview');

  const stats = data || { enquiries: 0, applicationsPending: 0, documentsMissing: 0, interviewsScheduled: 0, recentActivity: [] };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Enquiries</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl font-black text-white">{isLoading ? "..." : stats.enquiries}</div>
            <Users className="h-5 w-5 text-blue-400" />
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Applications</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl font-black text-rose-400">{isLoading ? "..." : stats.applicationsPending}</div>
            <ClipboardList className="h-5 w-5 text-rose-400" />
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Missing Documents</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl font-black text-yellow-500">{isLoading ? "..." : stats.documentsMissing}</div>
            <FileText className="h-5 w-5 text-yellow-500" />
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Scheduled Interviews</div>
          <div className="mt-2 flex items-center justify-between">
            <div className="text-2xl font-black text-emerald-400">{isLoading ? "..." : stats.interviewsScheduled}</div>
            <Calendar className="h-5 w-5 text-emerald-400" />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 min-h-[300px]">
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          {(!stats.recentActivity || stats.recentActivity.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-white/50">
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentActivity.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div>
                    <p className="font-medium text-white">{activity.action}</p>
                    <p className="text-xs text-white/60">{activity.applicant}</p>
                  </div>
                  <div className="text-xs font-medium text-white/60">
                    {activity.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
