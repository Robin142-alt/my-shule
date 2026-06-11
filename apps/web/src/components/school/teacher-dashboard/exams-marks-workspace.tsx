import { BookOpenCheck } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function ExamsMarksWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Exams & Marks" description="Enter formal exam marks for assigned papers during open exam windows." icon={BookOpenCheck}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Save Draft</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Validate Marks</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Submit to HOD</button>
      </div>
      <RecordTable
        columns={["Exam", "Class", "Subject", "Paper", "Out Of", "Deadline", "Entered", "Status", "Actions"]}
        rows={[]}
        emptyState="No open exam mark-entry tasks assigned to you."
      />
    </Panel>
  );
}
