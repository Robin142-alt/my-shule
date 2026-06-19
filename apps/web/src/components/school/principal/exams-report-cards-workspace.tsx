"use client";
import { Award } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type ExamsReportCardsRecord = {
  id: string;
  exam_name: string;
  term: string;
  classes: number;
  marks_progress: string;
  report_cards: string;
  status: string;
};

type ExamsReportCardsData = {
  metrics: {
    active_exams: number;
    marks_submitted: number;
    report_cards_published: number;
    pending_approval: number;
  };
  examsreportcardsList: ExamsReportCardsRecord[];
};

export function ExamsReportCardsWorkspace() {
  const { data, isLoading } = useSchoolQuery<ExamsReportCardsData>('/admin-command/principal/exams-report-cards');
  const items = data?.examsreportcardsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  return (
    <Panel title="Exams & Report Cards" description="Monitor exam administration and report card status." icon={Award}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active Exams</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active_exams ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Marks Submitted</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.marks_submitted ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Report Cards Published</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.report_cards_published ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Approval</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_approval ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Exam Name</th>
              <th className="px-4 py-3 font-bold">Term</th>
              <th className="px-4 py-3 font-bold">Classes</th>
              <th className="px-4 py-3 font-bold">Marks Progress</th>
              <th className="px-4 py-3 font-bold">Report Cards</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No records found. Create the first entry to get started.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.exam_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.term}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.classes}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.marks_progress}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.report_cards}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
