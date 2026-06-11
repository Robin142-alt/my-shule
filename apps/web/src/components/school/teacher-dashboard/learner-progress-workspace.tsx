import { LineChart } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function LearnerProgressWorkspace() {
  return (
    <Panel title="Learner Progress" description="Monitor performance, attendance, and concerns for learners in your classes." icon={LineChart}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Low Performers</p>
          <p className="text-2xl font-black text-red-600">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Missing Assignments</p>
          <p className="text-2xl font-black text-amber-600">0</p>
        </article>
      </div>
      <RecordTable
        columns={["Adm No.", "Learner", "Class", "Subject", "Attendance %", "CAT Average", "Exam Average", "Missing", "Concern Level", "Actions"]}
        rows={[]}
        emptyState="No learners tracked."
      />
    </Panel>
  );
}
