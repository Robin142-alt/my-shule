"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { FileText, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { downloadBase64File, openPrintDocument, type PrintableRow } from "@/lib/dashboard/export";

type ReportRecord = {
  id: string;
  report_name: string;
  report_type: string;
  generated_by: string;
  generated_at: string;
  period: string;
  status: string;
  file_format: string;
};

type Artifact = { filename: string; content_type: string; content_base64: string };
type SavedReport = { snapshotId: string; title: string; generatedDate: string; format: string;
  artifact: Artifact; manifest: { sections: Record<string, unknown>; filters?: Record<string, unknown> } };

const reportLabels: Record<string, string> = {
  circulation: "Circulation Report", overdue: "Overdue Books Report", inventory: "Book Inventory Report",
  fines: "Fines & Collections Report", borrower_activity: "Borrower Activity Report",
  most_borrowed: "Most Borrowed Books", stock_status: "Stock Status Report", "library-operations": "Library operations",
};
const periodLabels: Record<string, string> = { today: "Today", this_week: "This Week", this_month: "This Month",
  this_term: "This Term", this_year: "This Year", current: "Current snapshot" };

function previewRows(value: unknown, label = ""): PrintableRow[] {
  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return [{ label, value: "No records" }];
    return entries.flatMap(([key, child]) => previewRows(child,
      [label, Array.isArray(value) ? `Record ${Number(key) + 1}` : key.replaceAll("_", " ")].filter(Boolean).join(" / ")));
  }
  return [{ label, value: String(value ?? "—") }];
}

type ReportsData = {
  metrics: {
    total_reports: number;
    this_month: number;
    pending: number;
  };
  reports: ReportRecord[];
};

