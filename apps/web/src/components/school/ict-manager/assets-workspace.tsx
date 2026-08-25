"use client";
import { useState } from "react";
import { HardDrive, Plus } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";

type AssetsRecord = {
  id: string;
  asset_name: string;
  asset_tag: string;
  category: string;
  location: string;
  purchase_date: string;
  status: string;
};

type AssetsData = {
  metrics: {
    total_assets: number;
    active: number;
    in_repair: number;
    disposed: number;
  };
  assetsList: AssetsRecord[];
};

export function AssetsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<AssetsData>('/admin-command/ict-manager/assets');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_name: "", asset_tag: "", category: "", location: "", purchase_date: "" });
  const createAsset = useSchoolMutation<unknown, typeof form>('/admin-command/ict-manager/assets', 'POST', {
    onSuccess: async () => {
      toast.success('ICT asset created.');
      setForm({ asset_name: "", asset_tag: "", category: "", location: "", purchase_date: "" });
      setShowForm(false);
      await refetch();
    },
    onError: (mutationError) => toast.error('Asset was not created', { description: mutationError.message }),
  });
  const items = data?.assetsList || [];
  const canWrite = hasPermission('ict:write');

  if (error) {
    return (
      <Panel title="ICT Assets" description="Manage the school ICT asset inventory." icon={HardDrive}>
        <WorkspaceQueryFailure title="ICT assets could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  function submitAsset() {
    if (!form.asset_name.trim() || !form.category.trim()) {
      toast.error('Asset name and category are required.');
      return;
    }
    createAsset.mutate({
      ...form,
      asset_name: form.asset_name.trim(),
      asset_tag: form.asset_tag.trim(),
      category: form.category.trim(),
      location: form.location.trim(),
    });
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
      title="ICT Assets"
      description="Manage the school ICT asset inventory."
      icon={HardDrive}
      actions={(
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? 'ICT write permission is required' : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      )}
    >
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Add a verified school asset</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input aria-label="Asset name" value={form.asset_name} onChange={(event) => setForm((current) => ({ ...current, asset_name: event.target.value }))} placeholder="Asset name *" className="rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            <input aria-label="Asset tag" value={form.asset_tag} onChange={(event) => setForm((current) => ({ ...current, asset_tag: event.target.value }))} placeholder="Asset tag" className="rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            <input aria-label="Asset category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category *" className="rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            <input aria-label="Asset location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Location" className="rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" />
            <label className="text-xs font-bold text-[#334155]">Purchase date<input type="date" value={form.purchase_date} onChange={(event) => setForm((current) => ({ ...current, purchase_date: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button type="button" disabled={createAsset.isPending} onClick={submitAsset} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createAsset.isPending ? 'Saving…' : 'Save Asset'}</button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Assets</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.total_assets ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Active</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.active ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">In Repair</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.in_repair ?? 0}</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Disposed</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.disposed ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold">Asset Name</th>
              <th className="px-4 py-3 font-bold">Asset Tag</th>
              <th className="px-4 py-3 font-bold">Category</th>
              <th className="px-4 py-3 font-bold">Location</th>
              <th className="px-4 py-3 font-bold">Purchase Date</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No ICT asset exists for this school. Add the first verified asset to start assignments and maintenance tracking.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#64748B]">{row.asset_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.asset_tag}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.category}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.location}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.purchase_date}</td>
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
