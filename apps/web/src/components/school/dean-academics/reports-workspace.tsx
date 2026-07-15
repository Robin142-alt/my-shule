"use client";
import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { fieldValue, listFromData, metricFromData, Panel, StatusChip, Tone } from "./shared";

type ReportsRecord = {
  id?: string;
  title?: string;
  generated_at?: string;
  created_at?: string;
  type?: string;
  format?: string;
  status?: string;
  [key: string]: unknown;
};

type ReportsData = {
  metrics: {
    reports_generated: number;
  };
  reportsList: ReportsRecord[];
};

export function ReportsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ReportsData | ReportsRecord[]>('/admin-command/dean-academics/reports');
  const items = listFromData<ReportsRecord>(data, "reportsList");
  const [isGenerating, setIsGenerating] = useState(false);

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  async function handleGenerateReport() {
    if (isGenerating) return;

    setIsGenerating(true);
    try {
      await requestDashboardApi("/admin-command/dean-academics/reports/generate", {
        method: "POST",
        body: {
          title: "Dean academic operations report",
          reportId: "dean-academic-operations",
          format: "pdf",
          scope: "whole_school",
        },
      });

      toast.success("Dean academic report request submitted for generation.");
      await refetch();
    } catch (err: any) {
      toast.error(err.message || "Dean academic report could not be generated.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Panel
      title="Academic Reports"
      description="Generate and download academic reports."
      icon={FileText}
      actions={
        <button type="button" onClick={handleGenerateReport} disabled={isGenerating} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {isGenerating ? "Generating..." : "Generate report"}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Reports Generated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : metricFromData(data, "reports_generated", items.length)}</div>
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
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[#64748B]">No dean reports yet. Generate reports after coverage, assessment, or workload data is available.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["title", "name"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["generated_at", "created_at"])}</td>
                  <td className="px-4 py-3 text-[#64748B]">{fieldValue(row, ["type", "format"], "pdf")}</td>
                  <td className="px-4 py-3"><StatusChip label={fieldValue(row, ["status"], "Generated")} tone={getStatusTone(fieldValue(row, ["status"], "Generated"))} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
