"use client";

import { useState } from "react";
import { ArrowLeftRight, LogIn, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type StaffMovementRecord = {
  id: string;
  staff_name: string;
  department: string;
  departed_at: string;
  expected_return: string;
  status: string;
};

type StaffMovementData = {
  metrics: {
    currently_out: number;
    departed_today: number;
    returned_today: number;
  };
  staffmovementList: StaffMovementRecord[];
};

type MovementMode = "departure" | "entry";

type MovementForm = {
  staff_id: string;
  staff_name: string;
  department: string;
  expected_return: string;
  notes: string;
};

type MutationResponse = { success?: boolean; message?: string };

const emptyMovementForm: MovementForm = {
  staff_id: "",
  staff_name: "",
  department: "",
  expected_return: "",
  notes: "",
};

function statusTone(status: string): Tone {
  const normalized = status.trim().toLowerCase();
  if (normalized === "returned") return "success";
  if (normalized === "departed") return "warning";
  return "neutral";
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "—";
}

export function StaffMovementWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<StaffMovementData>(
    "/admin-command/security-officer/staff-movement",
  );
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<MovementMode>("departure");
  const [form, setForm] = useState<MovementForm>(emptyMovementForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const canWrite = hasPermission("security:write");

  function onMutationError(title: string, actionError: Error) {
    setFeedback(null);
    setMutationError(actionError.message);
    toast.error(title, { description: actionError.message });
  }

  function completeMutation(response: MutationResponse, fallback: string) {
    const message = response.message || fallback;
    setMutationError(null);
    setFeedback(message);
    setForm(emptyMovementForm);
    setShowForm(false);
    toast.success(message);
  }

  const recordDeparture = useSchoolMutation<MutationResponse, MovementForm>(
    "/admin-command/security-officer/staff-movement/departure",
    "POST",
    {
      onSuccess: async (response) => {
        completeMutation(response, "Staff departure recorded.");
        await refetch();
      },
      onError: (actionError) => onMutationError("Staff departure was not recorded", actionError),
    },
  );
  const recordEntry = useSchoolMutation<MutationResponse, Pick<MovementForm, "staff_id" | "staff_name" | "notes">>(
    "/admin-command/security-officer/staff-movement/entry",
    "POST",
    {
      onSuccess: async (response) => {
        completeMutation(response, "Staff entry recorded.");
        await refetch();
      },
      onError: (actionError) => onMutationError("Staff entry was not recorded", actionError),
    },
  );
  const recordReturn = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/staff-movement/${id}/return`,
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Staff return recorded.";
        setMutationError(null);
        setFeedback(message);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => onMutationError("Staff return was not recorded", actionError),
    },
  );

  function submitMovement() {
    if (!form.staff_id.trim()) {
      toast.error("A staff reference is required.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    if (mode === "entry") {
      recordEntry.mutate({
        staff_id: form.staff_id.trim(),
        staff_name: form.staff_name.trim() || form.staff_id.trim(),
        notes: form.notes.trim(),
      });
      return;
    }
    recordDeparture.mutate({
      staff_id: form.staff_id.trim(),
      staff_name: form.staff_name.trim() || form.staff_id.trim(),
      department: form.department.trim(),
      expected_return: form.expected_return ? new Date(form.expected_return).toISOString() : "",
      notes: form.notes.trim(),
    });
  }

  if (error) {
    return (
      <Panel title="Staff Movement" description="Record staff gate departures, normal entries, and returns during school hours." icon={ArrowLeftRight}>
        <WorkspaceQueryFailure title="Staff movement records could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  const items = data?.staffmovementList ?? [];
  const formPending = recordDeparture.isPending || recordEntry.isPending;

  return (
    <Panel
      title="Staff Movement"
      description="Record staff gate departures, normal entries, and returns during school hours."
      icon={ArrowLeftRight}
      actions={(
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Log staff movement
        </button>
      )}
    >
      {feedback ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{feedback}</div> : null}
      {mutationError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">The staff movement action failed: {mutationError}. The register was not updated by this attempt.</div> : null}

      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Log staff movement</h3>
          <p className="mt-1 text-xs text-[#64748B]">Use the staff account, payroll, or name reference held by this school so the movement remains identifiable in the audited register.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-bold text-[#334155]">Movement type *<select aria-label="Staff movement type" value={mode} onChange={(event) => setMode(event.target.value as MovementMode)} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"><option value="departure">Departure</option><option value="entry">Normal entry</option></select></label>
            <label className="text-xs font-bold text-[#334155]">Staff reference *<input aria-label="Staff reference" value={form.staff_id} onChange={(event) => setForm((current) => ({ ...current, staff_id: event.target.value }))} placeholder="Account ID, payroll number, or name" className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Staff display name<input aria-label="Staff display name" value={form.staff_name} onChange={(event) => setForm((current) => ({ ...current, staff_name: event.target.value }))} placeholder="Optional when the reference is the name" className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            {mode === "departure" ? <>
              <label className="text-xs font-bold text-[#334155]">Department<input aria-label="Staff department" value={form.department} onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
              <label className="text-xs font-bold text-[#334155]">Expected return<input aria-label="Expected return" type="datetime-local" value={form.expected_return} onChange={(event) => setForm((current) => ({ ...current, expected_return: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            </> : null}
            <label className="text-xs font-bold text-[#334155] md:col-span-2 lg:col-span-3">Gate notes<textarea aria-label="Staff movement notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={formPending} onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] disabled:opacity-50">Cancel</button><button type="button" disabled={formPending} onClick={submitMovement} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{formPending ? "Recording…" : mode === "departure" ? "Record departure" : "Record entry"}</button></div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[["Currently Out", data?.metrics?.currently_out ?? 0], ["Departed Today", data?.metrics?.departed_today ?? 0], ["Returned Today", data?.metrics?.returned_today ?? 0]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4"><div className="text-sm font-semibold text-[#64748B]">{label}</div><div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : value}</div></div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Staff Name</th><th className="px-4 py-3 font-bold">Department</th><th className="px-4 py-3 font-bold">Departed At</th><th className="px-4 py-3 font-bold">Expected Return</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Action</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading school staff departures…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No staff departures have been logged for this school. Use Log staff movement when a staff member leaves or enters.</td></tr>
            ) : (
              items.map((row) => {
                const isDeparted = row.status.trim().toLowerCase() === "departed";
                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{row.staff_name}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.department)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.departed_at)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.expected_return)}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={statusTone(row.status)} /></td>
                    <td className="px-4 py-3"><button type="button" disabled={permissionsLoading || !canWrite || !isDeparted || recordReturn.isPending} onClick={() => recordReturn.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-emerald-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><LogIn className="h-3.5 w-3.5" aria-hidden="true" /> Record return</button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
