import { Bell } from "lucide-react";
import { Panel, RecordTable } from "./shared-components";

export function NotificationsWorkspace() {
  return (
    <Panel title="Notifications" description="Your alert center for deadlines, messages, and system alerts." icon={Bell}>
      <div className="mb-4">
        <button type="button" className="rounded-xl bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark All Read</button>
      </div>
      <RecordTable
        columns={["Date", "Type", "Title", "Priority", "Status", "Actions"]}
        rows={[]}
        emptyState="No new notifications."
      />
    </Panel>
  );
}
