"use client";
import { useState } from "react";
import { LayoutDashboard, ClipboardList, Calendar, PenLine, CheckCircle, BarChart3, FileText } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ExamRecord = {
  id: string;
  name: string;
  term: string;
  status: string;
  total_subjects: number;
  marks_progress: number;
  start_date: string;
};

type OverviewData = {
  metrics: {
    active_exams: number;
    pending_moderation: number;
    published_results: number;
    total_report_cards: number;
    marks_completion: number;
    overdue_entries: number;
  };
  recent_exams: ExamRecord[];
};

export function OverviewWorkspace() {
  const { data, isLoading } = useSchoolQuery<OverviewData>('/admin-command/exams-manager/overview');

  const exams = data?.recent_exams || [];

  const getStatusTone = (st: string): Tone => {
    switch (st?.toLowerCase()) {
      case "active": case "in_progress": return "info";
      case "completed": case "published": return "success";
      case "draft": case "scheduled": return "neutral";
      case "overdue": return "danger";
      default: return "neutral";
    }
  };

  return (
    <Panel title="Exams Overview" description="Current examination cycle status and key metrics." icon={LayoutDashboard}>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><ClipboardList className="w-4 h-4" /> Active Exams</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700"><CheckCircle className="w-4 h-4" /> Pending Moderation</div>
          <div className="mt-2 text-3xl font-black text-amber-700">{isLoading ? "..." : data?.metrics?.pending_moderation ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700"><BarChart3 className="w-4 h-4" /> Published</div>
          <div className="mt-2 text-3xl font-black text-emerald-700">{isLoading ? "..." : data?.metrics?.published_results ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><FileText className="w-4 h-4" /> Report Cards</div>
          <div className="mt-2 text-3xl font-black text-blue-700">{isLoading ? "..." : data?.metrics?.total_report_cards ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><PenLine className="w-4 h-4" /> Marks Completion</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{isLoading ? "..." : `${data?.metrics?.marks_completion ?? 0}%`}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><Calendar className="w-4 h-4" /> Overdue Entries</div>
          <div className="mt-2 text-3xl font-black text-rose-700">{isLoading ? "..." : data?.metrics?.overdue_entries ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Term</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subjects</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Marks Progress</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Start Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading exams data...</td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No exams found. Go to Exam Setup to create your first examination.</td></tr>
            ) : (
              exams.map((exam) => (
                <tr key={exam.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{exam.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.term}</td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.total_subjects}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${exam.marks_progress}%` }} />
                      </div>
                      <span className="text-xs text-[#64748B]">{exam.marks_progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#64748B]">{exam.start_date}</td>
                  <td className="px-4 py-3"><StatusChip label={exam.status} tone={getStatusTone(exam.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
