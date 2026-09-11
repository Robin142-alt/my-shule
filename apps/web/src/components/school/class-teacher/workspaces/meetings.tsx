import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherMeetings, useClassTeacherRegister, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { usePermissions } from "@/components/providers/permission-context";

type AssignedLearner = { id: string; name?: string; admissionNo?: string };
type ParentMeetingRecord = {
  id: string;
  date: string;
  time: string;
  parent: string;
  agenda: string;
  status: string;
};

export function MeetingsWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission('teacher:write');
  const { data, isLoading, error, refetch } = useClassTeacherMeetings(streamId);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: registerData, isLoading: isRegisterLoading } = useClassTeacherRegister(streamId);
  const learners = (Array.isArray(registerData) ? registerData : []) as AssignedLearner[];
  const meetings = (Array.isArray(data) ? data : []) as ParentMeetingRecord[];
  const [draft, setDraft] = useState({ agenda: "", student_id: "", description: "", start_time: "" });

  const scheduleMeeting = async () => {
    if (!draft.agenda.trim() || !draft.student_id || !draft.start_time) {
      toast.error("Select an assigned learner and enter the meeting agenda and date/time.");
      return;
    }
    setSubmitting(true);
    try {
      await requestDashboardApi("/api/admin-command/class-teacher/meetings", {
        method: "POST",
        body: { title: draft.agenda.trim(), studentId: draft.student_id, description: draft.description.trim(), start_time: new Date(draft.start_time).toISOString() },
      });
      toast.success("Parent meeting scheduled");
      setDraft({ agenda: "", student_id: "", description: "", start_time: "" });
      setShowForm(false);
      await refetch();
    } catch (submissionError) {
      toast.error(submissionError instanceof Error ? submissionError.message : "The meeting could not be scheduled.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Panel title="Parent Meetings" description="Scheduled meetings with parents of your learners." icon={Users}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Parent Meetings" description="Scheduled meetings with parents of your learners." icon={Users}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load meetings.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <Panel title="Parent Meetings" description="Scheduled meetings with parents of your learners." icon={Users}>
      <div className="mb-4 flex justify-end">
         {canWrite ? (
           <button type="button" disabled={!streamId || isRegisterLoading || learners.length === 0} className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50" onClick={() => setShowForm((current) => !current)}>{showForm ? "Cancel" : "Schedule Meeting"}</button>
         ) : null}
      </div>
      {showForm ? (
        <div className="mb-4 grid gap-3 rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Agenda<input value={draft.agenda} onChange={(event) => setDraft((current) => ({ ...current, agenda: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2" /></label>
          <label className="text-sm font-bold text-[#071D49]">Learner
            <select value={draft.student_id} onChange={(event) => setDraft((current) => ({ ...current, student_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] bg-white px-3 py-2">
              <option value="">{isRegisterLoading ? "Loading assigned learners..." : "Select learner"}</option>
              {learners.map((learner) => <option key={learner.id} value={String(learner.id)}>{learner.name || learner.admissionNo || learner.id}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Meeting notes<input value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2" /></label>
          <label className="text-sm font-bold text-[#071D49]">Start date and time<input type="datetime-local" value={draft.start_time} onChange={(event) => setDraft((current) => ({ ...current, start_time: event.target.value }))} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2" /></label>
          <div className="flex items-end"><button type="button" onClick={scheduleMeeting} disabled={submitting || !draft.student_id} className="w-full rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:opacity-50">{submitting ? "Scheduling..." : "Save Meeting"}</button></div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Time</th>
              <th className="p-3 font-semibold">Parent</th>
              <th className="p-3 font-semibold">Agenda</th>
              <th className="p-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {meetings.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-[#64748B]">No parent meetings are scheduled for this assigned class.</td></tr>
            ) : meetings.map((row) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3">{row.time}</td>
                <td className="p-3 font-bold">{row.parent}</td>
                <td className="p-3">{row.agenda}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Scheduled' ? 'neutral' : 'success'}/></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
