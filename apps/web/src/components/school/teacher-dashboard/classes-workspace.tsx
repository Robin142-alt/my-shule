import { Users } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function ClassesWorkspace() {
  return (
    <Panel title="My Classes" description="All classes, streams, and subjects assigned to you." icon={Users}>
      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Assigned Classes</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total Learners Taught</p>
          <p className="text-2xl font-black text-[#071D49]">0</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Average Attendance</p>
          <p className="text-2xl font-black text-[#071D49]">0%</p>
        </article>
      </div>
      <RecordTable
        columns={["Class", "Subject", "Learners", "Attendance Status", "CAT Average", "Actions"]}
        rows={[]}
        emptyState="No assigned classes found."
      />
    </Panel>
  );
}
