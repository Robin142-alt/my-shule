import { Medal } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function ClubWorkspace() {
  return (
    <Panel title="Club / Co-curricular" description="Manage club/sports membership, attendance, and events." icon={Medal}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark Attendance</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Add Members</button>
      </div>
      <RecordTable
        columns={["Activity/Club", "Date", "Expected", "Attendance", "Status", "Actions"]}
        rows={[]}
        emptyState="No active club sessions."
      />
    </Panel>
  );
}
