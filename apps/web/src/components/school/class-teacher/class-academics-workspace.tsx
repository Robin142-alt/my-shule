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
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Class Mean</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.class_mean?.toFixed(1) ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Class Position</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : metrics?.class_position ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Above Average</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : metrics?.subjects_above_average ?? 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Below Average</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : metrics?.subjects_below_average ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Pass Rate</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : `${metrics?.overall_pass_rate ?? 0}%`}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-border">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-border">Mean Score</th>
              <th className="px-4 py-3 font-bold border-b border-border">Highest</th>
              <th className="px-4 py-3 font-bold border-b border-border">Lowest</th>
              <th className="px-4 py-3 font-bold border-b border-border">Pass Rate</th>
              <th className="px-4 py-3 font-bold border-b border-border">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading academic data...</td></tr>
            ) : subjects.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No exam results available yet. Results will appear after the first exam cycle.</td></tr>
            ) : (
              subjects.map((s) => (
                <tr key={s.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{s.subject}</td>
                  <td className="px-4 py-3 text-muted">{s.teacher_name}</td>
                  <td className="px-4 py-3 font-bold text-foreground">{s.mean_score.toFixed(1)}</td>
                  <td className="px-4 py-3 text-success font-medium">{s.highest_score}</td>
                  <td className="px-4 py-3 text-danger font-medium">{s.lowest_score}</td>
                  <td className="px-4 py-3"><StatusChip label={`${s.pass_rate}%`} tone={getPassRateTone(s.pass_rate)} /></td>
                  <td className="px-4 py-3">
                    {s.trend === "up" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-xs"><TrendingUp className="w-3.5 h-3.5" /> Up</span>
                    ) : s.trend === "down" ? (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-xs"><TrendingDown className="w-3.5 h-3.5" /> Down</span>
                    ) : (
                      <span className="text-muted text-xs font-bold">Stable</span>
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
