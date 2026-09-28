"use client";
import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";

type LoansReturnsRecord = {
  id: string;
  asset_name: string;
  loaned_to: string;
  loan_date: string;
  due_date: string;
  return_date: string;
  status: string;
};

type LoansReturnsData = {
  metrics: {
    on_loan: number;
    returned_today: number;
    overdue: number;
  };
  loansreturnsList: LoansReturnsRecord[];
};

type IctOptions = {
  assets: Array<{ id: string; label: string }>;
  staff: Array<{ id: string; label: string }>;
};

export function LoansReturnsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<LoansReturnsData>('/admin-command/ict-manager/loans-returns');
  const { data: options, error: optionsError, refetch: refetchOptions } = useSchoolQuery<IctOptions>('/admin-command/ict-manager/options');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ asset_id: "", assigned_to_id: "", dueDate: "" });
  const createLoan = useSchoolMutation<unknown, typeof form>('/admin-command/ict-manager/loans-returns', 'POST', {
    onSuccess: async () => {
      toast.success('Asset loan recorded.');
      setForm({ asset_id: "", assigned_to_id: "", dueDate: "" });
      setShowForm(false);
      await refetch();
    },
    onError: (mutationError) => toast.error('Asset loan failed', { description: mutationError.message }),
  });
  const returnLoan = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/ict-manager/loans-returns/${id}/return`,
    'POST',
    {
      onSuccess: async () => { toast.success('Asset return recorded.'); await refetch(); },
      onError: (mutationError) => toast.error('Asset return failed', { description: mutationError.message }),
    },
  );
  const items = data?.loansreturnsList || [];
  const canWrite = hasPermission('ict:write');

  if (error) {
    return (
      <Panel title="Loans & Returns" description="Manage ICT equipment loans and returns." icon={ArrowLeftRight}>
        <WorkspaceQueryFailure title="ICT loans could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  function submitLoan() {
    if (!form.asset_id || !form.assigned_to_id || !form.dueDate) {
      toast.error('Choose an asset, borrower, and due date.');
      return;
    }
    createLoan.mutate(form);
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
      title="Loans & Returns"
      description="Manage ICT equipment loans and returns."
      icon={ArrowLeftRight}
      actions={<button type="button" disabled={permissionsLoading || !canWrite} onClick={() => setShowForm(true)} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-50">Record Loan</button>}
    >
      {showForm ? (
        <div className="mb-6 rounded-xl border border-info-border bg-info-soft p-4">
          {optionsError ? <WorkspaceQueryFailure title="Loan choices could not be loaded." error={optionsError} onRetry={() => void refetchOptions()} /> : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-bold text-foreground">Asset<select value={form.asset_id} onChange={(event) => setForm((current) => ({ ...current, asset_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"><option value="">Select asset</option>{(options?.assets ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-foreground">Borrower<select value={form.assigned_to_id} onChange={(event) => setForm((current) => ({ ...current, assigned_to_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm"><option value="">Select staff member</option>{(options?.staff ?? []).map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <label className="text-xs font-bold text-foreground">Due date<input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-sm" /></label>
              </div>
              <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-muted">Cancel</button><button type="button" disabled={createLoan.isPending} onClick={submitLoan} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createLoan.isPending ? 'Saving…' : 'Confirm Loan'}</button></div>
            </>
          )}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">On Loan</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.on_loan ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Returned Today</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.returned_today ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Overdue</div>
          <div className="mt-1 text-lg font-black text-foreground">{isLoading ? "..." : data?.metrics?.overdue ?? 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold">Asset Name</th>
              <th className="px-4 py-3 font-bold">Loaned To</th>
              <th className="px-4 py-3 font-bold">Loan Date</th>
              <th className="px-4 py-3 font-bold">Due Date</th>
              <th className="px-4 py-3 font-bold">Return Date</th>
              <th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No ICT equipment is on loan. Record a loan against a verified school asset and staff member.</td></tr>
            ) : (
              items.map(row => (
                <tr key={row.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3 text-muted">{row.asset_name}</td>
                  <td className="px-4 py-3 text-muted">{row.loaned_to}</td>
                  <td className="px-4 py-3 text-muted">{row.loan_date}</td>
                  <td className="px-4 py-3 text-muted">{row.due_date}</td>
                  <td className="px-4 py-3 text-muted">{row.return_date}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={getStatusTone(row.status)} /></td>
                  <td className="px-4 py-3"><button type="button" disabled={!canWrite || returnLoan.isPending || !['active', 'overdue'].includes(row.status.toLowerCase())} onClick={() => returnLoan.mutate({ id: row.id })} className="font-black text-info disabled:text-muted">Return</button></td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
