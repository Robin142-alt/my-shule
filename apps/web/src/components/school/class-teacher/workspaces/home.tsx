import { AlertTriangle, Home } from "lucide-react";
import { Panel } from "../shared";
import { useQuery } from "@tanstack/react-query";
import { fetchClassTeacherOverviewLive } from "@/lib/modules/teacher-live";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";

export function OverviewWorkspace() {
  const liveSession = useLiveTenantSession();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["class-teacher-overview", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchClassTeacherOverviewLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  if (isLoading || !liveSession.session) {
    return (
      <Panel title="Overview" description="This is the Class Teacher’s command center." icon={Home}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Overview" description="This is the Class Teacher’s command center." icon={Home}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load overview data.</div>
      </Panel>
    );
  }

  const safeData = data as any;
  return (
    <Panel title="Overview" description="This is the Class Teacher’s command center. It shows the class condition today." icon={Home}>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Total Learners: {safeData.totalLearners}</div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Present Today: {safeData.presentToday}</div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">Absent Today: {safeData.absentToday}</div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Fee Arrears: {safeData.feeArrears}</div>
      </div>
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-black uppercase text-[#64748B]">Urgent Follow-ups</h3>
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm text-[#071D49]">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="p-3 font-semibold">Learner</th>
                <th className="p-3 font-semibold">Issue</th>
                <th className="p-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              {((safeData.followUps as any[]) || []).map((row: any) => (
                <tr key={row.id}>
                  <td className="p-3 font-bold">{row.name}</td>
                  <td className="p-3 text-rose-600">{row.issue}</td>
                  <td className="p-3"><button className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">{row.actionNeeded}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
