"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Download, Upload, CheckCircle, FileSpreadsheet, RotateCcw, AlertTriangle, Eye, Loader2, XCircle } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { EXAM_SCORE_STATUSES, type ExamScoreStatus } from "@/lib/modules/exams-client";

const MARK_HEADERS = [
  "exam_series_id",
  "assessment_id",
  "academic_term_id",
  "class_section_id",
  "subject_id",
  "student_id",
  "score",
  "score_status",
  "remarks",
] as const;

interface MarkUploadRow {
  row_number: number;
  exam_series_id: string;
  assessment_id: string;
  academic_term_id: string;
  class_section_id: string;
  subject_id: string;
  student_id: string;
  score: number | null;
  score_status: ExamScoreStatus;
  remarks?: string;
}

interface MarkUploadPreview {
  mode: "preview" | "commit";
  batch_id?: string | null;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  committed_rows: number;
  preview_token: string;
  row_results: Array<{ row_number: number; status: string; errors: string[]; student_id?: string | null }>;
}

interface ImportBatchRow {
  id: string;
  file_name: string;
  status: "imported" | "rolled_back" | "failed";
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  committed_rows: number;
  imported_by_user_id?: string | null;
  imported_at: string;
  rolled_back_at?: string | null;
  rollback_reason?: string | null;
}

interface ImportBatchDetail extends ImportBatchRow {
  source_rows: MarkUploadRow[];
}

interface ApiResponse<T> {
  data?: T;
}

function responseData<T>(response: ApiResponse<T> | T): T {
  return response && typeof response === "object" && "data" in response
    ? (response as ApiResponse<T>).data as T
    : response as T;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function parseMarksCsv(content: string): MarkUploadRow[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV must include a header and at least one mark row.");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const missing = MARK_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}.`);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const value = (header: typeof MARK_HEADERS[number]) => values[headers.indexOf(header)] ?? "";
    const rowNumber = index + 2;
    const scoreStatus = value("score_status").trim().toLowerCase();
    if (!EXAM_SCORE_STATUSES.includes(scoreStatus as ExamScoreStatus)) {
      throw new Error(
        `Row ${rowNumber}: score_status must be one of ${EXAM_SCORE_STATUSES.join(", ")}.`,
      );
    }

    const scoreText = value("score").trim();
    let score: number | null = null;
    if (scoreStatus === "entered") {
      if (!scoreText) {
        throw new Error(`Row ${rowNumber}: score is required when score_status is entered.`);
      }
      score = Number(scoreText);
      if (!Number.isFinite(score) || score < 0) {
        throw new Error(`Row ${rowNumber}: score must be a non-negative number.`);
      }
    } else if (scoreText) {
      throw new Error(
        `Row ${rowNumber}: score must be blank when score_status is ${scoreStatus.replaceAll("_", " ")}.`,
      );
    }

    return {
      row_number: rowNumber,
      exam_series_id: value("exam_series_id"),
      assessment_id: value("assessment_id"),
      academic_term_id: value("academic_term_id"),
      class_section_id: value("class_section_id"),
      subject_id: value("subject_id"),
      student_id: value("student_id"),
      score,
      score_status: scoreStatus as ExamScoreStatus,
      remarks: value("remarks") || undefined,
    };
  });
}

