"use client";
import { useState } from "react";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";

type MaintenanceRecord = {
  id: string;
  asset_name: string;
  type: string;
  technician: string;
  scheduled_date: string;
  completed_date: string;
  status: string;
};

type MaintenanceData = {
  metrics: {
    scheduled: number;
    in_progress: number;
    completed_this_month: number;
  };
  maintenanceList: MaintenanceRecord[];
};

type IctOptions = { assets: Array<{ id: string; label: string }> };

export function MaintenanceWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<MaintenanceData>('/admin-command/ict-manager/maintenance');
  const { data: options, error: optionsError, refetch: refetchOptions } = useSchoolQuery<IctOptions>('/admin-command/ict-manager/options');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_id: "", type: "", technician: "", scheduled_date: "", notes: "" });
  const createMaintenance = useSchoolMutation<unknown, typeof form>('/admin-command/ict-manager/maintenance', 'POST', {
    onSuccess: async () => {
      toast.success('Maintenance scheduled.');
      setForm({ asset_id: "", type: "", technician: "", scheduled_date: "", notes: "" });
      setShowForm(false);
      await refetch();
    },
    onError: (mutationError) => toast.error('Maintenance was not scheduled', { description: mutationError.message }),
  });
  const completeMaintenance = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/ict-manager/maintenance/${id}/complete`,
    'POST',
    {
      onSuccess: async () => { toast.success('Maintenance completed.'); await refetch(); },
      onError: (mutationError) => toast.error('Maintenance completion failed', { description: mutationError.message }),
    },
  );
  const items = data?.maintenanceList || [];
  const canWrite = hasPermission('ict:write');

  if (error) {
    return (
      <Panel title="Maintenance" description="Schedule and track ICT equipment maintenance." icon={Wrench}>
        <WorkspaceQueryFailure title="Maintenance records could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  function submitMaintenance() {
    if (!form.asset_id || !form.type.trim()) {
      toast.error('Choose an asset and describe the maintenance issue.');
      return;
    }
    createMaintenance.mutate({ ...form, type: form.type.trim(), technician: form.technician.trim(), notes: form.notes.trim() });
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
      title="Maintenance"
      description="Schedule and track ICT equipment maintenance."
      icon={Wrench}
      actions={<button type="button" disabled={permissionsLoading || !canWrite} onClick={() => setShowForm(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">Schedule Maintenance</button>}
    >
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          {optionsError ? <WorkspaceQueryFailure title="Asset choices could not be loaded." error={optionsError} onRetry={() => void refetchOptions()} /> : (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-bold text-[#334155]">Asset<select value={form.asset_id} onChange={(event) => setForm((current) => ({ ...current, asset_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"><option value="">Select asset</option>{(options?.assets ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#334155]">Issue<input value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
                <label className="text-xs font-bold text-[#334155]">Technician<input value={form.technician} onChange={(event) => setForm((current) => ({ ...current, technician: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
                <label className="text-xs font-bold text-[#334155]">Scheduled date<input type="date" value={form.scheduled_date} onChange={(event) => setForm((current) => ({ ...current, scheduled_date: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
                <label className="text-xs font-bold text-[#334155] md:col-span-2">Notes<input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
              </div>
              <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button><button type="button" disabled={createMaintenance.isPending} onClick={submitMaintenance} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createMaintenance.isPending ? 'Saving…' : 'Confirm Schedule'}</button></div>
            </>
          )}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Scheduled</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.scheduled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">In Progress</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.in_progress ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Completed This Month</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.completed_this_month ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Asset Name</th>
              <th className="px-4 py-3 font-bold">Type</th>
              <th className="px-4 py-3 font-bold">Technician</th>
              <th className="px-4 py-3 font-bold">Scheduled Date</th>
              <th className="px-4 py-3 font-bold">Completed Date</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No asset maintenance is scheduled. Choose a verified asset to record the first repair or service.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.asset_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.technician}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.scheduled_date}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.completed_date}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3"><button type="button" disabled={!canWrite || completeMaintenance.isPending || row.status.toLowerCase() === 'completed'} onClick={() => completeMaintenance.mutate({ id: row.id })} className="font-black text-[#1D4ED8] disabled:text-[#94A3B8]">Complete</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
