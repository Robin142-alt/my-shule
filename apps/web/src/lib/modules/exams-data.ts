import type { StatusTone } from "@/lib/dashboard/types";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

export type ExamScoreFieldId = "mathematics" | "english" | "science" | "kiswahili";

export interface ExamScoreField {
  id: ExamScoreFieldId;
  label: string;
  shortLabel: string;
  maxScore: number;
}

export interface ExamMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
}

export interface ExamQueueItem {
  id: string;
  title: string;
  subtitle: string;
  value: string;
  tone: StatusTone;
  progress: number;
}

export interface ExamMarkRow {
  id: string;
  admissionNumber: string;
  student: string;
  stream: string;
  gender: string;
  scores: Record<ExamScoreFieldId, string>;
  competency: "EE" | "ME" | "AE" | "BE";
  status: "Clean" | "Missing" | "Review" | "Outlier";
}

export interface ApprovalStep {
  id: string;
  role: string;
  owner: string;
  status: "Complete" | "Active" | "Waiting" | "Rejected";
  timestamp: string;
  note: string;
  tone: StatusTone;
}

export interface ReportCardBatch {
  id: string;
  className: string;
  template: string;
  ready: number;
  total: number;
  status: string;
  tone: StatusTone;
  learners?: Array<{
    id: string;
    admissionNumber: string;
    learnerName: string;
    gradeForm?: string;
    stream?: string;
  }>;
}

export interface ExamAnalysisItem {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
}

export interface ExamAuditEntry {
  id: string;
  actor: string;
  action: string;
  scope: string;
  time: string;
  detail: string;
  tone: StatusTone;
}

export interface CbcCompetencyRow {
  id: string;
  competency: string;
  coverage: string;
  status: string;
  evidence: string;
  tone: StatusTone;
}

export interface HistoricalResult {
  id: string;
  exam: string;
  mean: string;
  topSubject: string;
  riskSignal: string;
}

export interface ExamSetupItem {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
}

export interface ExamAllocationRow {
  id: string;
  className: string;
  subject: string;
  teacher: string;
  reviewer: string;
  learners: number;
  status: string;
  tone: StatusTone;
}

export interface ExamPublishingItem {
  id: string;
  label: string;
  value: string;
  helper: string;
  tone: StatusTone;
}

export interface ExamsModuleData {
  schoolName: string;
  role: SchoolExperienceRole;
  currentExam: string;
  currentClass: string;
  setup: ExamSetupItem[];
  allocations: ExamAllocationRow[];
  publishing: ExamPublishingItem[];
  metrics: ExamMetric[];
  queues: ExamQueueItem[];
  fields: ExamScoreField[];
  marks: ExamMarkRow[];
  approvals: ApprovalStep[];
  reports: ReportCardBatch[];
  analysis: ExamAnalysisItem[];
  competencies: CbcCompetencyRow[];
  history: HistoricalResult[];
  audit: ExamAuditEntry[];
}

export interface ScoreValidation {
  valid: boolean;
  message: string;
  tone: StatusTone;
}

export interface MarksSummary {
  meanScore: number;
  validScores: number;
  missingScores: number;
  invalidScores: number;
  distribution: Record<"EE" | "ME" | "AE" | "BE", number>;
}

export interface ExamsAccessPolicy {
  canViewDashboard: boolean;
  canManageSetup: boolean;
  canViewAllocations: boolean;
  canEnterMarks: boolean;
  canModerate: boolean;
  canApproveReportCards: boolean;
  canSubmitReportCards: boolean;
  canGenerateReportCards: boolean;
  canViewReportCards: boolean;
  canPublishReportCards: boolean;
  canViewAnalytics: boolean;
  canViewAudit: boolean;
}

export type ExamsModuleDataSeed = Partial<
  Omit<ExamsModuleData, "schoolName" | "role">
>;

export const examScoreFields: ExamScoreField[] = [
  { id: "mathematics", label: "Mathematics", shortLabel: "Maths", maxScore: 100 },
  { id: "english", label: "English", shortLabel: "Eng", maxScore: 100 },
  { id: "science", label: "Science & Technology", shortLabel: "Sci", maxScore: 100 },
  { id: "kiswahili", label: "Kiswahili", shortLabel: "Kis", maxScore: 100 },
];

const previewPermissionsByRole: Partial<Record<SchoolExperienceRole, readonly string[]>> = {
  admin: ["*:*"],
  principal: ["exams:read", "exams:publish", "reports:read"],
  "dean-academics": ["exams:read", "exams:review", "exams:approve", "reports:read"],
  "exams-manager": ["exams:read", "exams:write", "exams:enter-marks", "exams:review", "reports:read"],
  hod: ["exams:review"],
  "grade-master": ["exams:review", "reports:read"],
  teacher: ["exams:enter-marks"],
  "class-teacher": ["exams:enter-marks"],
};

const examOfficerRoles = new Set<SchoolExperienceRole>(["admin", "exams-manager"]);
const deanApprovalRoles = new Set<SchoolExperienceRole>(["admin", "dean-academics"]);
const principalPublishingRoles = new Set<SchoolExperienceRole>(["admin", "principal"]);

/**
 * Mirrors the backend exam workflow gates for navigation and controls. When live
 * permissions are supplied they are authoritative, including an explicitly empty
 * permission list. Role defaults are used only for a signed-out preview surface.
 */
