"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, BarChart3, FileText, Download, Star } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalReportsData = {
  status: "active" | "degraded" | "setup_required";
  availableReports: number;
  favoriteReports: number;
  recentlyGenerated: number;
  categories: Array<{ name: string; count: number }>;
  scheduledReports: Array<{ title: string; schedule: string }>;
};

export function PrincipalReportsWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalReportsData>('/admin-command/principal/reports');

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Reports Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Available Reports</div>
          <div className="mt-2 text-2xl font-black text-white">{data.availableReports}</div>
        </Card>
        <Card className="border border-cyan-500/30 bg-cyan-500/10 p-5">
          <div className="text-sm font-semibold text-cyan-200">Favorites</div>
          <div className="mt-2 text-2xl font-black text-cyan-400">{data.favoriteReports}</div>
        </Card>
        <Card className="border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="text-sm font-semibold text-emerald-200">Generated This Month</div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{data.recentlyGenerated}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Report Categories</h2>
          </div>
          
          {(!data.categories || data.categories.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <BarChart3 className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No report categories available.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {data.categories.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <p className="font-medium text-white">{cat.name}</p>
                  </div>
                  <div className="text-sm font-bold text-white/60">
                    {cat.count} reports
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Scheduled Reports</h2>
          </div>
          
          {(!data.scheduledReports || data.scheduledReports.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <Download className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No automated reports scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {data.scheduledReports.map((report, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Star className="h-4 w-4 text-indigo-400" />
                    </div>
                    <p className="font-medium text-white text-sm">{report.title}</p>
                  </div>
                  <div className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
                    {report.schedule}
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
