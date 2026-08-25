"use client";

import { type FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { actionApproval } from "./api-client";
import { Panel, StatusChip, type Tone } from "./shared";

export type ApprovalRequest = {
  id: string;
  title: string;
  reason: string | null;
  status: string;
  approval_type: string | null;
  module: string | null;
  record_id: string | null;
  priority?: string | null;
  created_at: string;
};

type RecentApproval = {
  id: string;
  title: string;
  status: string;
  note?: string | null;
  module?: string | null;
  date: string;
};

type ApprovalsData = {
  metrics: {
    pending_approvals: number;
    urgent_approvals: number;
  };
  approvalsList: ApprovalRequest[];
  recentApprovals: RecentApproval[];
};

const PENDING_STATUSES = new Set(["pending", "pending_approval", "changes_requested", "escalated"]);

function normalizedCode(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function statusLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusTone(value: string): Tone {
  const normalized = normalizedCode(value);
  if (normalized === "approved") return "success";
  if (normalized === "rejected") return "danger";
  if (normalized === "escalated") return "danger";
  return "warning";
}

export function DeputyApprovalsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<ApprovalsData>(
    "/admin-command/deputy/approvals",
  );
  const { hasPermission } = usePermissions();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [decisionNote, setDecisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const approvals = Array.isArray(data?.approvalsList) ? data.approvalsList : [];
  const recentApprovals = Array.isArray(data?.recentApprovals) ? data.recentApprovals : [];

  const openDecision = (request: ApprovalRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setDecision(action);
    setDecisionNote("");
    setActionError("");
  };

  const submitDecision = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest) return;
    if (decision === "reject" && !decisionNote.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");
    try {
      await actionApproval(selectedRequest.id, decision, decisionNote.trim() || undefined);
      toast.success(`Approval ${decision === "approve" ? "approved" : "rejected"}.`);
      setSelectedRequest(null);
      await refetch();
    } catch (decisionError) {
      setActionError(
        decisionError instanceof Error
          ? decisionError.message
          : "The approval decision could not be saved.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Panel
        title="Approvals & Escalations"
        description="Loading approvals assigned to the active Deputy Principal role."
        icon={CheckCircle2}
      >
        <div className="h-48 animate-pulse rounded-xl border border-[#D8E0EC] bg-[#F8FAFC]" />
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel
        title="Approvals & Escalations"
        description="The assigned approval queue could not be loaded."
        icon={AlertCircle}
      >
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          <span>The approval service is unavailable. No decision has been recorded.</span>
          <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Approvals & Escalations"
      description="Only requests assigned to your current Deputy Principal role are shown. Supported decisions update the source workflow, audit trail, event, and requester notification together."
      icon={CheckCircle2}
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Pending Approvals</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">{data.metrics?.pending_approvals ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" /> Urgent Approvals
          </div>
          <div className="mt-1 text-lg font-black text-rose-800">{data.metrics?.urgent_approvals ?? 0}</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Request</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Module</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Priority</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Reason</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 font-bold">Status</th>
              <th className="border-b border-[#D8E0EC] px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {approvals.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  No approval request is currently assigned to you.
                </td>
              </tr>
            ) : approvals.map((request) => {
              const canDecideHere = normalizedCode(request.module) === "procurement"
                && normalizedCode(request.approval_type) === "procurement";
              const isPending = PENDING_STATUSES.has(normalizedCode(request.status));
              const canWrite = hasPermission("deputy:write");
              return (
                <tr key={request.id} className="align-top hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{request.title}</td>
                  <td className="px-4 py-3 capitalize text-[#64748B]">
                    {request.module?.replace(/[_-]+/g, " ") || "Not linked"}
                  </td>
                  <td className="px-4 py-3 capitalize text-[#64748B]">{request.priority || "normal"}</td>
                  <td className="max-w-xs whitespace-normal px-4 py-3 text-[#64748B]">
                    {request.reason || "No reason supplied"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusChip label={statusLabel(request.status)} tone={statusTone(request.status)} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isPending ? (
                      <span className="text-xs font-semibold text-[#64748B]">Already processed</span>
                    ) : canDecideHere && canWrite ? (
                      <div className="inline-flex gap-2">
                        <Button type="button" size="sm" onClick={() => openDecision(request, "approve")}>Approve</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => openDecision(request, "reject")}>Reject</Button>
                      </div>
                    ) : canDecideHere ? (
                      <span className="text-xs font-semibold text-[#64748B]">Decision permission required</span>
                    ) : (
                      <span className="text-xs font-semibold text-[#64748B]">
                        Decide in the {request.module || "source"} workspace
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-[#D8E0EC] p-4">
        <h3 className="font-bold text-[#071D49]">Your Recent Decisions</h3>
        {recentApprovals.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748B]">No recent decisions are recorded for your current user and role.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {recentApprovals.map((approval) => (
              <div key={approval.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#F8FAFC] p-3">
                <div>
                  <p className="font-semibold text-[#071D49]">{approval.title}</p>
                  <p className="text-xs text-[#64748B]">{approval.note || "No decision note"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip label={statusLabel(approval.status)} tone={statusTone(approval.status)} />
                  <span className="text-xs text-[#64748B]">{approval.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selectedRequest)}
        onClose={() => !isSubmitting && setSelectedRequest(null)}
        title={`${decision === "approve" ? "Approve" : "Reject"} request`}
      >
        <form onSubmit={submitDecision} className="space-y-4">
          <p className="text-sm text-[#64748B]">
            {selectedRequest?.title}. This decision will be persisted in the originating procurement workflow.
          </p>
          {actionError ? (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {actionError}
            </div>
          ) : null}
          <label className="block space-y-2 text-sm font-medium text-[#071D49]">
            {decision === "reject" ? "Rejection reason" : "Decision note (optional)"}
            <textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              required={decision === "reject"}
              rows={4}
              className="w-full rounded-lg border border-[#D8E0EC] p-2"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setSelectedRequest(null)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving decision..." : decision === "approve" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
