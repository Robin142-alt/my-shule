"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { fieldClassName, MetricCard, Panel, StatusChip, toneForStatus, WorkspaceFailure } from "./shared";

type FollowUpRecord = {
  id: string;
  student_name: string;
  class: string;
  reason: string;
  due_date: string;
  priority: string;
  counsellor: string;
  status: string;
};

type FollowUpsData = {
  metrics: { pending_followups: number; completed: number; overdue: number };
  followUpsList: FollowUpRecord[];
};

type WorkspaceOptions = { students: Array<{ id: string; label: string }> };
type FollowUpForm = { student_id: string; reason: string; due_date: string; priority: string };

const emptyForm: FollowUpForm = { student_id: "", reason: "", due_date: "", priority: "normal" };

export function FollowUpsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<FollowUpsData>(
    "/admin-command/guidance-counselling/follow-ups",
  );
  const optionsQuery = useSchoolQuery<WorkspaceOptions>("/admin-command/guidance-counselling/options");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FollowUpForm>(emptyForm);
  const canWrite = hasPermission("counselling:write");

  const createFollowUp = useSchoolMutation<unknown, FollowUpForm>(
    "/admin-command/guidance-counselling/follow-ups",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling follow-up scheduled.");
        setForm(emptyForm);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => toast.error("Follow-up was not scheduled", { description: mutationError.message }),
    },
  );
  const completeFollowUp = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/guidance-counselling/follow-ups/${encodeURIComponent(id)}/done`,
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling follow-up completed.");
        await refetch();
      },
      onError: (mutationError) => toast.error("Follow-up was not completed", { description: mutationError.message }),
    },
  );

  function submitFollowUp() {
    if (!form.student_id || !form.due_date || !form.reason.trim()) {
      toast.error("Student, follow-up date, and reason are required.");
      return;
    }
    createFollowUp.mutate({ ...form, reason: form.reason.trim() });
  }

  const items = data?.followUpsList ?? [];

  return (
    <Panel
      title="Follow-ups"
      description="Schedule and complete learner follow-up actions against tenant-scoped counselling records."
      icon={RefreshCw}
      actions={
        <button
          type="button"
          disabled={permissionsLoading || !canWrite || optionsQuery.isLoading || Boolean(optionsQuery.error)}
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New Follow-up
        </button>
      }
    >
      {optionsQuery.error ? (
        <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Learner options could not be loaded. <button type="button" onClick={() => void optionsQuery.refetch()} className="font-black underline">Retry</button>
        </div>
      ) : null}
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Schedule follow-up</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">Student *
              <select aria-label="Student" value={form.student_id} onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))} className={fieldClassName}>
                <option value="">Select student</option>
                {(optionsQuery.data?.students ?? []).map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">Due date *
              <input aria-label="Due date" type="date" value={form.due_date} onChange={(event) => setForm((current) => ({ ...current, due_date: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-[#334155]">Priority
              <select aria-label="Priority" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className={fieldClassName}>
                <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Follow-up reason *
              <textarea aria-label="Follow-up reason" rows={3} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className={fieldClassName} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button type="button" disabled={createFollowUp.isPending} onClick={submitFollowUp} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createFollowUp.isPending ? "Saving…" : "Save Follow-up"}</button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Pending Follow-ups" value={isLoading ? "…" : data?.metrics.pending_followups ?? 0} tone="warning" />
        <MetricCard label="Completed" value={isLoading ? "…" : data?.metrics.completed ?? 0} tone="success" />
        <MetricCard label="Overdue" value={isLoading ? "…" : data?.metrics.overdue ?? 0} tone="danger" />
      </div>

      {error ? <WorkspaceFailure title="Counselling follow-ups could not be loaded." error={error} onRetry={() => void refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]"><tr>
              <th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Class</th><th className="px-4 py-3 font-bold">Reason</th>
              <th className="px-4 py-3 font-bold">Due</th><th className="px-4 py-3 font-bold">Priority</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Action</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading follow-ups…</td></tr> : null}
              {!isLoading && items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No follow-ups are scheduled. Add one after a counselling session when continued learner support is needed.</td></tr> : null}
              {items.map((row) => <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{row.student_name}</td><td className="px-4 py-3 text-[#64748B]">{row.class || "—"}</td>
                <td className="max-w-[24rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.reason}</td><td className="px-4 py-3 text-[#64748B]">{row.due_date}</td>
                <td className="px-4 py-3 text-[#64748B]">{row.priority}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={toneForStatus(row.status)} /></td>
                <td className="px-4 py-3">{canWrite && ["pending", "open"].includes(row.status.toLowerCase()) ? <button type="button" disabled={completeFollowUp.isPending} onClick={() => completeFollowUp.mutate({ id: row.id })} className="font-black text-emerald-700 underline disabled:opacity-50">Mark done</button> : "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
