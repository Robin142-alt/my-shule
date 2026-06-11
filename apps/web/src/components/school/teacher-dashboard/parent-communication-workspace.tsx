import { MessageCircle } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";
import { TeacherAction, TeacherView } from "./types";

export function ParentCommunicationWorkspace({
  onStartAction,
}: {
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  return (
    <Panel title="Parent Communication" description="Controlled communication with parents of learners you teach." icon={MessageCircle}>
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onStartAction("sms", "parent-communication", "New message form ready.")} className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">New Message</button>
        <button type="button" className="rounded-xl border border-[#D8E0EC] px-4 py-2 text-sm font-black text-[#071D49] bg-white">Message Class Parents</button>
      </div>
      <RecordTable
        columns={["Date", "Learner/Class", "Recipient", "Subject", "Channel", "Status", "Actions"]}
        rows={[]}
        emptyState="No messages sent recently."
      />
    </Panel>
  );
}
