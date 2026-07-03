"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlayCircle, CheckCircle, Mail, Download, UserCheck, Eye, Edit, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

interface MarkVersionRow {
  id?: string;
  mark_id?: string | null;
  original_score?: number | string | null;
  correction_score?: number | string | null;
  reason?: string | null;
  corrected_by_user_id?: string | null;
  approval_state?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

export function ModerationWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: versionsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<MarkVersionRow[]> | MarkVersionRow[]>("/exams/mark-versions");
  const versions = Array.isArray(versionsResponse) ? versionsResponse : versionsResponse?.data;
  const visibleVersions = Array.isArray(versions) ? versions : [];

  function versionKey(row: MarkVersionRow, index: number) {
    return row.id ?? `${row.mark_id ?? "mark"}-${index}`;
  }

  function exportIssues(rows: MarkVersionRow[]) {
    downloadCsvFile({
      filename: `mark-moderation-issues-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Mark ID", "Original score", "Correction score", "Reason", "Assigned to", "Status"],
      rows: rows.map((row, index) => [
        row.mark_id ?? "",
        String(row.original_score ?? ""),
        String(row.correction_score ?? ""),
        row.reason ?? "",
        row.corrected_by_user_id ?? "",
        row.approval_state ?? "pending",
      ]),
    });
    setNotice(`Moderation issue CSV downloaded with ${rows.length} issue${rows.length === 1 ? "" : "s"}.`);
  }

  async function moderateMarkRows(rows: MarkVersionRow[], action: "approve" | "return_for_correction", reason?: string) {
    const markIds = rows.map((row) => row.mark_id).filter((id): id is string => Boolean(id));
    if (!markIds.length) {
      setNotice("No persisted mark rows are available for moderation.");
      return;
    }
    setSavingAction(action);
    try {
      const body = action === "approve"
        ? { action: "approve", mark_ids: markIds }
        : { action: "return_for_correction", mark_ids: markIds, reason: reason ?? "Returned by Exams Manager for teacher correction." };
      const result = await requestDashboardApi<{ updated_count?: number }>("/api/exams/marks/moderate", {
        method: "POST",
        body,
      });
      await refetch();
      const updatedCount = Number(result.updated_count ?? 0);
      setNotice(`${updatedCount} mark row${updatedCount === 1 ? "" : "s"} ${action === "approve" ? "approved" : "returned for correction"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not complete mark moderation.");
    } finally {
      setSavingAction(null);
    }
  }

  function previewModerationRow(row: MarkVersionRow, title: string) {
    openPrintDocument({
      eyebrow: "Exam moderation",
      title,
      subtitle: `Mark ${row.mark_id ?? "unassigned"}`,
      rows: [
        { label: "Original score", value: String(row.original_score ?? "-") },
        { label: "Correction score", value: String(row.correction_score ?? "-") },
        { label: "Reason", value: String(row.reason ?? "No reason recorded") },
        { label: "Corrected by", value: String(row.corrected_by_user_id ?? "Unassigned") },
        { label: "Approval state", value: String(row.approval_state ?? "pending") },
      ],
      footer: "Moderation detail preview generated from current school mark correction records.",
    });
    setNotice(`${title} print preview generated for mark ${row.mark_id ?? "unassigned"}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Validation"
          title="Moderation & Validation"
          description="Detect incorrect, suspicious, incomplete, or inconsistent results before publishing."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void moderateMarkRows(visibleVersions, "return_for_correction", "Bulk correction request from Exams Manager moderation.")}>{savingAction === "return_for_correction" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />} Send Correction Requests</Button>
          <Button variant="outline" onClick={() => exportIssues(visibleVersions)}><Download className="mr-2 h-4 w-4" /> Export Issues</Button>
          <Button disabled={!!savingAction} onClick={() => void moderateMarkRows(visibleVersions, "approve")}>{savingAction === "approve" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />} Run Full Moderation</Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Pending Issues", value: String(visibleVersions.filter((row) => !["approved", "reviewed"].includes((row.approval_state ?? "").toLowerCase())).length), type: "warning" },
          { label: "Returned", value: String(visibleVersions.filter((row) => ["rejected", "returned"].includes((row.approval_state ?? "").toLowerCase())).length), type: "destructive" },
          { label: "Assigned", value: String(visibleVersions.filter((row) => Boolean(row.corrected_by_user_id)).length), type: "default" },
          { label: "Approved Exceptions", value: String(visibleVersions.filter((row) => ["approved", "reviewed"].includes((row.approval_state ?? "").toLowerCase())).length), type: "default" },
          { label: "Reviewed", value: String(visibleVersions.filter((row) => Boolean(row.approval_state)).length), type: "default" },
          { label: "Loaded Rows", value: String(visibleVersions.length), type: "default" },
        ].map((card, idx) => (
          <Card key={idx} className="p-4">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold text-${card.type === "default" ? "foreground" : card.type}`}>{card.value}</p>
          </Card>
        ))}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Detected Problem</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading mark moderation requests...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading requests: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!versions || !Array.isArray(versions) || versions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No pending moderation requests.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(versions) && versions.map((row, idx) => {
                const key = versionKey(row, idx);
                const status = row.approval_state ?? "pending";
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${status === "pending" || status === "returned" ? "bg-warning" : "bg-success"}`} />
                        <span className="font-medium">Medium</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">Mark Correction</TableCell>
                    <TableCell>Mark ID: {row.mark_id}</TableCell>
                    <TableCell>Score: {row.original_score} -&gt; {row.correction_score}</TableCell>
                    <TableCell className="text-muted-foreground">{row.reason}</TableCell>
                    <TableCell>{row.corrected_by_user_id}</TableCell>
                    <TableCell>
                      <Badge variant={status === "approved_exception" ? "success" : status === "returned" ? "destructive" : "outline"}>{status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => previewModerationRow(row, "Moderation issue detail")}><Eye className="mr-2 h-4 w-4" /> View Issue</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => previewModerationRow(row, "Mark correction detail")}><Edit className="mr-2 h-4 w-4" /> Open Mark</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void moderateMarkRows([row], "return_for_correction", "Assigned back to teacher for correction from moderation.")}><UserCheck className="mr-2 h-4 w-4" /> Assign to Teacher</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void moderateMarkRows([row], "return_for_correction", "Returned by Exams Manager for correction.")}><Mail className="mr-2 h-4 w-4" /> Return for Correction</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void moderateMarkRows([row], "approve")}><CheckCircle className="mr-2 h-4 w-4" /> Approve Exception</DropdownMenuItem>
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
