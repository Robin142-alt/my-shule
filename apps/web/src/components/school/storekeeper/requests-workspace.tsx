"use client";

import { RecordTable } from "@/components/ui/record-table";
import { useState } from "react";
import { Inbox, CheckCircle, XCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { approveRequest, rejectRequest, fulfillRequest } from "./api-client";
import { Modal } from "@/components/ui/modal";
import { useForm } from "react-hook-form";

type StoreRequest = {
  id: string;
  requester_name: string;
  department: string;
  item_name: string;
  quantity_requested: number;
  unit: string;
  reason: string;
  priority: string;
  requested_date: string;
  status: string;
};

type RequestsData = {
  metrics: {
    total_requests: number;
    pending: number;
    approved: number;
    fulfilled: number;
    rejected: number;
  };
  requests: StoreRequest[];
};

type RejectFormData = {
  reason: string;
};

export function RequestsWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<RequestsData>('/admin-command/storekeeper/requests');
  const [processing, setProcessing] = useState<string | null>(null);

  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<StoreRequest | null>(null);

  const rejectForm = useForm<RejectFormData>({
    defaultValues: {
      reason: "",
    }
  });

  const requests = data?.requests || [];

  const getStatusTone = (status: string): Tone => {
    if (status === "Pending") return "warning";
    if (status === "Approved") return "info";
    if (status === "Fulfilled") return "success";
    if (status === "Rejected") return "danger";
    if (status === "Partially Fulfilled") return "info";
    return "neutral";
  };

  const getPriorityTone = (priority: string): Tone => {
    if (priority === "Urgent") return "danger";
    if (priority === "High") return "warning";
    if (priority === "Normal") return "info";
    return "neutral";
  };

  const handleApprove = async (req: StoreRequest) => {
    setProcessing(req.id);
    try {
      await approveRequest(req.id);
      toast.success(`Request from ${req.requester_name} approved.`);
      refetch();
    } catch {
      toast.error("Failed to approve request.");
    } finally {
      setProcessing(null);
    }
  };

  const onSubmitReject = async (formData: RejectFormData) => {
    if (!selectedRequestForReject) return;
    setProcessing(selectedRequestForReject.id);
    try {
      await rejectRequest(selectedRequestForReject.id, formData.reason);
      toast.success(`Request rejected.`);
      setIsRejectOpen(false);
      rejectForm.reset();
      refetch();
    } catch {
      toast.error("Failed to reject request.");
    } finally {
      setProcessing(null);
      setSelectedRequestForReject(null);
    }
  };

  const handleFulfill = async (req: StoreRequest) => {
    if (!confirm(`Mark request for ${req.quantity_requested} ${req.unit}(s) of "${req.item_name}" as fulfilled?`)) return;
    setProcessing(req.id);
    try {
      await fulfillRequest(req.id);
      toast.success(`Request fulfilled. Stock deducted.`);
      refetch();
    } catch {
      toast.error("Failed to fulfill request.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Panel
      title="Departmental Requests"
      description="Review and process item requests from departments and staff."
      icon={Inbox}
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="text-sm font-semibold text-muted">Total Requests</div>
          <div className="mt-1 text-2xl font-black text-foreground">{isLoading ? "..." : data?.metrics?.total_requests || 0}</div>
        </div>
        <div className="rounded-xl border border-warning-border bg-warning-soft p-4">
          <div className="text-sm font-semibold text-warning">Pending</div>
          <div className="mt-1 text-2xl font-black text-warning">{isLoading ? "..." : data?.metrics?.pending || 0}</div>
        </div>
        <div className="rounded-xl border border-info-border bg-info-soft p-4">
          <div className="text-sm font-semibold text-info">Approved</div>
          <div className="mt-1 text-2xl font-black text-info">{isLoading ? "..." : data?.metrics?.approved || 0}</div>
        </div>
        <div className="rounded-xl border border-success-border bg-success-soft p-4">
          <div className="text-sm font-semibold text-success">Fulfilled</div>
          <div className="mt-1 text-2xl font-black text-success">{isLoading ? "..." : data?.metrics?.fulfilled || 0}</div>
        </div>
        <div className="rounded-xl border border-danger-border bg-danger-soft p-4">
          <div className="text-sm font-semibold text-danger">Rejected</div>
          <div className="mt-1 text-2xl font-black text-danger">{isLoading ? "..." : data?.metrics?.rejected || 0}</div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <RecordTable className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-surface-muted text-foreground">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-border">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-border">Requester</th>
              <th className="px-4 py-3 font-bold border-b border-border">Department</th>
              <th className="px-4 py-3 font-bold border-b border-border">Item</th>
              <th className="px-4 py-3 font-bold border-b border-border">Qty</th>
              <th className="px-4 py-3 font-bold border-b border-border">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-border">Date</th>
              <th className="px-4 py-3 font-bold border-b border-border">Status</th>
              <th className="px-4 py-3 font-bold border-b border-border text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Loading requests...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">No departmental requests. Requests from staff and departments will appear here for processing.</td></tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="hover:bg-surface-muted">
                  <td className="px-4 py-3"><StatusChip label={req.priority} tone={getPriorityTone(req.priority)} /></td>
                  <td className="px-4 py-3 font-semibold text-foreground">{req.requester_name}</td>
                  <td className="px-4 py-3 text-muted">{req.department}</td>
                  <td className="px-4 py-3 text-foreground">{req.item_name}</td>
                  <td className="px-4 py-3 text-foreground">{req.quantity_requested} {req.unit}</td>
                  <td className="px-4 py-3 text-muted max-w-[180px] truncate">{req.reason}</td>
                  <td className="px-4 py-3 text-muted">{req.requested_date}</td>
                  <td className="px-4 py-3"><StatusChip label={req.status} tone={getStatusTone(req.status)} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {req.status === "Pending" && (
                        <>
                          <button disabled={processing === req.id} onClick={() => handleApprove(req)} className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-semibold text-xs disabled:opacity-50">
                            <CheckCircle className="h-3 w-3" /> Approve
                          </button>
                          <button
                            disabled={processing === req.id}
                            onClick={() => {
                              setSelectedRequestForReject(req);
                              rejectForm.reset({ reason: "" });
                              setIsRejectOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-rose-600 hover:underline font-semibold text-xs disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                      {req.status === "Approved" && (
                        <button disabled={processing === req.id} onClick={() => handleFulfill(req)} className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold text-xs disabled:opacity-50">
                          <Truck className="h-3 w-3" /> {processing === req.id ? "Fulfilling..." : "Fulfill"}
                        </button>
                      )}
                      {(req.status === "Fulfilled" || req.status === "Rejected") && (
                        <span className="text-xs text-muted">Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </RecordTable>
      </div>

      {/* Reject Request Modal */}
      <Modal
        open={isRejectOpen}
        onClose={() => {
          setIsRejectOpen(false);
          setSelectedRequestForReject(null);
        }}
        title={`Reject Request: ${selectedRequestForReject?.item_name || ""}`}
      >
        <form onSubmit={rejectForm.handleSubmit(onSubmitReject)} className="space-y-4 py-4">
          <p className="text-sm text-muted">
            Reason for rejecting {selectedRequestForReject?.requester_name}&apos;s request for &quot;{selectedRequestForReject?.item_name}&quot;:
          </p>

          <div className="space-y-1">
            <label className="text-sm font-medium">Rejection Reason</label>
            <textarea
              {...rejectForm.register("reason", { required: "Reason is required" })}
              className="w-full rounded border border-slate-300 p-2 text-sm text-foreground"
              placeholder="Provide a reason for rejection..."
              rows={3}
            />
            {rejectForm.formState.errors.reason && (
              <span className="text-xs text-red-500">{rejectForm.formState.errors.reason.message}</span>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsRejectOpen(false);
                setSelectedRequestForReject(null);
              }}
              className="px-4 py-2 border rounded text-sm font-medium hover:bg-slate-50 text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700"
            >
              Reject Request
            </button>
          </div>
        </form>
      </Modal>
    </Panel>
  );
}
