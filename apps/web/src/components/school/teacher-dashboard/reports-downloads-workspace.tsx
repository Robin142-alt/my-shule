import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function ReportsDownloadsWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-reports-downloads", liveSession.session?.tenantId],
    queryFn: () => requestDashboardApi<any>("/admin-command/teacher/reports", {
      tenantId: liveSession.session!.tenantId,
      accessToken: (liveSession.session as any)?.accessToken,
    }),
    enabled: !!liveSession.session,
  });

  const stats = data?.metrics || {};
  const rows = (data?.items || []).map((c: any) => [
      c.title,
      c.type,
      c.generated_at,
      c.status
  ]);

  return (
    <Panel title="Reports & Downloads" description="Access and download available reports." icon={Download}>
      <div className="grid gap-3 sm:grid-cols-1 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Available Reports</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.available ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Title","Type","Generated","Status"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No reports ready yet. Published report cards, class summaries, and exports will appear here."}
        />
      )}
    </Panel>
  );
}
