"use client";
import { useState } from "react";
import { Heart, Plus, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { usePermissions } from "@/components/providers/permission-context";
import { createWelfareNote, escalateWelfareNote } from "./api-client";

type WelfareRecord = {
  id: string;
  student_name: string;
  admission_no: string;
  category: string;
  note: string;
  severity: string;
  status: string;
  created_at: string;
  follow_up_date: string | null;
};

type WelfareNotesData = {
  metrics: {
    total_notes: number;
    open_cases: number;
    escalated: number;
    resolved_this_term: number;
  };
  notes: WelfareRecord[];
};

type WelfareLearnerOptions = {
  learners: Array<{ id: string; full_name: string; admission_no: string }>;
};

export function WelfareNotesWorkspace() {
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('teacher:write');
  const { data, isLoading, error, refetch } = useSchoolQuery<WelfareNotesData>('/admin-command/class-teacher/welfare-notes');
  const {
    data: learnerOptions,
    isLoading: learnersLoading,
    error: learnersError,
    refetch: refetchLearners,
  } = useSchoolQuery<WelfareLearnerOptions>('/admin-command/class-teacher/learner-profiles');
  const [showAdd, setShowAdd] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ student_id: "", category: "", note: "", severity: "Medium" });
  const [saving, setSaving] = useState(false);

  const notes = data?.notes || [];
  const metrics = data?.metrics;

  const getCategoryTone = (c: string): Tone => {
    if (c === "Family" || c === "Bereavement") return "danger";
    if (c === "Financial" || c === "Health") return "warning";
    if (c === "Social" || c === "Emotional") return "info";
    return "neutral";
  };

  const getStatusTone = (s: string): Tone => {
    if (s === "Resolved") return "success";
    if (s === "Open") return "warning";
    if (s === "Escalated") return "danger";
    return "neutral";
  };

  const handleCreate = async () => {
    if (!form.student_id || !form.category || !form.note.trim()) {
      toast.error("Select an assigned learner and category, then enter the note.");
      return;
    }
    setSaving(true);
    try {
      await createWelfareNote(form);
      toast.success("Welfare note created.");
      setShowAdd(false);
      setForm({ student_id: "", category: "", note: "", severity: "Medium" });
      await refetch();
    } catch (submissionError) {
      toast.error("Failed to create welfare note.", {
        description: submissionError instanceof Error ? submissionError.message : "The welfare note could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEscalate = async (id: string) => {
    setActionLoading(id);
    try {
      await escalateWelfareNote(id);
      toast.success("Case escalated to counsellor/deputy.");
      await refetch();
    } catch (submissionError) {
      toast.error("Failed to escalate.", {
        description: submissionError instanceof Error ? submissionError.message : "The welfare concern could not be escalated.",
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Panel
      title="Welfare Notes"
      description="Track welfare concerns, create notes, and escalate serious cases to counsellor or deputy."
      icon={Heart}
      actions={canWrite ? (
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900">
          <Plus className="w-4 h-4" /> New Welfare Note
        </button>
      ) : undefined}
    >
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Notes</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_notes ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-700">Open Cases</div>
          <div className="mt-1 text-2xl font-black text-amber-700">{isLoading ? "..." : metrics?.open_cases ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Escalated</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.escalated ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Resolved (Term)</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.resolved_this_term ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Category</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Note</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading welfare notes...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-rose-700">
                  Welfare notes could not be loaded. <button type="button" onClick={() => void refetch()} className="font-black underline">Retry</button>
                </td>
              </tr>
            ) : notes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">No welfare notes yet. Create one when you notice a student welfare concern.</td></tr>
            ) : (
              notes.map((n) => (
                <tr key={n.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{n.student_name}</td>
                  <td className="px-4 py-3"><StatusChip label={n.category} tone={getCategoryTone(n.category)} /></td>
                  <td className="px-4 py-3 text-[#64748B] max-w-xs truncate">{n.note}</td>
                  <td className="px-4 py-3">
                    <StatusChip label={n.severity} tone={n.severity === "High" ? "danger" : n.severity === "Medium" ? "warning" : "info"} />
                  </td>
                  <td className="px-4 py-3"><StatusChip label={n.status} tone={getStatusTone(n.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{n.created_at}</td>
                  <td className="px-4 py-3 text-right">
                    {canWrite && n.status === "Open" && (
                      <button
                        disabled={actionLoading === n.id}
                        onClick={() => handleEscalate(n.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <ArrowUpRight className="w-3 h-3" /> {actionLoading === n.id ? "..." : "Escalate"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Welfare Note Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-[#071D49] mb-4">New Welfare Note</h3>
            <div className="space-y-3">
              <select
                aria-label="Assigned learner"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                disabled={learnersLoading || Boolean(learnersError) || (learnerOptions?.learners.length ?? 0) === 0}
                className="w-full rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">
                  {learnersLoading
                    ? "Loading assigned learners..."
                    : learnersError
                      ? "Assigned learners could not be loaded"
                      : learnerOptions?.learners.length
                      ? "Select an assigned learner..."
                      : "No learners are assigned to your class"}
                </option>
                {(learnerOptions?.learners ?? []).map((learner) => (
                  <option key={learner.id} value={learner.id}>
                    {learner.full_name} ({learner.admission_no})
                  </option>
                ))}
              </select>
              {learnersError ? (
                <button type="button" onClick={() => void refetchLearners()} className="text-left text-sm font-black text-rose-700 underline">
                  Retry assigned learners
                </button>
              ) : null}
              <select aria-label="Welfare category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select category...</option>
                <option value="Family">Family</option>
                <option value="Financial">Financial</option>
                <option value="Health">Health</option>
                <option value="Social">Social</option>
                <option value="Emotional">Emotional</option>
                <option value="Bereavement">Bereavement</option>
                <option value="Other">Other</option>
              </select>
              <select aria-label="Welfare severity" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <textarea aria-label="Welfare note" placeholder="Describe the welfare concern..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full rounded-lg border border-[#D8E0EC] p-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-slate-50">Cancel</button>
              <button disabled={saving || Boolean(learnersError) || !form.student_id} onClick={handleCreate} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 disabled:opacity-50">
                {saving ? "Saving..." : "Create Note"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
