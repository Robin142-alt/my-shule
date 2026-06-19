import { FolderOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function TeachingResourcesWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-teaching-resources", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/resources", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.title,
      c.subject,
      c.type,
      c.uploaded_at,
      c.status
  ]);

  return (
    <Panel title="Teaching Resources" description="Access and manage teaching materials and resources." icon={FolderOpen}>
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Total Resources</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.total ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Shared</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.shared ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Title","Subject","Type","Uploaded","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No records found. Create the first entry to get started."}
        />
      )}
    </Panel>
  );
}
