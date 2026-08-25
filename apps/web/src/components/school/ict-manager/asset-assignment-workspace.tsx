"use client";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";

type AssetAssignmentRecord = {
  id: string;
  asset_name: string;
  asset_tag: string;
  assigned_to: string;
  department: string;
  assigned_date: string;
  status: string;
};

type AssetAssignmentData = {
  metrics: {
    assigned: number;
    unassigned: number;
    pending_return: number;
  };
  assetassignmentList: AssetAssignmentRecord[];
};

type IctOptions = {
  assets: Array<{ id: string; label: string }>;
  staff: Array<{ id: string; label: string }>;
};

export function AssetAssignmentWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<AssetAssignmentData>('/admin-command/ict-manager/asset-assignment');
  const { data: options, error: optionsError, refetch: refetchOptions } = useSchoolQuery<IctOptions>('/admin-command/ict-manager/options');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_id: "", assigned_to_id: "", department: "" });
  const assignAsset = useSchoolMutation<unknown, typeof form>('/admin-command/ict-manager/asset-assignment', 'POST', {
    onSuccess: async () => {
      toast.success('Asset assignment recorded.');
      setForm({ asset_id: "", assigned_to_id: "", department: "" });
      setShowForm(false);
      await refetch();
    },
    onError: (mutationError) => toast.error('Asset was not assigned', { description: mutationError.message }),
  });
  const returnAsset = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/ict-manager/asset-assignment/${id}/revoke`,
    'POST',
    {
      onSuccess: async () => { toast.success('Asset returned to inventory.'); await refetch(); },
      onError: (mutationError) => toast.error('Asset return failed', { description: mutationError.message }),
    },
  );
  const items = data?.assetassignmentList || [];
  const canWrite = hasPermission('ict:write');

  if (error) {
    return (
      <Panel title="Asset Assignment" description="Assign ICT assets to staff and departments." icon={UserPlus}>
        <WorkspaceQueryFailure title="Asset assignments could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  function submitAssignment() {
    if (!form.asset_id || !form.assigned_to_id) {
      toast.error('Choose an asset and a staff member.');
      return;
    }
    assignAsset.mutate({ ...form, department: form.department.trim() });
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
      title="Asset Assignment"
      description="Assign ICT assets to staff and departments."
      icon={UserPlus}
      actions={<button type="button" disabled={permissionsLoading || !canWrite} onClick={() => setShowForm(true)} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">Assign Asset</button>}
    >
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          {optionsError ? (
            <WorkspaceQueryFailure title="Assignment choices could not be loaded." error={optionsError} onRetry={() => void refetchOptions()} />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-bold text-[#334155]">Asset<select value={form.asset_id} onChange={(event) => setForm((current) => ({ ...current, asset_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"><option value="">Select asset</option>{(options?.assets ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#334155]">Staff member<select value={form.assigned_to_id} onChange={(event) => setForm((current) => ({ ...current, assigned_to_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"><option value="">Select staff member</option>{(options?.staff ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-[#334155]">Department<input value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
              </div>
              <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button><button type="button" disabled={assignAsset.isPending} onClick={submitAssignment} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{assignAsset.isPending ? 'Assigning…' : 'Confirm Assignment'}</button></div>
            </>
          )}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Assigned</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.assigned ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Unassigned</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.unassigned ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Return</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_return ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Asset Name</th>
              <th className="px-4 py-3 font-bold">Asset Tag</th>
              <th className="px-4 py-3 font-bold">Assigned To</th>
              <th className="px-4 py-3 font-bold">Department</th>
              <th className="px-4 py-3 font-bold">Assigned Date</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No asset is assigned. Assign an available school asset to a verified staff member.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.asset_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.asset_tag}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.assigned_to}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.department}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.assigned_date}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3"><button type="button" disabled={!canWrite || returnAsset.isPending || row.status.toLowerCase() !== 'active'} onClick={() => returnAsset.mutate({ id: row.id })} className="font-black text-[#1D4ED8] disabled:text-[#94A3B8]">Return</button></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
