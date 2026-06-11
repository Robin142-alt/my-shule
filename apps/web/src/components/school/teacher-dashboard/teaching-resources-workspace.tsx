import { FolderOpen } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function TeachingResourcesWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Teaching Resources" description="Manage schemes of work, notes, and worksheets." icon={FolderOpen}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onStartAction("resource", "teaching-resources", "Upload resource form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Upload Resource</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Import from Bank</button>
      </div>
      <RecordTable
        columns={["Title", "Class", "Subject", "Type", "Visibility", "Status", "Actions"]}
        rows={[]}
        emptyState="No teaching resources uploaded yet."
      />
    </Panel>
  );
}
