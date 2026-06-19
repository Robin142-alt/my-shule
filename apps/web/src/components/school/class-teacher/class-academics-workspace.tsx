"use client";
import { BookOpen, TrendingUp, TrendingDown } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type SubjectPerformance = {
  id: string;
  subject: string;
  teacher_name: string;
  mean_score: number;
  highest_score: number;
  lowest_score: number;
  pass_rate: number;
  trend: string;
};

type ClassAcademicsData = {
  metrics: {
    class_mean: number;
    class_position: string;
    subjects_above_average: number;
    subjects_below_average: number;
    overall_pass_rate: number;
  };
  term: string;
  subjects: SubjectPerformance[];
};

export function ClassAcademicsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ClassAcademicsData>('/admin-command/class-teacher/class-academics');

  const metrics = data?.metrics;
  const subjects = data?.subjects || [];

  const getPassRateTone = (rate: number): Tone => {
    if (rate >= 80) return "success";
    if (rate >= 60) return "warning";
    return "danger";
  };

  return (
    <Panel title="Class Academics" description={`Academic performance summary${data?.term ? ` — ${data.term}` : ""}.`} icon={BookOpen}>
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Class Mean</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.class_mean?.toFixed(1) ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Class Position</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.class_position ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Above Average</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.subjects_above_average ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Below Average</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.subjects_below_average ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Pass Rate</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : `${metrics?.overall_pass_rate ?? 0}%`}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Mean Score</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Highest</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lowest</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Pass Rate</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading academic data...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No exam results available yet. Results will appear after the first exam cycle.</td></tr>
            ) : (
              subjects.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{s.subject}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.teacher_name}</td>
                  <td className="px-4 py-3 font-bold text-[#071D49]">{s.mean_score.toFixed(1)}</td>
                  <td className="px-4 py-3 text-emerald-700 font-medium">{s.highest_score}</td>
                  <td className="px-4 py-3 text-rose-700 font-medium">{s.lowest_score}</td>
                  <td className="px-4 py-3"><StatusChip label={`${s.pass_rate}%`} tone={getPassRateTone(s.pass_rate)} /></td>
                  <td className="px-4 py-3">
                    {s.trend === "up" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs"><TrendingUp className="w-3.5 h-3.5" /> Up</span>
                    ) : s.trend === "down" ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs"><TrendingDown className="w-3.5 h-3.5" /> Down</span>
                    ) : (
                      <span className="text-[#64748B] text-xs font-bold">Stable</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
