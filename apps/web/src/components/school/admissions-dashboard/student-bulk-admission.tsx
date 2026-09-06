"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import { useActionFeedback } from "@/hooks/use-action-feedback";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

type ImportRecord = {
  row_number: number;
  admission_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  date_of_birth?: string;
  admission_date: string;
  academic_year_id: string;
  curriculum: string;
  grade_level: string;
  class_section_id: string;
  stream_id?: string;
  subject_ids: string[];
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
};

type ImportPreviewRow = {
  row_number: number;
  admission_number: string;
  learner_name: string;
  academic_year: string;
  class_name: string;
  stream_name: string | null;
  guardian_phone: string;
  status: "valid" | "invalid";
  errors: string[];
  record: ImportRecord | null;
};

type ImportPreview = {
  success: boolean;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  rows: ImportPreviewRow[];
};

type ImportCommitResult = {
  success: boolean;
  total_rows: number;
  admitted_rows: number;
  failed_rows: number;
  results: Array<{
    row_number: number;
    admission_number: string;
    status: "admitted" | "failed";
    student_id?: string;
    class_name?: string;
    error?: string;
  }>;
};

type CsvArtifact = {
  filename: string;
  csv: string;
};

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function StudentBulkAdmission({ onCompleted }: { onCompleted: () => Promise<void> | void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportCommitResult | null>(null);
  const [busy, setBusy] = useState<"template" | "preview" | "commit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showFeedback, clearFeedback } = useActionFeedback();

  function reportError(message: string) {
    setError(message);
    showFeedback(message, "danger");
  }

  const tenantId = getCurrentSchoolId() || undefined;

  async function downloadTemplate() {
    setBusy("template");
    setError(null);
    showFeedback("Preparing the admission template...", "loading");
    try {
      const artifact = await requestDashboardApi<CsvArtifact>("/admissions/imports/template", { tenantId });
      downloadText(artifact.filename, artifact.csv);
      showFeedback("Admission template download started.", "success");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Template download failed";
      reportError(message);
    } finally {
      setBusy(null);
    }
  }

  async function validateFile() {
    if (!file) {
      reportError("Choose the completed CSV file before validation.");
      return;
    }

    setBusy("preview");
    setError(null);
    setPreview(null);
    setResult(null);
    showFeedback("Validating the admission file. Please keep this screen open...", "loading");
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      const nextPreview = await requestDashboardApi<ImportPreview>("/admissions/imports", {
        method: "POST",
        tenantId,
        body: formData,
        timeoutMs: 60_000,
      });
      setPreview(nextPreview);
      if (nextPreview.invalid_rows > 0) {
        reportError(`${nextPreview.invalid_rows} row(s) need correction before admission.`);
      } else {
        showFeedback(`${nextPreview.valid_rows} row(s) are ready to admit.`, "success");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "File validation failed";
      reportError(message);
    } finally {
      setBusy(null);
    }
  }

  async function confirmImport() {
    const rows = preview?.rows.map((row) => row.record).filter((row): row is ImportRecord => Boolean(row)) ?? [];
    if (!preview || preview.invalid_rows > 0 || rows.length !== preview.total_rows) {
      reportError("Correct every invalid row and validate the file again before confirming admission.");
      return;
    }

    setBusy("commit");
    setError(null);
    showFeedback("Admitting the validated learners. Please keep this screen open...", "loading");
    try {
      const nextResult = await requestDashboardApi<ImportCommitResult>("/admissions/imports/commit", {
        method: "POST",
        tenantId,
        body: { rows },
        timeoutMs: 120_000,
      });
      setResult(nextResult);
      if (nextResult.failed_rows > 0) {
        reportError(`${nextResult.admitted_rows} admitted; ${nextResult.failed_rows} failed. Review the results.`);
      } else {
        showFeedback(`${nextResult.admitted_rows} students admitted successfully.`, "success");
      }
      try {
        await onCompleted();
      } catch {
        showFeedback(`Import completed: ${nextResult.admitted_rows} admitted, ${nextResult.failed_rows} failed. The student list could not refresh. Review the import results before trying again.`, "warning");
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Bulk admission failed";
      reportError(message);
    } finally {
      setBusy(null);
    }
  }

  function downloadCorrectionReport() {
    const invalidRows = preview?.rows.filter((row) => row.status === "invalid") ?? [];
    const failedRows = result?.results.filter((row) => row.status === "failed") ?? [];
    const rows = invalidRows.length > 0
      ? invalidRows.map((row) => [row.row_number, row.admission_number, row.learner_name, row.errors.join("; ")])
      : failedRows.map((row) => [row.row_number, row.admission_number, "", row.error ?? "Admission failed"]);
    const csv = [
      ["row_number", "admission_number", "learner_name", "errors"],
      ...rows,
    ].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
    downloadText("myshule-admission-import-errors.csv", csv);
  }

  return (
    <div aria-busy={busy !== null} className="mb-6 min-w-0 rounded-xl border border-[#B8D7E8] bg-[#F4FBFF] p-4 [&_button]:min-h-11">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cyan-100 text-[#071D49]">
            <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-black text-[#071D49]">Bulk student admission</h3>
            <p className="mt-1 text-sm text-[#52637A]">Download template, upload, validate, preview, correct, confirm, then review results.</p>
          </div>
        </div>
        <button type="button" disabled={busy !== null} onClick={() => { clearFeedback(); setExpanded((value) => !value); }} className="rounded-lg border border-[#9DB8D1] bg-white px-4 py-2 text-sm font-black text-[#071D49] disabled:opacity-60">
          {expanded ? "Close bulk admission" : "Open bulk admission"}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-[#CFE3EF] pt-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <button type="button" disabled={busy !== null} onClick={() => void downloadTemplate()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#9DB8D1] bg-white px-4 py-2 font-bold text-[#071D49] disabled:opacity-60">
              {busy === "template" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              1. Download template
            </button>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                  setResult(null);
                  setError(null);
                  clearFeedback();
                }}
              />
              <button type="button" disabled={busy !== null} onClick={() => fileInputRef.current?.click()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#9DB8D1] bg-white px-4 py-2 font-bold text-[#071D49] disabled:opacity-60">
                <Upload className="h-4 w-4" />
                <span className="min-w-0 break-all">2. {file ? file.name : "Upload completed CSV"}</span>
              </button>
            </div>
            <button type="button" disabled={busy !== null || !file} onClick={() => void validateFile()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 font-bold text-white disabled:opacity-60">
              {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              3. Validate and preview
            </button>
          </div>

          {error ? <div role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}

          {preview ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
                <span className="rounded-full bg-white px-3 py-1 text-[#071D49]">{preview.total_rows} total</span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">{preview.valid_rows} valid</span>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-800">{preview.invalid_rows} need correction</span>
              </div>
              <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-[#CFE3EF] bg-white">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="sticky top-0 bg-[#EAF5FB] text-[#071D49]">
                    <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Admission no.</th><th className="px-3 py-2">Learner</th><th className="px-3 py-2">Class</th><th className="px-3 py-2">Guardian phone</th><th className="px-3 py-2">Validation</th></tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row) => (
                      <tr key={`${row.row_number}-${row.admission_number}`} className="border-t border-[#E3EDF4] align-top">
                        <td className="px-3 py-2">{row.row_number}</td>
                        <td className="px-3 py-2 font-bold text-[#071D49]">{row.admission_number || "Missing"}</td>
                        <td className="px-3 py-2">{row.learner_name || "Missing"}</td>
                        <td className="px-3 py-2">{[row.class_name, row.stream_name].filter(Boolean).join(" / ") || "Missing"}</td>
                        <td className="px-3 py-2">{row.guardian_phone || "Missing"}</td>
                        <td className={`px-3 py-2 font-bold ${row.status === "valid" ? "text-emerald-700" : "text-rose-700"}`}>
                          {row.status === "valid" ? "Ready" : row.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {preview.invalid_rows > 0 ? (
                  <>
                    <button type="button" onClick={downloadCorrectionReport} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-bold text-rose-700"><Download className="h-4 w-4" /> Download errors</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white">4. Upload corrected file</button>
                  </>
                ) : (
                  <button type="button" disabled={busy !== null || preview.valid_rows === 0} onClick={() => void confirmImport()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:opacity-60">
                    {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    4. Confirm {preview.valid_rows} admission(s)
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {result ? (
            <div role="status" className={`mt-4 rounded-lg border p-4 ${result.failed_rows === 0 ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-2 font-black text-[#071D49]">
                {result.failed_rows === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <XCircle className="h-5 w-5 text-amber-700" />}
                Import results: {result.admitted_rows} admitted, {result.failed_rows} failed
              </div>
              {result.failed_rows > 0 ? <button type="button" onClick={downloadCorrectionReport} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-800"><Download className="h-4 w-4" /> Download failed rows</button> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
