"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { fieldClassName, MetricCard, Panel, StatusChip, toneForStatus, WorkspaceFailure } from "./shared";

type ParentEngagementRecord = {
  id: string;
  student_name: string;
  parent_name: string;
  date: string;
  type: string;
  reason: string;
  counsellor: string;
  guardian_status: string;
  status: string;
};

type ParentEngagementData = {
  metrics: { parent_sessions: number; pending_invitations: number; notifications_queued: number };
  parentEngagementList: ParentEngagementRecord[];
};

type WorkspaceOptions = {
  students: Array<{ id: string; label: string }>;
  guardians: Array<{ id: string; label: string; student_id: string }>;
};

type ParentEngagementForm = {
  student_id: string;
  guardian_id: string;
  contact_method: string;
  reason: string;
  summary: string;
  agreed_action: string;
  follow_up_date: string;
};

const emptyForm: ParentEngagementForm = {
  student_id: "",
  guardian_id: "",
  contact_method: "phone",
  reason: "",
  summary: "",
  agreed_action: "",
  follow_up_date: "",
};

export function ParentEngagementWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<ParentEngagementData>(
    "/admin-command/guidance-counselling/parent-engagement",
  );
  const optionsQuery = useSchoolQuery<WorkspaceOptions>("/admin-command/guidance-counselling/options");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ParentEngagementForm>(emptyForm);
  const canWrite = hasPermission("counselling:write");

  const createEngagement = useSchoolMutation<unknown, ParentEngagementForm>(
    "/admin-command/guidance-counselling/parent-engagement",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Parent engagement logged.");
        setForm(emptyForm);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => toast.error("Parent engagement was not logged", { description: mutationError.message }),
    },
  );
  const notifyParent = useSchoolMutation<{ delivery_state?: string }, { id: string }>(
    ({ id }) => `/admin-command/guidance-counselling/parent-engagement/${encodeURIComponent(id)}/notify`,
    "POST",
    {
      onSuccess: async () => {
        toast.success("Parent portal notification queued.");
        await refetch();
      },
      onError: (mutationError) => toast.error("Parent notification was not queued", { description: mutationError.message }),
    },
  );

  function submitEngagement() {
    if (!form.student_id || !form.guardian_id || !form.reason.trim()) {
      toast.error("Student, parent or guardian, and engagement reason are required.");
      return;
    }
    createEngagement.mutate({
      ...form,
      reason: form.reason.trim(),
      summary: form.summary.trim(),
      agreed_action: form.agreed_action.trim(),
    });
  }

  const items = data?.parentEngagementList ?? [];
  const guardians = (optionsQuery.data?.guardians ?? []).filter(
    (guardian) => !form.student_id || guardian.student_id === form.student_id,
  );

  return (
    <Panel
      title="Parent Engagement"
      description="Log confidential parent contact and queue truthful portal notifications for linked guardians."
      icon={Users}
      actions={
        <button type="button" disabled={permissionsLoading || !canWrite || optionsQuery.isLoading || Boolean(optionsQuery.error)} onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" /> Log Parent Contact
        </button>
      }
    >
      {optionsQuery.error ? <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Linked learner and guardian options could not be loaded. <button type="button" onClick={() => void optionsQuery.refetch()} className="font-black underline">Retry</button></div> : null}
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Log parent engagement</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">Student *
              <select aria-label="Student" value={form.student_id} onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value, guardian_id: "" }))} className={fieldClassName}>
                <option value="">Select student</option>{(optionsQuery.data?.students ?? []).map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">Parent or guardian *
              <select aria-label="Parent or guardian" value={form.guardian_id} onChange={(event) => setForm((current) => ({ ...current, guardian_id: event.target.value }))} className={fieldClassName}>
                <option value="">Select linked guardian</option>{guardians.map((guardian) => <option key={guardian.id} value={guardian.id}>{guardian.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">Contact method
              <select aria-label="Contact method" value={form.contact_method} onChange={(event) => setForm((current) => ({ ...current, contact_method: event.target.value }))} className={fieldClassName}>
                <option value="phone">Phone</option><option value="sms">SMS</option><option value="email">Email</option><option value="in_person">In person</option><option value="portal">Parent portal</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">Follow-up date
              <input aria-label="Follow-up date" type="date" value={form.follow_up_date} onChange={(event) => setForm((current) => ({ ...current, follow_up_date: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Engagement reason *
              <textarea aria-label="Engagement reason" rows={2} value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Discussion summary
              <textarea aria-label="Discussion summary" rows={2} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Agreed action
              <textarea aria-label="Agreed action" rows={2} value={form.agreed_action} onChange={(event) => setForm((current) => ({ ...current, agreed_action: event.target.value }))} className={fieldClassName} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button type="button" disabled={createEngagement.isPending} onClick={submitEngagement} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createEngagement.isPending ? "Saving…" : "Save Parent Contact"}</button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Parent Contacts" value={isLoading ? "…" : data?.metrics.parent_sessions ?? 0} tone="info" />
        <MetricCard label="Pending Guardian Invitations" value={isLoading ? "…" : data?.metrics.pending_invitations ?? 0} tone="warning" />
        <MetricCard label="Notifications Queued" value={isLoading ? "…" : data?.metrics.notifications_queued ?? 0} tone="info" />
      </div>

      {error ? <WorkspaceFailure title="Parent engagement records could not be loaded." error={error} onRetry={() => void refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Parent</th><th className="px-4 py-3 font-bold">Date</th><th className="px-4 py-3 font-bold">Method</th><th className="px-4 py-3 font-bold">Reason</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Action</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading parent engagement…</td></tr> : null}
              {!isLoading && items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No parent engagement has been logged. Record a contact after speaking with a learner&apos;s linked guardian.</td></tr> : null}
              {items.map((row) => <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{row.student_name}</td><td className="px-4 py-3 text-[#64748B]">{row.parent_name}</td><td className="px-4 py-3 text-[#64748B]">{row.date}</td><td className="px-4 py-3 text-[#64748B]">{row.type}</td><td className="max-w-[24rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.reason}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={toneForStatus(row.status)} /></td>
                <td className="px-4 py-3">{canWrite && row.status !== "Queued" ? <button type="button" disabled={notifyParent.isPending} onClick={() => notifyParent.mutate({ id: row.id })} className="font-black text-blue-700 underline disabled:opacity-50">Queue parent notice</button> : "—"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
