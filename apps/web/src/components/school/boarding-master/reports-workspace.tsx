"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { downloadBase64File } from "@/lib/dashboard/export";
import { downloadBoardingReport, generateBoardingReport } from "./api-client";

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
    reports_failed?: number;
  };
  reportsList: ReportsRecord[];
};

type ReportArtifactResponse = {
  report?: {
    format?: string;
    artifact?: {
      filename?: string;
      content_type?: string;
      content_base64?: string;
    };
  };
};

export function ReportsWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<ReportsData>('/admin-command/boarding-master/reports');
  const [format, setFormat] = useState<"pdf" | "xlsx" | "csv">("pdf");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const items = data?.reportsList || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  async function generateReport() {
    setPendingAction("generate");
    try {
      const response = await generateBoardingReport({
        title: "Boarding operations report",
        format,
      }) as ReportArtifactResponse;
      if (!response.report && !('artifact' in response)) {
        throw new Error("The server did not return a stored report artifact.");
      }
      toast.success("Boarding report generated", { description: `A verified ${format.toUpperCase()} artifact was stored.` });
      await refetch();
    } catch (generationError) {
      toast.error("Boarding report was not generated", {
        description: generationError instanceof Error ? generationError.message : "The live report artifact could not be stored.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function downloadReport(report: ReportsRecord) {
    setPendingAction(`download:${report.id}`);
    try {
      const response = await downloadBoardingReport(report.id) as ReportArtifactResponse;
      const artifact = response.report?.artifact;
      if (!artifact?.content_base64) {
        throw new Error("The stored boarding report has no verified downloadable artifact.");
      }
      downloadBase64File({
        filename: artifact.filename || `boarding-report-${report.id}.${response.report?.format || report.type}`,
        mimeType: artifact.content_type || "application/octet-stream",
        contentBase64: artifact.content_base64,
      });
      toast.success("Verified boarding report downloaded");
    } catch (downloadError) {
      toast.error("Boarding report download failed", {
        description: downloadError instanceof Error ? downloadError.message : "The stored artifact could not be decoded.",
      });
    } finally {
      setPendingAction(null);
    }
  }

  if (error) {
    return (
      <Panel title="Boarding Reports" description="Generate and download verified reports from live boarding records." icon={FileText}>
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-black">Boarding reports could not be loaded.</p>
          <p className="mt-1">{error.message}</p>
          <button type="button" onClick={() => void refetch()} className="mt-3 font-black underline">Retry</button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Boarding Reports"
      description="Generate and download verified reports from live boarding records."
      icon={FileText}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="boarding-report-format">Report format</label>
          <select
            id="boarding-report-format"
            value={format}
            onChange={(event) => setFormat(event.target.value as typeof format)}
            disabled={pendingAction !== null}
            className="rounded-lg border border-[#D8E0EC] bg-white px-3 py-2 text-sm font-bold text-[#334155]"
          >
            <option value="pdf">PDF</option>
            <option value="xlsx">XLSX</option>
            <option value="csv">CSV</option>
          </select>
          <button
            type="button"
            onClick={() => void generateReport()}
            disabled={pendingAction !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${pendingAction === "generate" ? "animate-spin" : ""}`} />
            {pendingAction === "generate" ? "Generating…" : "Generate report"}
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Verified Artifacts</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.reports_generated ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Failed Integrity Checks</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.reports_failed ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Title</th>
              <th className="px-4 py-3 font-bold">Generated At</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No boarding report exists for this school. Generate the first artifact from live hostel, allocation, roll-call, leave, and incident records.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.generated_at}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={row.status !== "Ready" || pendingAction !== null}
                      onClick={() => void downloadReport(row)}
                      className="inline-flex items-center gap-1 text-xs font-black text-[#1D4ED8] disabled:cursor-not-allowed disabled:text-[#94A3B8]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {pendingAction === `download:${row.id}` ? "Downloading…" : row.status === "Ready" ? "Download" : "Unavailable"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
