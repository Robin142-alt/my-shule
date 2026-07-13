"use client";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { generateExamsReport } from "./api-client";

type ReportsRecord = {
  id: string;
  title: string;
  generated_at: string;
  type: string;
  status: string;
};

type ReportsData = {
  metrics: {
    reports_generated: number;
  };
  reportsList: ReportsRecord[];
};

export function ReportsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ReportsData>('/admin-command/exams-manager/reports');
  const [isGenerating, setIsGenerating] = useState(false);
  const items = data?.reportsList || [];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      await generateExamsReport({
        title: "Exams operations report",
        format: "pdf",
      });
      toast.success("Exams operations report compiled.");
      await refetch();
    } catch {
      toast.error("Failed to compile exams report.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared" || st === "Published" || st === "Admitted" || st === "Generated") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "Draft" || st === "Behind" || st === "Warning" || st === "Pending Review" || st === "Not Started") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Suspended") return "danger";
    if (st === "Issued" || st === "Submitted" || st === "On Leave" || st === "Graduated" || st === "Downloaded") return "info";
    return "neutral";
  };

  return (
    <Panel
      title="Exam Reports"
      description="Generate and download exam administration reports."
      icon={FileText}
      actions={
        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> {isGenerating ? "Compiling..." : "Generate report"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Reports Generated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.reports_generated ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Title</th>
              <th className="px-4 py-3 font-bold">Generated At</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No reports have been generated yet. Use Generate report to compile the current exam setup, marks, moderation, report-card, and publishing state.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.generated_at}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
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
