"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileDown,
  FileSpreadsheet,
  History,
  LockKeyhole,
  Search,
  ShieldCheck,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import {
  ReportCardActionBar,
  ReportCardDocument,
  ReportCardVerificationStrip,
} from "@/components/report-cards/report-card-document";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import {
  downloadCsvFile,
  openPrintDocument,
} from "@/lib/dashboard/export";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import type { StatusTone } from "@/lib/dashboard/types";
import {
  buildExamsModuleData,
  calculateMarksSummary,
  resolveExamsAccessPolicy,
  validateExamScore,
  type ApprovalStep,
  type CbcCompetencyRow,
  type ExamAnalysisItem,
  type ExamAllocationRow,
  type ExamAuditEntry,
  type ExamMarkRow,
  type ExamsAccessPolicy,
  type ExamsModuleData,
  type ExamsModuleDataSeed,
  type ExamPublishingItem,
  type ExamScoreField,
  type ExamScoreFieldId,
  type ExamSetupItem,
  type HistoricalResult,
} from "@/lib/modules/exams-data";
import {
  bulkUploadExamMarksLive,
  enterExamMarkLive,
  fetchExamsWorkspaceLive,
  fetchReportCardBatchStatusLive,
  generateReportCardBatchLive,
  generateReportCardLive,
  lockExamMarkSheetLive,
  mapLiveReportCardToPreview,
  publishLiveExamSeries,
  publishReportCardLive,
  transitionLiveReportCard,
  fetchExamsAnalyticsLive,
  type ExamMarkSheetView,
  type ExamReportCardPreview,
  type ExamsLiveWorkspace,
  type LiveReportCardBatchStatus,
  type LiveExamsAnalyticsResponse,
} from "@/lib/modules/exams-client";
import {
  buildReportCardDocument,
  buildReportCardGenerationRows,
  curriculumSettings,
  getReportCardTypeLabel,
  inferClassReportingMode,
  type ClassReportingMode,
  type ReportCardDocumentData,
  type ReportCardGenerationRow,
  type ReportCardSettings,
  type ReportCardStatus,
  type ReportCardType,
  type SchoolCurriculumDirection,
} from "@/lib/report-cards/curriculum-report-cards";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { AnalyticsDashboard } from "./AnalyticsDashboard";

type SaveState = "synced" | "saving" | "offline";
type SubmissionState = "draft" | "submitted" | "reopened";

type ExamEntryStatus = "Open" | "Draft" | "Submitted" | "Returned";
type ExamEntryCurriculum = "CBC" | "8-4-4" | "Hybrid";

export interface ExamTeachingAssignment {
  id: string;
  exam: string;
  className: string;
  stream: string;
  subject: string;
  curriculum: ExamEntryCurriculum;
  deadline: string;
  status: ExamEntryStatus;
  missingMarks: number;
  invalidMarks: number;
  lastSaved: string;
  teacherName: string;
  schoolId: string;
  academicYear: string;
  term: string;
  learners?: ExamEntryLearnerRow[];
}

export interface ExamEntryLearnerRow {
  id: string;
  admissionNumber: string;
  learnerName: string;
  paper1: string;
  paper2: string;
  practical: string;
  scoreLevel: string;
  competency: string;
  teacherComment: string;
  status: "Complete" | "Missing" | "Invalid" | "Absent" | "Exempt";
}

function getAssignmentTone(status: ExamEntryStatus, missingMarks: number, invalidMarks: number): StatusTone {
  if (status === "Returned" || invalidMarks > 0) {
    return "critical";
  }

  if (status === "Draft" || missingMarks > 0) {
    return "warning";
  }

  return "ok";
}

function buildAssignmentLearners(assignment: ExamTeachingAssignment): ExamEntryLearnerRow[] {
  return assignment.learners?.map((learner) => ({ ...learner })) ?? [];
}

function getAssignmentScope(assignment: ExamTeachingAssignment) {
  return `${assignment.className} ${assignment.stream}`.trim();
}

const toneClasses: Record<StatusTone, string> = {
  ok: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  critical: "border-danger/20 bg-danger/10 text-danger",
};

const statusToneMap: Record<ExamMarkRow["status"], StatusTone> = {
  Clean: "ok",
  Missing: "warning",
  Review: "warning",
  Outlier: "critical",
};

function metricIcon(tone: StatusTone) {
  if (tone === "ok") {
    return CheckCircle2;
  }

  if (tone === "critical") {
    return AlertCircle;
  }

  return ClipboardCheck;
}

function getCellKey(rowId: string, fieldId: ExamScoreFieldId) {
  return `${rowId}:${fieldId}`;
}

function getSaveLabel(saveState: SaveState) {
  if (saveState === "saving") {
    return "Saving changes";
  }

  if (saveState === "offline") {
    return "Offline queue protected";
  }

  return "Autosaved just now";
}

function getSubmissionMessage(submissionState: SubmissionState) {
  if (submissionState === "submitted") {
    return "Submission locked for HOD review";
  }

  if (submissionState === "reopened") {
    return "Marks reopened for teacher correction";
  }

  return "Teacher draft open";
}

function getRowValidation(row: ExamMarkRow, fields: ExamScoreField[]) {
  for (const field of fields) {
    const validation = validateExamScore(row.scores[field.id], field.maxScore);

    if (!validation.valid) {
      return validation;
    }
  }

  return null;
}

