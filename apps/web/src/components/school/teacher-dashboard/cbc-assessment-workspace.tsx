import { ClipboardCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function CbcAssessmentWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-cbc-assessment", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/cbc-assessments", {
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
      c.strand,
      c.score,
      c.status
  ]);

  return (
    <Panel title="CBC Assessment" description="Manage competency-based curriculum assessments." icon={ClipboardCheck}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending Assessment</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.pending ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Completed</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.completed ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Learner","Class","Subject","Strand","Score","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No CBC assessment records yet. Start from assigned learners once your class and subject allocation is active."}
        />
      )}
    </Panel>
  );
}
