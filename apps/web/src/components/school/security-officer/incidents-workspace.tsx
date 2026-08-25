"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Siren } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { WorkspaceQueryFailure } from "@/components/school/workspace-query-failure";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { Panel, StatusChip, type Tone } from "./shared";

type IncidentsRecord = {
  id: string;
  date: string;
  description: string;
  location: string;
  severity: string;
  status: string;
};

type IncidentsData = {
  metrics: {
    open_incidents: number;
    resolved_today: number;
    escalated: number;
  };
  incidentsList: IncidentsRecord[];
};

type IncidentForm = {
  title: string;
  description: string;
  location: string;
  severity: "low" | "medium" | "high" | "critical";
};

type MutationResponse = { success?: boolean; message?: string };

const emptyIncidentForm: IncidentForm = {
  title: "",
  description: "",
  location: "School gate",
  severity: "medium",
};

function statusTone(value: string): Tone {
  const normalized = value.trim().toLowerCase();
  if (normalized === "resolved") return "success";
  if (["critical", "high", "escalated"].includes(normalized)) return "danger";
  if (["reported", "open", "active", "medium"].includes(normalized)) return "warning";
  if (normalized === "low") return "info";
  return "neutral";
}

export function IncidentsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<IncidentsData>(
    "/admin-command/security-officer/incidents",
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<IncidentForm>(emptyIncidentForm);
  const [resolveTarget, setResolveTarget] = useState<IncidentsRecord | null>(null);
  const [resolution, setResolution] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const canWrite = hasPermission("security:write");

  function onMutationError(title: string, actionError: Error) {
    setFeedback(null);
    setMutationError(actionError.message);
    toast.error(title, { description: actionError.message });
  }

  const createIncident = useSchoolMutation<MutationResponse, IncidentForm>(
    "/admin-command/security-officer/incidents",
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Security incident reported.";
        setMutationError(null);
        setFeedback(message);
        setForm(emptyIncidentForm);
        setShowForm(false);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => onMutationError("Incident was not recorded", actionError),
    },
  );
  const escalateIncident = useSchoolMutation<MutationResponse, { id: string }>(
    ({ id }) => `/admin-command/security-officer/incidents/${id}/escalate`,
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Incident escalated.";
        setMutationError(null);
        setFeedback(message);
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => onMutationError("Incident was not escalated", actionError),
    },
  );
  const resolveIncident = useSchoolMutation<MutationResponse, { id: string; resolution: string }>(
    ({ id }) => `/admin-command/security-officer/incidents/${id}/resolve`,
    "POST",
    {
      onSuccess: async (response) => {
        const message = response.message || "Incident resolved.";
        setMutationError(null);
        setFeedback(message);
        setResolveTarget(null);
        setResolution("");
        toast.success(message);
        await refetch();
      },
      onError: (actionError) => onMutationError("Incident was not resolved", actionError),
    },
  );

  function submitIncident() {
    if (!form.title.trim() || !form.description.trim() || !form.location.trim()) {
      toast.error("Incident title, description, and location are required.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    createIncident.mutate({
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      severity: form.severity,
    });
  }

  function submitResolution() {
    if (!resolveTarget || !resolution.trim()) {
      toast.error("Record a resolution note before closing this incident.");
      return;
    }
    setMutationError(null);
    setFeedback(null);
    resolveIncident.mutate({ id: resolveTarget.id, resolution: resolution.trim() });
  }

  if (error) {
    return (
      <Panel title="Security Incidents" description="Report, escalate, and resolve school-scoped security incidents." icon={AlertTriangle}>
        <WorkspaceQueryFailure title="Security incidents could not be loaded." error={error} onRetry={() => void refetch()} />
      </Panel>
    );
  }

  const items = data?.incidentsList ?? [];

  return (
    <Panel
      title="Security Incidents"
      description="Report, escalate, and resolve school-scoped security incidents."
      icon={AlertTriangle}
      actions={(
        <button
          type="button"
          disabled={permissionsLoading || !canWrite}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Report incident
        </button>
      )}
    >
      {feedback ? <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{feedback}</div> : null}
      {mutationError ? <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">The incident action failed: {mutationError}. The case remains visible and can be retried.</div> : null}

      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Report a security incident</h3>
          <p className="mt-1 text-xs text-[#64748B]">The backend records the reporter, audit entry, school boundary, and leadership notifications.</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">Incident title *<input aria-label="Incident title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Location *<input aria-label="Incident location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
            <label className="text-xs font-bold text-[#334155]">Severity *<select aria-label="Incident severity" value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as IncidentForm["severity"] }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Description *<textarea aria-label="Incident description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white p-2 text-sm" /></label>
          </div>
          <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={createIncident.isPending} onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B] disabled:opacity-50">Cancel</button><button type="button" disabled={createIncident.isPending} onClick={submitIncident} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createIncident.isPending ? "Reporting…" : "Save incident"}</button></div>
        </div>
      ) : null}

      {resolveTarget ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-black text-emerald-950">Resolve incident</h3>
          <p className="mt-1 text-xs text-emerald-800">{resolveTarget.description}</p>
          <label className="mt-3 block text-xs font-bold text-emerald-950">Resolution note *<textarea aria-label="Resolution note" value={resolution} onChange={(event) => setResolution(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-emerald-200 bg-white p-2 text-sm" /></label>
          <div className="mt-3 flex justify-end gap-2"><button type="button" disabled={resolveIncident.isPending} onClick={() => { setResolveTarget(null); setResolution(""); }} className="rounded-lg px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50">Cancel</button><button type="button" disabled={resolveIncident.isPending} onClick={submitResolution} className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-black text-white disabled:opacity-50">{resolveIncident.isPending ? "Resolving…" : "Confirm resolution"}</button></div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[["Open Incidents", data?.metrics?.open_incidents ?? 0], ["Resolved Today", data?.metrics?.resolved_today ?? 0], ["Escalated", data?.metrics?.escalated ?? 0]].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4"><div className="text-sm font-semibold text-[#64748B]">{label}</div><div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : value}</div></div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full whitespace-nowrap text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Date</th><th className="px-4 py-3 font-bold">Description</th><th className="px-4 py-3 font-bold">Location</th><th className="px-4 py-3 font-bold">Severity</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Actions</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading security incidents…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No security incidents have been recorded for this school. Use Report incident when a real case occurs.</td></tr>
            ) : (
              items.map((row) => {
                const normalizedStatus = row.status.trim().toLowerCase();
                return (
                  <tr key={row.id} className="border-t border-[#D8E0EC] hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#64748B]">{row.date}</td><td className="max-w-[28rem] whitespace-normal px-4 py-3 text-[#071D49]">{row.description}</td><td className="px-4 py-3 text-[#64748B]">{row.location || "—"}</td><td className="px-4 py-3"><StatusChip label={row.severity} tone={statusTone(row.severity)} /></td><td className="px-4 py-3"><StatusChip label={row.status} tone={statusTone(row.status)} /></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-2">
                      <button type="button" disabled={permissionsLoading || !canWrite || ["resolved", "escalated"].includes(normalizedStatus) || escalateIncident.isPending} onClick={() => escalateIncident.mutate({ id: row.id })} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-rose-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><Siren className="h-3.5 w-3.5" aria-hidden="true" /> Escalate</button>
                      <button type="button" disabled={permissionsLoading || !canWrite || normalizedStatus === "resolved" || resolveIncident.isPending} onClick={() => setResolveTarget(row)} title={!permissionsLoading && !canWrite ? "Security write permission is required" : undefined} className="inline-flex items-center gap-1 font-black text-emerald-700 disabled:cursor-not-allowed disabled:text-[#94A3B8]"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Resolve</button>
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