function PageIntro({
  schoolName,
  currentExam,
  currentClass,
  saveState,
  hasAssignedTeacherEntry,
  canGenerateReports,
  onContinueMarksEntry,
  onImportSpreadsheet,
  onGenerateReports,
}: {
  schoolName: string;
  currentExam: string;
  currentClass: string;
  saveState: SaveState;
  hasAssignedTeacherEntry: boolean;
  canGenerateReports: boolean;
  onContinueMarksEntry?: () => void;
  onImportSpreadsheet?: () => void;
  onGenerateReports?: () => void;
}) {
  const hasExamContext =
    currentExam !== "No exam selected" && currentClass !== "No class selected";

  return (
    <section className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              label={saveState === "synced" ? "Autosave ready" : getSaveLabel(saveState)}
              tone={saveState === "saving" ? "pending" : "synced"}
            />
            <span className="badge badge-info">Tenant-isolated drafts</span>
            <span className="badge badge-neutral">School protected</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold leading-tight text-foreground md:text-3xl">
            Exams & Results command center
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            {hasExamContext
              ? `${schoolName} is running ${currentExam} for ${currentClass}. Marks, moderation, approvals, parent PDFs, publishing controls, and trace records stay in one academic operations surface.`
              : `No active exam or class has been returned for ${schoolName || "this school"}. Connect the live school session or configure an exam before entering results.`}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {hasAssignedTeacherEntry ? (
              <>
                <Button size="lg" onClick={onContinueMarksEntry}>
                  <BookOpenCheck className="h-4 w-4" />
                  Continue marks entry
                </Button>
                <Button variant="secondary" size="lg" onClick={onImportSpreadsheet}>
                  <Upload className="h-4 w-4" />
                  Import spreadsheet
                </Button>
              </>
            ) : null}
            {canGenerateReports ? (
              <Button
                variant="secondary"
                size="lg"
                onClick={onGenerateReports}
                disabled={!hasExamContext}
              >
                <FileDown className="h-4 w-4" />
                Print operations report
              </Button>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border bg-surface-muted px-5 py-5 xl:border-l xl:border-t-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Exam period posture
          </p>
          <div className="mt-4 space-y-3">
            {[
              ["Data safety", "Autosave, local draft, conflict-ready records"],
              ["Governance", "Teacher to HOD to deputy to principal"],
              ["Publishing", "Immutable results after approval lock"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-[13px] leading-5 text-muted">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MyExamEntryPanel({
  assignments,
  activeAssignmentId,
  message,
  onOpenAssignment,
  onDownloadTemplate,
  onSaveDraft,
  onImportRequest,
}: {
  assignments: ExamTeachingAssignment[];
  activeAssignmentId: string | null;
  message: string | null;
  onOpenAssignment: (assignment: ExamTeachingAssignment) => void;
  onDownloadTemplate: (assignment: ExamTeachingAssignment) => void;
  onSaveDraft: (assignment: ExamTeachingAssignment) => void;
  onImportRequest: (assignment: ExamTeachingAssignment) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const activeAssignment =
    assignments.find((assignment) => assignment.id === activeAssignmentId) ?? assignments[0] ?? null;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredAssignments = normalizedSearch
    ? assignments.filter((assignment) =>
        [
          assignment.exam,
          assignment.className,
          assignment.stream,
          assignment.subject,
          assignment.curriculum,
          assignment.status,
        ].some((value) => value.toLowerCase().includes(normalizedSearch)),
      )
    : assignments;

  if (assignments.length === 0) {
    return (
      <Card className="p-5">
        <p className="eyebrow">Assigned teaching workload</p>
        <h3 className="mt-2 section-title text-lg">My Exam Entry</h3>
        <div className="mt-4 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-5">
          <p className="text-sm font-semibold text-foreground">No assigned exam entries loaded</p>
          <p className="mt-1 text-[13px] leading-5 text-muted">
            Teaching assignments and learner marksheets appear only after the live school service returns records for this user and tenant.
          </p>
        </div>
      </Card>
    );
  }

  const counts = [
    ["Open Entries", assignments.filter((assignment) => assignment.status === "Open").length],
    ["Draft Marksheets", assignments.filter((assignment) => assignment.status === "Draft").length],
    ["Submitted Marks", assignments.filter((assignment) => assignment.status === "Submitted").length],
    ["Returned Corrections", assignments.filter((assignment) => assignment.status === "Returned").length],
    [
      "Deadline Alerts",
      assignments.filter((assignment) => assignment.missingMarks > 0 || assignment.invalidMarks > 0).length,
    ],
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Assigned teaching workload</p>
            <h3 className="mt-2 section-title text-lg">My Exam Entry</h3>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted">
              Only subjects assigned to this user in the same school workspace are actionable here.
            </p>
          </div>
          <StatusPill label={`${assignments.length} assigned`} tone="ok" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {counts.map(([label, value]) => (
            <div key={label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <label className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <span className="sr-only">Search exam assignments</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            placeholder="Search assignment, subject, class, or status"
            type="search"
          />
        </label>

        <div className="mt-4 space-y-3">
          {filteredAssignments.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-5 text-sm font-semibold text-muted">
              No assigned exam entries match that search.
            </div>
          ) : null}
          {filteredAssignments.map((assignment) => {
            const tone = getAssignmentTone(assignment.status, assignment.missingMarks, assignment.invalidMarks);
            const scope = getAssignmentScope(assignment);
            const isActive = activeAssignment?.id === assignment.id;

            return (
              <div
                key={assignment.id}
                className={`rounded-[var(--radius)] border px-4 py-3 ${
                  isActive ? "border-info/30 bg-info-soft/40" : "border-border bg-surface-muted"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{assignment.subject}</p>
                      <StatusPill label={assignment.status} tone={tone} compact />
                      <span className="badge badge-neutral">{assignment.curriculum}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-muted">
                      {scope} - {assignment.exam} - {assignment.term} {assignment.academicYear}
                    </p>
                    <p className="mt-1 text-[12px] font-semibold text-muted-strong">
                      Deadline {assignment.deadline} - Last saved {assignment.lastSaved}
                    </p>
                    {(assignment.missingMarks > 0 || assignment.invalidMarks > 0) ? (
                      <p className="mt-2 text-[12px] font-semibold text-warning">
                        {assignment.missingMarks} missing, {assignment.invalidMarks} invalid marks need correction.
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => onOpenAssignment(assignment)}
                      aria-label={`Open marksheet for ${assignment.subject}`}
                    >
                      <BookOpenCheck className="h-3.5 w-3.5" />
                      Open Marksheet
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onOpenAssignment(assignment)}
                      aria-label={`Continue draft for ${assignment.subject}`}
                    >
                      Continue Draft
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onDownloadTemplate(assignment)}
                      aria-label={`Download template for ${assignment.subject}`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      Download Template
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onImportRequest(assignment)}
                      aria-label={`Import CSV or Excel for ${assignment.subject}`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Import CSV/Excel
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onSaveDraft(assignment)}
                      aria-label={`Save draft for ${assignment.subject}`}
                    >
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Save Draft
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {message ? (
          <div aria-live="polite" className="mt-4 rounded-[var(--radius-sm)] border border-info/20 bg-info-soft px-4 py-3 text-sm font-semibold text-info">
            {message}
          </div>
        ) : null}
      </Card>

      <ExamEntryMarksheetPanel assignment={activeAssignment} />
    </section>
  );
}

function ExamEntryMarksheetPanel({
  assignment,
}: {
  assignment: ExamTeachingAssignment | null;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const rows = useMemo(() => (assignment ? buildAssignmentLearners(assignment) : []), [assignment]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((row) =>
        [row.admissionNumber, row.learnerName, row.status, row.teacherComment].some((value) =>
          value.toLowerCase().includes(normalizedSearch),
        ),
      )
    : rows;
  const blockingRows = rows.filter((row) => row.status === "Missing" || row.status === "Invalid");
  const submitBlocked = !assignment || rows.length === 0 || blockingRows.length > 0;

  async function submitMarks() {
    if (!assignment || submitBlocked) {
      return;
    }

    setSubmitting(true);
    try {
      await requestDashboardApi("/admin-command/exams-manager/marks-entry", {
        method: "POST",
        body: {
          assignment_id: assignment.id,
          exam: assignment.exam,
          class_name: assignment.className,
          stream: assignment.stream,
          subject: assignment.subject,
          source_dashboard: "exams-module-screen",
          marks: filteredRows.map((row) => ({
            student_id: row.id,
            admission_number: row.admissionNumber,
            learner_name: row.learnerName,
            status: row.status,
            teacher_comment: row.teacherComment,
          })),
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!assignment) {
    return (
      <Card className="p-5">
        <p className="eyebrow">Marksheet</p>
        <h3 className="mt-2 text-base font-semibold text-foreground">Select an assigned record</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Open a marksheet from My Exam Entry to review learner records before saving or submitting.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Selected assignment</p>
            <h3 className="mt-2 text-base font-semibold text-foreground">{assignment.subject} marksheet</h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              {getAssignmentScope(assignment)} - {assignment.curriculum} - {assignment.exam}
            </p>
          </div>
          <StatusPill
            label={submitBlocked ? "Needs correction" : "Ready to submit"}
            tone={submitBlocked ? "warning" : "ok"}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2">
          <Search className="h-4 w-4 text-muted" />
          <span className="sr-only">Search learner marksheet</span>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
            placeholder="Search learner"
            type="search"
          />
        </label>

        {submitBlocked ? (
          <div className="mt-3 rounded-[var(--radius-sm)] border border-warning/20 bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
            {rows.length === 0
              ? "No tenant-scoped learner records were returned for this assignment."
              : `Resolve missing marks before submitting. ${blockingRows.length} learner record${blockingRows.length === 1 ? "" : "s"} still need review.`}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[760px] border-collapse">
          <thead className="bg-surface-muted">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              <th className="border-b border-border px-4 py-3">Admission No.</th>
              <th className="border-b border-border px-4 py-3">Learner Name</th>
              {assignment.curriculum === "8-4-4" ? (
                <>
                  <th className="border-b border-border px-4 py-3">Paper 1</th>
                  <th className="border-b border-border px-4 py-3">Paper 2</th>
                  <th className="border-b border-border px-4 py-3">Practical</th>
                </>
              ) : (
                <>
                  <th className="border-b border-border px-4 py-3">Score/Level</th>
                  <th className="border-b border-border px-4 py-3">Competency</th>
                </>
              )}
              <th className="border-b border-border px-4 py-3">Teacher Comment</th>
              <th className="border-b border-border px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map((row) => (
              <tr key={row.id} className="bg-surface">
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{row.admissionNumber}</td>
                <td className="px-4 py-3 text-sm text-foreground">{row.learnerName}</td>
                {assignment.curriculum === "8-4-4" ? (
                  <>
                    <td className="px-4 py-3 text-sm text-muted-strong">{row.paper1 || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-strong">{row.paper2 || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-strong">{row.practical || "-"}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-muted-strong">{row.scoreLevel || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-strong">{row.competency || "-"}</td>
                  </>
                )}
                <td className="px-4 py-3 text-sm text-muted-strong">{row.teacherComment}</td>
                <td className="px-4 py-3">
                  <StatusPill
                    label={row.status}
                    tone={row.status === "Complete" ? "ok" : row.status === "Missing" ? "warning" : "critical"}
                    compact
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface-muted px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] font-semibold text-muted-strong">
          {filteredRows.length} visible learner records - school scope {assignment.schoolId}
        </p>
        <Button disabled={submitBlocked || submitting} onClick={submitMarks}>
          <ShieldCheck className="h-3.5 w-3.5" />
          {submitting ? "Submitting..." : "Submit Marks"}
        </Button>
      </div>
    </Card>
  );
}

function MetricStrip({
  metrics,
}: {
  metrics: ReturnType<typeof buildExamsModuleData>["metrics"];
}) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => {
        const Icon = metricIcon(metric.tone);

        return (
          <Card key={metric.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  {metric.label}
                </p>
                <p className="mt-3 text-2xl font-bold leading-none text-foreground">
                  {metric.value}
                </p>
              </div>
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] border ${toneClasses[metric.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-5 text-muted">{metric.helper}</p>
          </Card>
        );
      })}
    </section>
  );
}

function PrincipalAcademicApprovalPanel({
  message,
  onAction,
}: {
  message: string | null;
  onAction: (action: string) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="eyebrow">Principal academic approval</p>
          <h3 className="mt-2 section-title text-lg">Academic Oversight</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted">
            Final academic decisions stay separate from mark entry: approval, publishing readiness, parent visibility, and audit posture are reviewed here.
          </p>
        </div>
        <StatusPill label="Approval queue visible" tone="warning" />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[
          ["Results Approval", "Pending approval classes, returned corrections, approved today, and publishing blockers."],
          ["Report Publishing", "Reports ready, parent-published counts, SMS notices pending, and acknowledgement progress."],
          ["Academic Analytics", "School mean, weakest subject, top improvers, at-risk learners, and class/stream comparison."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-2 text-[13px] leading-5 text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {[
          "Review Approval",
          "Approve Publishing",
          "Return for Correction",
          "Open Approval History",
          "Preview Reports",
          "Publish to Parent Dashboard",
          "Send SMS Notice",
          "Download Board Summary",
        ].map((label) => (
          <Button key={label} size="sm" variant={label === "Approve Publishing" ? "primary" : "secondary"} onClick={() => onAction(label)}>
            {label.includes("Publish") || label.includes("Approve") ? <ShieldCheck className="h-3.5 w-3.5" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
            {label}
          </Button>
        ))}
      </div>

      {message ? (
        <div aria-live="polite" className="mt-4 rounded-[var(--radius-sm)] border border-info/20 bg-info-soft px-4 py-3 text-sm font-semibold text-info">
          {message}
        </div>
      ) : null}
    </Card>
  );
}

function DashboardPanel({
  data,
}: {
  data: ReturnType<typeof buildExamsModuleData>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Operational dashboard</p>
            <h3 className="mt-2 section-title text-lg">Submission pressure and moderation queues</h3>
          </div>
          <StatusPill
            label={data.queues.length > 0 ? "Live exam data" : "Awaiting live data"}
            tone={data.queues.length > 0 ? "ok" : "warning"}
          />
        </div>
        <div className="mt-5 space-y-4">
          {data.queues.length === 0 ? (
            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-5 text-sm text-muted">
              No tenant-scoped submission or moderation queues have been returned.
            </div>
          ) : null}
          {data.queues.map((queue) => (
            <div key={queue.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{queue.title}</p>
                  <p className="mt-1 text-[13px] leading-5 text-muted">{queue.subtitle}</p>
                </div>
                <StatusPill label={queue.value} tone={queue.tone} />
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-info"
                  style={{ width: `${queue.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-5">
        <Card className="p-5">
          <p className="eyebrow">Teacher quick access</p>
          <div className="mt-4 space-y-3">
            {data.allocations.length === 0 ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-4 text-sm text-muted">
                No tenant-scoped teaching allocations have been returned.
              </div>
            ) : null}
            {data.allocations.map((allocation) => (
              <div
                key={allocation.id}
                className="flex w-full items-center justify-between rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2.5 text-left text-sm font-semibold text-foreground"
              >
                {allocation.className} - {allocation.subject}
                <BookOpenCheck className="h-4 w-4 text-muted" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <p className="eyebrow">Smart alerts</p>
          <div className="mt-4 space-y-3 text-sm">
            {data.queues.length === 0 ? (
              <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-3 text-muted">
                No live exam alerts are available.
              </div>
            ) : (
              data.queues.map((queue) => (
                <div key={queue.id} className="rounded-[var(--radius-sm)] border border-warning/20 bg-warning-soft px-3 py-2 text-warning">
                  {queue.title}: {queue.subtitle}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MarksEntryGrid({
  fields,
  initialRows,
  saveState,
  setSaveState,
  submissionState,
  onSubmitForApproval,
}: {
  fields: ExamScoreField[];
  initialRows: ExamMarkRow[];
  saveState: SaveState;
  setSaveState: (state: SaveState) => void;
  submissionState: SubmissionState;
  onSubmitForApproval: () => void;
}) {
  const [rows, setRows] = useState(initialRows);
  const [searchTerm, setSearchTerm] = useState("");
  const [density, setDensity] = useState<"comfortable" | "compact">("compact");
  const inputRefs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (saveState !== "saving") {
      return;
    }

    const timer = window.setTimeout(() => setSaveState("synced"), 120);
    return () => window.clearTimeout(timer);
  }, [saveState, setSaveState]);

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
      return rows;
    }

    return rows.filter((row) =>
      [row.student, row.admissionNumber, row.stream].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [rows, searchTerm]);

  const marksSummary = useMemo(() => calculateMarksSummary(rows, fields), [rows, fields]);
  const marksLocked = submissionState === "submitted";
  const outlierCount = rows.filter((row) => row.status === "Outlier").length;
  const submissionBlocked =
    rows.length === 0 ||
    marksSummary.missingScores > 0 ||
    marksSummary.invalidScores > 0 ||
    outlierCount > 0;

  function focusCell(rowIndex: number, fieldIndex: number) {
    const nextRow = filteredRows[rowIndex];
    const nextField = fields[fieldIndex];

    if (!nextRow || !nextField) {
      return;
    }

    inputRefs.current.get(getCellKey(nextRow.id, nextField.id))?.focus();
  }

  function handleScoreChange(rowId: string, fieldId: ExamScoreFieldId, value: string) {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              scores: {
                ...row.scores,
                [fieldId]: value,
              },
            }
          : row,
      ),
    );
    setSaveState("saving");
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    fieldIndex: number,
  ) {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(rowIndex + 1, fieldIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(rowIndex - 1, fieldIndex);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(rowIndex, fieldIndex + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(rowIndex, fieldIndex - 1);
    }
  }

  function handlePaste(
    event: ClipboardEvent<HTMLInputElement>,
    startRowIndex: number,
    startFieldIndex: number,
  ) {
    const clipboardText = event.clipboardData.getData("text");

    if (!clipboardText.includes("\t") && !clipboardText.includes("\n")) {
      return;
    }

    event.preventDefault();
    const pastedRows = clipboardText
      .trimEnd()
      .split(/\r?\n/)
      .map((line) => line.split("\t"));

    setRows((currentRows) => {
      const nextRows = currentRows.map((row) => ({
        ...row,
        scores: { ...row.scores },
      }));

      pastedRows.forEach((pastedRow, rowOffset) => {
        const targetRow = filteredRows[startRowIndex + rowOffset];

        if (!targetRow) {
          return;
        }

        const target = nextRows.find((row) => row.id === targetRow.id);

        if (!target) {
          return;
        }

        pastedRow.forEach((cellValue, fieldOffset) => {
          const targetField = fields[startFieldIndex + fieldOffset];

          if (targetField) {
            target.scores[targetField.id] = cellValue.trim();
          }
        });
      });

      return nextRows;
    });
    setSaveState("saving");
  }

  function fillMissingWithMean() {
    if (marksLocked) {
      return;
    }

    const fallback = String(Math.round(marksSummary.meanScore));
    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        scores: fields.reduce<Record<ExamScoreFieldId, string>>(
          (scores, field) => ({
            ...scores,
            [field.id]: scores[field.id].trim() ? scores[field.id] : fallback,
          }),
          { ...row.scores },
        ),
      })),
    );
    setSaveState("saving");
  }

  function exportMarks() {
    downloadCsvFile({
      filename: "exam-marks.csv",
      headers: ["Admission", "Student", "Class", ...fields.map((field) => field.label), "Status"],
      rows: rows.map((row) => [
        row.admissionNumber,
        row.student,
        row.stream,
        ...fields.map((field) => row.scores[field.id]),
        row.status,
      ]),
    });
  }

  function handleSubmitForApproval() {
    if (marksLocked || submissionBlocked) {
      return;
    }

    onSubmitForApproval();
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="eyebrow">Results entry</p>
            <h3 className="mt-2 section-title text-lg">Spreadsheet marks entry</h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              Only learner records returned for the authenticated school and assigned marksheet are shown here.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={fillMissingWithMean} disabled={marksLocked}>
              <Wand2 className="h-3.5 w-3.5" />
              Fill blanks
            </Button>
            <Button variant="secondary" size="sm" onClick={exportMarks}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitForApproval}
              disabled={marksLocked || submissionBlocked}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {marksLocked ? "Submitted to HOD" : "Submit to HOD"}
            </Button>
          </div>
        </div>
        <div
          aria-live="polite"
          className={`mt-4 rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-semibold ${
            submissionState === "submitted"
              ? "border-info/20 bg-info-soft text-info"
              : submissionState === "reopened"
                ? "border-warning/20 bg-warning-soft text-warning"
                : "border-border bg-surface-muted text-muted-strong"
          }`}
        >
          {getSubmissionMessage(submissionState)}
        </div>
        {submissionBlocked && !marksLocked ? (
          <div className="mt-3 rounded-[var(--radius-sm)] border border-warning/20 bg-warning-soft px-4 py-3 text-sm font-semibold text-warning">
            Resolve missing marks and invalid/outlier scores before submitting.
          </div>
        ) : null}
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto]">
          <label className="flex min-w-0 items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2">
            <Search className="h-4 w-4 text-muted" />
            <span className="sr-only">Search marks table</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              placeholder="Search learner, admission, or stream"
              type="search"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              label={saveState === "synced" ? "Autosaved just now" : getSaveLabel(saveState)}
              tone={saveState === "saving" ? "pending" : "synced"}
            />
            {saveState !== "synced" ? (
              <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-strong">
                Last checkpoint: Autosaved just now
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setDensity((current) => (current === "compact" ? "comfortable" : "compact"))}
              className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-[12px] font-semibold text-muted-strong transition hover:bg-surface-strong"
            >
              {density === "compact" ? "Compact density" : "Comfort density"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 border-b border-border bg-surface-muted md:grid-cols-4">
        {[
          ["Live average", `${marksSummary.meanScore}%`],
          ["Valid scores", String(marksSummary.validScores)],
          ["Missing cells", String(marksSummary.missingScores)],
          ["Outlier checks", String(marksSummary.invalidScores + outlierCount)],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-border px-4 py-3 md:border-b-0 md:border-r last:md:border-r-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</p>
            <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="min-w-[980px] border-collapse">
          <thead>
            <tr className="bg-surface-muted">
              <th className="sticky left-0 top-0 z-30 w-[128px] border-b border-r border-border bg-surface-muted px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                Admission
              </th>
              <th className="sticky left-[128px] top-0 z-30 w-[220px] border-b border-r border-border bg-surface-muted px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                Student
              </th>
              {fields.map((field) => (
                <th
                  key={field.id}
                  className="sticky top-0 z-20 min-w-[148px] border-b border-r border-border bg-surface-muted px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
                >
                  {field.shortLabel}
                  <span className="ml-1 font-medium text-muted">/{field.maxScore}</span>
                </th>
              ))}
              <th className="sticky top-0 z-20 min-w-[136px] border-b border-border bg-surface-muted px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, rowIndex) => {
              const rowValidation = getRowValidation(row, fields);

              return (
                <tr key={row.id} className="group border-b border-border/60 hover:bg-info-soft/30">
                  <td className="sticky left-0 z-10 border-r border-border bg-surface px-3 py-3 text-[13px] font-semibold text-muted-strong group-hover:bg-info-soft/80">
                    {row.admissionNumber}
                  </td>
                  <td className="sticky left-[128px] z-10 border-r border-border bg-surface px-3 py-3 group-hover:bg-info-soft/80">
                    <p className="text-sm font-semibold text-foreground">{row.student}</p>
                    <p className="text-[12px] text-muted">{row.stream}</p>
                  </td>
                  {fields.map((field, fieldIndex) => {
                    const value = row.scores[field.id];
                    const validation = validateExamScore(value, field.maxScore);

                    return (
                      <td
                        key={field.id}
                        className={`${density === "compact" ? "px-2 py-2" : "px-3 py-3"} border-r border-border align-top`}
                      >
                        <input
                          ref={(node) => {
                            const key = getCellKey(row.id, field.id);

                            if (node) {
                              inputRefs.current.set(key, node);
                            } else {
                              inputRefs.current.delete(key);
                            }
                          }}
                          aria-label={`${row.student} ${field.label} score`}
                          inputMode="decimal"
                          disabled={marksLocked}
                          value={value}
                          onChange={(event) => handleScoreChange(row.id, field.id, event.target.value)}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, fieldIndex)}
                          onPaste={(event) => handlePaste(event, rowIndex, fieldIndex)}
                          className={`h-9 w-full rounded-[var(--radius-xs)] border px-2 text-sm font-semibold tabular-nums outline-none transition focus:border-info focus:bg-surface-strong focus:shadow-[0_0_0_3px_rgba(37,99,235,0.12)] ${
                            validation.valid
                              ? "border-border bg-surface-muted text-foreground"
                              : validation.tone === "critical"
                                ? "border-danger/40 bg-danger-soft/70 text-danger"
                                : "border-warning/40 bg-warning-soft text-warning"
                          }`}
                        />
                        {!validation.valid ? (
                          <p className="mt-1 text-[11px] font-semibold text-danger">
                            {validation.message}
                          </p>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 align-top">
                    <StatusPill
                      label={rowValidation ? (rowValidation.tone === "critical" ? "Invalid score" : "Needs score") : row.status}
                      tone={rowValidation?.tone ?? statusToneMap[row.status]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-[13px] text-muted md:flex-row md:items-center md:justify-between">
        <p>
          Showing {filteredRows.length} learners from a virtualized-ready exam grid. Large classes keep
          frozen learner columns and sticky headers.
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(marksSummary.distribution).map(([grade, count]) => (
            <span key={grade} className="badge badge-neutral">
              {grade} {count}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ExamSetupPanel({
  setup,
}: {
  setup: ExamSetupItem[];
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="eyebrow">Exam setup</p>
          <h3 className="mt-2 section-title text-lg">Exam setup</h3>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted">
            Plan the exam window, assessment configuration, grade boundaries, and readiness checks before teachers enter marks.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            openPrintDocument({
              eyebrow: "Exam setup",
              title: "Exam configuration summary",
              subtitle: "Current exam setup controls and readiness",
              rows: setup.map((item) => ({ label: item.label, value: `${item.value} - ${item.helper}` })),
              footer: "Generated from the active exams setup workspace.",
            })
          }
        >
          <BookOpenCheck className="h-3.5 w-3.5" />
          Edit configuration
        </Button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {setup.map((item) => (
          <div key={item.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{item.label}</p>
              <StatusPill label={item.tone === "ok" ? "Ready" : "Check"} tone={item.tone} compact />
            </div>
            <p className="mt-2 text-lg font-bold text-foreground">{item.value}</p>
            <p className="mt-1 text-[13px] leading-5 text-muted">{item.helper}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-[var(--radius-sm)] border border-info/20 bg-info-soft px-4 py-3">
        <p className="text-sm font-semibold text-info">Assessment configuration</p>
        <p className="mt-1 text-[13px] leading-5 text-muted-strong">
          Subject weights, maximum marks, CBC competency evidence, remark rules, and report-card templates share one versioned configuration.
        </p>
      </div>
    </Card>
  );
}

function AllocationPanel({
  allocations,
}: {
  allocations: ExamAllocationRow[];
}) {
  const allocationColumns: Array<DataTableColumn<ExamAllocationRow>> = [
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "subject", header: "Subject", render: (row) => row.subject },
    { id: "teacher", header: "Teacher assignment", render: (row) => row.teacher },
    { id: "reviewer", header: "Reviewer", render: (row) => row.reviewer },
    { id: "learners", header: "Learners", render: (row) => row.learners },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <DataTable
        title="Subject allocation"
        subtitle="Subject allocation, teacher assignment, reviewer ownership, and learner counts stay visible before marks entry."
        columns={allocationColumns}
        rows={allocations}
        getRowKey={(row) => row.id}
      />
      <Card className="p-5">
        <Users className="h-5 w-5 text-info" />
        <h3 className="mt-3 text-base font-semibold text-foreground">Teacher assignment</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Teachers only see assigned subjects and classes. HOD reviewers can reopen submitted sheets with reasons and timestamps.
        </p>
        <div className="mt-4 space-y-2 text-[13px] text-muted-strong">
          <p className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
            {allocations.length} tenant-scoped allocations returned
          </p>
          <p className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
            {allocations.reduce((total, allocation) => total + allocation.learners, 0)} learners covered
          </p>
          <p className="rounded-[var(--radius-sm)] bg-surface-muted px-3 py-2">
            School boundary is enforced by the live API
          </p>
        </div>
      </Card>
    </div>
  );
}

function BulkUploadPanel() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const uploadChecks: Array<[string, string, StatusTone]> = [
    ["Template match", selectedFileName ? "Ready for live validation" : "Awaiting a selected file", "warning"],
    ["Duplicate guard", "Runs before any school record is written", "warning"],
    ["School boundary", "Requires the authenticated tenant context", "warning"],
    ["Partial recovery", "Available only after the server creates an import batch", "warning"],
  ];

  return (
    <Card className="p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="eyebrow">Bulk results upload</p>
          <h3 className="mt-2 section-title text-lg">Spreadsheet import with pre-flight checks</h3>
          <div className="mt-5 rounded-[var(--radius)] border border-dashed border-info/30 bg-info-soft/40 px-5 py-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-info" />
            <p className="mt-3 text-sm font-semibold text-foreground">Drop Excel or CSV result sheets here</p>
            <p className="mt-1 text-[13px] text-muted">The import validates subjects, max marks, learners, duplicates, and CBC rules before writing records.</p>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? null)}
            />
            <Button className="mt-4" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Select file
            </Button>
            {selectedFileName ? <p className="mt-2 text-xs font-semibold text-info">{selectedFileName} selected for validation.</p> : null}
          </div>
        </div>
        <div className="space-y-3">
          {uploadChecks.map(([title, detail, tone]) => (
            <div key={title} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <StatusPill label={tone === "ok" ? "Ready" : "Check"} tone={tone} />
              </div>
              <p className="mt-1 text-[13px] leading-5 text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ModerationPanel({
  queues,
}: {
  queues: ReturnType<typeof buildExamsModuleData>["queues"];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {queues.map((queue) => (
        <Card key={queue.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border ${toneClasses[queue.tone]}`}>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <StatusPill label={queue.value} tone={queue.tone} />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">{queue.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{queue.subtitle}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-strong">
            <div className="h-full rounded-full bg-info" style={{ width: `${queue.progress}%` }} />
          </div>
          <Button
            className="mt-4"
            variant="secondary"
            size="sm"
            onClick={() =>
              openPrintDocument({
                eyebrow: "Moderation queue",
                title: queue.title,
                subtitle: queue.subtitle,
                rows: [
                  { label: "Queue value", value: queue.value },
                  { label: "Progress", value: `${queue.progress}%` },
                  { label: "Status", value: queue.tone },
                ],
                footer: "Moderation queue summary generated from exams workflow data.",
              })
            }
          >
            Open moderation
          </Button>
        </Card>
      ))}
    </div>
  );
}

function ApprovalPanel({
  approvals,
}: {
  approvals: ApprovalStep[];
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="eyebrow">Approval workflow</p>
          <h3 className="mt-2 section-title text-lg">Teacher to publishing governance</h3>
        </div>
        <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-[12px] font-semibold text-muted">
          Read-only projection
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        Report-card decisions use the authoritative live workflow in the Report cards tab. Mark corrections require a selected live moderation record and audited reason.
      </p>
      {approvals.length === 0 ? (
        <div className="mt-5 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-muted px-4 py-5 text-sm text-muted">
          No tenant-authoritative approval steps were returned.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-4">
          {approvals.map((step, index) => (
          <div key={step.id} className="relative rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-muted text-sm font-bold text-foreground">
                {index + 1}
              </span>
              <StatusPill label={step.status} tone={step.tone} />
            </div>
            <h4 className="mt-4 text-sm font-semibold text-foreground">{step.role}</h4>
            <p className="mt-1 text-[13px] text-muted">{step.owner}</p>
            <p className="mt-3 text-[13px] leading-5 text-muted">{step.note}</p>
            <p className="mt-3 text-[12px] font-semibold text-muted-strong">{step.timestamp}</p>
          </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function getReportingModeLabel(mode: ClassReportingMode) {
  const labels: Record<ClassReportingMode, string> = {
    CBC_CBE: "CBC/CBE",
    HYBRID_CBC_MARKS: "Hybrid CBC + Marks",
    LEGACY_844_KCSE: "Legacy 8-4-4/KCSE",
  };

  return labels[mode];
}

function getReportTypeFilterLabel(type: ReportCardType | "ALL") {
  if (type === "ALL") {
    return "All report types";
  }

  return getReportCardTypeLabel(type);
}

function getReportCardStatusTone(status: ReportCardStatus): StatusTone {
  if (status === "Published" || status === "Principal/Deputy approved" || status === "Ready for review") {
    return "ok";
  }

  if (status === "Data incomplete" || status === "Returned for correction") {
    return "critical";
  }

  return "warning";
}

type LiveReportCardWorkflowAction = "submit" | "approve" | "publish";

function getLiveReportCardAction(
  card: ExamReportCardPreview,
  access: ExamsAccessPolicy,
): { action: LiveReportCardWorkflowAction; label: string } | null {
  const status = card.status.trim().toLowerCase();

  if (
    access.canSubmitReportCards
    && ["draft", "draft_generated", "regeneration_required"].includes(status)
  ) {
    return { action: "submit", label: "Submit for Dean review" };
  }

  if (access.canApproveReportCards && status === "under_review") {
    return { action: "approve", label: "Approve report card" };
  }

  if (access.canPublishReportCards && status === "approved") {
    return { action: "publish", label: "Publish report card" };
  }

  return null;
}

function LiveReportCardWorkflow({
  cards,
  access,
  isLiveMode,
  activeActionId,
  feedback,
  onTransition,
}: {
  cards: ExamReportCardPreview[];
  access: ExamsAccessPolicy;
  isLiveMode: boolean;
  activeActionId: string | null;
  feedback: { message: string; tone: StatusTone } | null;
  onTransition: (card: ExamReportCardPreview, action: LiveReportCardWorkflowAction) => void;
}) {
  return (
    <Card className="p-5">
      <div>
        <p className="eyebrow">Authoritative workflow</p>
        <h3 className="mt-2 section-title text-lg">Live report-card approvals and publishing</h3>
        <p className="mt-1 text-[13px] leading-5 text-muted">
          Status changes are submitted to the tenant-scoped Exams API and appear here only from live report-card records.
        </p>
      </div>
      {feedback ? (
        <div
          role={feedback.tone === "critical" ? "alert" : "status"}
          className={`mt-4 rounded-[var(--radius-sm)] border px-4 py-3 text-sm font-semibold ${toneClasses[feedback.tone]}`}
        >
          {feedback.message}
        </div>
      ) : null}
      {cards.length === 0 ? (
        <div className="mt-4 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-muted px-4 py-5 text-sm text-muted">
          No tenant-authoritative report-card records are available. Approval and publishing controls remain unavailable.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {cards.map((card) => {
            const nextAction = getLiveReportCardAction(card, access);
            const actionId = nextAction ? `report-card-${nextAction.action}-${card.id}` : null;

            return (
              <div
                key={card.id}
                className="flex flex-col gap-3 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{card.title}</p>
                  <p className="mt-1 text-[12px] text-muted">{card.className} · {card.verificationCode}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={card.status} tone={card.status === "published" ? "ok" : "warning"} />
                  {nextAction ? (
                    <Button
                      size="sm"
                      onClick={() => onTransition(card, nextAction.action)}
                      disabled={!isLiveMode || Boolean(activeActionId)}
                      aria-label={`${nextAction.label} for ${card.title}`}
                    >
                      {activeActionId === actionId ? "Saving..." : nextAction.label}
                    </Button>
                  ) : (
                    <span className="text-[12px] font-semibold text-muted">
                      No transition is allowed for this role and status.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function ReportCardsPanel({
  data,
  liveCards,
  access,
  isLiveMode,
  activeActionId,
  feedback,
  onTransition,
}: {
  data: ExamsModuleData;
  liveCards: ExamReportCardPreview[];
  access: ExamsAccessPolicy;
  isLiveMode: boolean;
  activeActionId: string | null;
  feedback: { message: string; tone: StatusTone } | null;
  onTransition: (card: ExamReportCardPreview, action: LiveReportCardWorkflowAction) => void;
}) {
  const [reportSettings, setReportSettings] = useState<ReportCardSettings>(() => ({ ...curriculumSettings }));
  const [classReportingModes, setClassReportingModes] = useState<Record<string, ClassReportingMode>>(() =>
    Object.fromEntries(
      data.reports.map((report) => [
        report.className,
        inferClassReportingMode({
          className: report.className,
          schoolDirection: curriculumSettings.schoolDefaultCurriculumDirection,
        }),
      ]),
    ),
  );
  const [reportTypeFilter, setReportTypeFilter] = useState<ReportCardType | "ALL">("ALL");
  const [modeFilter, setModeFilter] = useState<ClassReportingMode | "ALL">("ALL");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [termFilter, setTermFilter] = useState("");
  const [reportingPeriodFilter, setReportingPeriodFilter] = useState(
    data.currentExam === "No exam selected" ? "" : data.currentExam,
  );
  const [gradeFormFilter, setGradeFormFilter] = useState("ALL");
  const [streamFilter, setStreamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<ReportCardStatus | "ALL">("ALL");
  const [completionFilter, setCompletionFilter] = useState<"ALL" | "COMPLETE" | "INCOMPLETE">("ALL");
  const [publicationFilter, setPublicationFilter] = useState<"ALL" | "Published" | "Unpublished">("ALL");
  const [approvalFilter, setApprovalFilter] = useState<"ALL" | "APPROVED" | "PENDING">("ALL");
  const [feeHoldFilter, setFeeHoldFilter] = useState<"ALL" | "Clear" | "Held">("ALL");
  const [selectedReport, setSelectedReport] = useState<ReportCardDocumentData | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const baseRows = useMemo(
    () =>
      buildReportCardGenerationRows(data.reports, {
        settings: reportSettings,
        classReportingModes,
      }),
    [classReportingModes, data.reports, reportSettings],
  );
  const rows = baseRows;

  const filteredRows = rows.filter((row) => {
    const matchesType = reportTypeFilter === "ALL" || row.reportType === reportTypeFilter;
    const matchesMode = modeFilter === "ALL" || row.reportingMode === modeFilter;
    const matchesGradeForm = gradeFormFilter === "ALL" || row.gradeForm === gradeFormFilter;
    const matchesStream = streamFilter === "ALL" || row.stream === streamFilter;
    const matchesStatus = statusFilter === "ALL" || row.approvalStatus === statusFilter;
    const matchesCompletion =
      completionFilter === "ALL"
      || (completionFilter === "COMPLETE" && row.missingItems.length === 0)
      || (completionFilter === "INCOMPLETE" && row.missingItems.length > 0);
    const matchesPublication = publicationFilter === "ALL" || row.publishedStatus === publicationFilter;
    const isApproved = row.approvalStatus === "Principal/Deputy approved" || row.publishedStatus === "Published";
    const matchesApproval =
      approvalFilter === "ALL"
      || (approvalFilter === "APPROVED" && isApproved)
      || (approvalFilter === "PENDING" && !isApproved);
    const matchesFeeHold = feeHoldFilter === "ALL" || row.feeHoldStatus === feeHoldFilter;

    return (
      matchesType
      && matchesMode
      && matchesGradeForm
      && matchesStream
      && matchesStatus
      && matchesCompletion
      && matchesPublication
      && matchesApproval
      && matchesFeeHold
    );
  });

  const gradeFormOptions = Array.from(new Set(rows.map((row) => row.gradeForm)));
  const streamOptions = Array.from(new Set(rows.map((row) => row.stream)));
  const statusOptions = Array.from(new Set(rows.map((row) => row.approvalStatus)));
  const summary = {
    learners: rows.length,
    cbc: rows.filter((row) => row.reportType === "CBC_CBE_COMPETENCY").length,
    hybrid: rows.filter((row) => row.reportType === "HYBRID_CBC_MARKS").length,
    legacy: rows.filter((row) => row.reportType === "LEGACY_844_KCSE").length,
    blocked: rows.filter((row) => row.missingItems.length > 0 || row.feeHoldStatus === "Held").length,
    published: rows.filter((row) => row.publishedStatus === "Published").length,
    missingCbc: rows.filter((row) => row.cbcCompletion !== "Complete" && row.cbcCompletion !== "Not required").length,
    missingMarks: rows.filter((row) => row.marksCompletion !== "Complete" && row.marksCompletion !== "Not required").length,
    missingComments: rows.filter((row) => row.commentsStatus !== "Complete" && row.commentsStatus !== "Not required").length,
    awaitingApproval: rows.filter((row) => row.approvalStatus !== "Principal/Deputy approved" && row.publishedStatus !== "Published").length,
  };

  function updateSchoolDirection(direction: SchoolCurriculumDirection) {
    setReportSettings((current) => ({
      ...current,
      schoolDefaultCurriculumDirection: direction,
    }));
    setClassReportingModes(
      Object.fromEntries(
        data.reports.map((report) => [
          report.className,
          inferClassReportingMode({
            className: report.className,
            schoolDirection: direction,
          }),
        ]),
      ),
    );
    setNotice(
      direction === "CBC_CBE"
        ? "CBC/CBE preview selected. This does not change the school setting; legacy 8-4-4/KCSE remains an explicit class/report format."
        : "Hybrid Transition preview selected. This does not change the school setting; legacy 8-4-4/KCSE remains class-level transition support only.",
    );
  }

  function updateReportSettingFlag(key: keyof Pick<ReportCardSettings, "allowMarksSupplement" | "allowRanking" | "allowFeeVisibility" | "allowDisciplineVisibility" | "requirePrincipalApproval" | "requireClassTeacherComments" | "requireCbcObservations" | "requireSubjectTeacherComments">, value: boolean) {
    setReportSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setNotice("Readiness preview settings updated locally. No tenant setting was changed.");
  }

  function updateClassReportingMode(className: string, mode: ClassReportingMode) {
    setClassReportingModes((current) => ({
      ...current,
      [className]: mode,
    }));
    setNotice(`${className}: ${getReportingModeLabel(mode)} preview selected. No class setting was changed.`);
  }

  function buildPreview(row: ReportCardGenerationRow) {
    return buildReportCardDocument({
      data,
      row,
      settings: reportSettings,
    });
  }

  function openPreview(row: ReportCardGenerationRow) {
    setSelectedReport(buildPreview(row));
    setNotice(null);
  }

  function openPrintPreview(report: ReportCardDocumentData) {
    const documentElement = document.getElementById(`report-card-document-${report.id}`);

    if (!documentElement) {
      setNotice("Open the report preview before printing.");
      return;
    }

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");

    if (!printWindow) {
      setNotice("Browser blocked the print preview window. Allow popups, then try again.");
      return;
    }

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>${getReportCardTypeLabel(report.curriculum.reportCardType)} - ${report.learner.fullName}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #ffffff; color: #0f172a; font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
            .print-shell { width: 794px; margin: 0 auto; }
            button, .print\\:hidden { display: none !important; }
          </style>
        </head>
        <body>
          <div class="print-shell">${documentElement.outerHTML}</div>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>`);
    printWindow.document.close();
    setNotice(`${report.learner.fullName}: print preview ready.`);
  }

  async function downloadPdf(report: ReportCardDocumentData) {
    const isAuthoritativeLiveCard = liveCards.some((card) => card.id === report.id);

    if (!isAuthoritativeLiveCard) {
      openPrintPreview(report);
      setNotice(`${report.learner.fullName}: this is a read-only readiness preview. Use the browser print dialog to save it; no report-card download was claimed.`);
      return;
    }

    setNotice(`${report.learner.fullName}: downloading PDF...`);
    try {
      const res = await fetch(`/api/exams/report-cards/${report.id}/download`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to download PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Report_Card_${report.learner.fullName.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setNotice(`${report.learner.fullName}: PDF download complete.`);
    } catch {
      openPrintPreview(report);
      setNotice(`${report.learner.fullName}: Choose "Save as PDF" in the print dialog as a fallback.`);
    }
  }

  function printSummary() {
    openPrintDocument({
      eyebrow: "Curriculum-aware report cards",
      title: "Report card generation summary",
      subtitle: "CBC/CBE is the school direction. Hybrid and legacy formats are selected only by class or report type.",
      rows: rows.map((row) => ({
        label: `${row.learnerName} - ${row.gradeForm}`,
        value: `${getReportCardTypeLabel(row.reportType)} | ${row.approvalStatus} | ${row.publishedStatus}`,
      })),
      footer: "Generated from the Exams & Results workspace.",
    });
  }

  const columns: DataTableColumn<ReportCardGenerationRow>[] = [
    {
      id: "learner",
      header: "Learner",
      render: (row) => (
        <div>
          <p className="font-semibold">{row.learnerName}</p>
          <p className="text-[12px] text-muted">{row.admissionNumber}</p>
        </div>
      ),
    },
    { id: "class", header: "Class/Form", render: (row) => `${row.gradeForm} ${row.stream ? `(${row.stream})` : ""}` },
    { id: "mode", header: "Mode", render: (row) => getReportingModeLabel(row.reportingMode) },
    { id: "type", header: "Report type", render: (row) => getReportCardTypeLabel(row.reportType) },
    {
      id: "inputs",
      header: "Inputs",
      render: (row) => (
        <div className="space-y-1 text-[12px]">
          <p>CBC: {row.cbcCompletion}</p>
          <p>Marks: {row.marksCompletion}</p>
          <p>Comments: {row.commentsStatus}</p>
        </div>
      ),
    },
    {
      id: "approval",
      header: "Approval",
      render: (row) => <StatusPill label={row.approvalStatus} tone={getReportCardStatusTone(row.approvalStatus)} />,
    },
    {
      id: "portal",
      header: "Portal",
      render: (row) => (
        <div className="space-y-1">
          <StatusPill label={row.publishedStatus} tone={row.publishedStatus === "Published" ? "ok" : "warning"} />
          <p className="text-[11px] text-muted">{row.printedStatus}</p>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Readiness preview",
      className: "min-w-[220px]",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => openPreview(row)}>
            Preview
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openPrintPreview(buildPreview(row))}>
            Print
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <LiveReportCardWorkflow
        cards={liveCards}
        access={access}
        isLiveMode={isLiveMode}
        activeActionId={activeActionId}
        feedback={feedback}
        onTransition={onTransition}
      />
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Readiness preview settings</p>
            <h3 className="mt-2 section-title text-lg">CBC/CBE-first document preview with class-level transition modes</h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              These controls recalculate a read-only document preview. They do not save tenant settings or change report-card workflow status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={printSummary}>
              <FileDown className="h-4 w-4" />
              Print Summary
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const firstPublished = rows.find((row) => row.publishedStatus === "Published") ?? null;
                if (!firstPublished) {
                  setNotice("Parent portal preview is empty until at least one report is published.");
                  return;
                }
                openPreview(firstPublished);
              }}
            >
              <Users className="h-4 w-4" />
              Parent portal preview
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <label className="space-y-1">
              <span className="text-[12px] font-semibold text-muted">School default curriculum direction</span>
              <select
                value={reportSettings.schoolDefaultCurriculumDirection}
                onChange={(event) => updateSchoolDirection(event.target.value as SchoolCurriculumDirection)}
                className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
              >
                <option value="CBC_CBE">CBC/CBE School</option>
                <option value="HYBRID_TRANSITION">Hybrid Transition School</option>
              </select>
            </label>
            <p className="mt-2 text-[12px] leading-5 text-muted">
              8-4-4/KCSE is available only as a legacy class/report format, never as a school-wide mode.
            </p>
            <div className="mt-3 grid gap-2 text-[12px] text-foreground">
              {[
                ["Allow marks supplement", "allowMarksSupplement"],
                ["Allow ranking", "allowRanking"],
                ["Allow fee visibility", "allowFeeVisibility"],
                ["Allow discipline visibility", "allowDisciplineVisibility"],
                ["Require principal approval", "requirePrincipalApproval"],
                ["Require class teacher comments", "requireClassTeacherComments"],
                ["Require CBC observations", "requireCbcObservations"],
                ["Require subject teacher comments", "requireSubjectTeacherComments"],
              ].map(([label, key]) => (
                <label key={key} className="flex items-center justify-between gap-3">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(reportSettings[key as keyof ReportCardSettings])}
                    onChange={(event) =>
                      updateReportSettingFlag(
                        key as keyof Pick<
                          ReportCardSettings,
                          | "allowMarksSupplement"
                          | "allowRanking"
                          | "allowFeeVisibility"
                          | "allowDisciplineVisibility"
                          | "requirePrincipalApproval"
                          | "requireClassTeacherComments"
                          | "requireCbcObservations"
                          | "requireSubjectTeacherComments"
                        >,
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
            <p className="text-[12px] font-semibold text-muted">Class/Form/Grade reporting modes</p>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {data.reports.map((report) => (
                <label key={report.className} className="space-y-1">
                  <span className="text-[12px] font-semibold text-foreground">{report.className}</span>
                  <select
                    aria-label={`${report.className} reporting mode`}
                    value={classReportingModes[report.className] ?? "CBC_CBE"}
                    onChange={(event) => updateClassReportingMode(report.className, event.target.value as ClassReportingMode)}
                    className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
                  >
                    <option value="CBC_CBE">CBC/CBE</option>
                    <option value="HYBRID_CBC_MARKS">Hybrid CBC + Marks</option>
                    <option value="LEGACY_844_KCSE">Legacy 8-4-4/KCSE class/report</option>
                  </select>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Learners", summary.learners],
            ["CBC/CBE", summary.cbc],
            ["Hybrid", summary.hybrid],
            ["Legacy class reports", summary.legacy],
            ["Needs attention", summary.blocked],
            ["Published", summary.published],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Missing CBC observations", summary.missingCbc],
            ["Missing marks", summary.missingMarks],
            ["Missing comments", summary.missingComments],
            ["Awaiting approval", summary.awaitingApproval],
            ["Held/blocked", summary.blocked],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[var(--radius-sm)] border border-warning/20 bg-warning/10 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Academic year</span>
            <select
              value={academicYearFilter}
              onChange={(event) => setAcademicYearFilter(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="">Not returned by the current exam record</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Term</span>
            <select
              value={termFilter}
              onChange={(event) => setTermFilter(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="">Not returned by the current exam record</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Reporting period</span>
            <select
              value={reportingPeriodFilter}
              onChange={(event) => setReportingPeriodFilter(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value={reportingPeriodFilter}>
                {reportingPeriodFilter || "Not returned by the current exam record"}
              </option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Grade/Form</span>
            <select
              value={gradeFormFilter}
              onChange={(event) => setGradeFormFilter(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All grades/forms</option>
              {gradeFormOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Stream</span>
            <select
              value={streamFilter}
              onChange={(event) => setStreamFilter(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All streams</option>
              {streamOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Report card type</span>
            <select
              value={reportTypeFilter}
              onChange={(event) => setReportTypeFilter(event.target.value as ReportCardType | "ALL")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              {(["ALL", "CBC_CBE_COMPETENCY", "HYBRID_CBC_MARKS", "LEGACY_844_KCSE"] as const).map((option) => (
                <option key={option} value={option}>{getReportTypeFilterLabel(option)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Class reporting mode</span>
            <select
              value={modeFilter}
              onChange={(event) => setModeFilter(event.target.value as ClassReportingMode | "ALL")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All class modes</option>
              <option value="CBC_CBE">CBC/CBE</option>
              <option value="HYBRID_CBC_MARKS">Hybrid CBC + Marks</option>
              <option value="LEGACY_844_KCSE">Legacy 8-4-4/KCSE class</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ReportCardStatus | "ALL")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All statuses</option>
              {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Completion state</span>
            <select
              value={completionFilter}
              onChange={(event) => setCompletionFilter(event.target.value as "ALL" | "COMPLETE" | "INCOMPLETE")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All completion states</option>
              <option value="COMPLETE">Complete inputs</option>
              <option value="INCOMPLETE">Missing inputs</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Published/unpublished</span>
            <select
              value={publicationFilter}
              onChange={(event) => setPublicationFilter(event.target.value as "ALL" | "Published" | "Unpublished")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All publication states</option>
              <option value="Published">Published</option>
              <option value="Unpublished">Unpublished</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Approved/pending</span>
            <select
              value={approvalFilter}
              onChange={(event) => setApprovalFilter(event.target.value as "ALL" | "APPROVED" | "PENDING")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All approval states</option>
              <option value="APPROVED">Approved/published</option>
              <option value="PENDING">Pending approval</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[12px] font-semibold text-muted">Fee hold status</span>
            <select
              value={feeHoldFilter}
              onChange={(event) => setFeeHoldFilter(event.target.value as "ALL" | "Clear" | "Held")}
              className="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-white px-3 text-sm text-foreground"
            >
              <option value="ALL">All fee states</option>
              <option value="Clear">Clear</option>
              <option value="Held">Held</option>
            </select>
          </label>
          <div className="rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-[12px] text-foreground">
            Parent portal visibility stays locked until report status is Published. Ranking is off unless the school enables it.
          </div>
        </div>
      </Card>

      {notice ? (
        <div className="rounded-[var(--radius-sm)] border border-info/20 bg-info/10 px-4 py-3 text-[13px] font-semibold text-foreground">
          {notice}
        </div>
      ) : null}

      <DataTable
        title="Report card readiness preview"
        subtitle="Review and print caller-supplied readiness data. Workflow mutations are available only on authoritative live report-card records above."
        columns={columns}
        rows={filteredRows}
        getRowKey={(row) => row.id}
        emptyMessage="No report cards match the selected filters."
      />

      <Modal
        open={Boolean(selectedReport)}
        title="Report card preview"
        description="Review the exact A4 document before printing or saving as PDF."
        onClose={() => setSelectedReport(null)}
        size="xl"
      >
        {selectedReport ? (
          <div className="space-y-4">
            <ReportCardActionBar
              report={selectedReport}
              onPrint={() => openPrintPreview(selectedReport)}
              onDownloadPdf={() => downloadPdf(selectedReport)}
            />
            <ReportCardVerificationStrip report={selectedReport} />
            <ReportCardDocument report={selectedReport} />
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function CompetenciesPanel({
  competencies,
}: {
  competencies: CbcCompetencyRow[];
}) {
  const columns: DataTableColumn<CbcCompetencyRow>[] = [
    { id: "competency", header: "Competency", render: (row) => <span className="font-semibold">{row.competency}</span> },
    { id: "coverage", header: "Coverage", render: (row) => row.coverage },
    { id: "evidence", header: "Evidence", render: (row) => row.evidence },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.tone} /> },
  ];

  return (
    <DataTable
      title="CBC competency coverage"
      subtitle="Evidence, coverage, and rule checks for CBC-aligned assessments."
      columns={columns}
      rows={competencies}
      getRowKey={(row) => row.id}
    />
  );
}

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border bg-surface p-5 h-32">
            <div className="flex justify-between items-center">
              <div className="h-5 w-5 bg-muted rounded-full"></div>
              <div className="h-4 w-12 bg-muted rounded"></div>
            </div>
            <div className="h-4 w-24 bg-muted rounded mt-4 text-xs"></div>
            <div className="h-6 w-16 bg-muted rounded mt-2"></div>
          </div>
        ))}
      </div>
      {/* Trends & Table Skeleton */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 rounded-[var(--radius)] border border-border bg-surface p-6 h-80">
          <div className="h-4 w-32 bg-muted rounded mb-6"></div>
          <div className="h-48 bg-muted/30 rounded flex items-end justify-between p-4 gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-muted rounded-t w-full" style={{ height: `${i * 15}%` }}></div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-surface p-6 h-80">
          <div className="h-4 w-32 bg-muted rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-24 bg-muted rounded"></div>
                <div className="h-4 w-8 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsErrorBanner({ error, refetch }: { error: any; refetch: () => void }) {
  return (
    <div className="rounded-[var(--radius)] border border-danger/20 bg-danger/10 p-6 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-danger" />
      <h3 className="mt-4 text-lg font-bold text-danger">Failed to load academic analytics</h3>
      <p className="mt-2 text-sm text-muted">
        {error?.message || "An unexpected error occurred while fetching the live analytics data from the server."}
      </p>
      <Button className="mt-4" variant="outline" onClick={refetch}>
        Retry Loading
      </Button>
    </div>
  );
}

function AnalyticsEmptyState() {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface p-12 text-center">
      <BarChart3 className="mx-auto h-16 w-16 text-muted/60" />
      <h3 className="mt-6 text-xl font-bold text-foreground">No academic analytics available</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-muted">
        Get started by creating an exam series, configuring subject assessments, and submitting student marks. Once data is recorded, performance trends and CBC grade distributions will appear here.
      </p>
    </div>
  );
}

function AnalyticsPanel({
  analysis,
  history,
  isLiveMode,
  isLoading,
  error,
  liveData,
  refetch,
}: {
  analysis: ExamAnalysisItem[];
  history: HistoricalResult[];
  isLiveMode?: boolean;
  isLoading?: boolean;
  error?: any;
  liveData?: LiveExamsAnalyticsResponse;
  refetch?: () => void;
}) {
  if (!isLiveMode) {
    const historyColumns: DataTableColumn<HistoricalResult>[] = [
      { id: "exam", header: "Exam", render: (row) => <span className="font-semibold">{row.exam}</span> },
      { id: "mean", header: "Mean", render: (row) => row.mean },
      { id: "topSubject", header: "Top subject", render: (row) => row.topSubject },
      { id: "riskSignal", header: "Risk signal", render: (row) => row.riskSignal },
    ];

    return (
      <div className="space-y-5">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {analysis.map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <BarChart3 className="h-5 w-5 text-info" />
                <StatusPill label={item.tone === "ok" ? "Healthy" : "Watch"} tone={item.tone} />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
              <p className="mt-2 text-[13px] leading-5 text-muted">{item.helper}</p>
            </Card>
          ))}
        </section>
        <DataTable
          title="Historical results"
          subtitle="Simple trend reading across recent exams."
          columns={historyColumns}
          rows={history}
          getRowKey={(row) => row.id}
        />
      </div>
    );
  }

  if (isLoading) {
    return <AnalyticsLoadingSkeleton />;
  }

  if (error) {
    return <AnalyticsErrorBanner error={error} refetch={refetch || (() => {})} />;
  }

  const hasData = liveData && (
    (liveData.trends && liveData.trends.length > 0) || 
    (liveData.subjectPerformance && liveData.subjectPerformance.length > 0) ||
    (liveData.studentProgress?.topPerformers && liveData.studentProgress.topPerformers.length > 0) ||
    liveData.kpis.pending_reviews > 0 ||
    liveData.kpis.missing_marks_alerts > 0 ||
    liveData.kpis.active_exams > 0 ||
    liveData.data_quality.explicit_evidence_count > 0
  );

  if (!hasData) {
    return <AnalyticsEmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: School Average */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <BarChart3 className="h-5 w-5 text-info" />
            <StatusPill
              label={liveData.kpis.school_average === null ? "Awaiting Results" : "Final Results"}
              tone={liveData.kpis.school_average === null ? "warning" : "ok"}
            />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            School Average
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {liveData.kpis.school_average === null
              ? "No final results"
              : `${liveData.kpis.school_average}%`}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            Mean percentage from locked or published numeric marks only.
          </p>
        </Card>

        {/* KPI 2: Pending Reviews */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <ClipboardCheck className="h-5 w-5 text-warning" />
            <StatusPill 
              label={liveData.kpis.pending_reviews > 0 ? "Requires Review" : "No Pending"} 
              tone={liveData.kpis.pending_reviews > 0 ? "warning" : "ok"} 
            />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Pending Reviews
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {liveData.kpis.pending_reviews}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            Submitted marks awaiting HOD or Principal review.
          </p>
        </Card>

        {/* KPI 3: Missing Marks Alerts */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <AlertCircle className="h-5 w-5 text-danger" />
            <StatusPill 
              label={liveData.kpis.missing_marks_alerts > 0 ? "Action Needed" : "All Marked"} 
              tone={liveData.kpis.missing_marks_alerts > 0 ? "critical" : "ok"} 
            />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Missing Marks Alerts
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {liveData.kpis.missing_marks_alerts}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            Expected student marks not yet submitted/recorded.
          </p>
        </Card>

        {/* KPI 4: Active Exams */}
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <BookOpenCheck className="h-5 w-5 text-success" />
            <StatusPill label="Active Cycle" tone="ok" />
          </div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            Active Exams
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {liveData.kpis.active_exams}
          </p>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            Ongoing assessment series currently in progress.
          </p>
        </Card>
      </section>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              Result evidence quality
            </p>
            <p className="mt-1 text-sm text-foreground">
              Final numeric marks and explicit learner evidence remain separate from incomplete entry work.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={`${liveData.data_quality.final_mark_count} final marks`}
              tone="ok"
            />
            <StatusPill
              label={`${liveData.data_quality.explicit_evidence_count} status records`}
              tone="ok"
            />
            <StatusPill
              label={`${liveData.data_quality.missing_or_incomplete_count} missing or incomplete`}
              tone={liveData.data_quality.missing_or_incomplete_count > 0 ? "warning" : "ok"}
            />
          </div>
        </div>
      </Card>

      {/* Rich Analytics Dashboard via Recharts */}
      <AnalyticsDashboard liveData={liveData} />

      {/* Subject Performance Table */}
      {liveData.subjectPerformance && liveData.subjectPerformance.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-base font-bold text-foreground">Subject Performance</h3>
            <p className="text-xs text-muted leading-relaxed">
              Detailed mean score, pass rate, and CBC competency grade distribution (EE, ME, AE, BE) by subject.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-muted/50 border-b border-border">
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Subject Name</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted text-center">Mean Score</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted text-center">Pass Rate</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">CBC Grade Distribution (EE | ME | AE | BE)</th>
                </tr>
              </thead>
              <tbody>
                {liveData.subjectPerformance.map((subj) => {
                  const ee = subj.ee_count ?? 0;
                  const me = subj.me_count ?? 0;
                  const ae = subj.ae_count ?? 0;
                  const be = subj.be_count ?? 0;
                  const totalGradeCount = ee + me + ae + be;
                  
                  // Calculate percentages for stacked bar
                  const eePct = totalGradeCount > 0 ? (ee / totalGradeCount) * 100 : 0;
                  const mePct = totalGradeCount > 0 ? (me / totalGradeCount) * 100 : 0;
                  const aePct = totalGradeCount > 0 ? (ae / totalGradeCount) * 100 : 0;
                  const bePct = totalGradeCount > 0 ? (be / totalGradeCount) * 100 : 0;

                  return (
                    <tr key={subj.subject_id} className="border-b border-border hover:bg-surface-muted/20 transition-colors">
                      <td className="p-4 text-sm font-semibold text-foreground">{subj.subject_name}</td>
                      <td className="p-4 text-sm font-bold text-center text-foreground">{subj.mean_score}%</td>
                      <td className="p-4 text-sm font-bold text-center text-foreground">
                        <span className={`px-2 py-0.5 rounded text-xs ${subj.pass_rate >= 50 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                          {subj.pass_rate}%
                        </span>
                      </td>
                      <td className="p-4 max-w-[400px]">
                        <div className="space-y-2">
                          {/* Stacked Progress Bar */}
                          {totalGradeCount > 0 ? (
                            <div className="flex h-3 w-full overflow-hidden rounded bg-muted">
                              {ee > 0 && (
                                <div 
                                  style={{ width: `${eePct}%` }} 
                                  className="bg-success" 
                                  title={`Exceeding Expectation (EE): ${ee} students`} 
                                />
                              )}
                              {me > 0 && (
                                <div 
                                  style={{ width: `${mePct}%` }} 
                                  className="bg-info" 
                                  title={`Meeting Expectation (ME): ${me} students`} 
                                />
                              )}
                              {ae > 0 && (
                                <div 
                                  style={{ width: `${aePct}%` }} 
                                  className="bg-warning" 
                                  title={`Approaching Expectation (AE): ${ae} students`} 
                                />
                              )}
                              {be > 0 && (
                                <div 
                                  style={{ width: `${bePct}%` }} 
                                  className="bg-danger" 
                                  title={`Below Expectation (BE): ${be} students`} 
                                />
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-muted">No grade boundaries matched</div>
                          )}

                          {/* Pill counts */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-success/10 text-success rounded">
                              EE: {ee}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-info/10 text-info rounded">
                              ME: {me}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-warning/10 text-warning rounded">
                              AE: {ae}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-danger/10 text-danger rounded">
                              BE: {be}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Student Insights Section: 3-column Comparison */}
      <section className="grid gap-6 md:grid-cols-3">
        {/* Column 1: Top Performers */}
        <Card className="p-5 flex flex-col">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Top Performers
          </h4>
          <div className="mt-3 divide-y divide-border/60 flex-1">
            {liveData.studentProgress.topPerformers && liveData.studentProgress.topPerformers.length > 0 ? (
              liveData.studentProgress.topPerformers.map((student) => (
                <div key={student.student_id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{student.student_name}</p>
                    <p className="text-muted text-[10px]">Adm: {student.admission_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">{student.average_percentage}%</p>
                    <p className="text-muted text-[9px]">{student.assessments_taken} assessments</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-xs py-4 text-center">Top performers appear after marks are submitted and results are processed.</p>
            )}
          </div>
        </Card>

        {/* Column 2: Top Improvers */}
        <Card className="p-5 flex flex-col">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <span className="h-2 w-2 rounded-full bg-info"></span>
            Top Improvers
          </h4>
          <div className="mt-3 divide-y divide-border/60 flex-1">
            {liveData.studentProgress.topImprovers && liveData.studentProgress.topImprovers.length > 0 ? (
              liveData.studentProgress.topImprovers.map((student) => (
                <div key={student.student_id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{student.student_name}</p>
                    <p className="text-muted text-[10px]">Adm: {student.admission_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-info">+{student.improvement}%</p>
                    <p className="text-muted text-[9px]">
                      {student.latest_average}% vs {student.previous_average}%
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-xs py-4 text-center">Improvers appear after learners have at least two processed assessment results.</p>
            )}
          </div>
        </Card>

        {/* Column 3: At-Risk Students */}
        <Card className="p-5 flex flex-col">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
            <span className="h-2 w-2 rounded-full bg-danger"></span>
            At-Risk Students
          </h4>
          <div className="mt-3 divide-y divide-border/60 flex-1">
            {liveData.studentProgress.atRiskStudents && liveData.studentProgress.atRiskStudents.length > 0 ? (
              liveData.studentProgress.atRiskStudents.map((student) => (
                <div key={student.student_id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{student.student_name}</p>
                    <p className="text-muted text-[10px]">Adm: {student.admission_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-danger">{student.average_percentage}%</p>
                    <p className="text-muted text-[9px]">{student.assessments_taken} assessments</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted text-xs py-4 text-center">At-risk learners appear after processed marks identify an average below 50%.</p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}

function PublishingHistoryPanel({
  publishing,
  history,
}: {
  publishing: ExamPublishingItem[];
  history: HistoricalResult[];
}) {
  const historyColumns: DataTableColumn<HistoricalResult>[] = [
    { id: "exam", header: "Exam", render: (row) => <span className="font-semibold">{row.exam}</span> },
    { id: "mean", header: "Mean", render: (row) => row.mean },
    { id: "topSubject", header: "Top subject", render: (row) => row.topSubject },
    { id: "riskSignal", header: "Risk signal", render: (row) => row.riskSignal },
  ];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Publishing</p>
            <h3 className="mt-2 section-title text-lg">Exam publishing</h3>
            <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted">
              Release reports to parents only after approvals, PDF generation, portal visibility, and immutable result locking are ready.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() =>
              openPrintDocument({
                eyebrow: "Publishing controls",
                title: "Exam publishing summary",
                subtitle: "Current report publishing state",
                rows: publishing.map((item) => ({ label: item.label, value: `${item.value} - ${item.helper}` })),
                footer: "Publishing controls generated from the active exams workflow.",
              })
            }
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Publish controls
          </Button>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {publishing.map((item) => (
            <div key={item.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <StatusPill label={item.value} tone={item.tone} />
              </div>
              <p className="mt-2 text-[13px] leading-5 text-muted">{item.helper}</p>
            </div>
          ))}
        </div>
      </Card>
      <DataTable
        title="Historical results"
        subtitle="Protected historical records stay readable for trend comparison without allowing published-result edits."
        columns={historyColumns}
        rows={history}
        getRowKey={(row) => row.id}
      />
    </div>
  );
}

function ResultLockingPanel({
  canPublish,
  isLiveMode,
  hasSelectedSeries,
  isPending,
  feedback,
  onPublish,
}: {
  canPublish: boolean;
  isLiveMode: boolean;
  hasSelectedSeries: boolean;
  isPending: boolean;
  feedback: string | null;
  onPublish: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <p className="eyebrow">Publishing and locks</p>
          <h3 className="mt-2 section-title text-lg">Controlled publishing with immutable result records</h3>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ["Publishing gate", "Dean-approved report cards are required"],
              ["Selected series", hasSelectedSeries ? "Tenant exam series selected" : "No tenant exam series selected"],
              ["Conflict handling", "Concurrent edits create reviewable versions"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-[13px] leading-5 text-muted">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-surface-muted p-4">
          <LockKeyhole className="h-6 w-6 text-info" />
          <p className="mt-4 text-sm font-semibold text-foreground">Principal publishing control</p>
          <p className="mt-2 text-[13px] leading-5 text-muted">
            This control calls the canonical tenant-scoped exam-series publishing workflow. No local lock state is created.
          </p>
          <Button
            className="mt-4"
            onClick={onPublish}
            disabled={!canPublish || !isLiveMode || !hasSelectedSeries || isPending}
            block
          >
            {isPending ? "Publishing..." : "Publish selected exam series"}
          </Button>
          {!canPublish ? (
            <p className="mt-3 text-[12px] font-semibold text-warning">Principal publishing permission is required.</p>
          ) : null}
          {feedback ? <p className="mt-3 text-[12px] font-semibold text-muted">{feedback}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function AuditPanel({
  audit,
}: {
  audit: ExamAuditEntry[];
}) {
  const columns: DataTableColumn<ExamAuditEntry>[] = [
    { id: "actor", header: "Actor", render: (row) => <span className="font-semibold">{row.actor}</span> },
    { id: "action", header: "Action", render: (row) => row.action },
    { id: "scope", header: "Scope", render: (row) => row.scope },
    { id: "time", header: "Time", render: (row) => row.time },
    { id: "detail", header: "Detail", render: (row) => row.detail },
  ];

  return (
    <DataTable
      title="Audit log"
      subtitle="Every edit, approval, rejection, lock, reopen, and publishing event is traceable."
      columns={columns}
      rows={audit}
      getRowKey={(row) => row.id}
    />
  );
}

function getBatchProgressLabel(batch: LiveReportCardBatchStatus | null) {
  if (!batch) {
    return "No active batch";
  }

  return `${batch.completed_students}/${batch.total_students} report cards`;
}

function ReportCardArtifactPreview({
  preview,
}: {
  preview: ExamReportCardPreview | null;
}) {
  if (!preview) {
    return (
      <Card className="p-5">
        <p className="eyebrow">Report-card preview</p>
        <h3 className="mt-2 text-base font-semibold text-foreground">Generated artifact pending</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Live report-card metadata appears here after generation or after the latest approved card loads.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Report-card preview</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{preview.title}</h3>
          <p className="mt-1 text-sm text-muted">{preview.className} - {preview.summary}</p>
        </div>
        <StatusPill label={preview.status} tone={preview.status === "published" ? "ok" : "warning"} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Verification</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{preview.verificationCode}</p>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Artifact</p>
          <p className="mt-1 break-all text-sm font-semibold text-foreground">{preview.artifactId}</p>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Generated</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{preview.generatedAt}</p>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Checksum</p>
          <p className="mt-1 break-all text-sm font-semibold text-foreground">{preview.checksum}</p>
        </div>
      </div>
      {preview.downloadUrl ? (
        <p className="mt-3 break-all text-[12px] font-semibold text-info">{preview.downloadUrl}</p>
      ) : null}
    </Card>
  );
}

function BatchProgressCard({
  batch,
  isPolling,
}: {
  batch: LiveReportCardBatchStatus | null;
  isPolling: boolean;
}) {
  const processed = batch?.completed_students ?? 0;
  const total = batch?.total_students ?? 0;
  const progress = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Batch progress</p>
          <h3 className="mt-2 text-base font-semibold text-foreground">{getBatchProgressLabel(batch)}</h3>
          <p className="mt-1 text-sm text-muted">
            {batch ? `${batch.queue_status ?? batch.status} - ${batch.artifact_count ?? processed} artifacts` : "Polling starts after a class batch is requested."}
          </p>
        </div>
        <StatusPill label={isPolling ? "Polling" : batch?.status ?? "Idle"} tone={batch ? "warning" : "ok"} />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-strong">
        <div className="h-full rounded-full bg-info" style={{ width: `${progress}%` }} />
      </div>
      {batch?.failed_students ? (
        <p className="mt-3 text-sm font-semibold text-danger">{batch.failed_students} failed artifacts need review.</p>
      ) : null}
    </Card>
  );
}

function LiveExamsOperationsPanel({
  access,
  apiConfigured,
  isLiveMode,
  isLoading,
  error,
  markSheets,
  selectedPreview,
  batchStatus,
  batchPolling,
  message,
  activeActionId,
  onSaveMark,
  onPreviewUpload,
  onLockSheet,
  onCorrectMark,
  onGenerateReportCard,
  onGenerateBatch,
  onPublishSelected,
}: {
  access: ExamsAccessPolicy;
  apiConfigured: boolean;
  isLiveMode: boolean;
  isLoading: boolean;
  error: string | null;
  markSheets: ExamMarkSheetView[];
  selectedPreview: ExamReportCardPreview | null;
  batchStatus: LiveReportCardBatchStatus | null;
  batchPolling: boolean;
  message: string | null;
  activeActionId: string | null;
  onSaveMark: () => void;
  onPreviewUpload: () => void;
  onLockSheet: () => void;
  onCorrectMark: () => void;
  onGenerateReportCard: () => void;
  onGenerateBatch: () => void;
  onPublishSelected: () => void;
}) {
  const disabled = !isLiveMode || isLoading || Boolean(activeActionId);
  const statusLabel = isLiveMode
    ? "Live exams API connected"
    : apiConfigured
      ? "Live sign-in required"
      : "Exams API unavailable";

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">Live exams workflow</p>
            <h3 className="mt-2 section-title text-lg">Mark sheets and report-card operations</h3>
            <p className="mt-1 text-[13px] leading-5 text-muted">
              {error ?? (isLoading ? "Loading live exam records..." : statusLabel)}
            </p>
          </div>
          <StatusPill label={statusLabel} tone={isLiveMode ? "ok" : "warning"} />
        </div>

        {markSheets.length > 0 ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {markSheets.map((sheet) => (
              <div key={sheet.id} className="rounded-[var(--radius-sm)] border border-border bg-surface-muted px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{sheet.title}</p>
                  <StatusPill label={sheet.status} tone={sheet.tone} />
                </div>
                <p className="mt-1 text-[13px] text-muted">{sheet.progressLabel}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[var(--radius-sm)] border border-dashed border-border bg-surface-muted px-4 py-5 text-sm text-muted">
            No tenant-authoritative mark sheets are available for this active role.
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {access.canEnterMarks ? (
            <>
              <Button size="sm" onClick={onSaveMark} disabled={disabled}>
                <ClipboardCheck className="h-3.5 w-3.5" />
                Save mark
              </Button>
              <Button size="sm" variant="secondary" onClick={onPreviewUpload} disabled={disabled}>
                <Upload className="h-3.5 w-3.5" />
                Preview upload
              </Button>
              <Button size="sm" variant="secondary" onClick={onLockSheet} disabled={disabled}>
                <LockKeyhole className="h-3.5 w-3.5" />
                Lock sheet
              </Button>
            </>
          ) : null}
          {access.canModerate ? (
            <Button size="sm" variant="secondary" onClick={onCorrectMark} disabled={disabled}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Correct locked mark
            </Button>
          ) : null}
          {access.canGenerateReportCards ? (
            <>
              <Button size="sm" onClick={onGenerateReportCard} disabled={disabled}>
                <FileDown className="h-3.5 w-3.5" />
                Generate report card
              </Button>
              <Button size="sm" variant="secondary" onClick={onGenerateBatch} disabled={disabled}>
                <Users className="h-3.5 w-3.5" />
                Generate class batch
              </Button>
            </>
          ) : null}
          {access.canPublishReportCards ? (
            <Button size="sm" onClick={onPublishSelected} disabled={disabled || !selectedPreview}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Publish selected card
            </Button>
          ) : null}
        </div>

        {message ? (
          <div aria-live="polite" className="mt-4 rounded-[var(--radius-sm)] border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-foreground">
            {message}
          </div>
        ) : null}
      </Card>

      <div className="space-y-5">
        <ReportCardArtifactPreview preview={selectedPreview} />
        <BatchProgressCard batch={batchStatus} isPolling={batchPolling} />
      </div>
    </section>
  );
}

export function ExamsModuleScreen({
  role,
  schoolName,
  tenantSlug,
  initialLiveWorkspace,
  liveSessionOverride,
  teachingAssignmentsOverride,
  moduleDataSeed,
}: {
  role: SchoolExperienceRole;
  schoolName: string;
  tenantSlug?: string | null;
  initialLiveWorkspace?: ExamsLiveWorkspace;
  liveSessionOverride?: ReturnType<typeof useLiveTenantSession>;
  teachingAssignmentsOverride?: ExamTeachingAssignment[];
  moduleDataSeed?: ExamsModuleDataSeed;
}) {
  const data = useMemo(
    () => buildExamsModuleData({ role, schoolName, seed: moduleDataSeed }),
    [moduleDataSeed, role, schoolName],
  );
  const liveTenantId = tenantSlug?.trim() || schoolName;
  const queryClient = useQueryClient();
  const discoveredLiveSession = useLiveTenantSession(liveTenantId);
  const liveSession = liveSessionOverride ?? discoveredLiveSession;
  const [saveState, setSaveState] = useState<SaveState>("synced");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("draft");
  const [moduleMessage, setModuleMessage] = useState<string | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<ExamReportCardPreview | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeBatchStatus, setActiveBatchStatus] = useState<LiveReportCardBatchStatus | null>(null);
  const teachingAssignments = useMemo(
    () => teachingAssignmentsOverride ?? [],
    [teachingAssignmentsOverride],
  );
  const livePermissions = liveSession.session
    ? (Array.isArray(liveSession.session.user.permissions)
        ? liveSession.session.user.permissions
        : [])
    : undefined;
  const access = useMemo(
    () => resolveExamsAccessPolicy({
      role,
      permissions: livePermissions,
      hasTeachingAssignment: teachingAssignments.length > 0,
    }),
    [livePermissions, role, teachingAssignments.length],
  );
  const [selectedTeachingAssignmentId, setSelectedTeachingAssignmentId] = useState<string | null>(null);
  const [examEntryMessage, setExamEntryMessage] = useState<string | null>(null);
  const [principalApprovalMessage, setPrincipalApprovalMessage] = useState<string | null>(null);

  const liveWorkspaceQuery = useQuery({
    queryKey: ["exams-module", liveSession.session?.tenantId],
    queryFn: () => fetchExamsWorkspaceLive(liveSession.session!),
    enabled: Boolean(liveSession.session && (access.canViewAllocations || access.canViewReportCards)),
    initialData: initialLiveWorkspace,
    placeholderData: (previous) => previous,
  });
  const batchStatusQuery = useQuery({
    queryKey: ["exams-report-card-batch", liveSession.session?.tenantId, activeBatchId],
    queryFn: () => fetchReportCardBatchStatusLive(liveSession.session!, activeBatchId!),
    enabled: Boolean(liveSession.session && access.canViewReportCards && activeBatchId),
    refetchInterval: activeBatchId ? 3000 : false,
  });
  const analyticsQuery = useQuery({
    queryKey: ["exams-analytics", liveSession.session?.tenantId],
    queryFn: () => fetchExamsAnalyticsLive(liveSession.session!),
    enabled: Boolean(liveSession.session && access.canViewAnalytics),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
  const isLiveMode = Boolean(liveSession.session);
  const liveWorkspace = liveWorkspaceQuery.data;
  const liveMarkSheets = liveWorkspace?.markSheets ?? [];
  const hasAssignedTeacherEntry = teachingAssignments.length > 0;
  const activeTeachingAssignmentId =
    teachingAssignments.find((assignment) => assignment.id === selectedTeachingAssignmentId)?.id ??
    teachingAssignments[0]?.id ??
    null;
  const selectedMarkSheet = liveMarkSheets[0] ?? null;
  const selectedPreview = generatedPreview ?? liveWorkspace?.reportCards[0] ?? null;
  const batchStatus = batchStatusQuery.data ?? activeBatchStatus;
  const liveAllocationRows: ExamAllocationRow[] = liveMarkSheets.map((sheet) => {
    const [className, subject] = sheet.title.split(" - ");

    return {
      id: sheet.id,
      className: className || sheet.classSectionId,
      subject: subject || sheet.subjectId,
      teacher: role === "teacher" ? "Assigned teacher" : "Subject teacher",
      reviewer: role === "principal" ? "Principal approval" : "HOD review",
      learners: sheet.learnerCount,
      status: sheet.status,
      tone: sheet.tone,
    };
  });

  function openTeachingAssignment(assignment: ExamTeachingAssignment) {
    setSelectedTeachingAssignmentId(assignment.id);
    setExamEntryMessage(`${assignment.subject} marksheet ready for ${getAssignmentScope(assignment)}.`);
  }

  function saveTeachingDraft(assignment: ExamTeachingAssignment) {
    setSelectedTeachingAssignmentId(assignment.id);
    setExamEntryMessage(`Draft not saved: open the assigned live mark sheet so changes are persisted and audited for ${getAssignmentScope(assignment)} ${assignment.subject}.`);
  }

  function downloadTeachingTemplate(assignment: ExamTeachingAssignment) {
    setSelectedTeachingAssignmentId(assignment.id);
    const learners = buildAssignmentLearners(assignment);

    if (learners.length === 0) {
      setExamEntryMessage(`No tenant-authoritative learners were returned for ${getAssignmentScope(assignment)} ${assignment.subject}; no template was created.`);
      return;
    }

    downloadCsvFile({
      filename: `exam-entry-${assignment.id}.csv`,
      headers: ["Admission Number", "Learner Name", "Paper 1", "Paper 2", "Practical", "Teacher Comment"],
      rows: learners.map((learner) => [
        learner.admissionNumber,
        learner.learnerName,
        learner.paper1,
        learner.paper2,
        learner.practical,
        learner.teacherComment,
      ]),
    });
    setExamEntryMessage(`Template downloaded for ${getAssignmentScope(assignment)} ${assignment.subject}.`);
  }

  function requestTeachingImport(assignment: ExamTeachingAssignment) {
    setSelectedTeachingAssignmentId(assignment.id);
    setExamEntryMessage(`Import needs a selected CSV or Excel file before ${assignment.subject} records are changed.`);
  }

  function openPrincipalAcademicAction(action: string) {
    const actionGuidance: Record<string, string> = {
      "Approve Publishing": "Use the Report cards tab to approve selected reports after the generated artifact and approval blockers are clear.",
      "Publish to Parent Dashboard": "Publishing requires an approved generated report card; use the live publish handler when a card is selected.",
      "Send SMS Notice": "SMS notices are queued only after provider configuration and parent contacts are available.",
      "Return for Correction": "Open the Approval pipeline tab to return a selected record with a correction reason.",
      "Open Approval History": "Open the Audit trail tab for school-scoped approval history.",
    };
    setPrincipalApprovalMessage(actionGuidance[action] ?? `${action} selected for principal review.`);
  }

  async function refreshLiveExams() {
    await queryClient.invalidateQueries({
      queryKey: ["exams-module", liveSession.session?.tenantId],
    });
  }

  function buildLiveMarkInput(score = 84) {
    if (!selectedMarkSheet) {
      throw new Error("No live mark sheet is available.");
    }

    if (!selectedPreview?.studentId) {
      throw new Error("No live learner record is selected for this exam action.");
    }

    return {
      exam_series_id: selectedMarkSheet.examSeriesId,
      assessment_id: selectedMarkSheet.assessmentId,
      academic_term_id: selectedMarkSheet.academicTermId,
      class_section_id: selectedMarkSheet.classSectionId,
      subject_id: selectedMarkSheet.subjectId,
      student_id: selectedPreview.studentId,
      score,
      remarks: "Saved from the live exams desk.",
    };
  }

  async function runLiveAction(actionId: string, action: () => Promise<string>) {
    if (!liveSession.session) {
      setModuleError("Connect a live school session before changing exam records.");
      return;
    }

    setActiveActionId(actionId);
    setModuleError(null);
    setModuleMessage(null);

    try {
      const message = await action();
      setModuleMessage(message);
      await refreshLiveExams();
    } catch (error) {
      setModuleError(error instanceof Error ? error.message : "Live exams action failed.");
    } finally {
      setActiveActionId(null);
    }
  }

  function requireCapability(allowed: boolean, message: string) {
    if (allowed) return true;
    setModuleMessage(null);
    setModuleError(message);
    return false;
  }

  function saveLiveMark() {
    if (!requireCapability(access.canEnterMarks, "The active role cannot enter exam marks.")) return;
    void runLiveAction("save-mark", async () => {
      await enterExamMarkLive(liveSession.session!, buildLiveMarkInput(84));
      setSaveState("synced");
      return "Mark saved to live exams ledger.";
    });
  }

  function previewBulkUpload() {
    if (!requireCapability(access.canEnterMarks, "The active role cannot upload exam marks.")) return;
    void runLiveAction("preview-upload", async () => {
      await bulkUploadExamMarksLive(liveSession.session!, {
        mode: "preview",
        rows: [buildLiveMarkInput(84)],
      });
      return "Bulk upload preview accepted.";
    });
  }

  function lockLiveSheet() {
    if (!requireCapability(access.canEnterMarks, "The active role cannot lock exam mark sheets.")) return;
    void runLiveAction("lock-sheet", async () => {
      if (!selectedMarkSheet) {
        throw new Error("No live mark sheet is available.");
      }

      await lockExamMarkSheetLive(liveSession.session!, selectedMarkSheet.id);
      setSubmissionState("submitted");
      return "Mark sheet locked for approval.";
    });
  }

  function correctLiveMark() {
    if (!requireCapability(access.canModerate, "The active role cannot review locked-mark corrections.")) return;
    void runLiveAction("correct-mark", async () => {
      throw new Error("No locked mark correction record is selected. Open a returned locked-mark correction from the moderation queue before submitting an audited correction.");
    });
  }

  function generateLiveReportCard() {
    if (!requireCapability(access.canGenerateReportCards, "Exams Manager authorization is required to generate report cards.")) return;
    void runLiveAction("generate-report-card", async () => {
      if (!selectedMarkSheet) {
        throw new Error("No live mark sheet is available.");
      }

      if (!selectedPreview?.studentId) {
        throw new Error("No live learner record is selected for report-card generation.");
      }

      const generated = await generateReportCardLive(liveSession.session!, {
        exam_series_id: selectedMarkSheet.examSeriesId,
        student_id: selectedPreview.studentId,
      });
      setGeneratedPreview(mapLiveReportCardToPreview(generated));
      return "Report card generated from live marks.";
    });
  }

  function generateLiveBatch() {
    if (!requireCapability(access.canGenerateReportCards, "Exams Manager authorization is required to generate report-card batches.")) return;
    void runLiveAction("generate-batch", async () => {
      if (!selectedMarkSheet) {
        throw new Error("No live mark sheet is available.");
      }

      const batch = await generateReportCardBatchLive(liveSession.session!, {
        exam_series_id: selectedMarkSheet.examSeriesId,
        class_section_id: selectedMarkSheet.classSectionId,
      });
      setActiveBatchId(batch.id);
      setActiveBatchStatus(batch);
      return "Report-card batch generation started.";
    });
  }

  function publishLiveReportCard() {
    if (!requireCapability(access.canPublishReportCards, "Principal authorization is required to publish report cards.")) return;
    void runLiveAction("publish-report-card", async () => {
      if (!selectedPreview) {
        throw new Error("No generated report card is selected.");
      }

      await publishReportCardLive(liveSession.session!, {
        exam_series_id: selectedPreview.examSeriesId,
        student_id: selectedPreview.studentId,
        report_snapshot_id: selectedPreview.reportSnapshotId,
      });
      return "Report card published to the parent portal.";
    });
  }

  function transitionReportCard(
    card: ExamReportCardPreview,
    action: LiveReportCardWorkflowAction,
  ) {
    const allowed = action === "submit"
      ? access.canSubmitReportCards
      : action === "approve"
        ? access.canApproveReportCards
        : access.canPublishReportCards;
    const requiredRole = action === "submit"
      ? "Exams Manager"
      : action === "approve"
        ? "Dean of Academics"
        : "Principal";

    if (!requireCapability(allowed, `${requiredRole} authorization is required to ${action} report cards.`)) return;

    void runLiveAction(`report-card-${action}-${card.id}`, async () => {
      await transitionLiveReportCard(liveSession.session!, card.id, action);
      return action === "submit"
        ? "Report card submitted to the Dean review queue."
        : action === "approve"
          ? "Report card approved through the tenant workflow."
          : "Report card published to the parent portal.";
    });
  }

  function publishLiveSeries() {
    if (!requireCapability(access.canPublishReportCards, "Principal authorization is required to publish exam results.")) return;

    void runLiveAction("publish-exam-series", async () => {
      if (!selectedMarkSheet) {
        throw new Error("No tenant-authoritative exam series is selected.");
      }

      await publishLiveExamSeries(liveSession.session!, selectedMarkSheet.examSeriesId);
      return "Exam series published through the tenant workflow.";
    });
  }

  function submitForApproval() {
    setModuleMessage(null);
    setModuleError("This readiness grid cannot submit marks. Use an assigned live mark sheet so the tenant workflow is persisted and audited.");
  }

  const workflowFeedback = moduleError
    ? { message: moduleError, tone: "critical" as StatusTone }
    : moduleMessage
      ? { message: moduleMessage, tone: "ok" as StatusTone }
      : null;
  const examTabs = ([
    access.canViewDashboard
      ? { id: "dashboard", label: "Dashboard", panel: <DashboardPanel data={data} /> }
      : null,
    access.canManageSetup
      ? { id: "setup", label: "Setup", panel: <ExamSetupPanel setup={data.setup} /> }
      : null,
    access.canViewAllocations
      ? {
          id: "allocation",
          label: "Allocation",
          panel: <AllocationPanel allocations={liveAllocationRows.length > 0 ? liveAllocationRows : data.allocations} />,
        }
      : null,
    access.canEnterMarks
      ? {
          id: "marks",
          label: "Marks entry",
          panel: (
            <MarksEntryGrid
              fields={data.fields}
              initialRows={data.marks}
              saveState={saveState}
              setSaveState={setSaveState}
              submissionState={submissionState}
              onSubmitForApproval={submitForApproval}
            />
          ),
        }
      : null,
    access.canEnterMarks
      ? { id: "bulk", label: "Bulk upload", panel: <BulkUploadPanel /> }
      : null,
    access.canModerate
      ? { id: "moderation", label: "Moderation", panel: <ModerationPanel queues={data.queues} /> }
      : null,
    access.canApproveReportCards
      ? {
          id: "approval",
          label: "Approval pipeline",
          panel: (
            <ApprovalPanel
              approvals={data.approvals}
            />
          ),
        }
      : null,
    access.canViewReportCards
      ? {
          id: "reports",
          label: "Report cards",
          panel: (
            <ReportCardsPanel
              data={data}
              liveCards={liveWorkspace?.reportCards ?? []}
              access={access}
              isLiveMode={isLiveMode}
              activeActionId={activeActionId}
              feedback={workflowFeedback}
              onTransition={transitionReportCard}
            />
          ),
        }
      : null,
    access.canManageSetup || access.canModerate
      ? { id: "competencies", label: "CBC competencies", panel: <CompetenciesPanel competencies={data.competencies} /> }
      : null,
    access.canViewAnalytics
      ? {
          id: "analytics",
          label: "Analytics",
          panel: (
            <AnalyticsPanel
              analysis={data.analysis}
              history={data.history}
              isLiveMode={isLiveMode}
              isLoading={analyticsQuery.isLoading}
              error={analyticsQuery.error}
              liveData={analyticsQuery.data}
              refetch={analyticsQuery.refetch}
            />
          ),
        }
      : null,
    access.canPublishReportCards
      ? {
          id: "publishing",
          label: "Publishing & history",
          panel: <PublishingHistoryPanel publishing={data.publishing} history={data.history} />,
        }
      : null,
    access.canPublishReportCards
      ? {
          id: "locking",
          label: "Result publishing",
          panel: (
            <ResultLockingPanel
              canPublish={access.canPublishReportCards}
              isLiveMode={isLiveMode}
              hasSelectedSeries={Boolean(selectedMarkSheet)}
              isPending={activeActionId === "publish-exam-series"}
              feedback={moduleError ?? moduleMessage}
              onPublish={publishLiveSeries}
            />
          ),
        }
      : null,
    access.canViewAudit
      ? { id: "audit", label: "Audit trail", panel: <AuditPanel audit={data.audit} /> }
      : null,
  ] as Array<TabItem | null>).filter((item): item is TabItem => item !== null);
  const defaultExamTab = examTabs.some((item) => item.id === "marks")
    ? "marks"
    : examTabs[0]?.id;

  return (
    <div className="space-y-6">
      <PageIntro
        schoolName={data.schoolName}
        currentExam={data.currentExam}
        currentClass={data.currentClass}
        saveState={saveState}
        hasAssignedTeacherEntry={access.canEnterMarks && hasAssignedTeacherEntry}
        canGenerateReports={access.canViewReportCards}
        onContinueMarksEntry={() => {
          const assignment = teachingAssignments[0];
          if (assignment) {
            openTeachingAssignment(assignment);
          }
        }}
        onImportSpreadsheet={() => {
          const assignment = teachingAssignments[0];
          if (assignment) {
            requestTeachingImport(assignment);
          }
        }}
        onGenerateReports={() =>
          openPrintDocument({
            eyebrow: "Exams report",
            title: `${data.currentExam} operations report`,
            subtitle: `${data.schoolName} - ${data.currentClass}`,
            rows: [
              { label: "Current exam", value: data.currentExam },
              { label: "Current class", value: data.currentClass },
              { label: "Teaching assignments", value: String(teachingAssignments.length) },
              { label: "Live mode", value: isLiveMode ? "Connected" : "Not connected" },
            ],
            footer: "Generated from the active exams command center.",
          })
        }
      />
      <MetricStrip metrics={data.metrics} />
      {access.canPublishReportCards ? (
        <PrincipalAcademicApprovalPanel
          message={principalApprovalMessage}
          onAction={openPrincipalAcademicAction}
        />
      ) : null}
      {access.canEnterMarks || hasAssignedTeacherEntry ? (
        <MyExamEntryPanel
          assignments={teachingAssignments}
          activeAssignmentId={activeTeachingAssignmentId}
          message={examEntryMessage}
          onOpenAssignment={openTeachingAssignment}
          onDownloadTemplate={downloadTeachingTemplate}
          onSaveDraft={saveTeachingDraft}
          onImportRequest={requestTeachingImport}
        />
      ) : null}
      {access.canViewDashboard ? (
        <LiveExamsOperationsPanel
          access={access}
          apiConfigured={liveSession.apiConfigured}
          isLiveMode={isLiveMode}
          isLoading={liveWorkspaceQuery.isLoading}
          error={moduleError ?? liveSession.error ?? null}
          markSheets={liveMarkSheets}
          selectedPreview={selectedPreview}
          batchStatus={batchStatus ?? null}
          batchPolling={Boolean(activeBatchId && batchStatusQuery.isFetching)}
          message={moduleMessage}
          activeActionId={activeActionId}
          onSaveMark={saveLiveMark}
          onPreviewUpload={previewBulkUpload}
          onLockSheet={lockLiveSheet}
          onCorrectMark={correctLiveMark}
          onGenerateReportCard={generateLiveReportCard}
          onGenerateBatch={generateLiveBatch}
          onPublishSelected={publishLiveReportCard}
        />
      ) : null}
      {examTabs.length > 0 ? (
        <Tabs defaultTab={defaultExamTab} items={examTabs} />
      ) : (
        <Card className="border-warning/30 bg-warning/10 p-5">
          <p className="eyebrow">Access restricted</p>
          <h3 className="mt-2 section-title text-lg">No exams capability is active for this role</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            The backend permission set for the active role does not allow marks, review, report cards, publishing, analytics, or audit access.
          </p>
        </Card>
      )}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: FileSpreadsheet,
            title: "Keyboard-first table system",
            value: "Arrow, enter, tab, paste, sticky headers, frozen learner columns",
          },
          {
            icon: History,
            title: "Recovery and versions",
            value: "Autosave checkpoints, local draft recovery, controlled reopen history",
          },
          {
            icon: ShieldCheck,
            title: "Academic integrity",
      value: "School data isolation, role scoping, immutable publishing, complete edit history",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <Card key={item.title} className="p-5">
              <Icon className="h-5 w-5 text-info" />
              <h3 className="mt-4 text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-[13px] leading-5 text-muted">{item.value}</p>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
