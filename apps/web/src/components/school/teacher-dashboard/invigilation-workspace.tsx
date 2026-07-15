import { PenTool } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function InvigilationWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-invigilation", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/invigilation", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.date,
      c.time,
      c.exam,
      c.room,
      c.paper,
      c.class_name,
      c.status
  ]);

  return (
    <Panel title="Invigilation Duties" description="View exam duties and report exam attendance/issues." icon={PenTool}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Upcoming Duties</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.upcoming ?? 0}</p>
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
          columns={["Date","Time","Exam","Room","Paper","Class","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No invigilation duties assigned yet. Exams office assignments will appear here once scheduled."}
        />
      )}
    </Panel>
  );
}
