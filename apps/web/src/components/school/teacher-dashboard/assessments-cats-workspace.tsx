import { PenTool } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function AssessmentsCatsWorkspace() {
  return (
    <Panel title="Assessments / CATs" description="Manage continuous assessment tests and class assessments." icon={PenTool}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create CAT</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Import Marks</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Download Template</button>
      </div>
      <RecordTable
        columns={["Assessment", "Class", "Subject", "Out Of", "Date", "Marks Entered", "Status", "Actions"]}
        rows={[]}
        emptyState="No assessments currently running."
      />
    </Panel>
  );
}
