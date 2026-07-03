"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Upload, CheckCircle, Save, Edit, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";

interface MarkEntryRow {
  id?: string;
  exam_series_id?: string | null;
  class_section_id?: string | null;
  subject_id?: string | null;
  assessment_id?: string | null;
  academic_term_id?: string | null;
  student_id?: string | null;
  score?: number | string | null;
  remarks?: string | null;
  status?: string | null;
  updated_at?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

export function MyMarksWorkspace({ model }: { model: unknown }) {
  void model;
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: marksResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<MarkEntryRow[]> | MarkEntryRow[]>("/exams/marks");
  const marks = Array.isArray(marksResponse) ? marksResponse : marksResponse?.data;
  const visibleMarks = Array.isArray(marks) ? marks : [];
  const routeTo = (workspace: string) => router.push(`/school/exams-manager/${workspace}`);

  function markKey(row: MarkEntryRow, index: number) {
    return row.id ?? `${row.exam_series_id ?? "series"}-${row.assessment_id ?? "assessment"}-${row.student_id ?? "student"}-${index}`;
  }

  function downloadTemplate(rows: MarkEntryRow[], label = "marks-template") {
    downloadCsvFile({
      filename: `${label}-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["exam_series_id", "assessment_id", "academic_term_id", "class_section_id", "subject_id", "student_id", "score", "remarks"],
      rows: rows.length
        ? rows.map((row) => [
            row.exam_series_id ?? "",
            row.assessment_id ?? "",
            row.academic_term_id ?? "",
            row.class_section_id ?? "",
            row.subject_id ?? "",
            row.student_id ?? "",
            String(row.score ?? ""),
            row.remarks ?? "",
          ])
        : [["", "", "", "", "", "", "", ""]],
    });
    setNotice(`Marks template downloaded for ${rows.length || 1} row${rows.length === 1 ? "" : "s"}.`);
  }

  function canPersistMark(row: MarkEntryRow): row is MarkEntryRow & {
    exam_series_id: string;
    assessment_id: string;
    academic_term_id: string;
    class_section_id: string;
    subject_id: string;
    student_id: string;
  } {
    return Boolean(row.exam_series_id && row.assessment_id && row.academic_term_id && row.class_section_id && row.subject_id && row.student_id && row.score !== null && row.score !== undefined);
  }

  async function saveDraftRows(rows: MarkEntryRow[]) {
    const persistable = rows.filter(canPersistMark);
    if (!persistable.length) {
      setNotice("No complete mark rows are available to save.");
      return;
    }
    setSavingAction("save-draft");
    try {
      const outcomes = await Promise.allSettled(persistable.map((row) => requestDashboardApi("/api/exams/marks", {
        method: "POST",
        body: {
          exam_series_id: row.exam_series_id,
          assessment_id: row.assessment_id,
          academic_term_id: row.academic_term_id,
          class_section_id: row.class_section_id,
          subject_id: row.subject_id,
          student_id: row.student_id,
          score: Number(row.score),
        },
      })));
      await refetch();
      const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
      setNotice(`${succeeded} mark row${succeeded === 1 ? "" : "s"} saved${succeeded < persistable.length ? `; ${persistable.length - succeeded} failed and can be retried` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save marks.");
    } finally {
      setSavingAction(null);
    }
  }

  async function submitRows(rows: MarkEntryRow[]) {
    const markIds = rows.map((row) => row.id).filter((id): id is string => Boolean(id));
    if (!markIds.length) {
      setNotice("Save mark rows before submitting them for review.");
      return;
    }
    setSavingAction("submit-marks");
    try {
      const result = await requestDashboardApi<{ data?: { submitted_count?: number } }>("/api/exams/marks/submit", {
        method: "POST",
        body: { mark_ids: markIds },
      });
      await refetch();
      const submittedCount = Number(result.data?.submitted_count ?? 0);
      setNotice(`${submittedCount} mark row${submittedCount === 1 ? "" : "s"} submitted for review.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not submit marks.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Grading"
          title="My Marks Entry"
          description="Enter and submit marks for your assigned teaching subjects."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => downloadTemplate(visibleMarks, "my-marks-template")}><Download className="mr-2 h-4 w-4" /> Template</Button>
          <Button variant="outline" onClick={() => routeTo("imports-templates")}><Upload className="mr-2 h-4 w-4" /> Upload</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => void saveDraftRows(visibleMarks)}>{savingAction === "save-draft" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Draft</Button>
          <Button disabled={!!savingAction} onClick={() => void submitRows(visibleMarks)}>{savingAction === "submit-marks" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />} Submit Marks</Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Paper</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading marks...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-destructive">
                    Error loading marks: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!marks || !Array.isArray(marks) || marks.length === 0) && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No marks entry records found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(marks) && marks.map((row, idx) => {
                const key = markKey(row, idx);
                const status = row.status ?? "draft";
                return (
                  <TableRow key={key}>
                    <TableCell>Series: {row.exam_series_id}</TableCell>
                    <TableCell>Class: {row.class_section_id}</TableCell>
                    <TableCell className="font-medium">Subject: {row.subject_id}</TableCell>
                    <TableCell>Assessment: {row.assessment_id}</TableCell>
                    <TableCell>Student: {row.student_id}</TableCell>
                    <TableCell>{row.score ?? "-"}</TableCell>
                    <TableCell>{row.status === "submitted" ? row.score : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={status === "submitted" || status === "published" ? "success" : "secondary"}>{status}</Badge>
                    </TableCell>
                    <TableCell>{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push("/school/teacher/marks-entry")}><Edit className="mr-2 h-4 w-4" /> Open Mark Sheet</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void saveDraftRows([row])}><Save className="mr-2 h-4 w-4" /> Save This Row</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => void submitRows([row])}><CheckCircle className="mr-2 h-4 w-4" /> Submit This Row</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => downloadTemplate([row], `marks-template-${row.assessment_id ?? "assessment"}`)}><Download className="mr-2 h-4 w-4" /> Download Template</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => routeTo("imports-templates")}><Upload className="mr-2 h-4 w-4" /> Upload Marks</DropdownMenuItem>
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
