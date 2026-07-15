import { Edit3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function MarkEntryWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-mark-entry", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/mark-entry", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.exam,
      c.subject,
      c.class_name,
      c.total_marks,
      c.entered,
      c.status
  ]);

  return (
    <Panel title="Mark Entry" description="Enter and submit marks for assessments." icon={Edit3}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Pending Entry</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.pending ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Submitted</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.submitted ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Exam","Subject","Class","Total Marks","Entered","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No mark-entry sheets yet. Exams manager must publish an exam and assign your subject before entry opens."}
        />
      )}
    </Panel>
  );
}
