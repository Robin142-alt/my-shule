"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { CheckCircle2, LogIn, LogOut, ShieldAlert, Ticket } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type StudentExitPassesRecord = {
  id: string;
  student_name: string;
  class: string;
  authorized_by: string;
  exit_time: string;
  return_time: string;
  status: string;
};

type StudentExitPassesData = {
  metrics: {
    active_passes: number;
    pending_verification: number;
    returned_today: number;
  };
  studentexitpassesList: StudentExitPassesRecord[];
};

type UnauthorizedExitForm = {
  student_id: string;
  description: string;
  location: string;
};

type MutationResponse = { success?: boolean; message?: string };

const emptyUnauthorizedExit: UnauthorizedExitForm = {
  student_id: "",
  description: "",
  location: "School gate",
};

function statusTone(status: string): Tone {
  const normalized = status.trim().toLowerCase();
  if (normalized === "returned") return "success";
  if (["pending", "out", "departed"].includes(normalized)) return "warning";
  if (normalized === "verified") return "info";
  if (["unauthorized", "expired", "rejected"].includes(normalized)) return "danger";
  return "neutral";
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "—";
}

export function StudentExitPassesWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<StudentExitPassesData>(
    "/admin-command/security-officer/student-exit-passes",
  );
  const [showUnauthorizedForm, setShowUnauthorizedForm] = useState(false);
  const [unauthorizedForm, setUnauthorizedForm] = useState<UnauthorizedExitForm>(emptyUnauthorizedExit);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const canWrite = hasPermission("security:write");

  function onMutationError(title: string, actionError: Error) {
    setFeedback(null);
    setMutationError(actionError.message);
    toast.error(title, { description: actionError.message });
  }

  function completePassAction(response: MutationResponse, fallback: string) {
    const message = response.message || fallback;
    setMutationError(null);
    setFeedback(message);
    toast.success(message);
  }

  const verifyPass = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/student-exit-passes/${id}/verify`,
    "POST",
    {
      onSuccess: async (response) => { completePassAction(response, "Exit pass verified."); await refetch(); },
      onError: (actionError) => onMutationError("Exit pass was not verified", actionError),
    },
  );
  const recordExit = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/student-exit-passes/${id}/exit`,
    "POST",
    {
      onSuccess: async (response) => { completePassAction(response, "Student exit recorded."); await refetch(); },
      onError: (actionError) => onMutationError("Student exit was not recorded", actionError),
    },
  );
  const recordReturn = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/student-exit-passes/${id}/return`,
    "POST",
    {
      onSuccess: async (response) => { completePassAction(response, "Student return recorded."); await refetch(); },
      onError: (actionError) => onMutationError("Student return was not recorded", actionError),
    },
  );
  const flagUnauthorizedExit = useSchoolMutation<MutationResponse, UnauthorizedExitForm>(
    "/admin-command/security-officer/student-exit-passes/flag-unauthorized",
    "POST",
    {
      onSuccess: async (response) => {
        completePassAction(response, "Unauthorized exit incident created and routed.");
        setUnauthorizedForm(emptyUnauthorizedExit);
        setShowUnauthorizedForm(false);
        await refetch();
      },
      onError: (actionError) => onMutationError("Unauthorized exit was not flagged", actionError),
    },
  );

  function submitUnauthorizedExit() {
    if (!unauthorizedForm.student_id.trim() || !unauthorizedForm.description.trim() || !unauthorizedForm.location.trim()) {
      toast.error("Student or pass reference, description, and location are required.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    flagUnauthorizedExit.mutate({
      student_id: unauthorizedForm.student_id.trim(),
      description: unauthorizedForm.description.trim(),
      location: unauthorizedForm.location.trim(),
    });
  }

  if (error) {
    return (
      <Panel title="Student Exit Passes" description="Verify authorized exit passes and record each departure and return." icon={Ticket}>
        <WorkspaceQueryFailure title="Student exit passes could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  const items = data?.studentexitpassesList ?? [];

  return (
    <Panel
      title="Student Exit Passes"
      description="Verify authorized exit passes and record each departure and return."
      icon={Ticket}
      actions={(
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowUnauthorizedForm(true)}
          title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Flag unauthorized exit
        </button>
      )}
    >
      {feedback ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{feedback}</div> : null}
      {mutationError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">The exit-pass action failed: {mutationError}. The current pass status remains visible for a safe retry.</div> : null}

      {showUnauthorizedForm ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <h3 className="text-sm font-black text-rose-950">Flag an unauthorized exit attempt</h3>
          <p className="mt-1 text-xs text-rose-800">This creates a real high-severity incident and notifies authorized school leadership and discipline roles.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-rose-950">Student or pass reference *<input aria-label="Student or pass reference" value={unauthorizedForm.student_id} onChange={(event) => setUnauthorizedForm((current) => ({ ...current, student_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-rose-950">Location *<input aria-label="Unauthorized exit location" value={unauthorizedForm.location} onChange={(event) => setUnauthorizedForm((current) => ({ ...current, location: event.target.value }))} className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-rose-950 md:col-span-2">Description *<textarea aria-label="Unauthorized exit description" value={unauthorizedForm.description} onChange={(event) => setUnauthorizedForm((current) => ({ ...current, description: event.target.value }))} rows={3} className="mt-1 w-full rounded-lg border border-rose-200 bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={flagUnauthorizedExit.isPending} onClick={() => setShowUnauthorizedForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-rose-900 disabled:opacity-50">Cancel</button><button type="button" disabled={flagUnauthorizedExit.isPending} onClick={submitUnauthorizedExit} className="rounded-lg bg-rose-800 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{flagUnauthorizedExit.isPending ? "Flagging…" : "Create incident"}</button></div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[["Active Passes", data?.metrics?.active_passes ?? 0], ["Pending Verification", data?.metrics?.pending_verification ?? 0], ["Returned Today", data?.metrics?.returned_today ?? 0]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4"><div className="text-sm font-semibold text-[#64748B]">{label}</div><div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : value}</div></div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <RecordTable className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Student Name</th><th className="px-4 py-3 font-bold">Class</th><th className="px-4 py-3 font-bold">Authorized By</th><th className="px-4 py-3 font-bold">Exit Time</th><th className="px-4 py-3 font-bold">Return Time</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Actions</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading authorized student exit passes…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No authorized exit passes are waiting at this school gate. Passes appear here after the school&apos;s approval workflow; use Flag unauthorized exit for an unapproved attempt.</td></tr>
            ) : (
              items.map((row) => {
                const status = row.status.trim().toLowerCase();
                const canVerify = status === "pending";
                const canRecordExit = ["verified", "active", "approved"].includes(status);
                const canRecordReturn = ["out", "departed"].includes(status);
                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{row.student_name}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.class)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.authorized_by)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.exit_time)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.return_time)}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={statusTone(row.status)} /></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                      <button type="button" disabled={permissionsLoading || !canWrite || !canVerify || verifyPass.isPending} onClick={() => verifyPass.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-[#1D4ED8] disabled:cursor-not-allowed disabled:text-[#94A3B8]"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Verify</button>
                      <button type="button" disabled={permissionsLoading || !canWrite || !canRecordExit || recordExit.isPending} onClick={() => recordExit.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-amber-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Log exit</button>
                      <button type="button" disabled={permissionsLoading || !canWrite || !canRecordReturn || recordReturn.isPending} onClick={() => recordReturn.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-emerald-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><LogIn className="h-3.5 w-3.5" aria-hidden="true" /> Log return</button>
                    </div></td>
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
