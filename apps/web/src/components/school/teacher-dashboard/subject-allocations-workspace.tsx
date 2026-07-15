import { LayoutGrid } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function SubjectAllocationsWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-subject-allocations", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/subject-allocations", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.subject,
      c.class_name,
      c.stream,
      c.lessons_per_week,
      c.status
  ]);

  return (
    <Panel title="Subject Allocations" description="View your subject and class allocations." icon={LayoutGrid}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total Subjects</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.total_subjects ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total Lessons/Week</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.total_lessons ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Subject","Class","Stream","Lessons/Week","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No subject allocations yet. HOD or deputy allocations will appear here before teaching workflows open."}
        />
      )}
    </Panel>
  );
}
