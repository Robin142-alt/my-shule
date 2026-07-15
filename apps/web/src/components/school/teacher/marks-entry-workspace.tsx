"use client";

import { useMemo, useState } from "react";
import { Check, Download, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type MarkRow = {
  id?: string;
  mark_entry_window_id?: string | null;
  exam_series_id?: string | null;
  exam_series_name?: string | null;
  assessment_id?: string | null;
  assessment_name?: string | null;
  academic_term_id?: string | null;
  class_section_id?: string | null;
  class_name?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  student_id?: string | null;
  admission_number?: string | null;
  student_name?: string | null;
  score?: number | string | null;
  max_score?: number | string | null;
  remarks?: string | null;
  status?: string | null;
  updated_at?: string | null;
  closes_at?: string | null;
};

type ApiResponse<T> = T | { data?: T };
const LOCKED_MARK_STATUSES = new Set(["submitted", "reviewed", "locked", "published"]);

function unwrapRows(payload: ApiResponse<MarkRow[]> | undefined): MarkRow[] {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}

function getMaxScore(row: MarkRow) {
  const score = Number(row.max_score);
  return Number.isFinite(score) && score > 0 ? score : 100;
}

function isEditableMark(row: MarkRow) {
  return !LOCKED_MARK_STATUSES.has((row.status ?? "draft").toLowerCase());
}

function canPersistMark(row: MarkRow, score: string): row is MarkRow & {
  exam_series_id: string;
  assessment_id: string;
  academic_term_id: string;
  class_section_id: string;
  subject_id: string;
  student_id: string;
} {
  const numericScore = Number(score);
  return Boolean(
    row.exam_series_id &&
      row.assessment_id &&
      row.academic_term_id &&
      row.class_section_id &&
      row.subject_id &&
      row.student_id &&
      score !== "" &&
      Number.isFinite(numericScore) &&
      numericScore >= 0 &&
      numericScore <= getMaxScore(row) &&
      isEditableMark(row),
  );
}

function rowKey(row: MarkRow, index: number) {
  return row.id ?? `${row.exam_series_id ?? "series"}-${row.assessment_id ?? "assessment"}-${row.student_id ?? "student"}-${index}`;
}

export function MarksEntryWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<ApiResponse<MarkRow[]>>("/api/exams/marks");
  const rows = useMemo(() => unwrapRows(data), [data]);
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleMarkChange(row: MarkRow, key: string, value: string) {
    const numericScore = Number(value);
    if (value === "" || (Number.isFinite(numericScore) && numericScore >= 0 && numericScore <= getMaxScore(row))) {
      setDraftScores((current) => ({ ...current, [key]: value }));
    }
  }

  function getScore(row: MarkRow, key: string) {
    return draftScores[key] ?? (row.score === null || row.score === undefined ? "" : String(row.score));
  }

  function getGrade(scoreValue: string) {
    if (!scoreValue) return "-";
    const score = Number(scoreValue);
    if (score >= 80) return "A";
    if (score >= 70) return "B";
    if (score >= 60) return "C";
    if (score >= 50) return "D";
    return "E";
  }

  async function handleSaveAll() {
    const changedRows = rows
      .map((row, index) => ({ row, key: rowKey(row, index), score: getScore(row, rowKey(row, index)) }))
      .filter(({ row, score }) => canPersistMark(row, score));

    if (!changedRows.length) {
      toast.error("No editable complete mark rows are available to save.");
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await Promise.allSettled(
        changedRows.map(({ row, score }) =>
          requestDashboardApi("/api/exams/marks", {
            method: "POST",
            body: {
              exam_series_id: row.exam_series_id,
              assessment_id: row.assessment_id,
              academic_term_id: row.academic_term_id,
              class_section_id: row.class_section_id,
              subject_id: row.subject_id,
              student_id: row.student_id,
              score: Number(score),
              remarks: row.remarks ?? undefined,
            },
          }),
        ),
      );
      const saved = results.filter((result) => result.status === "fulfilled").length;
      const failed = results.length - saved;
      await refetch();
      toast.success(`${saved} mark row${saved === 1 ? "" : "s"} saved${failed ? `; ${failed} failed and can be retried` : ""}.`);
    } catch (error: any) {
      toast.error(error?.message || "Could not save marks.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function exportMarksTemplate() {
    downloadCsvFile({
      filename: `marks-entry-template-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["exam_series_id", "assessment_id", "academic_term_id", "class_section_id", "subject_id", "student_id", "score", "remarks"],
      rows: rows.length
        ? rows.map((row, index) => [
            row.exam_series_id ?? "",
            row.assessment_id ?? "",
            row.academic_term_id ?? "",
            row.class_section_id ?? "",
            row.subject_id ?? "",
            row.student_id ?? "",
            getScore(row, rowKey(row, index)),
            row.remarks ?? "",
          ])
        : [["", "", "", "", "", "", "", ""]],
    });
    toast.success("Marks entry template downloaded.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Marks Entry</h2>
          <p className="mt-1 text-sm text-slate-500">Enter and save scores for assessment rows already assigned to your teaching workload.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={exportMarksTemplate} disabled={isLoading}>
            <Download className="h-4 w-4" /> Export Template
          </Button>
          <Button className="gap-2" onClick={handleSaveAll} disabled={isSubmitting || isLoading || rows.length === 0}>
            <Save className="h-4 w-4" /> {isSubmitting ? "Saving..." : "Save Marks"}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-16 px-4 py-3 text-center font-medium">#</th>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Assessment</th>
                <th className="w-32 px-4 py-3 text-center font-medium">Score</th>
                <th className="w-24 px-4 py-3 text-center font-medium">Grade</th>
                <th className="w-28 px-4 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading mark rows...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No open mark-entry rows are assigned to your workload. The Exams Manager must create an assessment, confirm teacher allocation, and open the mark-entry window.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const key = rowKey(row, index);
                  const score = getScore(row, key);
                  const status = row.status ?? "draft";
                  const saved = status !== "draft";
                  const editable = isEditableMark(row);
                  const maxScore = getMaxScore(row);

                  return (
                    <tr key={key} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-center text-slate-400">{index + 1}</td>
                      <td className="px-4 py-2 font-medium text-slate-900">
                        {row.student_name || row.admission_number || row.student_id || "Student"}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        <div className="font-medium text-slate-700">{row.assessment_name || row.exam_series_name || row.assessment_id || "Assessment"}</div>
                        <div className="text-xs text-slate-400">{row.subject_name || row.subject_id || "Subject"} {row.class_name ? `- ${row.class_name}` : ""}</div>
                        {row.closes_at ? <div className="text-xs text-slate-400">Due {new Date(row.closes_at).toLocaleDateString()}</div> : null}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={maxScore}
                          className="h-8 w-full rounded border border-slate-200 text-center font-medium text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          value={score}
                          disabled={!editable}
                          aria-label={`Score out of ${maxScore}`}
                          onChange={(event) => handleMarkChange(row, key, event.target.value)}
                        />
                        <div className="mt-1 text-center text-[11px] text-slate-400">/{maxScore}</div>
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-slate-700">{getGrade(score)}</td>
                      <td className="px-4 py-2 text-center">
                        {saved ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                            <Check className="h-4 w-4" /> {status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Draft</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
