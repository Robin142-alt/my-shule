import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function NotificationsWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["teacher-notifications", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/notifications", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.date,
      c.title,
      c.category,
      c.status
  ]);

  return (
    <Panel title="Notifications" description="View announcements and system notifications." icon={Bell}>
      <button type="button" disabled={!liveSession.session || isFetching} onClick={() => void refetch()} className="mb-4 min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">Refresh</button>
      {!liveSession.session && !liveSession.isLoading && <p className="mb-4 text-sm text-muted">{liveSession.error || "Sign in to your school account to load this workspace."}</p>}
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="app-metric-card rounded-xl border border-border bg-white p-3">
          <p className="text-xs font-bold uppercase text-muted">Unread</p>
          <p className="text-2xl font-black text-foreground">{isLoading ? "..." : stats?.unread ?? 0}</p>
        </article>
        <article className="app-metric-card rounded-xl border border-border bg-white p-3">
          <p className="text-xs font-bold uppercase text-muted">Total</p>
          <p className="text-2xl font-black text-foreground">{isLoading ? "..." : stats?.total ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Date","Title","Category","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No notifications yet. School messages, approvals, and workflow alerts will appear here."}
        />
      )}
    </Panel>
  );
}
