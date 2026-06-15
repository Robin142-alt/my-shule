"use client";
import { CheckCircle2 } from "lucide-react";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useQueryClient } from "@tanstack/react-query";

export type ApprovalRequest = {
  id: string;
  type: string;
  raisedBy: string;
  affectedPerson: string;
  status: "Pending Approval" | "Approved" | "Rejected";
};

type ApprovalsData = {
  metrics: {
    pending_approvals: number;
  };
  approvalsList: ApprovalRequest[];
};

export function DeputyApprovalsWorkspace() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useSchoolQuery<ApprovalsData>('/admin-command/deputy/approvals');

  const actionMutation = useSchoolMutation<{ id: string, action: string }>('/admin-command/deputy/approvals/:id/action', 'POST', {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/approvals'] })
  });

  const approvals = data?.approvalsList || [];

  const handleAction = async (id: string, action: "Approve" | "Reject") => {
    try {
      await fetch(`/api/v1/admin-command/deputy/approvals/${id}/action`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      queryClient.invalidateQueries({ queryKey: ["school", "session", '/admin-command/deputy/approvals'] });
      alert(`Request has been ${action}d.`);
    } catch (e) {
      alert("Failed to process approval action.");
    }
  };

  const getStatusTone = (st: string): Tone => {
    if (st === "Pending Approval") return "warning";
    if (st === "Approved") return "success";
    return "danger";
  };

  return (
    <Panel title="Approvals & Escalations" description="Handle operational approvals and escalations." icon={CheckCircle2}>
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Approvals</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{isLoading ? "..." : data?.metrics?.pending_approvals || 0}</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Raised By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Affected Person</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748B]">No pending approvals.</td>
              </tr>
            ) : (
              approvals.map((req) => (
                <tr key={req.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{req.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{req.raisedBy}</td>
                  <td className="px-4 py-3 text-[#64748B]">{req.affectedPerson}</td>
                  <td className="px-4 py-3"><StatusChip label={req.status} tone={getStatusTone(req.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    {req.status === "Pending Approval" ? (
                      <>
                        <button onClick={() => handleAction(req.id, "Approve")} className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Approve</button>
                        <button onClick={() => handleAction(req.id, "Reject")} className="text-rose-600 hover:underline font-semibold text-xs mr-3">Reject</button>
                      </>
                    ) : (
                      <span className="text-[#64748B] text-xs font-semibold">Processed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}