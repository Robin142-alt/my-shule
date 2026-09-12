import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { Bell } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherNotifications, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

export function NotificationsWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error, refetch } = useClassTeacherNotifications(streamId);

  if (isLoading) {
    return (
      <Panel title="Notifications" description="Alerts and messages regarding your class." icon={Bell}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Notifications" description="Alerts and messages regarding your class." icon={Bell}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load notifications.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <Panel title="Notifications" description="Alerts and messages regarding your class." icon={Bell}>
      <div className="flex flex-col gap-3">
        {(Array.isArray(data) ? data : []).map((notif: any) => (
          <div key={notif.id} className={`rounded-xl border p-4 ${notif.isRead ? 'border-[#D8E0EC] bg-white' : 'border-[#1D4ED8] bg-[#EEF5FF]'}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-[#071D49]">{notif.message}</p>
              <span className="text-xs text-[#64748B]">{notif.date}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
