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
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-info border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Notifications" description="Alerts and messages regarding your class." icon={Bell}>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger font-bold">Failed to load notifications.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <Panel title="Notifications" description="Alerts and messages regarding your class." icon={Bell}>
      <div className="flex flex-col gap-3">
        {(Array.isArray(data) ? data : []).map((notif: any) => (
          <div key={notif.id} className={`rounded-xl border p-4 ${notif.isRead ? 'border-border bg-white' : 'border-info bg-info-soft'}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-foreground">{notif.message}</p>
              <span className="text-xs text-muted">{notif.date}</span>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
