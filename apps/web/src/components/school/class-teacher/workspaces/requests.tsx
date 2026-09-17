import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { GitPullRequest } from "lucide-react";
import { Panel, StatusChip, openClassTeacherRecord } from "../shared";
import { useClassTeacherRequests, useResolvedClassTeacherStreamId } from "@/lib/data/class-teacher-hooks";

export function RequestsWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error, refetch } = useClassTeacherRequests(streamId);

  if (isLoading) {
    return (
      <Panel title="Learner Requests" description="Pending requests for learners (e.g., leave, gate pass)." icon={GitPullRequest}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Learner Requests" description="Pending requests for learners (e.g., leave, gate pass)." icon={GitPullRequest}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load requests.</div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Panel>
    );
  }

  return (
    <Panel title="Learner Requests" description="Pending requests for learners (e.g., leave, gate pass)." icon={GitPullRequest}>
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Learner</th>
              <th className="p-3 font-semibold">Type</th>
              <th className="p-3 font-semibold">Requested By</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {(Array.isArray(data) ? data : []).map((row: any) => (
              <tr key={row.id}>
                <td className="p-3">{row.date}</td>
                <td className="p-3 font-bold">{row.learner}</td>
                <td className="p-3">{row.type}</td>
                <td className="p-3">{row.requestedBy}</td>
                <td className="p-3"><StatusChip label={row.status} tone={row.status === 'Pending' ? 'warning' : 'success'}/></td>
                <td className="p-3">
                   <button type="button" className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]" onClick={() => openClassTeacherRecord("Learner request review", [["Date", String(row.date)], ["Learner", String(row.learner)], ["Type", String(row.type)], ["Requested By", String(row.requestedBy)], ["Status", String(row.status)]])}>Review</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
