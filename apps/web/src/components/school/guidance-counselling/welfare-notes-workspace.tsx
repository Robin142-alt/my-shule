"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { FileHeart, Plus } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { fieldClassName, MetricCard, Panel, StatusChip, toneForStatus, WorkspaceFailure } from "./shared";

type WelfareNote = {
  id: string;
  student_name: string;
  class: string;
  note_date: string;
  category: string;
  description: string;
  action_taken: string;
  status: string;
};

type WelfareNotesData = {
  metrics: { active_notes: number; flagged: number; resolved: number };
  welfareNotesList: WelfareNote[];
};

type WorkspaceOptions = { students: Array<{ id: string; label: string }> };
type WelfareForm = { student_id: string; category: string; description: string; action_taken: string };

const emptyForm: WelfareForm = { student_id: "", category: "Wellbeing", description: "", action_taken: "" };

export function WelfareNotesWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<WelfareNotesData>(
    "/admin-command/guidance-counselling/welfare-notes",
  );
  const optionsQuery = useSchoolQuery<WorkspaceOptions>("/admin-command/guidance-counselling/options");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<WelfareForm>(emptyForm);
  const canWrite = hasPermission("counselling:write");

  const createNote = useSchoolMutation<unknown, WelfareForm>(
    "/admin-command/guidance-counselling/welfare-notes",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Student welfare note recorded.");
        setForm(emptyForm);
        setShowForm(false);
        await refetch();
      },
      onError: (mutationError) => toast.error("Welfare note was not recorded", { description: mutationError.message }),
    },
  );
  const flagNote = useSchoolMutation<unknown, { id: string }>(
    ({ id }) => `/admin-command/guidance-counselling/welfare-notes/${encodeURIComponent(id)}/flag`,
    "POST",
    {
      onSuccess: async () => {
        toast.success("Welfare note flagged for school review.");
        await refetch();
      },
      onError: (mutationError) => toast.error("Welfare note was not flagged", { description: mutationError.message }),
    },
  );

  function submitNote() {
    if (!form.student_id || !form.category.trim() || !form.description.trim()) {
      toast.error("Student, category, and welfare note are required.");
      return;
    }
    createNote.mutate({
      ...form,
      category: form.category.trim(),
      description: form.description.trim(),
      action_taken: form.action_taken.trim(),
    });
  }

  const items = data?.welfareNotesList ?? [];

  return (
    <Panel
      title="Welfare Notes"
      description="Record student welfare observations and flag concerns for tenant-scoped school review."
      icon={FileHeart}
      actions={
        <button type="button" disabled={permissionsLoading || !canWrite || optionsQuery.isLoading || Boolean(optionsQuery.error)} onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add Welfare Note
        </button>
      }
    >
      {optionsQuery.error ? <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Learner options could not be loaded. <button type="button" onClick={() => void optionsQuery.refetch()} className="font-black underline">Retry</button></div> : null}
      {showForm ? (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <h3 className="text-sm font-black text-[#071D49]">Record welfare note</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-bold text-[#334155]">Student *
              <select aria-label="Student" value={form.student_id} onChange={(event) => setForm((current) => ({ ...current, student_id: event.target.value }))} className={fieldClassName}>
                <option value="">Select student</option>{(optionsQuery.data?.students ?? []).map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#334155]">Category *
              <input aria-label="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Welfare note *
              <textarea aria-label="Welfare note" rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-[#334155] md:col-span-2">Action already taken
              <textarea aria-label="Action already taken" rows={2} value={form.action_taken} onChange={(event) => setForm((current) => ({ ...current, action_taken: event.target.value }))} className={fieldClassName} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
            <button type="button" disabled={createNote.isPending} onClick={submitNote} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{createNote.isPending ? "Saving…" : "Save Welfare Note"}</button>
          </div>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <MetricCard label="Active Notes" value={isLoading ? "…" : data?.metrics.active_notes ?? 0} tone="warning" />
        <MetricCard label="Flagged" value={isLoading ? "…" : data?.metrics.flagged ?? 0} tone="danger" />
        <MetricCard label="Resolved" value={isLoading ? "…" : data?.metrics.resolved ?? 0} tone="success" />
      </div>

      {error ? <WorkspaceFailure title="Welfare notes could not be loaded." error={error} onRetry={() => void refetch()} /> : (
        <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
          <RecordTable className="w-full whitespace-nowrap text-left text-sm">
            <thead className="bg-[#F8FAFC] text-[#071D49]"><tr><th className="px-4 py-3 font-bold">Student</th><th className="px-4 py-3 font-bold">Class</th><th className="px-4 py-3 font-bold">Date</th><th className="px-4 py-3 font-bold">Category</th><th className="px-4 py-3 font-bold">Observation</th><th className="px-4 py-3 font-bold">Status</th><th className="px-4 py-3 font-bold">Action</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading welfare notes…</td></tr> : null}
              {!isLoading && items.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No welfare notes exist for this school. Record the first observation when a learner needs welfare support.</td></tr> : null}
              {items.map((row) => <tr key={row.id} className="border-t border-[#D8E0EC] align-top hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-semibold text-[#071D49]">{row.student_name}</td><td className="px-4 py-3 text-[#64748B]">{row.class || "—"}</td><td className="px-4 py-3 text-[#64748B]">{row.note_date}</td><td className="px-4 py-3 text-[#64748B]">{row.category}</td>
                <td className="max-w-[28rem] whitespace-normal px-4 py-3 text-[#64748B]">{row.description}{row.action_taken ? <span className="mt-1 block text-xs">Action: {row.action_taken}</span> : null}</td><td className="px-4 py-3"><StatusChip label={row.status} tone={toneForStatus(row.status)} /></td>
                <td className="px-4 py-3">{canWrite && row.status.toLowerCase() !== "flagged" ? <button type="button" disabled={flagNote.isPending} onClick={() => flagNote.mutate({ id: row.id })} className="font-black text-rose-700 underline disabled:opacity-50">Flag for review</button> : "—"}</td>
              </tr>)}
            </tbody>
          </RecordTable>
        </div>
      )}
    </Panel>
  );
}
