"use client";

import { useState } from "react";
import { Calendar, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import {
  fieldClassName,
  MetricCard,
  Panel,
  StatusChip,
  toneForStatus,
  WorkspaceFailure,
} from "./shared";

type SessionRecord = {
  id: string;
  student_name: string;
  class: string;
  counsellor: string;
  date: string;
  time: string;
  agenda: string;
  location: string;
  status: string;
};

type SessionsData = {
  metrics: { sessions_today: number; upcoming: number; completed_this_term: number };
  sessionsList: SessionRecord[];
};

type WorkspaceOptions = {
  students: Array<{ id: string; label: string }>;
  referrals: Array<{ id: string; label: string; student_id: string }>;
};

type SessionForm = {
  student_id: string;
  referral_id: string;
  scheduled_for: string;
  agenda: string;
  location: string;
};

const emptyForm: SessionForm = {
  student_id: "",
  referral_id: "",
  scheduled_for: "",
  agenda: "",
  location: "",
};

export function SessionsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, failureReason, isLoading, refetch } = useSchoolQuery<SessionsData>(
    "/admin-command/guidance-counselling/sessions",
  );
  const optionsQuery = useSchoolQuery<WorkspaceOptions>(
    "/admin-command/guidance-counselling/options",
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SessionForm>(emptyForm);
  const canWrite = hasPermission("counselling:write");

  const createSession = useSchoolMutation<unknown, SessionForm>(
    "/admin-command/guidance-counselling/sessions",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling session scheduled.");
        setForm(emptyForm);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => toast.error("Session was not scheduled", { description: mutationError.message }),
    },
  );
  const completeSession = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/guidance-counselling/sessions/${encodeURIComponent(id)}/complete`,
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling session completed.");
        await refetch();
      },
      onError: (mutationError) => toast.error("Session was not completed", { description: mutationError.message }),
    },
  );

  function submitSession() {
    if (!form.student_id || !form.scheduled_for || !form.agenda.trim()) {
      toast.error("Student, date and time, and session agenda are required.");
      return;
    }
    createSession.mutate({
      ...form,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
      agenda: form.agenda.trim(),
      location: form.location.trim(),
    });
  }

  const readFailure = error ?? failureReason;
  const items = data?.sessionsList ?? [];
  const referrals = (optionsQuery.data?.referrals ?? []).filter(
    (referral) => !form.student_id || referral.student_id === form.student_id,
  );

  return (
    <Panel
      title="Counselling Sessions"
      description="Schedule confidential learner sessions and record completion against live school records."
      icon={Calendar}
      actions={
        <button
          type="button"
          disabled={permissionsLoading || !canWrite || optionsQuery.isLoading || Boolean(optionsQuery.error)}
          onClick={() => setShowForm(true)}
          title={!permissionsLoading && !canWrite ? "Counselling write permission is required" : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Schedule Session
        </button>
      }
    >
      {optionsQuery.error ? (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Learner options could not be loaded, so scheduling is temporarily unavailable.
          <button type="button" onClick={() => void optionsQuery.refetch()} className="ml-2 font-black underline">Retry</button>
        </div>
      ) : null}

      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Schedule counselling session</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">
              Student *
              <select
                aria-label="Student"
                value={form.student_id}
                onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value, referral_id: "" }))}
                className={fieldClassName}
              >
                <option value="">Select student</option>
                {(optionsQuery.data?.students ?? []).map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Linked referral
              <select
                aria-label="Linked referral"
                value={form.referral_id}
                onChange={(event) => setForm((current) => ({ ...current, referral_id: event.target.value }))}
                className={fieldClassName}
              >
                <option value="">No linked referral</option>
                {referrals.map((referral) => <option key={referral.id} value={referral.id}>{referral.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Date and time *
              <input
                aria-label="Date and time"
                type="datetime-local"
                value={form.scheduled_for}
                onChange={(event) => setForm((current) => ({ ...current, scheduled_for: event.target.value }))}
                className={fieldClassName}
              />
            </label>
            <label className="text-xs font-bold text-[#334155]">
              Location
              <input
                aria-label="Location"
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                className={fieldClassName}
              />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">
              Session agenda *
              <textarea
                aria-label="Session agenda"
                rows={3}
                value={form.agenda}
                onChange={(event) => setForm((current) => ({ ...current, agenda: event.target.value }))}
                className={fieldClassName}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button type="button" disabled={createSession.isPending} onClick={submitSession} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {createSession.isPending ? "Scheduling…" : "Schedule Session"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Sessions Today" value={isLoading ? "…" : data?.metrics.sessions_today ?? 0} tone="info" />
        <MetricCard label="Upcoming" value={isLoading ? "…" : data?.metrics.upcoming ?? 0} tone="warning" />
        <MetricCard label="Completed This Term" value={isLoading ? "…" : data?.metrics.completed_this_term ?? 0} tone="success" />
      </div>

      {readFailure ? (
        <WorkspaceFailure title="Counselling sessions could not be loaded." error={readFailure} onRetry={() => void refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]"><tr>
              <th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Class</th>
              <th className="px-4 py-3 font-bold">Counsellor</th><th className="px-4 py-3 font-bold">When</th>
              <th className="px-4 py-3 font-bold">Agenda</th><th className="px-4 py-3 font-bold">Status</th>
              <th className="px-4 py-3 font-bold">Action</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading sessions…</td></tr> : null}
              {!isLoading && items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No counselling sessions have been scheduled for this school. Schedule the first session when a learner needs support.</td></tr> : null}
              {items.map((row) => (
                <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{row.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.class || "—"}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.counsellor}</td>
                  <td className="px-4 py-3 text-[#64748B]">{row.date} {row.time}</td>
                  <td className="max-w-[24rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.agenda}{row.location ? ` · ${row.location}` : ""}</td>
                  <td className="px-4 py-3"><StatusChip label={row.status} tone={toneForStatus(row.status)} /></td>
                  <td className="px-4 py-3">
                    {canWrite && row.status.toLowerCase() === "scheduled" ? (
                      <button type="button" disabled={completeSession.isPending} onClick={() => completeSession.mutate({ id: row.id })} className="font-black text-emerald-700 underline disabled:opacity-50">Mark complete</button>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
