"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { DoorOpen, LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type GateRegisterRecord = {
  id: string;
  time: string;
  name: string;
  type: string;
  id_number: string;
  purpose: string;
  status: string;
};

type GateRegisterData = {
  metrics: {
    entries_today: number;
    exits_today: number;
    pending_verification: number;
  };
  gateregisterList: GateRegisterRecord[];
};

type GateEntryForm = {
  visitor_name: string;
  id_number: string;
  phone_number: string;
  purpose: string;
  host_user_id: string;
};

type MutationResponse = { success?: boolean; message?: string };

const emptyGateEntry: GateEntryForm = {
  visitor_name: "",
  id_number: "",
  phone_number: "",
  purpose: "",
  host_user_id: "",
};

function statusTone(status: string): Tone {
  const normalized = status.trim().toLowerCase();
  if (["checked out", "cleared", "completed"].includes(normalized)) return "success";
  if (["active", "checked in"].includes(normalized)) return "info";
  if (normalized === "flagged") return "danger";
  return "neutral";
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "—";
}

export function GateRegisterWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<GateRegisterData>(
    "/admin-command/security-officer/gate-register",
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GateEntryForm>(emptyGateEntry);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const canWrite = hasPermission("security:write");

  function onMutationError(title: string, actionError: Error) {
    setFeedback(null);
    setMutationError(actionError.message);
    toast.error(title, { description: actionError.message });
  }

  const createEntry = useSchoolMutation<MutationResponse, GateEntryForm>(
    "/admin-command/security-officer/gate-register",
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Gate entry recorded.";
        setMutationError(null);
        setFeedback(message);
        setForm(emptyGateEntry);
        setShowForm(false);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => onMutationError("Gate entry was not recorded", actionError),
    },
  );
  const recordExit = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/gate-register/${id}/exit`,
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Gate exit recorded.";
        setMutationError(null);
        setFeedback(message);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => onMutationError("Gate exit was not recorded", actionError),
    },
  );

  function submitEntry() {
    if (!form.visitor_name.trim() || !form.purpose.trim()) {
      toast.error("Name and purpose are required before recording a gate entry.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    createEntry.mutate({
      visitor_name: form.visitor_name.trim(),
      id_number: form.id_number.trim(),
      phone_number: form.phone_number.trim(),
      purpose: form.purpose.trim(),
      host_user_id: form.host_user_id.trim(),
    });
  }

  if (error) {
    return (
      <Panel title="Gate Register" description="Record verified visitor arrivals and departures at the active school gate." icon={DoorOpen}>
        <WorkspaceQueryFailure title="The gate register could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  const items = data?.gateregisterList ?? [];

  return (
    <Panel
      title="Gate Register"
      description="Record verified visitor arrivals and departures at the active school gate."
      icon={DoorOpen}
      actions={(
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Record visitor entry
        </button>
      )}
    >
      {feedback ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{feedback}</div> : null}
      {mutationError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">The gate action failed: {mutationError}. Verify the entry is still active before retrying.</div> : null}

      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Record a visitor gate entry</h3>
          <p className="mt-1 text-xs text-[#64748B]">The gate entry uses the same audited visitor register as reception and the Visitor Management workspace.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-bold text-[#334155]">Visitor name *<input aria-label="Gate visitor name" value={form.visitor_name} onChange={(event) => setForm((current) => ({ ...current, visitor_name: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">ID or passport number<input aria-label="Gate ID or passport number" value={form.id_number} onChange={(event) => setForm((current) => ({ ...current, id_number: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Phone number<input aria-label="Gate phone number" type="tel" value={form.phone_number} onChange={(event) => setForm((current) => ({ ...current, phone_number: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Purpose *<input aria-label="Gate visit purpose" value={form.purpose} onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Host account ID<input aria-label="Gate host account ID" value={form.host_user_id} onChange={(event) => setForm((current) => ({ ...current, host_user_id: event.target.value }))} placeholder="Optional" className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" disabled={createEntry.isPending} onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] disabled:opacity-50">Cancel</button>
            <button type="button" disabled={createEntry.isPending} onClick={submitEntry} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createEntry.isPending ? "Recording…" : "Save gate entry"}</button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[["Entries Today", data?.metrics?.entries_today ?? 0], ["Exits Today", data?.metrics?.exits_today ?? 0], ["Still On Site", data?.metrics?.pending_verification ?? 0]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4"><div className="text-sm font-semibold text-[#64748B]">{label}</div><div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : value}</div></div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Time In</th><th className="px-4 py-3 font-bold">Name</th><th className="px-4 py-3 font-bold">Type</th><th className="px-4 py-3 font-bold">ID Number</th><th className="px-4 py-3 font-bold">Purpose</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Action</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading today&apos;s school gate activity…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No visitor gate entries exist for this school. Use Record visitor entry when the first visitor arrives.</td></tr>
            ) : (
              items.map((row) => {
                const canExit = ["active", "flagged", "checked in"].includes(row.status.trim().toLowerCase());
                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#64748B]">{displayValue(row.time)}</td><td className="px-4 py-3 font-semibold text-[#071D49]">{row.name}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.type)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.id_number)}</td><td className="max-w-[22rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.purpose}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={statusTone(row.status)} /></td>
                    <td className="px-4 py-3"><button type="button" disabled={permissionsLoading || !canWrite || !canExit || recordExit.isPending} onClick={() => recordExit.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-emerald-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Record exit</button></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </RecordTable>
      </div>
    </Panel>
  );
}
