import { TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function LearnerProgressWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-learner-progress", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/learner-progress", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.learner,
      c.class_name,
      c.subject,
      c.score,
      c.trend,
      c.status
  ]);

  return (
    <Panel title="Learner Progress" description="Track individual learner academic progress." icon={TrendingUp}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Tracked Learners</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.tracked ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">At Risk</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.at_risk ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Learner","Class","Subject","Score","Trend","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No records found. Create the first entry to get started."}
        />
      )}
    </Panel>
  );
}
