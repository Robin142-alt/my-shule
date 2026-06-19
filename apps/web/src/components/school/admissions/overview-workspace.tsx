"use client";
import { LayoutDashboard, UserPlus, FileCheck, CalendarCheck, Users, TrendingUp } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type OverviewData = {
  metrics: {
    total_applications: number;
    pending_review: number;
    interviews_scheduled: number;
    admitted_this_term: number;
    documents_pending: number;
    acceptance_rate: number;
  };
  recent_applications: Array<{
    id: string;
    student_name: string;
    grade_applied: string;
    status: string;
    submitted_at: string;
  }>;
};

export function OverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<OverviewData>('/admin-command/admissions/overview');

  const metrics = data?.metrics;
  const recent = data?.recent_applications || [];

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "admitted": return "success";
      case "accepted": return "success";
      case "interview scheduled": return "info";
      case "pending review": return "warning";
      case "rejected": return "danger";
      default: return "neutral";
    }
  };

  return (
    <Panel title="Admissions Overview" description="Summary of the current admissions cycle and pipeline." icon={LayoutDashboard}>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><UserPlus className="w-4 h-4" /> Applications</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_applications ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><FileCheck className="w-4 h-4" /> Pending Review</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.pending_review ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><CalendarCheck className="w-4 h-4" /> Interviews</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.interviews_scheduled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><Users className="w-4 h-4" /> Admitted</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.admitted_this_term ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><FileCheck className="w-4 h-4" /> Docs Pending</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.documents_pending ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><TrendingUp className="w-4 h-4" /> Accept Rate</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : `${metrics?.acceptance_rate ?? 0}%`}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Grade Applied</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading admissions data...</td></tr>
            ) : recent.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No applications received yet. Open the admissions cycle to start receiving applications.</td></tr>
            ) : (
              recent.map((app) => (
                <tr key={app.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{app.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{app.grade_applied}</td>
                  <td className="px-4 py-3"><StatusChip label={app.status} tone={getStatusTone(app.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{app.submitted_at}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
