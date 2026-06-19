"use client";
import { useState } from "react";
import { CheckSquare, ThumbsUp, ThumbsDown, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, MetricCard, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { actionApproval } from "./api-client";

type ApprovalRecord = {
  id: string;
  type: string;
  requester: string;
  description: string;
  amount?: number;
  status: string;
  requested_at: string;
  priority: string;
};

type ApprovalsData = {
  metrics: { pending: number; approved_this_month: number; rejected_this_month: number; escalated: number };
  requests: ApprovalRecord[];
};

export function ApprovalsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ApprovalsData>('/admin-command/principal/approvals');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const requests = data?.requests || [];

  const getStatusTone = (s: string): Tone => {
    switch (s?.toLowerCase()) {
      case "approved": return "success";
      case "pending": return "warning";
      case "rejected": return "danger";
      case "escalated": return "danger";
      default: return "neutral";
    }
  };

  const getPriorityTone = (p: string): Tone => {
    switch (p?.toLowerCase()) {
      case "high": return "danger";
      case "medium": return "warning";
      case "low": return "info";
      default: return "neutral";
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setActioningId(id);
    try {
      await actionApproval(id, action);
      await refetch();
      toast.success(`Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.`);
    } catch {
      toast.error(`Failed to ${action} request.`);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Panel title="Approvals" description="Review and action pending approval requests from across the school." icon={CheckSquare}>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <MetricCard label="Pending" value={isLoading ? "…" : data?.metrics?.pending ?? 0} icon={Clock} tone={(data?.metrics?.pending ?? 0) > 0 ? "warning" : "success"} />
        <MetricCard label="Approved (Month)" value={isLoading ? "…" : data?.metrics?.approved_this_month ?? 0} icon={ThumbsUp} tone="success" />
        <MetricCard label="Rejected (Month)" value={isLoading ? "…" : data?.metrics?.rejected_this_month ?? 0} icon={ThumbsDown} tone="danger" />
        <MetricCard label="Escalated" value={isLoading ? "…" : data?.metrics?.escalated ?? 0} icon={AlertTriangle} tone={(data?.metrics?.escalated ?? 0) > 0 ? "danger" : "neutral"} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Requester</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Description</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Amount</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">Loading approval requests…</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#64748B]">No approval requests found. Requests from staff for fee waivers, stock adjustments, or other approvals will appear here.</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3"><StatusChip label={req.priority} tone={getPriorityTone(req.priority)} /></td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{req.type}</td>
                  <td className="px-4 py-3 text-[#64748B]">{req.requester}</td>
                  <td className="px-4 py-3 text-[#64748B] max-w-[200px] truncate">{req.description}</td>
                  <td className="px-4 py-3 text-[#64748B]">{req.amount != null ? `KES ${req.amount.toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={req.status} tone={getStatusTone(req.status)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{req.requested_at}</td>
                  <td className="px-4 py-3 text-right">
                    {req.status?.toLowerCase() === "pending" ? (
                      <div className="inline-flex gap-2">
                        <button
                          disabled={actioningId === req.id}
                          onClick={() => handleAction(req.id, 'approve')}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                        >
                          <ThumbsUp className="h-3 w-3" /> Approve
                        </button>
                        <button
                          disabled={actioningId === req.id}
                          onClick={() => handleAction(req.id, 'reject')}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                        >
                          <ThumbsDown className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748B]">Actioned</span>
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
