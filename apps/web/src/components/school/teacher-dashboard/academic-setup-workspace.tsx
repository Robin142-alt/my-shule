import { Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function AcademicSetupWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-academic-setup", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/academic-setup", {
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
    <Panel title="Academic Setup" description="View your academic setup for the current term." icon={Settings}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Subjects</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.subjects ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Classes</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.classes ?? 0}</p>
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
          emptyState={isLoading ? "Loading..." : "No academic setup records yet. Deputy or HOD class, subject, and term setup will appear here."}
        />
      )}
    </Panel>
  );
}
