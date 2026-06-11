import { PenTool } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function InvigilationWorkspace() {
  return (
    <Panel title="Invigilation Duties" description="View exam duties and report exam attendance/issues." icon={PenTool}>
      <div className="mb-4">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Report Incident</button>
      </div>
      <RecordTable
        columns={["Date", "Time", "Exam", "Room", "Paper", "Class", "Status", "Actions"]}
        rows={[]}
        emptyState="No invigilation duties assigned."
      />
    </Panel>
  );
}
