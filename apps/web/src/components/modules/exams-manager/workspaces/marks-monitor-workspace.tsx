"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, PlayCircle, Bell, Download, Lock, Eye, RotateCcw, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { buildSchoolSectionHref } from "@/components/school/school-pages";

interface MarkWindowRow {
  id?: string;
  class_section_id?: string | null;
  subject_id?: string | null;
  class_name?: string | null;
  subject_name?: string | null;
  created_by_user_id?: string | null;
  status?: string | null;
  workflow_status?: string | null;
  last_action?: string | null;
  return_reason?: string | null;
  closes_at?: string | null;
  expected_count?: number | string | null;
  saved_count?: number | string | null;
  submitted_count?: number | string | null;
  missing_count?: number | string | null;
  teacher_user_ids?: string[] | null;
}

interface ApiResponse<T> {
  data?: T;
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function displayStatus(row: MarkWindowRow): string {
  return row.workflow_status ?? row.last_action ?? row.status ?? "pending";
}

function classLabel(row: MarkWindowRow): string {
  return row.class_name ?? row.class_section_id ?? "Unassigned class";
}

function subjectLabel(row: MarkWindowRow): string {
  return row.subject_name ?? row.subject_id ?? "Unassigned subject";
}

function teacherLabel(row: MarkWindowRow): string {
  const teachers = row.teacher_user_ids?.filter(Boolean) ?? [];
  if (teachers.length) return teachers.join(", ");
  return row.created_by_user_id ?? "Unassigned teacher";
}

function ReturnMarksDialog({
  children,
  window,
  onReturn,
}: {
  children: React.ReactNode;
  window: MarkWindowRow;
  onReturn: (windowId: string, reason: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(window.return_reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 10 || trimmedReason.length > 2000) {
      setError("Correction reason must be between 10 and 2000 characters.");
      return;
    }
    if (!window.id) {
      setError("This mark window must be saved before it can be returned to a teacher.");
      return;
    }
    setSaving(true);
    try {
      await onReturn(window.id, trimmedReason);
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not return the marks window.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Return Marks to Teacher</DialogTitle>
            <DialogDescription>
              Record the correction reason. The mark window and affected marks are persisted in the current school.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-semibold">{classLabel(window)} - {subjectLabel(window)}</p>
              <p className="text-muted-foreground">Teacher: {teacherLabel(window)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`return-reason-${window.id ?? "unsaved"}`}>Correction reason</Label>
              <Textarea
                id={`return-reason-${window.id ?? "unsaved"}`}
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </div>
            {error ? <div role="alert" className="text-sm text-destructive">{error}</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || reason.trim().length < 10}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Return Marks
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function MarksMonitorWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: windowsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<MarkWindowRow[]> | MarkWindowRow[]>("/exams/mark-entry-windows");
  const windows = Array.isArray(windowsResponse) ? windowsResponse : windowsResponse?.data;
  const visibleWindows = Array.isArray(windows) ? windows : [];
  const completeCount = visibleWindows.filter((row) => displayStatus(row) === "locked" || row.status === "closed").length;
  const returnedCount = visibleWindows.filter((row) => displayStatus(row) === "returned").length;
  const missingCount = visibleWindows.reduce((total, row) => total + toNumber(row.missing_count), 0);

  function windowKey(row: MarkWindowRow, index: number) {
    return row.id ?? `${row.class_section_id ?? "class"}-${row.subject_id ?? "subject"}-${index}`;
  }

  async function transitionWindow(windowId: string, action: "open" | "lock" | "return", reason?: string) {
    setSavingAction(`${action}:${windowId}`);
    try {
      await requestDashboardApi(`/api/exams/mark-entry-windows/${encodeURIComponent(windowId)}/transition`, {
        method: "PATCH",
        body: { action, ...(reason ? { reason } : {}) },
      });
      await refetch();
      setNotice(action === "return" ? "Marks returned to the teacher for correction." : `Mark window ${action === "lock" ? "locked" : "opened"}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the mark window.");
      throw error;
    } finally {
      setSavingAction(null);
    }
  }

  async function remindWindow(windowId: string) {
    setSavingAction(`remind:${windowId}`);
    try {
      const result = await requestDashboardApi<{ data?: { sent?: number; skipped?: number } }>(`/api/exams/mark-entry-windows/${encodeURIComponent(windowId)}/remind`, {
        method: "POST",
      });
      const sent = toNumber(result.data?.sent);
      const skipped = toNumber(result.data?.skipped);
      setNotice(`${sent} teacher reminder${sent === 1 ? "" : "s"} created${skipped ? `; ${skipped} window had no assigned teacher` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send mark-entry reminder.");
    } finally {
      setSavingAction(null);
    }
  }

  async function bulkTransition(action: "open" | "lock") {
    const persisted = visibleWindows.filter((row): row is MarkWindowRow & { id: string } => Boolean(row.id));
    if (!persisted.length) {
      setNotice("No persisted mark windows are available for this action.");
      return;
    }
    setSavingAction(`bulk-${action}`);
    const outcomes = await Promise.allSettled(persisted.map(({ id: windowId }) => requestDashboardApi(`/api/exams/mark-entry-windows/${encodeURIComponent(windowId)}/transition`, {
      method: "PATCH",
      body: { action },
    })));
    await refetch();
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    const failed = persisted.length - succeeded;
    setNotice(`${succeeded} mark window${succeeded === 1 ? "" : "s"} ${action === "lock" ? "locked" : "opened"}${failed ? `; ${failed} failed and can be retried` : ""}.`);
    setSavingAction(null);
  }

  async function bulkRemind() {
    const persisted = visibleWindows.filter((row): row is MarkWindowRow & { id: string } => Boolean(row.id));
    if (!persisted.length) {
      setNotice("No persisted mark windows are available for reminders.");
      return;
    }
    setSavingAction("bulk-remind");
    const outcomes = await Promise.allSettled(persisted.map(({ id: windowId }) => requestDashboardApi(`/api/exams/mark-entry-windows/${encodeURIComponent(windowId)}/remind`, {
      method: "POST",
    })));
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    const failed = persisted.length - succeeded;
    setNotice(`${succeeded} reminder request${succeeded === 1 ? "" : "s"} processed${failed ? `; ${failed} failed and can be retried` : ""}.`);
    setSavingAction(null);
  }

  function exportMissingMarks(rows: MarkWindowRow[]) {
    const missingRows = rows.filter((row) => toNumber(row.missing_count) > 0);
    downloadCsvFile({
      filename: `missing-marks-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Class", "Subject", "Teacher", "Expected", "Saved", "Submitted", "Missing", "Status", "Deadline"],
      rows: missingRows.map((row) => [
        classLabel(row),
        subjectLabel(row),
        teacherLabel(row),
        String(toNumber(row.expected_count)),
        String(toNumber(row.saved_count)),
        String(toNumber(row.submitted_count)),
        String(toNumber(row.missing_count)),
        displayStatus(row),
        row.closes_at ? new Date(row.closes_at).toLocaleDateString() : "",
      ]),
    });
    setNotice(`Missing marks CSV downloaded for ${missingRows.length} mark window${missingRows.length === 1 ? "" : "s"}.`);
  }

  function previewMarksProgress(row: MarkWindowRow) {
    openPrintDocument({
      eyebrow: "Marks monitor",
      title: "Marks Progress Detail",
      subtitle: `${classLabel(row)} | ${subjectLabel(row)}`,
      rows: [
        { label: "Class", value: classLabel(row) },
        { label: "Subject", value: subjectLabel(row) },
        { label: "Teacher", value: teacherLabel(row) },
        { label: "Expected learners", value: String(toNumber(row.expected_count)) },
        { label: "Saved marks", value: String(toNumber(row.saved_count)) },
        { label: "Submitted marks", value: String(toNumber(row.submitted_count)) },
        { label: "Missing marks", value: String(toNumber(row.missing_count)) },
        { label: "Status", value: displayStatus(row) },
        { label: "Return reason", value: row.return_reason || "Not returned" },
        { label: "Deadline", value: row.closes_at ? new Date(row.closes_at).toLocaleDateString() : "No deadline" },
      ],
      footer: "Progress preview generated from current school marks entry windows.",
    });
    setNotice(`Marks progress preview ready for ${classLabel(row)} ${subjectLabel(row)}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          eyebrow="Monitoring"
          title="Marks Entry Monitor"
          description="Track teacher grading progress across all classes and subjects."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void bulkRemind()}>
            {savingAction === "bulk-remind" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
            Send Reminders
          </Button>
          <Button variant="outline" onClick={() => exportMissingMarks(visibleWindows)}><Download className="mr-2 h-4 w-4" /> Missing Marks</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => void bulkTransition("lock")}>
            {savingAction === "bulk-lock" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Lock Submitted
          </Button>
          <Button disabled={!!savingAction} onClick={() => void bulkTransition("open")}>
            {savingAction === "bulk-open" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
            Open Marks Window
          </Button>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Subjects Complete", value: completeCount },
          { label: "Subjects Pending", value: Math.max(visibleWindows.length - completeCount, 0) },
          { label: "Missing Marks", value: missingCount },
          { label: "Returned Corrections", value: returnedCount },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <p className="eyebrow">{card.label}</p>
            <p className="mt-3 metric-value">{card.value}</p>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-success">Submitted</TableHead>
                <TableHead className="text-destructive">Missing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading mark windows...</p>
                  </TableCell>
                </TableRow>
              ) : null}
              {error ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-destructive">
                    Error loading windows: {error.message}
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && !error && !visibleWindows.length ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    <p>No mark entry windows are configured for this school.</p>
                    <Button className="mt-4" size="sm" onClick={() => window.location.assign(buildSchoolSectionHref("exams-manager", "exam-setup", "public"))}>
                      <PlayCircle className="mr-2 h-4 w-4" /> Open Exam Setup
                    </Button>
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && !error && visibleWindows.map((row, idx) => {
                const status = displayStatus(row);
                const key = windowKey(row, idx);
                return (
                  <TableRow key={key}>
                    <TableCell>{classLabel(row)}</TableCell>
                    <TableCell className="font-medium">{subjectLabel(row)}</TableCell>
                    <TableCell>{teacherLabel(row)}</TableCell>
                    <TableCell>{toNumber(row.expected_count)}</TableCell>
                    <TableCell>{toNumber(row.saved_count)}</TableCell>
                    <TableCell className="text-success">{toNumber(row.submitted_count)}</TableCell>
                    <TableCell className="text-destructive">{toNumber(row.missing_count)}</TableCell>
                    <TableCell>
                      <Badge variant={status === "open" || status === "opened" ? "success" : status === "returned" ? "destructive" : status === "locked" ? "warning" : "secondary"}>{status}</Badge>
                    </TableCell>
                    <TableCell>{row.closes_at ? new Date(row.closes_at).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => previewMarksProgress(row)}><Eye className="mr-2 h-4 w-4" /> View Progress</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => row.id ? void remindWindow(row.id) : setNotice("This mark window must be saved before reminders can be sent.")}><Bell className="mr-2 h-4 w-4" /> Send Reminder</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => row.id ? void transitionWindow(row.id, "lock") : setNotice("This mark window must be saved before it can be locked.")}><Lock className="mr-2 h-4 w-4" /> Lock Subject Marks</DropdownMenuItem>
                          <ReturnMarksDialog window={row} onReturn={(windowId, reason) => transitionWindow(windowId, "return", reason)}>
                            <DropdownMenuItem asChild><button type="button"><RotateCcw className="mr-2 h-4 w-4" /> Return to Teacher</button></DropdownMenuItem>
                          </ReturnMarksDialog>
                          <DropdownMenuItem onClick={() => row.id ? void transitionWindow(row.id, "open") : setNotice("This mark window must be saved before it can be opened.")}><PlayCircle className="mr-2 h-4 w-4" /> Open Marks Window</DropdownMenuItem>
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
