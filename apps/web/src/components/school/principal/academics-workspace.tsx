"use client";
import { BookOpen, TrendingUp, Award, AlertTriangle } from "lucide-react";
import { Panel, StatusChip, MetricCard, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type DepartmentPerformance = {
  id: string;
  department: string;
  hod: string;
  avg_score: number;
  subjects_count: number;
  teachers_count: number;
  status: string;
};

type AcademicsData = {
  metrics: {
    school_mean_score: number;
    total_departments: number;
    lesson_coverage_rate: number;
    underperforming_subjects: number;
  };
  departments: DepartmentPerformance[];
};

export function AcademicsWorkspace() {
  const { data, isLoading } = useSchoolQuery<AcademicsData>('/admin-command/principal/academics');

  const departments = data?.departments || [];

  const getPerformanceTone = (score: number): Tone => {
    if (score >= 70) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  const getStatusTone = (s: string): Tone => {
    if (s === "On Track") return "success";
    if (s === "At Risk") return "warning";
    if (s === "Behind") return "danger";
    return "neutral";
  };

  return (
    <Panel title="Academics" description="Academic performance overview across all departments." icon={BookOpen}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard label="School Mean Score" value={isLoading ? "…" : `${data?.metrics?.school_mean_score ?? 0}%`} icon={Award} tone={getPerformanceTone(data?.metrics?.school_mean_score ?? 0)} />
        <MetricCard label="Departments" value={isLoading ? "…" : data?.metrics?.total_departments ?? 0} icon={BookOpen} />
        <MetricCard label="Lesson Coverage" value={isLoading ? "…" : `${data?.metrics?.lesson_coverage_rate ?? 0}%`} icon={TrendingUp} tone={(data?.metrics?.lesson_coverage_rate ?? 100) < 80 ? "warning" : "success"} />
        <MetricCard label="Underperforming" value={isLoading ? "…" : data?.metrics?.underperforming_subjects ?? 0} icon={AlertTriangle} tone={(data?.metrics?.underperforming_subjects ?? 0) > 0 ? "danger" : "success"} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Department</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">HOD</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Avg Score</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subjects</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teachers</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading academic data…</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No departments configured yet. Set up departments in Subjects & Departments first.</td></tr>
            ) : (
              departments.map((dept) => (
                <tr key={dept.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{dept.department}</td>
                  <td className="px-4 py-3 text-[#64748B]">{dept.hod || "—"}</td>
                  <td className="px-4 py-3 font-bold" style={{ color: dept.avg_score >= 70 ? "#059669" : dept.avg_score >= 50 ? "#D97706" : "#DC2626" }}>{dept.avg_score}%</td>
                  <td className="px-4 py-3 text-[#64748B]">{dept.subjects_count}</td>
                  <td className="px-4 py-3 text-[#64748B]">{dept.teachers_count}</td>
                  <td className="px-4 py-3"><StatusChip label={dept.status} tone={getStatusTone(dept.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
