"use client";
import { LayoutDashboard, Users, UserX, BookOpen, AlertTriangle, Heart } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type AlertItem = {
  id: string;
  type: string;
  student_name: string;
  message: string;
  severity: string;
  created_at: string;
};

type OverviewData = {
  metrics: {
    total_students: number;
    present_today: number;
    absent_today: number;
    pending_discipline: number;
    welfare_flags: number;
    mean_grade: string;
  };
  alerts: AlertItem[];
};

export function OverviewWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<OverviewData>('/admin-command/class-teacher/overview');

  const metrics = data?.metrics;
  const alerts = data?.alerts || [];

  const getSeverityTone = (s: string): Tone => {
    if (s === "critical" || s === "high") return "danger";
    if (s === "medium") return "warning";
    if (s === "low") return "info";
    return "neutral";
  };

  return (
    <Panel title="Class Overview" description="Today's snapshot of your class — attendance, academics, and alerts." icon={LayoutDashboard}>
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Users className="w-4 h-4" /> Total Students</div>
          <div className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_students ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Users className="w-4 h-4" /> Present</div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.present_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><UserX className="w-4 h-4" /> Absent</div>
          <div className="mt-2 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.absent_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><AlertTriangle className="w-4 h-4" /> Discipline</div>
          <div className="mt-2 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.pending_discipline ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><Heart className="w-4 h-4" /> Welfare</div>
          <div className="mt-2 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.welfare_flags ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><BookOpen className="w-4 h-4" /> Mean Grade</div>
          <div className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.mean_grade ?? "—"}</div>
        </div>
      </div>

      {/* Alerts table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Message</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading alerts...</td></tr>
            ) : alerts.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No active alerts. Your class is running smoothly today.</td></tr>
            ) : (
              alerts.map((a) => (
                <tr key={a.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={a.severity} tone={getSeverityTone(a.severity)} /></td>
                  <td className="px-4 py-3 font-medium text-[#071D49] capitalize">{a.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{a.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-xs truncate">{a.message}</td>
                  <td className="px-4 py-3 text-[#64748B]">{a.created_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