export function resolveExamsAccessPolicy(input: {
  role: SchoolExperienceRole;
  permissions?: readonly string[];
  hasTeachingAssignment?: boolean;
}): ExamsAccessPolicy {
  const permissions = new Set(
    (input.permissions ?? previewPermissionsByRole[input.role] ?? [])
      .map((permission) => permission.trim().toLowerCase())
      .filter(Boolean),
  );
  const has = (permission: string) => permissions.has("*:*") || permissions.has(permission);
  const hasAny = (...required: string[]) => required.some(has);
  const canEnterMarks = has("exams:enter-marks") || (
    input.permissions === undefined
    && input.hasTeachingAssignment === true
  );
  const canManageSetup = has("exams:write") && examOfficerRoles.has(input.role);
  const canModerate = hasAny("exams:review", "exams:approve") || permissions.has("*:*");
  const canApproveReportCards =
    deanApprovalRoles.has(input.role)
    && has("exams:approve");
  const canSubmitReportCards =
    examOfficerRoles.has(input.role)
    && has("exams:write");
  const canGenerateReportCards = canSubmitReportCards;
  const canPublishReportCards =
    principalPublishingRoles.has(input.role)
    && (
      has("exams:publish")
      || (has("principal:write") && has("exams:read"))
      || permissions.has("*:*")
    );
  const canViewReportCards = hasAny(
    "exams:read",
    "exams:write",
    "exams:review",
    "exams:approve",
    "exams:publish",
    "reports:read",
  );
  const canViewDashboard = canEnterMarks || canManageSetup || canModerate || canViewReportCards;

  return {
    canViewDashboard,
    canManageSetup,
    canViewAllocations: canManageSetup || canModerate || has("exams:read"),
    canEnterMarks,
    canModerate,
    canApproveReportCards,
    canSubmitReportCards,
    canGenerateReportCards,
    canViewReportCards,
    canPublishReportCards,
    canViewAnalytics: canViewReportCards,
    canViewAudit: canViewReportCards || canModerate,
  };
}

export function validateExamScore(value: string, maxScore: number): ScoreValidation {
  const trimmed = value.trim();

  if (!trimmed) {
    return {
      valid: false,
      message: "Missing score",
      tone: "warning",
    };
  }

  const score = Number(trimmed);

  if (!Number.isFinite(score)) {
    return {
      valid: false,
      message: "Use numbers only",
      tone: "critical",
    };
  }

  if (score < 0) {
    return {
      valid: false,
      message: "Score cannot be negative",
      tone: "critical",
    };
  }

  if (score > maxScore) {
    return {
      valid: false,
      message: `Above max ${maxScore}`,
      tone: "critical",
    };
  }

  return {
    valid: true,
    message: "Saved",
    tone: "ok",
  };
}

export function getGradeBand(score: number): "EE" | "ME" | "AE" | "BE" {
  if (score >= 80) {
    return "EE";
  }

  if (score >= 65) {
    return "ME";
  }

  if (score >= 50) {
    return "AE";
  }

  return "BE";
}

export function calculateMarksSummary(rows: ExamMarkRow[], fields = examScoreFields): MarksSummary {
  const distribution: MarksSummary["distribution"] = {
    EE: 0,
    ME: 0,
    AE: 0,
    BE: 0,
  };
  let total = 0;
  let validScores = 0;
  let missingScores = 0;
  let invalidScores = 0;

  rows.forEach((row) => {
    fields.forEach((field) => {
      const value = row.scores[field.id];
      const validation = validateExamScore(value, field.maxScore);

      if (!value.trim()) {
        missingScores += 1;
        return;
      }

      if (!validation.valid) {
        invalidScores += 1;
        return;
      }

      const score = Number(value);
      total += score;
      validScores += 1;
      distribution[getGradeBand(score)] += 1;
    });
  });

  return {
    meanScore: validScores > 0 ? Math.round((total / validScores) * 10) / 10 : 0,
    validScores,
    missingScores,
    invalidScores,
    distribution,
  };
}

function cloneSeedRows(seed: ExamsModuleDataSeed) {
  return {
    setup: seed.setup?.map((item) => ({ ...item })) ?? [],
    allocations: seed.allocations?.map((item) => ({ ...item })) ?? [],
    publishing: seed.publishing?.map((item) => ({ ...item })) ?? [],
    metrics: seed.metrics?.map((item) => ({ ...item })) ?? [],
    queues: seed.queues?.map((item) => ({ ...item })) ?? [],
    fields: seed.fields?.map((item) => ({ ...item })) ?? examScoreFields.map((item) => ({ ...item })),
    marks: seed.marks?.map((item) => ({ ...item, scores: { ...item.scores } })) ?? [],
    approvals: seed.approvals?.map((item) => ({ ...item })) ?? [],
    reports: seed.reports?.map((item) => ({
      ...item,
      learners: item.learners?.map((learner) => ({ ...learner })),
    })) ?? [],
    analysis: seed.analysis?.map((item) => ({ ...item })) ?? [],
    competencies: seed.competencies?.map((item) => ({ ...item })) ?? [],
    history: seed.history?.map((item) => ({ ...item })) ?? [],
    audit: seed.audit?.map((item) => ({ ...item })) ?? [],
  };
}

/**
 * Builds the exams workspace from caller-supplied, tenant-authoritative records.
 * Missing records intentionally remain empty; the client must never invent a school,
 * class, learner, staff member, result, approval, or audit event as a fallback.
 */
export function buildExamsModuleData({
  role,
  schoolName,
  seed = {},
}: {
  role: SchoolExperienceRole;
  schoolName: string;
  seed?: ExamsModuleDataSeed;
}): ExamsModuleData {
  return {
    schoolName: schoolName.trim(),
    role,
    currentExam: seed.currentExam?.trim() || "No exam selected",
    currentClass: seed.currentClass?.trim() || "No class selected",
    ...cloneSeedRows(seed),
  };
}
