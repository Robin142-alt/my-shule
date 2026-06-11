import { User } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function ClassTeacherWorkspace() {
  return (
    <Panel title="My Class" description="Class teacher management for your assigned class." icon={User}>
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Class Learners</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Absent Today</p>
          <p className="text-2xl font-black text-red-600">0</p>
        </article>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark Class Attendance</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Message Class Parents</button>
      </div>
      <RecordTable
        columns={["Adm No.", "Learner", "Attendance %", "Fee Status", "Academic", "Discipline", "Actions"]}
        rows={[]}
        emptyState="No learners found in your class."
      />
    </Panel>
  );
}
