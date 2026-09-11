import type { LiveAuthSession } from "@/lib/dashboard/api-client";
import type { StatusTone } from "@/lib/dashboard/types";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";

export interface LiveExamMarkSheet {
  id: string;
  exam_series_id: string;
  exam_series_name?: string | null;
  academic_term_id?: string | null;
  assessment_id?: string | null;
  subject_id: string;
  subject_name?: string | null;
  class_section_id: string;
  class_name?: string | null;
  opens_at?: string | null;
  closes_at?: string | null;
  status: "open" | "closed" | string;
  mark_count: number;
  draft_mark_count?: number | null;
  submitted_mark_count?: number | null;
  reviewed_mark_count?: number | null;
  locked_mark_count?: number | null;
  published_mark_count?: number | null;
  learner_count?: number | null;
  last_marked_at?: string | null;
}

export interface LiveExamReportCard {
  id: string;
  exam_series_id?: string | null;
  exam_series_name?: string | null;
  student_id: string;
  student_name?: string | null;
  admission_number?: string | null;
  term?: string | null;
  academic_year?: string | null;
  report_snapshot_id: string;
  status: string;
  verification_code?: string | null;
  revision_number?: number | null;
  is_current?: boolean;
  submitted_by_user_id?: string | null;
  submitted_at?: string | null;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  approval_role?: string | null;
  published_by_user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  published_at?: string | null;
  withdrawn_by_user_id?: string | null;
  withdrawn_at?: string | null;
  workflow_version?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LiveReportCardArtifact {
  id?: string | null;
  artifact_id?: string | null;
  verification_code?: string | null;
  pdf_url?: string | null;
  download_url?: string | null;
  html_url?: string | null;
  checksum_sha256?: string | null;
  generated_at?: string | null;
}

export interface LiveReportCardBatchStatus {
  id: string;
  status: string;
  queue_status?: string | null;
  total_students: number;
  completed_students: number;
  failed_students?: number | null;
  failures?: Array<{ student_id: string; message: string }> | null;
  artifact_count?: number | null;
}

export interface ExamMarkSheetView {
  id: string;
  examSeriesId: string;
  academicTermId: string;
  assessmentId: string;
  subjectId: string;
  classSectionId: string;
  title: string;
  status: string;
  progressLabel: string;
  tone: StatusTone;
  learnerCount: number;
  markCount: number;
}

export interface ExamReportCardPreview {
  id: string;
  examSeriesId: string;
  studentId: string;
  reportSnapshotId: string;
  title: string;
  className: string;
  status: string;
  artifactId: string;
  verificationCode: string;
  downloadUrl: string;
  checksum: string;
  generatedAt: string;
  summary: string;
}

export interface ExamsLiveWorkspace {
  markSheets: ExamMarkSheetView[];
  reportCards: ExamReportCardPreview[];
  rawMarkSheets: LiveExamMarkSheet[];
  rawReportCards: LiveExamReportCard[];
}

export const EXAM_SCORE_STATUSES = [
  "entered",
  "absent",
  "exempt",
  "not_assessed",
  "incomplete",
  "withheld",
  "medical_exception",
  "transfer_student",
] as const;

export type ExamScoreStatus = typeof EXAM_SCORE_STATUSES[number];

export interface EnterExamMarkLiveInput {
  exam_series_id: string;
  assessment_id: string;
  academic_term_id: string;
  class_section_id: string;
  subject_id: string;
  student_id: string;
  score?: number | null;
  score_status?: ExamScoreStatus;
  remarks?: string;
}

export interface BulkExamMarksLiveInput {
  mode?: "preview" | "commit";
  preview_token?: string;
  rows: EnterExamMarkLiveInput[];
}

export interface CorrectLockedExamMarkLiveInput {
  mark_id: string;
  score?: number | null;
  score_status?: ExamScoreStatus;
  reason: string;
  first_approver_user_id?: string;
  second_approver_user_id?: string;
}

export interface GenerateReportCardLiveInput {
  exam_series_id: string;
  student_id: string;
}

export interface GenerateReportCardBatchLiveInput {
  exam_series_id: string;
  class_section_id?: string;
  stream_name?: string;
}

export interface PublishReportCardLiveInput {
  exam_series_id: string;
  student_id: string;
  report_snapshot_id: string;
}

export type ReportCardTransitionAction =
  | "submit"
  | "approve"
  | "recall"
  | "publish"
  | "unpublish";

function withSession<T>(
  session: LiveAuthSession,
  path: string,
  options?: {
    method?: "GET" | "POST" | "PATCH";
    body?: BodyInit | object | null;
  },
) {
  void session;

  return requestSchoolApiProxy<T | { data?: T }>(path, {
    method: options?.method,
    body: options?.body,
    unwrapEnvelope: false,
  }).then(unwrapApiData);
}

function unwrapApiData<T>(payload: T | { data?: T }): T {
  if (
    typeof payload === "object"
    && payload !== null
    && !Array.isArray(payload)
    && "data" in payload
  ) {
    return (payload as { data?: T }).data as T;
  }

  return payload as T;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getReportCardMetadata(card: LiveExamReportCard) {
  const metadata = metadataRecord(card.metadata);
  const reportCard = metadataRecord(metadata.report_card);
  const artifact = metadataRecord(metadata.artifact);

  return { metadata, reportCard, artifact };
}

function formatDate(value?: string | null) {
  if (!value) {
    return "Not generated";
  }

  return value.replace("T", " ").slice(0, 16);
}

export function mapExamMarkSheetFromLive(sheet: LiveExamMarkSheet): ExamMarkSheetView {
  const learnerCount = numberValue(sheet.learner_count, Math.max(numberValue(sheet.mark_count), 1));
  const markCount = numberValue(sheet.mark_count);
  const className = text(sheet.class_name, sheet.class_section_id);
  const subjectName = text(sheet.subject_name, sheet.subject_id);

  return {
    id: sheet.id,
    examSeriesId: sheet.exam_series_id,
    academicTermId: text(sheet.academic_term_id, "term-live"),
    assessmentId: text(sheet.assessment_id, sheet.subject_id),
    subjectId: sheet.subject_id,
    classSectionId: sheet.class_section_id,
    title: `${className} - ${subjectName}`,
    status: sheet.status,
    progressLabel: `${markCount}/${learnerCount} marks`,
    tone: sheet.status === "closed" ? "ok" : markCount >= learnerCount ? "ok" : "warning",
    learnerCount,
    markCount,
  };
}

export function mapLiveReportCardToPreview(card: LiveExamReportCard): ExamReportCardPreview {
  const { metadata, reportCard, artifact } = getReportCardMetadata(card);
  const templateFields = metadataRecord(reportCard.template_fields);
  const student = metadataRecord(reportCard.student);
  const totals = metadataRecord(reportCard.totals);
  const learnerName = text(
    templateFields.learner_name,
    text(student.full_name, text(card.student_name, card.student_id)),
  );
  const className = text(
    templateFields.class_stream,
    [text(student.class_name), text(student.stream_name)].filter(Boolean).join(" ") || "Class on file",
  );
  const meanScore = Number.isFinite(Number(totals.mean_score))
    ? String(Number(totals.mean_score))
    : "";
  const totalScore = Number.isFinite(Number(totals.total_score))
    ? String(Number(totals.total_score))
    : "";
  const summary = [
    totalScore ? `Total ${totalScore}` : null,
    meanScore ? `Mean ${meanScore}` : null,
  ].filter(Boolean).join(" | ") || "Report-card artifact metadata is ready.";

  return {
    id: card.id,
    examSeriesId: text(card.exam_series_id, "series-live"),
    studentId: card.student_id,
    reportSnapshotId: card.report_snapshot_id,
    title: learnerName,
    className,
    status: card.status,
    artifactId: text(artifact.id, text(artifact.artifact_id, card.report_snapshot_id)),
    verificationCode: text(card.verification_code, text(artifact.verification_code, "Verification pending")),
    downloadUrl: text(
      artifact.pdf_url,
      text(artifact.download_url, `/api/exams/report-cards/${encodeURIComponent(card.id)}/download`),
    ),
    checksum: text(artifact.checksum_sha256, "Checksum pending"),
    generatedAt: formatDate(
      text(
        artifact.generated_at,
        text(reportCard.generated_at, text(metadata.generated_at, card.published_at ?? "")),
      ),
    ),
    summary,
  };
}

export function mapExamsWorkspaceFromLive(input: {
  markSheets: LiveExamMarkSheet[];
  reportCards: LiveExamReportCard[];
}): ExamsLiveWorkspace {
  return {
    markSheets: input.markSheets.map(mapExamMarkSheetFromLive),
    reportCards: input.reportCards.map(mapLiveReportCardToPreview),
    rawMarkSheets: input.markSheets,
    rawReportCards: input.reportCards,
  };
}

export async function fetchExamsWorkspaceLive(session: LiveAuthSession) {
  const [markSheets, reportCards] = await Promise.all([
    withSession<LiveExamMarkSheet[]>(session, "/exams/mark-sheets"),
    withSession<LiveExamReportCard[]>(session, "/exams/report-cards"),
  ]);

  return mapExamsWorkspaceFromLive({ markSheets, reportCards });
}

export function fetchBulkMarkTemplateLive(session: LiveAuthSession) {
  return withSession(session, "/exams/marks/bulk-template");
}

export function enterExamMarkLive(session: LiveAuthSession, input: EnterExamMarkLiveInput) {
  return withSession(session, "/exams/marks", {
    method: "POST",
    body: input,
  });
}

export function bulkUploadExamMarksLive(session: LiveAuthSession, input: BulkExamMarksLiveInput) {
  return withSession(session, "/exams/marks/bulk-upload", {
    method: "POST",
    body: input,
  });
}

export function lockExamMarkSheetLive(session: LiveAuthSession, markSheetId: string) {
  return withSession(session, `/exams/mark-sheets/${encodeURIComponent(markSheetId)}/lock`, {
    method: "PATCH",
    body: {
      status: "closed",
    },
  });
}

export function correctLockedExamMarkLive(
  session: LiveAuthSession,
  input: CorrectLockedExamMarkLiveInput,
) {
  return withSession(session, "/exams/marks/corrections", {
    method: "PATCH",
    body: input,
  });
}

export function generateReportCardLive(
  session: LiveAuthSession,
  input: GenerateReportCardLiveInput,
) {
  return withSession<LiveExamReportCard>(session, "/exams/report-cards/generate", {
    method: "POST",
    body: input,
  });
}

export function regenerateReportCardLive(
  session: LiveAuthSession,
  input: GenerateReportCardLiveInput & { reason?: string },
) {
  return withSession<LiveExamReportCard>(session, "/exams/report-cards/regenerate", {
    method: "POST",
    body: input,
  });
}

export function generateReportCardBatchLive(
  session: LiveAuthSession,
  input: GenerateReportCardBatchLiveInput,
) {
  return withSession<LiveReportCardBatchStatus>(session, "/exams/report-cards/batches", {
    method: "POST",
    body: input,
  });
}

export function fetchReportCardBatchStatusLive(session: LiveAuthSession, batchId: string) {
  return withSession<LiveReportCardBatchStatus>(
    session,
    `/exams/report-cards/batches/${encodeURIComponent(batchId)}`,
  );
}

export function publishReportCardLive(
  session: LiveAuthSession,
  input: PublishReportCardLiveInput,
) {
  return withSession(session, "/exams/report-cards/publish", {
    method: "POST",
    body: input,
  });
}

export function transitionLiveReportCard(
  session: LiveAuthSession,
  reportCardId: string,
  action: ReportCardTransitionAction,
  reason?: string,
) {
  return withSession<LiveExamReportCard>(
    session,
    `/exams/report-cards/${encodeURIComponent(reportCardId)}/transition`,
    {
      method: "PATCH",
      body: {
        action,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      },
    },
  );
}

export function publishLiveExamSeries(session: LiveAuthSession, examSeriesId: string) {
  return withSession(
    session,
    `/exams/series/${encodeURIComponent(examSeriesId)}/publish`,
    { method: "POST" },
  );
}

export function unpublishLiveExamSeries(
  session: LiveAuthSession,
  examSeriesId: string,
  reason: string,
) {
  return withSession(
    session,
    `/exams/series/${encodeURIComponent(examSeriesId)}/unpublish`,
    {
      method: "POST",
      body: { reason: reason.trim() },
    },
  );
}

export function buildParentReportCardDownloadPath(reportCardId: string) {
  return `/exams/report-cards/${encodeURIComponent(reportCardId)}/parent-download`;
}

export function createParentReportCardDownloadLive(session: LiveAuthSession, reportCardId: string) {
  return withSession(session, buildParentReportCardDownloadPath(reportCardId));
}

export interface LiveExamsAnalyticsKPIs {
  school_average: number | null;
  pending_reviews: number;
  missing_marks_alerts: number;
  active_exams: number;
}

export interface LiveExamsAnalyticsTrend {
  exam_series_id: string;
  exam_series_name: string;
  starts_on: string;
  average_score: number | null;
  pass_rate?: number | null;
}

export interface LiveExamsAnalyticsSubjectPerformance {
  subject_id: string;
  subject_name: string;
  mean_score: number | null;
  pass_rate: number | null;
  ee_count: number;
  me_count: number;
  ae_count: number;
  be_count: number;
}

export interface LiveExamsAnalyticsTopPerformer {
  student_id: string;
  student_name: string;
  admission_number: string;
  average_percentage: number;
  assessments_taken: number;
}

export interface LiveExamsAnalyticsTopImprover {
  student_id: string;
  student_name: string;
  admission_number: string;
  latest_exam_series: string;
  latest_average: number;
  previous_exam_series: string;
  previous_average: number;
  improvement: number;
}

export interface LiveExamsAnalyticsAtRiskStudent {
  student_id: string;
  student_name: string;
  admission_number: string;
  average_percentage: number | null;
  reasons?: string[];
  assessments_taken: number;
}

export interface LiveExamsAnalyticsResponse {
  scope: {
    level: "school" | "department" | "subject" | "grade" | "class" | "assignment";
    role: string;
  };
  kpis: LiveExamsAnalyticsKPIs;
  trends: LiveExamsAnalyticsTrend[];
  subjectPerformance: LiveExamsAnalyticsSubjectPerformance[];
  studentProgress: {
    topPerformers: LiveExamsAnalyticsTopPerformer[];
    topImprovers: LiveExamsAnalyticsTopImprover[];
    atRiskStudents: LiveExamsAnalyticsAtRiskStudent[];
  };
  data_quality: {
    final_mark_count: number;
    explicit_evidence_count: number;
    missing_or_incomplete_count: number;
  };
}

export function fetchExamsAnalyticsLive(session: LiveAuthSession): Promise<LiveExamsAnalyticsResponse> {
  return withSession<LiveExamsAnalyticsResponse>(session, "/exams/analytics");
}