export function ReportsWorkspace() {
  const { data, error, isLoading, isFetching, refetch } = useSchoolQuery<ReportsData>('/admin-command/librarian/reports');
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const generate = useSchoolMutation<{ success: boolean; snapshotId: string; artifact: Artifact },
    { report_type: string; period: string; format: string }>('/admin-command/librarian/reports/generate', 'POST', {
    queueNetworkFailures: false,
  });
  const access = useSchoolMutation<{ report: SavedReport }, { id: string }>(
    ({ id }) => `/admin-command/librarian/reports/${encodeURIComponent(id)}/download`, 'POST', {
      queueNetworkFailures: false, invalidateSchoolQueries: false,
    });
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reportType, setReportType] = useState("circulation");
  const [period, setPeriod] = useState("this_term");
  const [format, setFormat] = useState("pdf");
  const currentSnapshot = ["inventory", "stock_status", "overdue"].includes(reportType);

  const reports = data?.reports || [];

  const getStatusTone = (st: string): Tone => {
    if (st === "Ready") return "success";
    if (st === "Generating") return "info";
    if (st === "Failed") return "danger";
    return "neutral";
  };

  const handleGenerate = async () => {
    if (isGenerating || !hasPermission('library:write')) return;
    setIsGenerating(true);
    try {
      const result = await generate.mutateAsync({ report_type: reportType, period: currentSnapshot ? 'current' : period, format });
      if (!result?.success || !result.snapshotId || !result.artifact?.content_base64) {
        throw new Error("The server did not confirm a saved report. Refresh the list before trying again.");
      }
      toast.success("Report generated and saved. Use Preview / Print or Download below.");
      await refetch();
    } catch (failure) {
      toast.error("Failed to generate report.", { description: failure instanceof Error ? failure.message : 'Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccess = async (id: string, preview: boolean) => {
    setActionId(id);
    try {
      const { report } = await access.mutateAsync({ id });
      if (!report?.artifact?.content_base64) throw new Error("The saved report has no downloadable file. Generate it again.");
      if (preview) {
        if (!report.manifest?.sections) throw new Error("The saved report has no preview. Download the file instead.");
        const filters = report.manifest.filters ?? {};
        const school = report.manifest.sections.school as { name?: string } | undefined;
        openPrintDocument({ eyebrow: school?.name ?? "Library report", title: report.title,
          subtitle: `Generated ${new Date(report.generatedDate).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`,
          rows: [
            { label: 'Period', value: periodLabels[String(filters.period)] ?? 'Not recorded' },
            ...(filters.start_date ? [{ label: 'From', value: String(filters.start_date) }, { label: 'Before', value: String(filters.end_date) }] : []),
            ...(filters.scope ? [{ label: 'Scope', value: String(filters.scope) }] : []),
            ...previewRows(report.manifest.sections),
          ],
          footer: `Document number: ${filters.document_number ?? report.snapshotId}` });
      } else {
        downloadBase64File({ filename: report.artifact.filename, mimeType: report.artifact.content_type,
          contentBase64: report.artifact.content_base64 });
        toast.success("Report download started.");
      }
    } catch (failure) {
      toast.error("Could not open report.", { description: failure instanceof Error ? failure.message : 'Please try again.' });
    } finally { setActionId(null); }
  };

  return (
    <Panel title="Library Reports" description="Generate, preview, print and download library reports." icon={FileText}
      actions={<button type="button" disabled={isFetching} onClick={() => void refetch()} className="rounded-lg border border-border px-4 py-2 text-sm font-bold disabled:opacity-50">{isFetching ? 'Refreshing...' : 'Refresh reports'}</button>}>
      {error && <WorkspaceQueryFailure title="Library reports could not be loaded." error={error} onRetry={() => void refetch()} />}
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Reports</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : error ? "—" : data?.metrics?.total_reports ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">This Month</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : error ? "—" : data?.metrics?.this_month ?? 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Generating</div>
          <div className="mt-1 text-2xl font-black text-info">{isGenerating ? 1 : isLoading ? "..." : error ? "—" : data?.metrics?.pending ?? 0}</div>
        </div>
      </div>

      {/* Generate report form */}
      <div className="mb-6 rounded-xl border border-border bg-surface-muted p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Generate New Report</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select aria-label="Report type" disabled={isGenerating} className="min-w-0 rounded-lg border border-border px-3 py-2 text-sm" value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="circulation">Circulation Report</option>
            <option value="overdue">Overdue Books Report</option>
            <option value="inventory">Book Inventory Report</option>
            <option value="fines">Fines & Collections Report</option>
            <option value="borrower_activity">Borrower Activity Report</option>
            <option value="most_borrowed">Most Borrowed Books</option>
            <option value="stock_status">Stock Status Report</option>
          </select>
          <select aria-label="Report period" disabled={isGenerating || currentSnapshot} className="min-w-0 rounded-lg border border-border px-3 py-2 text-sm" value={currentSnapshot ? 'current' : period} onChange={(e) => setPeriod(e.target.value)}>
            {currentSnapshot && <option value="current">Current snapshot</option>}
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_term">This Term</option>
            <option value="this_year">This Year</option>
          </select>
          <select aria-label="Report format" disabled={isGenerating} className="min-w-0 rounded-lg border border-border px-3 py-2 text-sm" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="pdf">PDF</option><option value="csv">CSV</option><option value="xlsx">Excel</option>
          </select>
          <button disabled={isGenerating || permissionsLoading || !hasPermission('library:write')} onClick={handleGenerate} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-blue-900 disabled:opacity-50">{isGenerating ? "Generating..." : "Generate Report"}</button>
        </div>
        {currentSnapshot && <p className="mt-2 text-sm text-muted">This report shows the current library position at generation time.</p>}
        {!permissionsLoading && !hasPermission('library:write') && <p className="mt-2 text-sm text-muted">You need library write permission to generate reports.</p>}
      </div>

      {/* Reports table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Report Name</th>
              <th className="px-4 py-3 font-bold border-b border-border">Type</th>
              <th className="px-4 py-3 font-bold border-b border-border">Period</th>
              <th className="px-4 py-3 font-bold border-b border-border">Generated By</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading reports...</td></tr>
            ) : error && reports.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Report availability could not be checked. Use Retry above.</td></tr>
            ) : reports.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No reports generated yet. Use the form above to generate your first library report.</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3 font-semibold text-foreground">{r.report_name}</td>
                  <td className="px-4 py-3 text-muted">{reportLabels[r.report_type] ?? r.report_type} ({r.file_format.toUpperCase()})</td>
                  <td className="px-4 py-3 text-muted">{periodLabels[r.period] ?? r.period}</td>
                  <td className="px-4 py-3 text-muted">{r.generated_by}</td>
                  <td className="px-4 py-3 text-muted">{new Date(r.generated_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</td>
                  <td className="px-4 py-3"><StatusChip label={r.status} tone={getStatusTone(r.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "Ready" ? (
                      <div className="flex flex-wrap justify-end gap-3">
                        <button disabled={actionId !== null} onClick={() => void handleAccess(r.id, true)} className="inline-flex items-center gap-1 py-2 text-blue-600 font-semibold text-xs disabled:opacity-50"><Eye className="w-3 h-3" /> Preview / Print</button>
                        <button disabled={actionId !== null} onClick={() => void handleAccess(r.id, false)} className="inline-flex items-center gap-1 py-2 text-blue-600 font-semibold text-xs disabled:opacity-50"><Download className="w-3 h-3" /> {actionId === r.id ? 'Opening...' : 'Download'}</button>
                      </div>
                    ) : r.status === "Generating" ? (
                      <span className="text-xs text-blue-600">Processing...</span>
                    ) : <span className="text-xs text-danger">File unavailable. Generate this report again.</span>}
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
