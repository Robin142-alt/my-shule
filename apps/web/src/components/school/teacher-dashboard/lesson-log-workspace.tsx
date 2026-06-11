import { LayoutList } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function LessonLogWorkspace() {
  return (
    <Panel title="Lesson Log" description="Record what was taught after each lesson." icon={LayoutList}>
      <div className="mb-4">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Record Lesson</button>
      </div>
      <RecordTable
        columns={["Date", "Class", "Subject", "Planned Topic", "Taught Topic", "Status", "Actions"]}
        rows={[]}
        emptyState="No lesson logs recorded yet."
      />
    </Panel>
  );
}
