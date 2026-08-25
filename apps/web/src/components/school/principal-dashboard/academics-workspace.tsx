"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, BookOpen, GraduationCap } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { toast } from "sonner";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type PrincipalAcademicsData = {
  status: "active" | "degraded" | "setup_required";
  activeAssignments: number;
  syllabusCoverage: number;
  averageScore: number;
  performanceTrend: Array<{ label: string; value: number }>;
  departmentPerformance: Array<{ department: string; score: number }>;
};

export function PrincipalAcademicsWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalAcademicsData>('/admin-command/principal/academics');
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Academics Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Status</div>
          <div className="mt-2 text-2xl font-black text-white capitalize">{data.status}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Syllabus Coverage</div>
          <div className="mt-2 text-2xl font-black text-white">{data.syllabusCoverage}%</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">School Average</div>
          <div className="mt-2 text-2xl font-black text-white">{data.averageScore}%</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Active Assignments</div>
          <div className="mt-2 text-2xl font-black text-white">{data.activeAssignments}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Performance Trend</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.performanceTrend?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-blue-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-blue-400/60"
                    style={{ height: `${item.value}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}%
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
            <h2 className="text-xl font-bold text-white">Department Performance</h2>
            <button
              type="button"
              onClick={async () => {
                try {
                  await requestPrincipalApi("/admin-command/principal/reports/generate", {
                    method: "POST",
                    body: { title: "Department performance report", type: "department_performance", source_dashboard: "principal-academics" },
                  });
                  toast.success("Department performance report requested.");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not request department report.");
                }
              }}
              className="text-xs bg-white/10 text-white px-3 py-1.5 rounded hover:bg-white/20 transition-colors flex items-center gap-1"
            >
              <BookOpen className="h-3 w-3" />
              Detailed Report
            </button>
          </div>
          
          {(!data.departmentPerformance || data.departmentPerformance.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <GraduationCap className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No department data available</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2 mt-4">
              {data.departmentPerformance.map((dept) => (
                <div key={dept.department} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-white">{dept.department}</span>
                    <span className="text-white/60">{dept.score}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${dept.score > 70 ? 'bg-green-500' : dept.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                      style={{ width: `${dept.score}%` }} 
                    />
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
