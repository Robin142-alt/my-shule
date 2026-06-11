"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, LayoutDashboard, Settings2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalClassesData = {
  status: "active" | "degraded" | "setup_required";
  totalClasses: number;
  totalStreams: number;
  averageClassSize: number;
  capacityUtilization: number;
  classDistribution: Array<{ label: string; value: number }>;
  recentAdjustments: Array<any>;
};

export function PrincipalClassesStreamsWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalClassesData>('/admin-command/principal/classes');

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Classes Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Streams</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalStreams}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Classes</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalClasses}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Average Size</div>
          <div className="mt-2 text-2xl font-black text-white">{data.averageClassSize} students</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Capacity Utilization</div>
          <div className="mt-2 text-2xl font-black text-blue-400">{data.capacityUtilization}%</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Population Distribution</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.classDistribution?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-indigo-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-indigo-400/60"
                    style={{ height: `${Math.min((item.value / 400) * 100, 100)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Adjustments</h2>
            <button className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1">
              <Settings2 className="h-3 w-3" />
              Manage Classes
            </button>
          </div>
          
          {(!data.recentAdjustments || data.recentAdjustments.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <LayoutDashboard className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent structural changes</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {/* List will go here */}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
