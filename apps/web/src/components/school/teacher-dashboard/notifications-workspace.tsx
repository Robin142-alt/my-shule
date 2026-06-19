import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function NotificationsWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-notifications", liveSession.session?.tenantId],
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
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Unread</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.unread ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.total ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Date","Title","Category","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No records found. Create the first entry to get started."}
        />
      )}
    </Panel>
  );
}
