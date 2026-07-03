"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Send, RotateCcw, CheckCircle, Eye, XCircle, Globe, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

interface ReportCardApprovalRow {
  id?: string;
  exam_series_id?: string | null;
  student_id?: string | null;
  status?: string | null;
  approval?: string | null;
  publish?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

export function ApprovalsPublishingWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: reportCardsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<ReportCardApprovalRow[]> | ReportCardApprovalRow[]>("/exams/report-cards?status=draft_generated,draft,regeneration_required,under_review,approved,published,withdrawn");
  const reportCards = Array.isArray(reportCardsResponse) ? reportCardsResponse : reportCardsResponse?.data;
  const visibleReportCards = Array.isArray(reportCards) ? reportCards : [];

  function cardKey(row: ReportCardApprovalRow, index: number) {
    return row.id ?? `${row.exam_series_id ?? "series"}-${row.student_id ?? "student"}-${index}`;
  }

  function approvalStatus(row: ReportCardApprovalRow) {
    return row.status ?? row.approval ?? "awaiting_submission";
  }

  function publishStatus(row: ReportCardApprovalRow) {
    return row.status === "published" || row.publish === "Published" ? "published" : "awaiting_publish";
  }

  function previewResults(row: ReportCardApprovalRow) {
    openPrintDocument({
      eyebrow: "Approval results preview",
      title: `Exam series ${row.exam_series_id ?? "unassigned"}`,
      subtitle: `Student ${row.student_id ?? "unassigned"}`,
      rows: [
        { label: "Approval status", value: approvalStatus(row) },
        { label: "Publish status", value: publishStatus(row) },
        { label: "Parent portal visibility", value: publishStatus(row) === "published" ? "Visible" : "Hidden" },
      ],
      footer: "Report card visibility remains tenant-scoped to the current school.",
    });
    setNotice(`Results print preview generated for student ${row.student_id ?? "unassigned"}.`);
  }

  async function transitionReportCard(reportCardId: string, action: "submit" | "approve" | "recall" | "publish" | "unpublish") {
    setSavingAction(`${action}-${reportCardId}`);
    try {
      await requestDashboardApi(`/api/exams/report-cards/${encodeURIComponent(reportCardId)}/transition`, {
        method: "PATCH",
        body: { action },
      });
      await refetch();
      setNotice(`Report card ${action} completed.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : `Could not ${action} the report card.`);
    } finally {
      setSavingAction(null);
    }
  }

  async function transitionMany(action: "recall" | "publish" | "unpublish", status: string) {
    const ids = visibleReportCards.filter((row) => row.status === status && row.id).map((row) => row.id as string);
    if (!ids.length) {
      setNotice(`No ${status.replace(/_/g, " ")} report cards are available to ${action}.`);
      return;
    }
    setSavingAction(`${action}-all`);
    const outcomes = await Promise.allSettled(ids.map((reportCardId) => requestDashboardApi(`/api/exams/report-cards/${encodeURIComponent(reportCardId)}/transition`, { method: "PATCH", body: { action } })));
    await refetch();
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    setNotice(`${succeeded} report card${succeeded === 1 ? "" : "s"} ${action} completed${succeeded < ids.length ? `; ${ids.length - succeeded} failed and can be retried` : ""}.`);
    setSavingAction(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Outputs"
          title="Approvals & Publishing"
          description="Submit finalized results to the Principal and publish approved report cards to parents."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void transitionMany("recall", "under_review")}><RotateCcw className="mr-2 h-4 w-4" /> Recall Submission</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => void transitionMany("unpublish", "published")}><Globe className="mr-2 h-4 w-4" /> Unpublish</Button>
          <Button disabled={!!savingAction} variant="default" className="bg-success text-success-foreground hover:bg-success/90" onClick={() => void transitionMany("publish", "approved")}>
            <CheckCircle className="mr-2 h-4 w-4" /> Publish Approved
          </Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Submitted By</TableHead>
                <TableHead>Approval Status</TableHead>
                <TableHead>Publish Status</TableHead>
                <TableHead>Principal Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading approval requests...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading approvals: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!reportCards || !Array.isArray(reportCards) || reportCards.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No items pending approval or publishing.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(reportCards) && reportCards.map((row, idx) => {
                const key = cardKey(row, idx);
                const approval = approvalStatus(row);
                const publish = publishStatus(row);
                return (
                  <TableRow key={key}>
                    <TableCell className="font-medium">Series: {row.exam_series_id}</TableCell>
                    <TableCell>Student: {row.student_id}</TableCell>
                    <TableCell>System</TableCell>
                    <TableCell>
                      <Badge variant={approval === "approved" || approval === "published" ? "success" : approval === "recalled" ? "secondary" : "warning"}>{approval}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={publish === "published" ? "success" : "outline"}>
                        {publish === "published" ? "Published" : "Awaiting Publish"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">-</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => previewResults(row)}><Eye className="mr-2 h-4 w-4" /> View Results</DropdownMenuItem>
                          <DropdownMenuItem disabled={!row.id || !["draft_generated", "draft", "regeneration_required"].includes(row.status ?? "") || !!savingAction} onClick={() => row.id && void transitionReportCard(row.id, "submit")}><Send className="mr-2 h-4 w-4" /> Submit for Approval</DropdownMenuItem>
                          <DropdownMenuItem disabled={!row.id || row.status !== "under_review" || !!savingAction} onClick={() => row.id && void transitionReportCard(row.id, "approve")}><CheckCircle className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                          <DropdownMenuItem className="text-success" disabled={!row.id || row.status !== "approved" || !!savingAction} onClick={() => row.id && void transitionReportCard(row.id, "publish")}><CheckCircle className="mr-2 h-4 w-4" /> Publish to Parents</DropdownMenuItem>
                          <DropdownMenuItem disabled={!row.id || row.status !== "under_review" || !!savingAction} onClick={() => row.id && void transitionReportCard(row.id, "recall")}><RotateCcw className="mr-2 h-4 w-4" /> Recall Submission</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" disabled={!row.id || row.status !== "published" || !!savingAction} onClick={() => row.id && void transitionReportCard(row.id, "unpublish")}><XCircle className="mr-2 h-4 w-4" /> Unpublish</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
