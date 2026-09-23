"use client";
import { RecordTable } from "@/components/ui/record-table";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { downloadBase64File } from "@/lib/dashboard/export";

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

type ReportArtifactResponse = {
  report: {
    format: string;
    artifact?: {
      filename?: string;
      content_type?: string;
      content_base64?: string;
    };
  };
};

export function ReportsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<ReportsData>('/admin-command/security-officer/reports');
  const generateReport = useSchoolMutation<unknown, { title: string; format: string }>('/admin-command/security-officer/reports/generate', 'POST', {
    onSuccess: async () => { toast.success('Security report generated.'); await refetch(); },
    onError: (mutationError) => toast.error('Security report generation failed', { description: mutationError.message }),
  });
  const downloadReport = useSchoolMutation<ReportArtifactResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/reports/${id}/download`,
    'POST',
    {
      onSuccess: ({ report }) => {
        if (!report.artifact?.content_base64) {
          toast.error('Security report download failed', { description: 'The stored report has no downloadable artifact.' });
          return;
        }
        try {
          downloadBase64File({
            filename: report.artifact.filename || `security-report-${Date.now()}.${report.format || 'pdf'}`,
            mimeType: report.artifact.content_type || 'application/octet-stream',
            contentBase64: report.artifact.content_base64,
          });
          toast.success('Security report downloaded.');
        } catch (downloadError) {
          toast.error('Security report download failed', {
            description: downloadError instanceof Error ? downloadError.message : 'The artifact could not be decoded.',
          });
        }
      },
      onError: (mutationError) => toast.error('Security report download failed', { description: mutationError.message }),
    },
  );
  const items = data?.reportsList || [];
  const canWrite = hasPermission('security:write');

  if (error) {
    return (
      <Panel title="Security Reports" description="Generate and download security reports." icon={FileText}>
        <WorkspaceQueryFailure title="Security reports could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  const getStatusTone = (st: string): Tone => {
    if (st === "Active" || st === "Available" || st === "Approved" || st === "Completed" || st === "Resolved" || st === "Present" || st === "Functional" || st === "On Track" || st === "Cleared") return "success";
    if (st === "Pending" || st === "In Progress" || st === "Pending Approval" || st === "Scheduled" || st === "On Loan" || st === "Behind" || st === "Departed" || st === "Warning" || st === "Pending Review") return "warning";
    if (st === "Overdue" || st === "Critical" || st === "Rejected" || st === "Escalated" || st === "Expired" || st === "Damaged" || st === "Flagged" || st === "Absent" || st === "Blacklisted" || st === "Disposed" || st === "Unauthorized") return "danger";
    if (st === "Issued" || st === "Checked In" || st === "Submitted" || st === "Booked" || st === "Sent" || st === "On Leave") return "info";
    return "neutral";
  };

  return (
    <Panel
      title="Security Reports"
      description="Generate and download security reports."
      icon={FileText}
      actions={<button type="button" disabled={permissionsLoading || !canWrite || generateReport.isPending} onClick={() => generateReport.mutate({ title: 'Security operations report', format: 'pdf' })} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{generateReport.isPending ? 'Generating…' : 'Generate PDF'}</button>}
    >
      <div className="grid gap-4 md:grid-cols-1 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Reports Generated</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.reports_generated ?? 0}</div>
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
              <th className="px-4 py-3 font-bold">Artifact</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No security report has been generated for this school. Generate the first report from live visitor, gate, student movement, staff movement, and incident records.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.generated_at}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3"><button type="button" disabled={downloadReport.isPending} onClick={() => downloadReport.mutate({ id: row.id })} className="font-black text-[#1D4ED8] disabled:text-[#94A3B8]">Download</button></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
