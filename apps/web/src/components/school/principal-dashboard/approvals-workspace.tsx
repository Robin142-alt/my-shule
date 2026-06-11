"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ApprovalsOverviewData = {
  status: "active" | "degraded" | "setup_required";
  pendingTotal: number;
  urgentApprovals: number;
  categories: Array<{ name: string; pending: number; urgent: number }>;
  recentApprovals: Array<{ title: string; date: string }>;
};

export function PrincipalApprovalsWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<ApprovalsOverviewData>('/admin-command/principal/approvals');

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Approvals Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Pending</div>
          <div className="mt-2 text-2xl font-black text-white">{data.pendingTotal}</div>
        </Card>
        <Card className="border border-rose-500/30 bg-rose-500/10 p-5">
          <div className="text-sm font-semibold text-rose-200">Urgent</div>
          <div className="mt-2 text-2xl font-black text-rose-400">{data.urgentApprovals}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Pending by Category</h2>
          </div>
          
          {(!data.categories || data.categories.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-10 w-10 text-emerald-400/50 mb-3" />
              <p className="text-white/60">All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {data.categories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                      <Clock className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{cat.name}</p>
                      {cat.urgent > 0 && (
                        <p className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="h-3 w-3" /> {cat.urgent} urgent
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {cat.pending}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Recent Approvals</h2>
          </div>
          
          {(!data.recentApprovals || data.recentApprovals.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <AlertCircle className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent approvals recorded.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {data.recentApprovals.map((app, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <p className="font-medium text-white text-sm">{app.title}</p>
                  </div>
                  <div className="text-xs text-white/60">
                    {app.date}
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
