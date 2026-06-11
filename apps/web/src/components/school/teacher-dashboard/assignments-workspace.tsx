import { ClipboardCheck } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function AssignmentsWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Assignments & Homework" description="Create homework, track submissions, and grade assignments." icon={ClipboardCheck}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Active Assignments</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending Marking</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
      </div>
      <div className="mb-4">
        <button type="button" onClick={() => onStartAction("assignment", "assignments", "Create assignment form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Assignment</button>
      </div>
      <RecordTable
        columns={["Title", "Class", "Subject", "Assigned", "Due Date", "Submissions", "Status", "Actions"]}
        rows={[]}
        emptyState="No assignments found."
      />
    </Panel>
  );
}