export function ImportsTemplatesWorkspace({ model }: { model: unknown }) {
  void model;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [pendingRows, setPendingRows] = useState<MarkUploadRow[]>([]);
  const [preview, setPreview] = useState<MarkUploadPreview | null>(null);
  const [rollbackBatch, setRollbackBatch] = useState<ImportBatchRow | null>(null);
  const [rollbackReason, setRollbackReason] = useState("");
  const { data: batchesResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<ImportBatchRow[]> | ImportBatchRow[]>("/exams/marks/import-batches");
  const batches = Array.isArray(batchesResponse) ? batchesResponse : batchesResponse?.data ?? [];

  const templates = [
    { label: "Marks Template", desc: "Preview and import raw marks", filename: "marks-template.csv", headers: [...MARK_HEADERS] },
    { label: "Attendance Template", desc: "Use in Exam Attendance", filename: "exam-attendance-template.csv", headers: ["timetable_slot_id", "student_id", "status", "remarks"] },
    { label: "Paper Components", desc: "Use in Papers & Components", filename: "paper-components-template.csv", headers: ["assessment_id", "component_code", "component_name", "max_score", "weight"] },
    { label: "Report Comments", desc: "Use in Report Cards", filename: "report-comments-template.csv", headers: ["report_card_id", "teacher_comment", "principal_comment"] },
  ];

  function downloadTemplate(template: typeof templates[number]) {
    downloadCsvFile({ filename: template.filename, headers: template.headers, rows: [template.headers.map(() => "")] });
    setNotice(`${template.label} downloaded.`);
  }

  function downloadAllTemplates() {
    templates.forEach(downloadTemplate);
    setNotice(`Downloaded ${templates.length} exam workflow templates.`);
  }

  async function handleSelectedFile(file: File | null | undefined) {
    if (!file) return;
    setSavingAction("preview");
    setNotice(null);
    try {
      const rows = parseMarksCsv(await file.text());
      const result = responseData(await requestDashboardApi("/api/exams/marks/bulk-upload", {
        method: "POST",
        body: { mode: "preview", file_name: file.name, rows },
      })) as MarkUploadPreview;
      setPendingFileName(file.name);
      setPendingRows(rows);
      setPreview(result);
      setNotice(`${file.name} validated: ${result.valid_rows} valid, ${result.invalid_rows} invalid, ${result.duplicate_rows} duplicate.`);
    } catch (error) {
      setPendingFileName("");
      setPendingRows([]);
      setPreview(null);
      setNotice(error instanceof Error ? error.message : "Could not validate the marks CSV.");
    } finally {
      setSavingAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function commitImport() {
    if (!preview?.preview_token || pendingRows.length === 0) return;
    setSavingAction("commit");
    try {
      const result = responseData(await requestDashboardApi("/api/exams/marks/bulk-upload", {
        method: "POST",
        body: { mode: "commit", preview_token: preview.preview_token, file_name: pendingFileName, rows: pendingRows },
      })) as MarkUploadPreview;
      setNotice(`${result.committed_rows} mark row(s) imported in batch ${result.batch_id}.`);
      setPreview(null);
      setPendingRows([]);
      setPendingFileName("");
      await refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not commit the mark import.");
    } finally {
      setSavingAction(null);
    }
  }

  async function loadBatchDetail(row: ImportBatchRow): Promise<ImportBatchDetail> {
    const response = await requestDashboardApi(`/api/exams/marks/import-batches/${encodeURIComponent(row.id)}`);
    return responseData(response) as ImportBatchDetail;
  }

  async function previewImportDetails(row: ImportBatchRow) {
    setSavingAction(`detail:${row.id}`);
    try {
      const detail = await loadBatchDetail(row);
      openPrintDocument({
        eyebrow: "Exam mark import",
        title: detail.file_name,
        subtitle: detail.status.replaceAll("_", " "),
        rows: [
          { label: "Found rows", value: String(detail.total_rows) },
          { label: "Valid rows", value: String(detail.valid_rows) },
          { label: "Failed rows", value: String(detail.invalid_rows) },
          { label: "Duplicate rows", value: String(detail.duplicate_rows) },
          { label: "Committed rows", value: String(detail.committed_rows) },
          { label: "Imported at", value: new Date(detail.imported_at).toLocaleString() },
          { label: "Rollback reason", value: detail.rollback_reason || "-" },
        ],
        footer: `Batch ${detail.id} is scoped to the current school.`,
      });
      setNotice(`${detail.file_name} details opened.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load import details.");
    } finally {
      setSavingAction(null);
    }
  }

  async function downloadOriginal(row: ImportBatchRow) {
    setSavingAction(`download:${row.id}`);
    try {
      const detail = await loadBatchDetail(row);
      downloadCsvFile({
        filename: detail.file_name,
        headers: [...MARK_HEADERS],
        rows: detail.source_rows.map((source) => MARK_HEADERS.map((header) => String(source[header] ?? ""))),
      });
      setNotice(`${detail.file_name} downloaded from the persisted import batch.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not download the imported rows.");
    } finally {
      setSavingAction(null);
    }
  }

  async function confirmRollback() {
    if (!rollbackBatch) return;
    if (rollbackReason.trim().length < 10) {
      setNotice("Enter a rollback reason of at least 10 characters.");
      return;
    }
    setSavingAction(`rollback:${rollbackBatch.id}`);
    try {
      await requestDashboardApi(`/api/exams/marks/import-batches/${encodeURIComponent(rollbackBatch.id)}/rollback`, {
        method: "POST",
        body: { reason: rollbackReason.trim() },
      });
      setNotice(`${rollbackBatch.file_name} rolled back. Prior mark values were restored and new imported rows were removed.`);
      setRollbackBatch(null);
      setRollbackReason("");
      await refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not roll back the mark import.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader eyebrow="Data Management" title="Imports & Templates" description="Preview, validate, import, audit, and safely roll back exam mark batches." />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadAllTemplates}><Download className="mr-2 h-4 w-4" /> Download Templates</Button>
          <Button disabled={Boolean(savingAction)} onClick={() => fileInputRef.current?.click()}>
            {savingAction === "preview" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Marks CSV
          </Button>
          <input ref={fileInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void handleSelectedFile(event.target.files?.[0])} />
        </div>
      </div>

      {notice ? <div role="status" className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {templates.map((template) => (
          <Card key={template.filename} className="flex min-h-32 flex-col justify-between p-5">
            <div><p className="flex items-center gap-2 font-medium"><FileSpreadsheet className="h-4 w-4 text-muted-foreground" />{template.label}</p><p className="mt-1 text-sm text-muted-foreground">{template.desc}</p></div>
            <Button variant="ghost" size="sm" className="-ml-3 w-fit text-primary" onClick={() => downloadTemplate(template)}>Download</Button>
          </Card>
        ))}
      </section>

      {preview ? (
        <Card className="p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h3 className="font-semibold">Import preview: {pendingFileName}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Review validation results before committing any marks.</p>
            </div>
            <Button disabled={Boolean(savingAction) || preview.valid_rows === 0 || preview.invalid_rows > 0 || preview.duplicate_rows > 0} onClick={() => void commitImport()}>
              {savingAction === "commit" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Import Valid Rows
            </Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Found</p><p className="text-xl font-semibold">{preview.total_rows}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Valid</p><p className="text-xl font-semibold text-success">{preview.valid_rows}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Invalid</p><p className="text-xl font-semibold text-destructive">{preview.invalid_rows}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Duplicates</p><p className="text-xl font-semibold text-amber-700">{preview.duplicate_rows}</p></div>
          </div>
          {preview.row_results.some((row) => row.errors.length > 0) ? (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-md border border-destructive/30 p-3">
              {preview.row_results.filter((row) => row.errors.length > 0).map((row) => <p key={row.row_number} className="text-sm text-destructive"><XCircle className="mr-1 inline h-4 w-4" />Row {row.row_number}: {row.errors.join("; ")}</p>)}
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="border-b p-5"><h3 className="text-lg font-semibold">Mark Import History</h3></div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>File name</TableHead><TableHead>Imported by</TableHead><TableHead className="text-center">Found</TableHead><TableHead className="text-center">Committed</TableHead><TableHead>Status</TableHead><TableHead>Imported at</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />Loading import history...</TableCell></TableRow> : null}
              {error ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-destructive">Error loading imports: {error.message}</TableCell></TableRow> : null}
              {!isLoading && !error && batches.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No mark imports yet. Upload a marks CSV to preview the first batch.</TableCell></TableRow> : null}
              {!isLoading && !error ? batches.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.file_name}</TableCell>
                  <TableCell>{row.imported_by_user_id || "Unknown user"}</TableCell>
                  <TableCell className="text-center">{row.total_rows}</TableCell>
                  <TableCell className="text-center">{row.committed_rows}</TableCell>
                  <TableCell><Badge variant={row.status === "imported" ? "success" : "outline"}>{row.status.replaceAll("_", " ")}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(row.imported_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${row.file_name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={Boolean(savingAction)} onClick={() => void previewImportDetails(row)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem disabled={Boolean(savingAction)} onClick={() => void downloadOriginal(row)}><Download className="mr-2 h-4 w-4" /> Download Original</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" disabled={row.status !== "imported" || Boolean(savingAction)} onClick={() => { setRollbackBatch(row); setRollbackReason(""); }}><RotateCcw className="mr-2 h-4 w-4" /> Rollback</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={Boolean(rollbackBatch)} onOpenChange={(open) => { if (!open) setRollbackBatch(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Roll back mark import</DialogTitle><DialogDescription>This restores marks that existed before the import and removes marks created by it. The operation stops if any imported mark changed afterward.</DialogDescription></DialogHeader>
          <div className="space-y-2 py-4"><Label htmlFor="rollback-reason">Reason</Label><Textarea id="rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} placeholder="Explain why this import must be reversed" /></div>
          <DialogFooter><Button variant="outline" onClick={() => setRollbackBatch(null)}>Cancel</Button><Button variant="destructive" disabled={Boolean(savingAction) || rollbackReason.trim().length < 10} onClick={() => void confirmRollback()}>{savingAction?.startsWith("rollback:") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}Confirm rollback</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
