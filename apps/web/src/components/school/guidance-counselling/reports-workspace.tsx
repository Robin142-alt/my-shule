"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Download, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";

import { fieldClassName, MetricCard, Panel, StatusChip, toneForStatus, WorkspaceFailure } from "./shared";

type ReportRecord = { id: string; title: string; generated_at: string; type: string; status: string };
type ReportsData = { metrics: { reports_generated: number }; reportsList: ReportRecord[] };
type ReportArtifact = { filename: string; content_type: string; content_base64: string };

export function ReportsWorkspace() {
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<ReportsData>(
    "/admin-command/guidance-counselling/reports",
  );
  const [format, setFormat] = useState("pdf");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const canWrite = hasPermission("counselling:write");

  const generateReport = useSchoolMutation<unknown, { title: string; format: string }>(
    "/admin-command/guidance-counselling/reports/generate",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling report generated from live school records.");
        await refetch();
      },
      onError: (mutationError) => toast.error("Counselling report was not generated", { description: mutationError.message }),
    },
  );

  async function downloadReport(report: ReportRecord) {
    if (!tenantId) {
      toast.error("A verified school context is required to download this report.");
      return;
    }
    setDownloadingId(report.id);
    try {
      const artifact = await requestDashboardApi<ReportArtifact>(
        `/admin-command/guidance-counselling/reports/${encodeURIComponent(report.id)}/download`,
        { tenantId },
      );
      const binary = window.atob(artifact.content_base64);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const objectUrl = URL.createObjectURL(new Blob([bytes], { type: artifact.content_type }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = artifact.filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Counselling report download prepared.");
    } catch (downloadError) {
      toast.error("Counselling report could not be downloaded", {
        description: downloadError instanceof Error ? downloadError.message : "Unknown download error",
      });
    } finally {
      setDownloadingId(null);
    }
  }

  const items = data?.reportsList ?? [];

  return (
    <Panel
      title="Counselling Reports"
      description="Generate auditable reports from live counselling records and download stored artifacts."
      icon={FileText}
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-[#334155]">Format
            <select aria-label="Report format" value={format} onChange={(event) => setFormat(event.target.value)} className={fieldClassName}>
              <option value="pdf">PDF</option><option value="csv">CSV</option><option value="xlsx">Excel</option>
            </select>
          </label>
          <button
            type="button"
            disabled={permissionsLoading || !canWrite || generateReport.isPending}
            onClick={() => generateReport.mutate({ title: "Counselling operations report", format })}
            className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {generateReport.isPending ? "Generating…" : "Generate Report"}
          </button>
        </div>
      }
    >
      <div className="mb-6 grid gap-4 sm:max-w-sm">
        <MetricCard label="Reports Generated" value={isLoading ? "…" : data?.metrics.reports_generated ?? 0} tone="info" />
      </div>

      {error ? <WorkspaceFailure title="Counselling reports could not be loaded." error={error} onRetry={() => void refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <RecordTable className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Title</th><th className="px-4 py-3 font-bold">Generated</th><th className="px-4 py-3 font-bold">Format</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Download</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading counselling reports…</td></tr> : null}
              {!isLoading && items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No counselling report has been generated. Choose a format and generate the first live operational report.</td></tr> : null}
              {items.map((row) => <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{row.title}</td><td className="px-4 py-3 text-[#64748B]">{row.generated_at}</td><td className="px-4 py-3 uppercase text-[#64748B]">{row.type}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={toneForStatus(row.status)} /></td>
                <td className="px-4 py-3"><button type="button" disabled={downloadingId === row.id} onClick={() => void downloadReport(row)} className="inline-flex items-center gap-1 font-black text-blue-700 underline disabled:opacity-50"><Download className="h-4 w-4" /> {downloadingId === row.id ? "Preparing…" : "Download"}</button></td>
              </tr>)}
            </tbody>
          </RecordTable>
        </div>
      )}
    </Panel>
  );
}
