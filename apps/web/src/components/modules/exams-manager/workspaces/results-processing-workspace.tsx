"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlayCircle, BarChart, RotateCcw, FileSpreadsheet, Activity, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";

interface ProcessingBatchRow {
  id?: string;
  exam_series_id: string;
  class_section_id?: string | null;
  total_students?: number;
  completed_students?: number;
  failed_students?: number;
  status?: string;
  processing_mode?: "aggregates" | "rankings" | null;
  processed_at?: string | null;
  snapshot_count?: number;
  ranked_count?: number;
}

interface ApiResponse<T> {
  data?: T;
}

interface BroadsheetRow {
  student_id: string;
  admission_number: string;
  student_name: string;
  raw_total: number;
  assessment_count: number;
  average_percentage: number;
  grade_label?: string | null;
  class_rank?: number | null;
}

interface BroadsheetResponse {
  exam_series_name: string;
  rows: BroadsheetRow[];
}

export function ResultsProcessingWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: batchesResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<ProcessingBatchRow[]> | ProcessingBatchRow[]>("/exams/report-card-batches");
  const batches = Array.isArray(batchesResponse) ? batchesResponse : batchesResponse?.data;

  function batchKey(row: ProcessingBatchRow, index: number) {
    return row.id ?? `${row.exam_series_id}-${row.class_section_id ?? "all"}-${index}`;
  }

  async function exportBroadsheet(batchId: string) {
    setSavingAction(`broadsheet-${batchId}`);
    try {
      const result = await requestDashboardApi<{ success: boolean; data: BroadsheetResponse }>(`/api/exams/results-processing/${encodeURIComponent(batchId)}/broadsheet`);
      const rows = result.data.rows;
      if (!rows.length) {
        setNotice("No processed result snapshots are available. Run the processing engine before exporting the broadsheet.");
        return;
      }
      downloadCsvFile({
        filename: `${result.data.exam_series_name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-broadsheet.csv`,
        headers: ["Admission number", "Student", "Raw total", "Assessments", "Average %", "Grade", "Class rank"],
        rows: rows.map((row) => [row.admission_number, row.student_name, String(row.raw_total), String(row.assessment_count), String(row.average_percentage), row.grade_label ?? "", row.class_rank ? String(row.class_rank) : ""]),
      });
      setNotice(`Broadsheet downloaded with ${rows.length} student result${rows.length === 1 ? "" : "s"}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not export the results broadsheet.");
    } finally {
      setSavingAction(null);
    }
  }

  async function exportAllBroadsheets(rows: ProcessingBatchRow[]) {
    const persisted = rows.filter((row): row is ProcessingBatchRow & { id: string } => Boolean(row.id));
    if (!persisted.length) {
      setNotice("No persisted result batch is available for broadsheet export.");
      return;
    }
    for (const row of persisted) {
      await exportBroadsheet(row.id);
    }
  }

  async function runProcessing(batchId: string, mode: "aggregates" | "rankings") {
    setSavingAction(`${mode}-${batchId}`);
    try {
      const result = await requestDashboardApi<{ success: boolean; data: { aggregate_count: number; ranked_count: number } }>(`/api/exams/results-processing/${encodeURIComponent(batchId)}/run`, {
        method: "POST",
        body: { mode },
      });
      await refetch();
      setNotice(`${result.data.aggregate_count} result snapshot${result.data.aggregate_count === 1 ? "" : "s"} computed${mode === "rankings" ? `; ${result.data.ranked_count} ranked` : ""}.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not process exam results.");
    } finally {
      setSavingAction(null);
    }
  }

  async function clearProcessing(batchId: string) {
    setSavingAction(`clear-${batchId}`);
    try {
      const result = await requestDashboardApi<{ success: boolean; data: { removed_count: number } }>(`/api/exams/results-processing/${encodeURIComponent(batchId)}/clear`, { method: "POST" });
      await refetch();
      setNotice(`${result.data.removed_count} persisted result snapshot${result.data.removed_count === 1 ? "" : "s"} cleared.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not clear processed exam results.");
    } finally {
      setSavingAction(null);
    }
  }

  async function runAll(mode: "rankings" | "clear") {
    const batchIds = (Array.isArray(batches) ? batches : []).map((row) => row.id).filter((id): id is string => Boolean(id));
    if (!batchIds.length) {
      setNotice("Create a report-card batch before processing results.");
      return;
    }
    setSavingAction(`${mode}-all`);
    const outcomes = await Promise.allSettled(batchIds.map((batchId) => mode === "clear"
      ? requestDashboardApi(`/api/exams/results-processing/${encodeURIComponent(batchId)}/clear`, { method: "POST" })
      : requestDashboardApi(`/api/exams/results-processing/${encodeURIComponent(batchId)}/run`, { method: "POST", body: { mode: "rankings" } })));
    await refetch();
    const succeeded = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
    const failed = outcomes.length - succeeded;
    setNotice(`${succeeded} batch${succeeded === 1 ? "" : "es"} ${mode === "clear" ? "cleared" : "processed"}${failed ? `; ${failed} failed and can be retried` : ""}.`);
    setSavingAction(null);
  }

  function exportBatchSummary(rows: ProcessingBatchRow[] = []) {
    downloadCsvFile({
      filename: `exam-processing-summary-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Exam series", "Class", "Total students", "Graded", "Missing marks", "Status"],
      rows: rows.map((row) => [
        row.exam_series_id,
        row.class_section_id || "All Classes",
        String(row.total_students ?? 0),
        String(row.completed_students ?? 0),
        String(row.failed_students ?? 0),
        row.status || "pending",
      ]),
    });
    setNotice(`Processing summary exported with ${rows.length} batch${rows.length === 1 ? "" : "es"}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Processing"
          title="Results Processing"
          description="Compute aggregates, assign grades, and generate student rankings."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void runAll("clear")}><RotateCcw className="mr-2 h-4 w-4" /> Clear Cache</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => void exportAllBroadsheets(Array.isArray(batches) ? batches : [])}><FileSpreadsheet className="mr-2 h-4 w-4" /> View Broadsheet</Button>
          <Button variant="outline" onClick={() => exportBatchSummary(Array.isArray(batches) ? batches : [])}><FileSpreadsheet className="mr-2 h-4 w-4" /> Batch Summary</Button>
          <Button disabled={!!savingAction} onClick={() => void runAll("rankings")}><PlayCircle className="mr-2 h-4 w-4" /> Run Processing Engine</Button>
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
                <TableHead>Total Students</TableHead>
                <TableHead className="text-success">Graded</TableHead>
                <TableHead className="text-destructive">Missing Marks</TableHead>
                <TableHead>Processing Status</TableHead>
                <TableHead>Ranking Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading processing batches...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading batches: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!batches || !Array.isArray(batches) || batches.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No results processing batches found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(batches) && batches.map((row, idx) => (
                <TableRow key={batchKey(row, idx)}>
                  <TableCell className="font-medium">Series: {row.exam_series_id}</TableCell>
                  <TableCell>{row.class_section_id || 'All Classes'}</TableCell>
                  <TableCell>{row.total_students}</TableCell>
                  <TableCell className="text-success">{row.completed_students}</TableCell>
                  <TableCell className="text-destructive">{row.failed_students}</TableCell>
                  <TableCell>
                    <Badge variant={row.processed_at ? 'success' : 'secondary'}>{row.processed_at ? "processed" : row.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.processing_mode === "rankings" ? "success" : "outline"}>{row.processing_mode === "rankings" ? `${row.ranked_count ?? 0} ranked` : "Pending"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!row.id || !!savingAction} onClick={() => row.id && void runProcessing(row.id, "aggregates")}><Activity className="mr-2 h-4 w-4" /> Compute Aggregates</DropdownMenuItem>
                        <DropdownMenuItem disabled={!row.id || !!savingAction} onClick={() => row.id && void runProcessing(row.id, "rankings")}><BarChart className="mr-2 h-4 w-4" /> Compute Rankings</DropdownMenuItem>
                        <DropdownMenuItem disabled={!row.id || !!savingAction} onClick={() => row.id && void exportBroadsheet(row.id)}><FileSpreadsheet className="mr-2 h-4 w-4" /> View Broadsheet</DropdownMenuItem>
                        <DropdownMenuItem disabled={!row.id || !!savingAction} onClick={() => row.id && void clearProcessing(row.id)}><RotateCcw className="mr-2 h-4 w-4" /> Clear Results Cache</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
