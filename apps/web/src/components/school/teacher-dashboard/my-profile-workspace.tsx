import { User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function MyProfileWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["teacher-my-profile", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/profile", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.field,
      c.value
  ]);

  return (
    <Panel title="My Profile" description="View and update your profile information." icon={User}>
      <button type="button" disabled={!liveSession.session || isFetching} onClick={() => void refetch()} className="mb-4 min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">Refresh</button>
      {!liveSession.session && !liveSession.isLoading && <p className="mb-4 text-sm text-muted">{liveSession.error || "Sign in to your school account to load this workspace."}</p>}
      <div className="grid gap-3 sm:grid-cols-1 mb-4">
        <article className="app-metric-card rounded-xl border border-border bg-white p-3">
          <p className="text-xs font-bold uppercase text-muted">Profile Completion %</p>
          <p className="text-2xl font-black text-foreground">{isLoading ? "..." : stats?.profile_complete ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Field","Value"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No profile records yet. Your staff profile will appear after HR or the principal completes staff setup."}
        />
      )}
    </Panel>
  );
}
