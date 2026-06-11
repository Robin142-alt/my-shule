import { FileText } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function ReportsDownloadsWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Reports & Downloads" description="Generate and download class lists, mark sheets, and subject reports." icon={FileText}>
      <div className="mb-4">
        <button type="button" onClick={() => onStartAction("report", "reports", "Generate report options ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Generate Report</button>
      </div>
      <RecordTable
        columns={["Report Name", "Category", "Class", "Subject", "Generated At", "Actions"]}
        rows={[]}
        emptyState="No reports generated recently."
      />
    </Panel>
  );
}
