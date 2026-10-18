import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable, StatusPill } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function SyllabusCoverageWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["teacher-syllabus-coverage", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/syllabus-coverage", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.subject,
      c.class_name,
      c.topic,
      c.coverage,
      c.target,
      <StatusPill key="status" status={c.status} type={c.status === "On Track" ? "success" : c.status === "Behind" ? "warning" : "default"} />
  ]);

  return (
    <Panel title="Syllabus Coverage" description="Track and update syllabus coverage for your subjects." icon={BookOpen}>
      <button type="button" disabled={!liveSession.session || isFetching} onClick={() => void refetch()} className="mb-4 min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50">Refresh</button>
      {!liveSession.session && !liveSession.isLoading && <p className="mb-4 text-sm text-muted">{liveSession.error || "Sign in to your school account to load this workspace."}</p>}
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article data-tone="success" className="app-metric-card rounded-xl border border-success-border bg-success-soft p-3">
          <p className="text-xs font-bold uppercase text-muted">On Track</p>
          <p className="text-2xl font-black text-success">{isLoading ? "..." : stats?.on_track ?? 0}</p>
        </article>
        <article data-tone="warning" className="app-metric-card rounded-xl border border-warning-border bg-warning-soft p-3">
          <p className="text-xs font-bold uppercase text-muted">Behind</p>
          <p className="text-2xl font-black text-warning">{isLoading ? "..." : stats?.behind ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-danger">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Subject","Class","Topic","Coverage %","Target %","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No syllabus coverage records yet. Save lesson logs to start tracking coverage."}
        />
      )}
    </Panel>
  );
}
