"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalWorkspaceData = {
  status: "active" | "degraded" | "setup_required";
  collectionsToday: string;
  outstandingInvoices: string;
  collectionData: Array<{ label: string; value: number; amount: string }>;
  pendingWaivers: Array<{ id: string; student: string; class: string; amount: string; reason: string; date: string }>;
};

export function PrincipalFinanceOverviewWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalWorkspaceData>('/admin-command/principal/finance-overview');

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Finance Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Summary Cards */}
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Status</div>
          <div className="mt-2 text-2xl font-black text-white capitalize">{data.status}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Collections Today</div>
          <div className="mt-2 text-2xl font-black text-white">{data.collectionsToday}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Outstanding Invoices</div>
          <div className="mt-2 text-2xl font-black text-white">{data.outstandingInvoices}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Waivers</div>
          <div className="mt-2 text-2xl font-black text-white">{data.pendingWaivers?.length || 0}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Collection Trend</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.collectionData?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-blue-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-blue-400/60"
                    style={{ height: `${item.value}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.amount}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-4">Pending Waivers</h2>
          {(!data.pendingWaivers || data.pendingWaivers.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No pending waivers</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.pendingWaivers.map((waiver) => (
                <div key={waiver.id} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{waiver.student}</h4>
                      <p className="text-sm text-white/60">{waiver.class} • {waiver.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{waiver.amount}</div>
                      <div className="text-xs text-white/40">{waiver.date}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="text-xs bg-green-500/20 text-green-400 px-3 py-1.5 rounded hover:bg-green-500/30 transition-colors">Approve</button>
                    <button className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors">Reject</button>
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
