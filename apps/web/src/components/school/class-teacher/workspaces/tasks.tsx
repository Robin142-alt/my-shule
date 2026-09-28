import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { CheckSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Panel, StatusChip } from "../shared";
import { useClassTeacherTasks, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function TasksWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error, refetch } = useClassTeacherTasks(streamId);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", due_date: "" });

  const createTask = async () => {
    if (!draft.title.trim()) {
      toast.error("Enter a task title.");
      return;
    }
    setSubmitting(true);
    try {
      await requestDashboardApi("/api/admin-command/class-teacher/tasks", { method: "POST", body: { title: draft.title.trim(), due_date: draft.due_date || null } });
      toast.success("Task created");
      setDraft({ title: "", due_date: "" });
      setShowForm(false);
      await refetch();
    } catch (submissionError) {
      toast.error(submissionError instanceof Error ? submissionError.message : "The task could not be created.");
    } finally {
      setSubmitting(false);
    }
  };

  const completeTask = async (taskId: string) => {
    setCompletingId(taskId);
    try {
      await requestDashboardApi(`/api/admin-command/class-teacher/tasks/${taskId}/complete`, { method: "POST" });
      toast.success("Task completed");
      await refetch();
    } catch (completionError) {
      toast.error(completionError instanceof Error ? completionError.message : "The task could not be completed.");
    } finally {
      setCompletingId(null);
    }
  };

  if (isLoading) {
    return (
      <Panel title="My Tasks" description="Your to-do list and reminders." icon={CheckSquare}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-info border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="My Tasks" description="Your to-do list and reminders." icon={CheckSquare}>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger font-bold">Failed to load tasks.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <Panel title="My Tasks" description="Your to-do list and reminders." icon={CheckSquare}>
      <div className="mb-4 flex justify-end">
         <button type="button" className="rounded-lg bg-info px-4 py-2 text-sm font-black text-white" onClick={() => setShowForm((current) => !current)}>{showForm ? "Cancel" : "Create Task"}</button>
      </div>
      {showForm ? (
        <div className="mb-4 grid gap-3 rounded-xl border border-border bg-surface-muted p-4 sm:grid-cols-[1fr_220px_auto]">
          <label className="text-sm font-bold text-foreground">Task<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1 w-full rounded-lg border border-border px-3 py-2" /></label>
          <label className="text-sm font-bold text-foreground">Due date<input type="date" value={draft.due_date} onChange={(event) => setDraft((current) => ({ ...current, due_date: event.target.value }))} className="mt-1 w-full rounded-lg border border-border px-3 py-2" /></label>
          <div className="flex items-end"><button type="button" onClick={createTask} disabled={submitting} className="rounded-lg bg-primary px-4 py-2 text-sm font-black text-white disabled:opacity-50">{submitting ? "Saving..." : "Save Task"}</button></div>
        </div>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm text-foreground">
          <thead className="bg-surface-muted">
            <tr>
              <th className="p-3 font-semibold">Task</th>
              <th className="p-3 font-semibold">Due Date</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3 font-bold">{row.task}</td>
                <td className="p-3">{row.dueDate}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Pending' ? 'warning' : 'neutral'}/></td>
                <td className="p-3 text-right">
                  {String(row.status).toUpperCase() !== "COMPLETED" ? <button type="button" disabled={completingId === row.id} className="rounded bg-info-soft px-2 py-1 text-xs font-bold text-info disabled:opacity-50" onClick={() => completeTask(String(row.id))}>{completingId === row.id ? "Saving..." : "Complete"}</button> : <span className="text-xs font-bold text-success">Done</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
