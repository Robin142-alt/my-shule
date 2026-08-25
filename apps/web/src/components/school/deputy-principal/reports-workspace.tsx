"use client";
import { AlertCircle, FileText } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { downloadReportArtifact, generateReport } from "./api-client";
import { downloadBase64File } from "@/lib/dashboard/export";

export type GeneratedReport = {
  id: string;
  reportName: string;
  generatedDate: string;
  type: "PDF" | "Excel" | "pdf" | "xlsx" | "csv";
  status: "Ready" | "Failed";
};

type ReportArtifactResponse = {
  report?: {
    title?: string;
    format?: string;
    artifact?: {
      filename?: string;
      content_type?: string;
      content_base64?: string;
    };
  };
};

type ReportsData = {
  metrics: {
    generated_reports: number;
  };
  reportsList: GeneratedReport[];
};

export function DeputyReportsDownloadsWorkspace() {
  const { data, error, isLoading, refetch } = useSchoolQuery<ReportsData>('/admin-command/deputy/reports');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reports = Array.isArray(data?.reportsList) ? data.reportsList : [];

  const handleGenerate = async () => {
    try {
      setIsSubmitting(true);
      await generateReport({ name: "Custom Operational Extract", format: "xlsx" });
      await refetch();
      toast.success("Operational XLSX report generated and stored.");
    } catch (generationError) {
      toast.error("Failed to generate report.", {
        description: generationError instanceof Error ? generationError.message : "The live report artifact could not be stored.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTone = (st: string): Tone => st === "Ready" ? "success" : "danger";

  const downloadReport = async (report: GeneratedReport) => {
    setDownloadingId(report.id);
    try {
      const response = await downloadReportArtifact(report.id) as ReportArtifactResponse;
      const artifact = response.report?.artifact;
      if (!artifact?.content_base64) {
        throw new Error("The stored report has no verified downloadable artifact.");
      }
      downloadBase64File({
        filename: artifact.filename || `deputy-report-${report.id}.${response.report?.format || report.type}`,
        mimeType: artifact.content_type || "application/octet-stream",
        contentBase64: artifact.content_base64,
      });
      toast.success(`${report.reportName} downloaded.`);
    } catch (downloadError) {
      toast.error("Deputy report download failed.", {
        description: downloadError instanceof Error ? downloadError.message : "The stored artifact could not be decoded.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  if (error) {
    return (
      <Panel title="Reports & Downloads" description="Generate and download verified Deputy Principal report artifacts." icon={AlertCircle}>
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span>The tenant-scoped report list could not be loaded.</span>
          <button type="button" onClick={() => void refetch()} className="font-black underline">Retry</button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Reports & Downloads" description="Generate operational reports for attendance, discipline, and duty." icon={FileText} actions={
      <button 
        onClick={handleGenerate} 
        disabled={isSubmitting}
        className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50"
      >
        {isSubmitting ? "Generating..." : "Generate XLSX Report"}
      </button>
    }>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Reports Generated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.generated_reports || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Report Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Format</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading verified reports...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No report has been generated for this school. Generate the first XLSX artifact from live Deputy Principal operational data.</td>
              </tr>
            ) : (
              reports.map((rep) => (
                <tr key={rep.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{rep.reportName}</td>
                  <td className="px-4 py-3 text-[#64748B]">{rep.generatedDate}</td>
                  <td className="px-4 py-3 text-[#64748B]">{rep.type}</td>
                  <td className="px-4 py-3"><StatusChip label={rep.status} tone={getTone(rep.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {rep.status === "Ready" ? (
                      <button
                        type="button"
                        disabled={downloadingId !== null}
                        onClick={() => void downloadReport(rep)}
                        className="text-xs font-semibold text-blue-600 hover:underline disabled:text-[#94A3B8]"
                      >
                        {downloadingId === rep.id ? "Verifying..." : "Download"}
                      </button>
                    ) : <span className="text-xs font-semibold text-rose-600">Integrity check failed</span>}
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
