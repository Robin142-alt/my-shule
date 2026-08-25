"use client";

import { useState } from "react";
import { BadgeCheck, LogOut, Plus, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type VisitorsRecord = {
  id: string;
  name: string;
  id_number: string;
  purpose: string;
  host: string;
  check_in: string;
  check_out: string;
  status: string;
};

type VisitorsData = {
  metrics: {
    checked_in: number;
    checked_out_today: number;
    flagged: number;
  };
  visitorsList: VisitorsRecord[];
};

type MutationResponse = { success?: boolean; message?: string };

type VisitorBadgeResponse = MutationResponse & {
  badge?: {
    id: string;
    visitor_name: string;
    purpose: string;
    host_user_id?: string | null;
    badge_number: string;
    time_in: string;
  };
};

type VisitorForm = {
  visitor_name: string;
  phone_number: string;
  id_number: string;
  purpose: string;
  host_user_id: string;
};

const emptyVisitorForm: VisitorForm = {
  visitor_name: "",
  phone_number: "",
  id_number: "",
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

export function VisitorsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<VisitorsData>(
    "/admin-command/security-officer/visitors",
  );
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [visitorForm, setVisitorForm] = useState<VisitorForm>(emptyVisitorForm);
  const [flagTarget, setFlagTarget] = useState<VisitorsRecord | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [badge, setBadge] = useState<VisitorBadgeResponse["badge"]>(undefined);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const canWrite = hasPermission("security:write");

  function handleMutationError(title: string, actionError: Error) {
    setFeedback(null);
    setMutationError(actionError.message);
    toast.error(title, { description: actionError.message });
  }

  const checkIn = useSchoolMutation<MutationResponse, VisitorForm>(
    "/admin-command/security-officer/visitors/check-in",
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Visitor checked in.";
        setMutationError(null);
        setFeedback(message);
        setVisitorForm(emptyVisitorForm);
        setShowCheckInForm(false);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => handleMutationError("Visitor was not checked in", actionError),
    },
  );
  const checkOut = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/visitors/${id}/check-out`,
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Visitor checked out.";
        setMutationError(null);
        setFeedback(message);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => handleMutationError("Visitor was not checked out", actionError),
    },
  );
  const flagVisitor = useSchoolMutation<MutationResponse, { id: string; reason: string }>(
    ({ id }) => `/admin-command/security-officer/visitors/${id}/flag`,
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Visitor flagged and incident created.";
        setMutationError(null);
        setFeedback(message);
        setFlagTarget(null);
        setFlagReason("");
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => handleMutationError("Visitor was not flagged", actionError),
    },
  );
  const prepareBadge = useSchoolMutation<VisitorBadgeResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/visitors/${id}/print-badge`,
    "POST",
    {
      onSuccess: async (response) => {
        if (!response.badge) {
          handleMutationError("Badge could not be prepared", new Error("The badge endpoint returned no badge details."));
          return;
        }
        const message = response.message || "Visitor badge prepared.";
        setMutationError(null);
        setFeedback(message);
        setBadge(response.badge);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => handleMutationError("Badge could not be prepared", actionError),
    },
  );

  function submitCheckIn() {
    if (!visitorForm.visitor_name.trim() || !visitorForm.purpose.trim()) {
      toast.error("Visitor name and visit purpose are required.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    checkIn.mutate({
      visitor_name: visitorForm.visitor_name.trim(),
      phone_number: visitorForm.phone_number.trim(),
      id_number: visitorForm.id_number.trim(),
      purpose: visitorForm.purpose.trim(),
      host_user_id: visitorForm.host_user_id.trim(),
    });
  }

  function submitFlag() {
    if (!flagTarget || !flagReason.trim()) {
      toast.error("Record a reason before flagging this visitor.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    flagVisitor.mutate({ id: flagTarget.id, reason: flagReason.trim() });
  }

  if (error) {
    return (
      <Panel title="Visitor Management" description="Check visitors in, issue badge details, flag concerns, and record departures." icon={Users}>
        <WorkspaceQueryFailure title="The visitor register could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  const items = data?.visitorsList ?? [];

  return (
    <Panel
      title="Visitor Management"
      description="Check visitors in, issue badge details, flag concerns, and record departures."
      icon={Users}
      actions={(
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowCheckInForm(true)}
          title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Check in visitor
        </button>
      )}
    >
      {feedback ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{feedback}</div> : null}
      {mutationError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">The visitor action failed: {mutationError}. Review the record and try again.</div> : null}

      {showCheckInForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Check in a visitor</h3>
          <p className="mt-1 text-xs text-[#64748B]">This entry is saved to the current school register and reception is notified by the backend workflow.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-bold text-[#334155]">Visitor name *<input aria-label="Visitor name" value={visitorForm.visitor_name} onChange={(event) => setVisitorForm((current) => ({ ...current, visitor_name: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">ID or passport number<input aria-label="ID or passport number" value={visitorForm.id_number} onChange={(event) => setVisitorForm((current) => ({ ...current, id_number: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Phone number<input aria-label="Phone number" type="tel" value={visitorForm.phone_number} onChange={(event) => setVisitorForm((current) => ({ ...current, phone_number: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Visit purpose *<input aria-label="Visit purpose" value={visitorForm.purpose} onChange={(event) => setVisitorForm((current) => ({ ...current, purpose: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Host account ID<input aria-label="Host account ID" value={visitorForm.host_user_id} onChange={(event) => setVisitorForm((current) => ({ ...current, host_user_id: event.target.value }))} placeholder="Optional" className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" disabled={checkIn.isPending} onClick={() => setShowCheckInForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] disabled:opacity-50">Cancel</button>
            <button type="button" disabled={checkIn.isPending} onClick={submitCheckIn} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{checkIn.isPending ? "Checking in…" : "Save check-in"}</button>
          </div>
        </div>
      ) : null}

      {flagTarget ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-black text-amber-950">Flag {flagTarget.name}</h3>
          <p className="mt-1 text-xs text-amber-800">Flagging creates a school-scoped security incident and notifies authorized leadership roles.</p>
          <label className="mt-3 block text-xs font-bold text-amber-950">Reason *<textarea aria-label="Flag reason" value={flagReason} onChange={(event) => setFlagReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-amber-200 bg-white p-2 text-sm" /></label>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" disabled={flagVisitor.isPending} onClick={() => { setFlagTarget(null); setFlagReason(""); }} className="rounded-lg px-4 py-2 text-sm font-bold text-amber-900 disabled:opacity-50">Cancel</button>
            <button type="button" disabled={flagVisitor.isPending} onClick={submitFlag} className="rounded-lg bg-amber-900 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{flagVisitor.isPending ? "Flagging…" : "Create flagged incident"}</button>
          </div>
        </div>
      ) : null}

      {badge ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-white p-4" aria-label="Visitor badge preview">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1D4ED8]">Visitor badge preview</p>
              <p className="mt-2 text-xl font-black text-[#071D49]">{badge.visitor_name}</p>
              <p className="mt-1 text-sm text-[#64748B]">{badge.purpose}</p>
              <p className="mt-2 font-mono text-sm font-black text-[#071D49]">{badge.badge_number}</p>
            </div>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#071D49] px-4 py-2 text-sm font-black text-[#071D49]"><BadgeCheck className="h-4 w-4" aria-hidden="true" /> Print badge</button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[["Checked In", data?.metrics?.checked_in ?? 0], ["Checked Out Today", data?.metrics?.checked_out_today ?? 0], ["Flagged", data?.metrics?.flagged ?? 0]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4"><div className="text-sm font-semibold text-[#64748B]">{label}</div><div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : value}</div></div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Name</th><th className="px-4 py-3 font-bold">ID Number</th><th className="px-4 py-3 font-bold">Purpose</th><th className="px-4 py-3 font-bold">Host</th><th className="px-4 py-3 font-bold">Check In</th><th className="px-4 py-3 font-bold">Check Out</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Actions</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading the school visitor register…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No visitors have checked in at this school. Use Check in visitor to record the first arrival.</td></tr>
            ) : (
              items.map((row) => {
                const normalizedStatus = row.status.trim().toLowerCase();
                const isOnSite = !row.check_out && ["active", "flagged", "checked in"].includes(normalizedStatus);
                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{row.name}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.id_number)}</td><td className="max-w-[20rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.purpose}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.host)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.check_in)}</td><td className="px-4 py-3 text-[#64748B]">{displayValue(row.check_out)}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={statusTone(row.status)} /></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                      <button type="button" disabled={permissionsLoading || !canWrite || prepareBadge.isPending} onClick={() => prepareBadge.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-[#1D4ED8] disabled:cursor-not-allowed disabled:text-[#94A3B8]"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Prepare badge</button>
                      <button type="button" disabled={permissionsLoading || !canWrite || !isOnSite || normalizedStatus === "flagged" || flagVisitor.isPending} onClick={() => setFlagTarget(row)} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-amber-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Flag</button>
                      <button type="button" disabled={permissionsLoading || !canWrite || !isOnSite || checkOut.isPending} onClick={() => checkOut.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-emerald-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><LogOut className="h-3.5 w-3.5" aria-hidden="true" /> Check out</button>
                    </div></td>
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
