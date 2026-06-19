import { User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function MyProfileWorkspace() {
  const liveSession = useLiveTenantSession("school");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teacher-my-profile", liveSession.session?.tenantId],
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
      <div className="grid gap-3 sm:grid-cols-1 mb-4">
        <article className="rounded-xl border border-[#D8E0EC] bg-white p-3">
          <p className="text-xs font-bold uppercase text-[#64748B]">Profile Completion %</p>
          <p className="text-2xl font-black text-[#071D49]">{isLoading ? "..." : stats?.profile_complete ?? 0}</p>
        </article>
      </div>
      {isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
          Failed to load data. Please retry.
        </div>
      ) : (
        <RecordTable
          columns={["Field","Value"]}
          rows={rows}
          emptyState={isLoading ? "Loading..." : "No records found. Create the first entry to get started."}
        />
      )}
    </Panel>
  );
}
