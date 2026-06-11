import { ShieldAlert } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function DisciplineWelfareWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Discipline & Welfare" description="Raise incidents and concerns to the relevant authorities." icon={ShieldAlert}>
      <div className="mb-4">
        <button type="button" onClick={() => onStartAction("concern", "discipline-welfare", "Concern form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Raise Concern</button>
      </div>
      <RecordTable
        columns={["Date", "Learner", "Class", "Concern Type", "Severity", "Sent To", "Status", "Actions"]}
        rows={[]}
        emptyState="No active concerns raised by you."
      />
    </Panel>
  );
}
