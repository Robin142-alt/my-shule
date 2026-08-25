"use client";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";

type FacilitiesIssuesRecord = {
  id: string;
  title: string;
  location: string;
  reported_by: string;
  date: string;
  priority: string;
  status: string;
};

type FacilitiesIssuesData = {
  metrics: {
    open_issues: number;
    resolved_today: number;
    critical: number;
  };
  facilitiesissuesList: FacilitiesIssuesRecord[];
};

export function FacilitiesIssuesWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<FacilitiesIssuesData>('/admin-command/ict-manager/facilities-issues');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", location: "", description: "", priority: "normal" });
  const createIssue = useSchoolMutation<unknown, typeof form>('/admin-command/ict-manager/facilities-issues', 'POST', {
    onSuccess: async () => {
      toast.success('Facility issue reported.');
      setForm({ title: "", location: "", description: "", priority: "normal" });
      setShowForm(false);
      await refetch();
    },
    onError: (mutationError) => toast.error('Facility issue was not recorded', { description: mutationError.message }),
  });
  const resolveIssue = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/ict-manager/facilities-issues/${id}/resolve`,
    'POST',
    {
      onSuccess: async () => { toast.success('Facility issue resolved.'); await refetch(); },
      onError: (mutationError) => toast.error('Issue resolution failed', { description: mutationError.message }),
    },
  );
  const items = data?.facilitiesissuesList || [];
  const canWrite = hasPermission('ict:write');

  if (error) {
    return (
      <Panel title="Facilities Issues" description="Track ICT-related facilities issues." icon={AlertCircle}>
        <WorkspaceQueryFailure title="Facility issues could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  function submitIssue() {
    if (!form.title.trim() || !form.location.trim()) {
      toast.error('Issue title and location are required.');
      return;
    }
    createIssue.mutate({ ...form, title: form.title.trim(), location: form.location.trim(), description: form.description.trim() });
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
      title="Facilities Issues"
      description="Track ICT-related facilities issues."
      icon={AlertCircle}
      actions={<button type="button" disabled={permissionsLoading || !canWrite} onClick={() => setShowForm(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">Report Issue</button>}
    >
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">Issue title<input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Location<input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Priority<select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="text-xs font-bold text-[#334155]">Description<input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button><button type="button" disabled={createIssue.isPending} onClick={submitIssue} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createIssue.isPending ? 'Saving…' : 'Submit Issue'}</button></div>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Open Issues</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.open_issues ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Resolved Today</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.resolved_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Critical</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.critical ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Title</th>
              <th className="px-4 py-3 font-bold">Location</th>
              <th className="px-4 py-3 font-bold">Reported By</th>
              <th className="px-4 py-3 font-bold">Date</th>
              <th className="px-4 py-3 font-bold">Priority</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No ICT-related facility issue is open for this school. Report a real issue when one is found.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.title}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.location}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.reported_by}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.priority}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3"><button type="button" disabled={!canWrite || resolveIssue.isPending || row.status.toLowerCase() === 'resolved'} onClick={() => resolveIssue.mutate({ id: row.id })} className="font-black text-[#1D4ED8] disabled:text-[#94A3B8]">Resolve</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
