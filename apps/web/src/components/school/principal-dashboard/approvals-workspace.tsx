"use client";

import { RecordTable } from "@/components/ui/record-table";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ShieldAlert, Clock, FileCheck2, Loader2, RefreshCw } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { toast } from "sonner";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type ApprovalRequest = {
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

type ApprovalsOverviewData = {
  status: "active" | "degraded" | "setup_required";
  pendingTotal: number;
  urgentApprovals: number;
  categories: Array<{ name: string; pending: number; urgent: number }>;
  requests: ApprovalRequest[];
  recentApprovals: Array<{ id: string; title: string; status: string; date: string; note?: string | null }>;
};

type PrincipalExamSeries = {
  id: string;
  title: string;
  status: string;
  startsOn: string;
  endsOn: string;
  totalReportCards: number;
  approvedReportCards: number;
  publishedReportCards: number;
  blockedReportCards: number;
  canPublish: boolean;
};

type PrincipalExamsOverview = {
  reportsPending: number;
  recentResults: PrincipalExamSeries[];
  releaseQueue?: PrincipalExamSeries[];
};

export function PrincipalApprovalsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<ApprovalsOverviewData>('/admin-command/principal/approvals');
  const {
    data: examsData,
    isLoading: examsLoading,
    error: examsError,
    refetch: refetchExams,
  } = useSchoolQuery<PrincipalExamsOverview>('/admin-command/principal/exams');
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { hasPermission } = usePermissions();
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [decisionNote, setDecisionNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingSeriesId, setPublishingSeriesId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const approvalOverview = data ?? {
    status: "degraded" as const,
    pendingTotal: 0,
    urgentApprovals: 0,
    categories: [],
    requests: [],
    recentApprovals: [],
  };
  const requests = Array.isArray(data?.requests) ? data.requests : [];
  const releaseQueue = Array.isArray(examsData?.releaseQueue)
    ? examsData.releaseQueue
    : Array.isArray(examsData?.recentResults)
      ? examsData.recentResults.filter((series) => series.canPublish)
      : [];
  const reportCardReleaseCount = Math.max(examsData?.reportsPending ?? 0, releaseQueue.length);
  const canPublishReportCards = hasPermission("principal:write") && hasPermission("exams:publish");

  const openDecision = (request: ApprovalRequest, action: "approve" | "reject") => {
    setSelectedRequest(request);
    setDecision(action);
    setDecisionNote("");
    setActionError("");
  };

  const submitDecision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRequest) return;
    if (decision === "reject" && !decisionNote.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }

    setIsSubmitting(true);
    setActionError("");
    try {
      await requestPrincipalApi(`/admin-command/principal/approvals/${selectedRequest.id}/action`, {
        method: "POST",
        body: { action: decision, comment: decisionNote.trim() || undefined },
      });
      toast.success(`Approval ${decision === "approve" ? "approved" : "rejected"}.`);
      setSelectedRequest(null);
      await refetch();
    } catch (decisionError) {
      setActionError(decisionError instanceof Error ? decisionError.message : "The approval decision could not be saved.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishReportCards = async (series: PrincipalExamSeries) => {
    setPublishingSeriesId(series.id);
    try {
      await requestPrincipalApi(`/admin-command/principal/exams-report-cards/${series.id}/publish`, {
        method: "POST",
      });
      toast.success(`${series.title} report cards released to authorized parent and student portals.`);
      await Promise.all([refetch(), refetchExams()]);
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "The report cards could not be released.");
    } finally {
      setPublishingSeriesId(null);
    }
  };

  if (isLoading && examsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="app-metric-grid grid gap-4 md:grid-cols-3">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Pending</div>
          <div className="mt-2 text-2xl font-black text-white">{approvalOverview.pendingTotal + reportCardReleaseCount}</div>
        </Card>
        <Card className="border border-rose-500/30 bg-rose-500/10 p-5">
          <div className="text-sm font-semibold text-rose-200">Urgent</div>
          <div className="mt-2 text-2xl font-black text-rose-400">{approvalOverview.urgentApprovals}</div>
        </Card>
        <Card className="border border-emerald-500/30 bg-emerald-500/10 p-5">
          <div className="text-sm font-semibold text-emerald-100">Report Cards Ready to Release</div>
          <div className="mt-2 text-2xl font-black text-emerald-300">{examsLoading ? "…" : reportCardReleaseCount}</div>
        </Card>
      </div>

      {error ? (
        <Card role="alert" className="border border-red-500/20 bg-red-500/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
              <AlertCircle className="h-5 w-5 text-red-300" />
              Administrative approvals could not be loaded: {error.message}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>Retry administrative approvals</Button>
          </div>
        </Card>
      ) : null}

      <Card className="border border-emerald-500/30 bg-emerald-500/10 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-300/20 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-emerald-300" />
              <h2 className="text-xl font-bold text-white">Principal Report-card Release</h2>
            </div>
            <p className="mt-1 text-sm text-white/70">
              Dean-approved report cards appear here for final Principal release. Releasing publishes the persisted cards to authorized parent and student portals.
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={examsLoading} onClick={() => refetchExams()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${examsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {examsError ? (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            <span>Report-card approvals could not be loaded: {examsError.message}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => refetchExams()}>Retry</Button>
          </div>
        ) : examsLoading ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/60">
            Loading report cards awaiting Principal release…
          </div>
        ) : releaseQueue.length === 0 ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-6 text-center text-white/60">
            No Dean-approved report cards are awaiting Principal release.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {releaseQueue.map((series) => (
              <div key={series.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-300/20 bg-slate-950/20 p-4">
                <div>
                  <p className="font-bold text-white">{series.title}</p>
                  <p className="mt-1 text-sm text-white/65">
                    {series.approvedReportCards} of {series.totalReportCards} cards approved
                    {series.blockedReportCards > 0 ? ` · ${series.blockedReportCards} blocked` : " · no blockers"}
                  </p>
                </div>
                {canPublishReportCards ? (
                  <Button
                    type="button"
                    disabled={Boolean(publishingSeriesId)}
                    onClick={() => publishReportCards(series)}
                  >
                    {publishingSeriesId === series.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {publishingSeriesId === series.id ? "Releasing…" : "Release report cards"}
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-amber-200">Principal release permission is required.</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="mb-5 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">Requests Awaiting Your Decision</h2>
          <p className="mt-1 text-sm text-white/60">
            Only approvals assigned to your current Principal role are shown. Procurement decisions update the request, audit trail, event, and requester notification together.
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/5 px-4 py-8 text-center text-white/60">
            No approval request is currently assigned to you.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <RecordTable className="app-record-table-dark min-w-[780px] w-full text-left text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="px-4 py-3 font-semibold">Request</th>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {requests.map((request) => {
                  const normalizedModule = String(request.module ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
                  const normalizedType = String(request.approval_type ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
                  const canDecideHere = normalizedModule === "procurement" && normalizedType === "procurement";
                  return (
                    <tr key={request.id} className="align-top text-white/80">
                      <td className="px-4 py-3 font-semibold text-white">{request.title}</td>
                      <td className="px-4 py-3 capitalize">{request.module?.replace(/[_-]+/g, " ") || "Not linked"}</td>
                      <td className="px-4 py-3 capitalize">{request.priority || "normal"}</td>
                      <td className="max-w-sm px-4 py-3 whitespace-normal">{request.reason || "No reason supplied"}</td>
                      <td className="px-4 py-3 text-right">
                        {canDecideHere && hasPermission("principal:write") ? (
                          <div className="inline-flex gap-2">
                            <Button type="button" size="sm" onClick={() => openDecision(request, "approve")}>Approve</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => openDecision(request, "reject")}>Reject</Button>
                          </div>
                        ) : (
                          <span className="text-xs text-white/50">Decide in the {request.module || "source"} workspace</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </RecordTable>
          </div>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Pending by Category</h2>
          </div>
          
          {approvalOverview.categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <CheckCircle2 className="h-10 w-10 text-emerald-400/50 mb-3" />
              <p className="text-white/60">All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {approvalOverview.categories.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                      <Clock className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{cat.name}</p>
                      {cat.urgent > 0 && (
                        <p className="text-xs text-rose-400 flex items-center gap-1 mt-0.5">
                          <ShieldAlert className="h-3 w-3" /> {cat.urgent} urgent
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-white">
                    {cat.pending}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Recent Approvals</h2>
          </div>
          
          {approvalOverview.recentApprovals.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <AlertCircle className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent approvals recorded.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {approvalOverview.recentApprovals.map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">{app.title}</p>
                      <p className="text-xs capitalize text-white/50">{app.status}</p>
                    </div>
                  </div>
                  <div className="text-xs text-white/60">
                    {app.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={Boolean(selectedRequest)}
        onClose={() => !isSubmitting && setSelectedRequest(null)}
        title={`${decision === "approve" ? "Approve" : "Reject"} request`}
      >
        <form onSubmit={submitDecision} className="space-y-4">
          <p className="text-sm text-slate-600">
            {selectedRequest?.title}. This decision will be persisted in the originating procurement workflow.
          </p>
          {actionError ? (
            <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>
          ) : null}
          <label className="block space-y-2 text-sm font-medium text-slate-800">
            {decision === "reject" ? "Rejection reason" : "Decision note (optional)"}
            <textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              required={decision === "reject"}
              rows={4}
              className="w-full rounded border border-slate-300 p-2"
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
    </div>
  );
}
