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
import { MoreHorizontal, FileText, Send, Download, MessageSquare, Eye, Edit, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { buildSchoolSectionHref } from "@/components/school/school-pages";

interface ReportCardRow {
  id?: string;
  student_id: string;
  exam_series_id: string;
  report_snapshot_id?: string;
  status?: string;
  metadata?: {
    class_teacher_comment?: string;
    principal_comment?: string;
    report_card?: { attendance?: unknown; fee_balance?: unknown };
  };
}

interface ApiResponse<T> {
  data?: T;
}

function ReportCardCommentsDialog({ children, reportCards, onSuccess, onNotice }: {
  children: React.ReactNode;
  reportCards: ReportCardRow[];
  onSuccess: () => unknown;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [classTeacherComment, setClassTeacherComment] = useState(reportCards.length === 1 ? reportCards[0].metadata?.class_teacher_comment ?? "" : "");
  const [principalComment, setPrincipalComment] = useState(reportCards.length === 1 ? reportCards[0].metadata?.principal_comment ?? "" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editableCards = reportCards.filter((reportCard): reportCard is ReportCardRow & { id: string } => Boolean(reportCard.id) && !["published", "withdrawn"].includes(reportCard.status ?? ""));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const outcomes = await Promise.allSettled(editableCards.map((reportCard) => requestDashboardApi(`/api/exams/report-cards/${encodeURIComponent(reportCard.id)}/comments`, {
      method: "PATCH",
      body: { class_teacher_comment: classTeacherComment, principal_comment: principalComment },
    })));
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    const failed = outcomes.length - succeeded;
    if (succeeded) {
      await onSuccess();
      onNotice(`${succeeded} report card${succeeded === 1 ? "" : "s"} updated${failed ? `; ${failed} failed and can be retried` : ""}.`);
      setOpen(false);
    } else {
      setError("No report-card comments were saved. Check the card state and try again.");
    }
    setSaving(false);
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <form onSubmit={submit}>
        <DialogHeader><DialogTitle>{reportCards.length > 1 ? "Bulk Report-Card Comments" : "Edit Report-Card Comments"}</DialogTitle><DialogDescription>Comments are saved to each selected draft report card and become immutable after publication.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label htmlFor="report-card-class-teacher-comment">Class teacher comment</Label><Textarea id="report-card-class-teacher-comment" maxLength={2000} value={classTeacherComment} onChange={(event) => setClassTeacherComment(event.target.value)} rows={4} /></div>
          <div className="space-y-2"><Label htmlFor="report-card-principal-comment">Principal comment</Label><Textarea id="report-card-principal-comment" maxLength={2000} value={principalComment} onChange={(event) => setPrincipalComment(event.target.value)} rows={4} /></div>
          {error ? <div role="alert" className="text-sm text-destructive">{error}</div> : null}
          {!editableCards.length ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">No editable draft report cards are selected.</div> : null}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !editableCards.length || (!classTeacherComment.trim() && !principalComment.trim())}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Comments</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

export function ReportCardsWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: cardsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<ReportCardRow[]> | ReportCardRow[]>("/exams/report-cards?limit=50");
  const cards = Array.isArray(cardsResponse) ? cardsResponse : cardsResponse?.data;
  const visibleCards = Array.isArray(cards) ? cards : [];

  function cardKey(row: ReportCardRow, index: number) {
    return row.id ?? `${row.student_id}-${row.exam_series_id}-${index}`;
  }

  function previewReport(row: ReportCardRow) {
    openPrintDocument({
      eyebrow: "Report card preview",
      title: `Student ${row.student_id}`,
      subtitle: `Exam series ${row.exam_series_id}`,
      rows: [
        { label: "Class teacher comment", value: row.metadata?.class_teacher_comment || "Not entered" },
        { label: "Principal comment", value: row.metadata?.principal_comment || "Not entered" },
        { label: "Attendance data", value: row.metadata?.report_card?.attendance ? "Included" : "Not included" },
        { label: "Fee balance", value: row.metadata?.report_card?.fee_balance ? "Included" : "Not included" },
        { label: "Snapshot", value: row.report_snapshot_id || "Not generated" },
        { label: "Status", value: row.status || "draft" },
      ],
      footer: "This preview is scoped to the current school and must be approved before parent portal publication.",
    });
    setNotice(`Report preview ready for student ${row.student_id}.`);
  }

  function downloadSingleReport(row: ReportCardRow) {
    if (!row.id) {
      setNotice("Generate and persist this report card before downloading its PDF.");
      return;
    }
    const link = document.createElement("a");
    link.href = `/api/exams/report-cards/${encodeURIComponent(row.id)}/download`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function downloadAllReports(rows: ReportCardRow[]) {
    const downloadable = rows.filter((row) => row.id);
    if (!downloadable.length) {
      setNotice("No generated report-card PDFs are available for download.");
      return;
    }
    downloadable.forEach((row, index) => window.setTimeout(() => downloadSingleReport(row), index * 150));
    setNotice(`${downloadable.length} report-card PDF download${downloadable.length === 1 ? "" : "s"} started.`);
  }

  async function generateReports(rows: ReportCardRow[]) {
    const eligible = rows.filter((row) => !["published", "withdrawn"].includes(row.status ?? ""));
    if (!eligible.length) {
      setNotice("No editable report cards are available for generation.");
      return;
    }
    setSavingAction("generate");
    const outcomes = await Promise.allSettled(eligible.map((row) => requestDashboardApi("/api/exams/report-cards/generate", {
      method: "POST",
      body: { exam_series_id: row.exam_series_id, student_id: row.student_id },
    })));
    await refetch();
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    setNotice(`${succeeded} report card${succeeded === 1 ? "" : "s"} generated${succeeded < eligible.length ? `; ${eligible.length - succeeded} failed and can be retried` : ""}.`);
    setSavingAction(null);
  }

  async function submitReports(rows: ReportCardRow[]) {
    const eligible = rows.filter((row): row is ReportCardRow & { id: string } => Boolean(row.id) && ["draft_generated", "draft", "regeneration_required"].includes(row.status ?? ""));
    if (!eligible.length) {
      setNotice("No generated draft report cards are ready for approval submission.");
      return;
    }
    setSavingAction("submit");
    const outcomes = await Promise.allSettled(eligible.map(({ id: reportCardId }) => requestDashboardApi(`/api/exams/report-cards/${encodeURIComponent(reportCardId)}/transition`, { method: "PATCH", body: { action: "submit" } })));
    await refetch();
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    setNotice(`${succeeded} report card${succeeded === 1 ? "" : "s"} submitted for approval${succeeded < eligible.length ? `; ${eligible.length - succeeded} failed` : ""}.`);
    setSavingAction(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader eyebrow="Outputs" title="Report Cards" description="Generate report cards, manage teacher comments, and compile attendance data." />
        <div className="flex flex-wrap gap-2">
          <ReportCardCommentsDialog reportCards={visibleCards} onSuccess={refetch} onNotice={setNotice}><Button type="button" variant="outline" disabled={!!savingAction}><MessageSquare className="mr-2 h-4 w-4" /> Bulk Comments</Button></ReportCardCommentsDialog>
          <Button variant="outline" onClick={() => downloadAllReports(visibleCards)}><Download className="mr-2 h-4 w-4" /> Download All PDFs</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => void submitReports(visibleCards)}><Send className="mr-2 h-4 w-4" /> Send to Approval</Button>
          <Button disabled={!!savingAction} onClick={() => void generateReports(visibleCards)}>{savingAction === "generate" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Generate Reports</Button>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Exam Series</TableHead><TableHead>Class Teacher Comment</TableHead><TableHead>Principal Comment</TableHead><TableHead>Attendance Data</TableHead><TableHead>Snapshot</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="py-10 text-center"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" /><p className="text-muted-foreground">Loading report cards...</p></TableCell></TableRow> : null}
              {error ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-destructive">Error loading report cards: {error.message}</TableCell></TableRow> : null}
              {!isLoading && !error && !visibleCards.length ? <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground"><p>No report cards generated yet.</p><Button className="mt-4" size="sm" onClick={() => window.location.assign(buildSchoolSectionHref("exams-manager", "results-processing", "public"))}><FileText className="mr-2 h-4 w-4" /> Open Results Processing</Button></TableCell></TableRow> : null}
              {!isLoading && !error && visibleCards.map((row, idx) => (
                <TableRow key={cardKey(row, idx)}>
                  <TableCell className="font-medium">{row.student_id}</TableCell>
                  <TableCell>{row.exam_series_id}</TableCell>
                  <TableCell>{row.metadata?.class_teacher_comment ? "Complete" : "Missing"}</TableCell>
                  <TableCell>{row.metadata?.principal_comment ? "Complete" : "Missing"}</TableCell>
                  <TableCell>{row.metadata?.report_card?.attendance ? "Included" : "Not included"}</TableCell>
                  <TableCell>{row.report_snapshot_id ? "Generated" : "Missing"}</TableCell>
                  <TableCell><Badge variant={row.status === "published" ? "success" : row.status === "under_review" || row.status === "approved" ? "warning" : "secondary"}>{row.status || "draft"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => previewReport(row)}><Eye className="mr-2 h-4 w-4" /> Preview Report</DropdownMenuItem>
                      <ReportCardCommentsDialog reportCards={[row]} onSuccess={refetch} onNotice={setNotice}><DropdownMenuItem asChild><button type="button" disabled={["published", "withdrawn"].includes(row.status ?? "")}><Edit className="mr-2 h-4 w-4" /> Edit Comments</button></DropdownMenuItem></ReportCardCommentsDialog>
                      <DropdownMenuItem disabled={!row.id} onClick={() => downloadSingleReport(row)}><Download className="mr-2 h-4 w-4" /> Download PDF</DropdownMenuItem>
                      <DropdownMenuItem disabled={!row.id || !["draft_generated", "draft", "regeneration_required"].includes(row.status ?? "") || !!savingAction} onClick={() => void submitReports([row])}><Send className="mr-2 h-4 w-4" /> Submit for Approval</DropdownMenuItem>
                    </DropdownMenuContent></DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
