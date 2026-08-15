import type {
  CbcCompetencyRow,
  ExamMarkRow,
  ExamScoreField,
  ExamsModuleData,
  ReportCardBatch,
} from "@/lib/modules/exams-data";

export type SchoolCurriculumDirection = "CBC_CBE" | "HYBRID_TRANSITION";
export type ClassReportingMode = "CBC_CBE" | "HYBRID_CBC_MARKS" | "LEGACY_844_KCSE";
export type ReportCardType = "CBC_CBE_COMPETENCY" | "HYBRID_CBC_MARKS" | "LEGACY_844_KCSE";
export type ReportCardStatus =
  | "Draft"
  | "Data incomplete"
  | "Ready for review"
  | "Submitted for review"
  | "Returned for correction"
  | "Class teacher reviewed"
  | "Dean/Exams reviewed"
  | "Principal/Deputy approved"
  | "Published"
  | "Printed"
  | "Archived";

export interface ReportCardSettings {
  schoolDefaultCurriculumDirection: SchoolCurriculumDirection;
  allowMarksSupplement: boolean;
  allowRanking: boolean;
  allowFeeVisibility: boolean;
  allowDisciplineVisibility: boolean;
  requirePrincipalApproval: boolean;
  requireClassTeacherComments: boolean;
  requireCbcObservations: boolean;
  requireSubjectTeacherComments: boolean;
  allowParentPortalPublishing: boolean;
  allowStudentPortalVisibility: boolean;
}

export interface ReportCardGenerationRow {
  id: string;
  admissionNumber: string;
  learnerName: string;
  gradeForm: string;
  stream: string;
  reportingMode: ClassReportingMode;
  reportType: ReportCardType;
  cbcCompletion: string;
  marksCompletion: string;
  commentsStatus: string;
  approvalStatus: ReportCardStatus;
  publishedStatus: "Unpublished" | "Published";
  printedStatus: "Not printed" | "Printed";
  feeHoldStatus: "Clear" | "Held";
  missingItems: string[];
}

export interface ReportCardLearnerSource {
  id: string;
  admissionNumber: string;
  learnerName: string;
  gradeForm?: string;
  stream?: string;
}

export interface ReportCardDocumentData {
  id: string;
  reportNumber: string;
  school: {
    name: string;
    logoUrl?: string;
    motto?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  learner: {
    fullName: string;
    admissionNumber: string;
    upi?: string;
    gradeForm: string;
    stream: string;
    gender?: string;
    boardingStatus?: string;
    houseDormitory?: string;
    classTeacher?: string;
    status?: string;
  };
  academic: {
    academicYear: string;
    term: string;
    reportingPeriod: string;
    openingDate?: string;
    closingDate?: string;
    nextTermOpeningDate?: string;
  };
  curriculum: {
    schoolDirection: SchoolCurriculumDirection;
    classReportingMode: ClassReportingMode;
    reportCardType: ReportCardType;
    archivedOriginalType?: ReportCardType;
    reportStatus: ReportCardStatus;
  };
  cbcProgress: {
    overallDescriptor?: string;
    learningAreasCompleted?: string;
    learningAreasNeedingSupport?: string;
    strongestAreas?: string[];
    areasForImprovement?: string[];
    attendancePercentage?: string;
    classTeacherProgressNote?: string;
    principalSummaryNote?: string;
  };
  learningAreas: Array<{
    learningArea: string;
    strand?: string;
    subStrand?: string;
    task?: string;
    performanceLevel?: string;
    descriptor?: string;
    teacherObservation?: string;
    learnerStrengths?: string;
    areaNeedingSupport?: string;
    parentSupport?: string;
    teacher?: string;
  }>;
  marksSupplement: Array<{
    subjectCode?: string;
    subjectName: string;
    assessmentComponent?: string;
    score?: string;
    percentage?: string;
    grade?: string;
    points?: string;
    teacherComment?: string;
    teacherName?: string;
  }>;
  academicSummary?: {
    totalScore?: string;
    meanScore?: string;
    percentage?: string;
    overallGrade?: string;
  };
  coreCompetencies: Array<{ competency: string; level?: string; observation?: string; evidence?: string }>;
  values: Array<{ value: string; rating?: string; comment?: string }>;
  projects: Array<{ title: string; category: string; note?: string }>;
  attendance?: {
    totalDays?: number;
    daysPresent?: number;
    daysAbsent?: number;
    lateArrivals?: number;
    percentage?: string;
    comment?: string;
  };
  conduct?: {
    generalConduct?: string;
    positiveNotes?: string;
    guidanceAreas?: string;
    boardingConduct?: string;
  };
  feeSummary?: {
    balanceLabel?: string;
    releaseStatus?: string;
  };
  comments: {
    classTeacher?: string;
    deanAcademics?: string;
    principalDeputy?: string;
  };
  descriptorLegend: Array<{ code: string; label: string }>;
  gradingScale: Array<{ grade: string; range: string; points?: string }>;
  signatures: Array<{ role: string; name?: string; date?: string }>;
  verification: {
    generatedBy: string;
    generatedAt: string;
    publishedAt?: string;
    qrValue?: string;
    securityNote: string;
  };
  permissions: {
    canViewFees: boolean;
    canViewConduct: boolean;
    canViewMarksSupplement: boolean;
    canApprove: boolean;
    canPublish: boolean;
    canDownload: boolean;
  };
  auditTrail: Array<{ actor: string; role: string; action: string; timestamp: string; reason?: string }>;
}

export const curriculumSettings: ReportCardSettings = {
  schoolDefaultCurriculumDirection: "HYBRID_TRANSITION",
  allowMarksSupplement: true,
  allowRanking: false,
  allowFeeVisibility: false,
  allowDisciplineVisibility: false,
  requirePrincipalApproval: true,
  requireClassTeacherComments: true,
  requireCbcObservations: true,
  requireSubjectTeacherComments: true,
  allowParentPortalPublishing: true,
  allowStudentPortalVisibility: true,
};

export const cbcDescriptorFallback = [
  { code: "EE", label: "Exceeding Expectations" },
  { code: "ME", label: "Meeting Expectations" },
  { code: "AE", label: "Approaching Expectations" },
  { code: "BE", label: "Below Expectations" },
];

export const legacyGradingFallback = [
  { grade: "A", range: "80-100", points: "12" },
  { grade: "B", range: "65-79", points: "9-11" },
  { grade: "C", range: "50-64", points: "6-8" },
  { grade: "D", range: "35-49", points: "3-5" },
  { grade: "E", range: "0-34", points: "1-2" },
];

export function getReportCardTypeLabel(type: ReportCardType) {
  if (type === "CBC_CBE_COMPETENCY") return "CBC/CBE Competency Report";
  if (type === "HYBRID_CBC_MARKS") return "Hybrid CBC Academic Report";
  return "Legacy 8-4-4/KCSE Report";
}

export function getReportCardTitle(type: ReportCardType) {
  if (type === "CBC_CBE_COMPETENCY") return "OFFICIAL COMPETENCY-BASED LEARNER REPORT";
  if (type === "HYBRID_CBC_MARKS") return "OFFICIAL HYBRID CBC ACADEMIC REPORT";
  return "OFFICIAL LEGACY 8-4-4/KCSE STUDENT REPORT";
}

export function getReportCardFilename(report: ReportCardDocumentData) {
  const cleanName = report.learner.fullName.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const cleanAdm = report.learner.admissionNumber.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
  const term = report.academic.term.replace(/[^a-z0-9]+/gi, "_");
  const year = report.academic.academicYear.replace(/[^a-z0-9]+/gi, "_");
  const suffix =
    report.curriculum.reportCardType === "CBC_CBE_COMPETENCY"
      ? "CBC"
      : report.curriculum.reportCardType === "HYBRID_CBC_MARKS"
        ? "Hybrid"
        : "Legacy844";

  return `ReportCard_${cleanName}_${cleanAdm}_${suffix}_${term}_${year}.pdf`;
}

export function selectReportCardType(input: {
  archivedReportType?: ReportCardType;
  selectedReportType?: ReportCardType;
  classReportingMode?: ClassReportingMode;
  periodReportType?: ReportCardType;
  schoolDirection: SchoolCurriculumDirection;
}): ReportCardType {
  if (input.archivedReportType) return input.archivedReportType;
  if (input.selectedReportType) return input.selectedReportType;
  if (input.classReportingMode === "LEGACY_844_KCSE") return "LEGACY_844_KCSE";
  if (input.classReportingMode === "HYBRID_CBC_MARKS") return "HYBRID_CBC_MARKS";
  if (input.periodReportType) return input.periodReportType;

  return input.schoolDirection === "CBC_CBE" ? "CBC_CBE_COMPETENCY" : "CBC_CBE_COMPETENCY";
}

export function inferClassReportingMode(input: {
  className: string;
  template?: string;
  schoolDirection: SchoolCurriculumDirection;
  classReportingMode?: ClassReportingMode;
}): ClassReportingMode {
  if (input.classReportingMode) return input.classReportingMode;
  if (input.schoolDirection === "CBC_CBE") return "CBC_CBE";

  const template = input.template?.toLowerCase() ?? "";
  if (template.includes("legacy") || template.includes("8-4-4") || template.includes("kcse")) return "LEGACY_844_KCSE";
  if (template.includes("hybrid")) return "HYBRID_CBC_MARKS";
  if (template.includes("cbc") || template.includes("cbe") || template.includes("competency")) return "CBC_CBE";

  if (input.className.includes("Form 4")) return "LEGACY_844_KCSE";
  if (input.className.includes("Grade 8")) return "HYBRID_CBC_MARKS";

  return "CBC_CBE";
}

export function buildReportCardGenerationRows(
  reports: ReportCardBatch[],
  options?: {
    settings?: ReportCardSettings;
    classReportingModes?: Record<string, ClassReportingMode>;
    learnersByReportId?: Record<string, ReportCardLearnerSource[]>;
  },
): ReportCardGenerationRow[] {
  const settings = options?.settings ?? curriculumSettings;

  return reports.flatMap((report) => {
    const learners = options?.learnersByReportId?.[report.id] ?? report.learners ?? [];
    const reportingMode = inferClassReportingMode({
      className: report.className,
      template: report.template,
      schoolDirection: settings.schoolDefaultCurriculumDirection,
      classReportingMode: options?.classReportingModes?.[report.className],
    });
    const reportType = selectReportCardType({
      classReportingMode: reportingMode,
      schoolDirection: settings.schoolDefaultCurriculumDirection,
    });
    const requiresCbcObservations = reportingMode !== "LEGACY_844_KCSE" && settings.requireCbcObservations;
    const requiresMarks =
      reportingMode === "LEGACY_844_KCSE"
      || (reportingMode === "HYBRID_CBC_MARKS" && settings.allowMarksSupplement);
    const requiresComments =
      settings.requireClassTeacherComments
      || (reportingMode !== "CBC_CBE" && settings.requireSubjectTeacherComments);
    const cbcMissing = requiresCbcObservations ? Math.max(report.total - report.ready, 0) : 0;
    const marksMissing = requiresMarks ? Math.max(Math.ceil((report.total - report.ready) / 2), 0) : 0;
    const missingItems = [
      cbcMissing > 0 ? "CBC observation is missing for one or more learning areas." : null,
      marksMissing > 0 ? "Marks are missing for one or more assessment components." : null,
      requiresComments && report.tone !== "ok" ? "Class teacher comment has not been added." : null,
    ].filter(Boolean) as string[];

    return learners.map((learner) => ({
      id: learner.id,
      admissionNumber: learner.admissionNumber,
      learnerName: learner.learnerName,
      gradeForm: learner.gradeForm ?? report.className,
      stream: learner.stream ?? "",
      reportingMode,
      reportType,
      cbcCompletion: requiresCbcObservations ? (cbcMissing === 0 ? "Complete" : `${cbcMissing} missing`) : "Not required",
      marksCompletion: requiresMarks ? (marksMissing === 0 ? "Complete" : `${marksMissing} missing`) : "Not required",
      commentsStatus: requiresComments ? (report.tone === "ok" ? "Complete" : "Missing comments") : "Not required",
      approvalStatus: missingItems.length === 0 ? "Ready for review" : "Data incomplete",
      publishedStatus: "Unpublished" as const,
      printedStatus: "Not printed" as const,
      feeHoldStatus: "Clear" as const,
      missingItems: [...missingItems],
    }));
  });
}

function buildMarksSupplement(mark: ExamMarkRow | undefined, fields: ExamScoreField[]) {
  if (!mark) return [];

  return fields.map((field) => ({
    subjectCode: field.shortLabel,
    subjectName: field.label,
    assessmentComponent: "Term assessment",
    score: mark.scores[field.id] ? `${mark.scores[field.id]}/${field.maxScore}` : undefined,
    percentage: mark.scores[field.id] ? `${mark.scores[field.id]}%` : undefined,
    grade: mark.competency,
    teacherComment: undefined,
    teacherName: undefined,
  }));
}

function buildLearningAreas(competencies: CbcCompetencyRow[]) {
  return competencies.map((item) => ({
    learningArea: item.competency,
    strand: undefined,
    subStrand: undefined,
    task: item.evidence,
    performanceLevel: item.status,
    descriptor: item.coverage,
    teacherObservation: undefined,
    learnerStrengths: undefined,
    areaNeedingSupport: item.tone === "ok" ? undefined : "Teacher follow-up required.",
    parentSupport: item.tone === "ok" ? undefined : "Review the learning activity at home and confirm practice time.",
    teacher: undefined,
  }));
}

export function buildReportCardDocument(input: {
  data: ExamsModuleData;
  row: ReportCardGenerationRow;
  settings?: ReportCardSettings;
  reportNumber?: string;
  school?: Partial<ReportCardDocumentData["school"]>;
  academic?: Partial<ReportCardDocumentData["academic"]>;
  generatedBy?: string;
}): ReportCardDocumentData {
  const settings = input.settings ?? curriculumSettings;
  const mark = input.data.marks.find(
    (candidate) => candidate.admissionNumber === input.row.admissionNumber,
  );
  const isLegacy = input.row.reportType === "LEGACY_844_KCSE";
  const canUseMarks = isLegacy || (input.row.reportType === "HYBRID_CBC_MARKS" && settings.allowMarksSupplement);

  return {
    id: input.row.id,
    reportNumber: input.reportNumber?.trim() || input.row.id,
    school: {
      ...input.school,
      name: input.school?.name?.trim() || input.data.schoolName,
    },
    learner: {
      fullName: input.row.learnerName,
      admissionNumber: input.row.admissionNumber,
      upi: undefined,
      gradeForm: input.row.gradeForm,
      stream: input.row.stream,
      gender: mark?.gender,
      boardingStatus: undefined,
      classTeacher: undefined,
      status: undefined,
    },
    academic: {
      academicYear: input.academic?.academicYear?.trim() || "",
      term: input.academic?.term?.trim() || "",
      reportingPeriod:
        input.academic?.reportingPeriod?.trim()
        || (input.data.currentExam === "No exam selected" ? "" : input.data.currentExam),
      openingDate: input.academic?.openingDate,
      closingDate: input.academic?.closingDate,
      nextTermOpeningDate: input.academic?.nextTermOpeningDate,
    },
    curriculum: {
      schoolDirection: settings.schoolDefaultCurriculumDirection,
      classReportingMode: input.row.reportingMode,
      reportCardType: input.row.reportType,
      reportStatus: input.row.approvalStatus,
    },
    cbcProgress: {
      overallDescriptor: isLegacy ? undefined : input.row.cbcCompletion === "Complete" ? "Meeting Expectations" : undefined,
      learningAreasCompleted: isLegacy ? undefined : input.row.cbcCompletion,
      learningAreasNeedingSupport: isLegacy ? undefined : input.row.missingItems.join(" "),
      strongestAreas: isLegacy ? [] : input.data.competencies.filter((item) => item.tone === "ok").map((item) => item.competency),
      areasForImprovement: isLegacy ? [] : input.data.competencies.filter((item) => item.tone !== "ok").map((item) => item.competency),
      attendancePercentage: "No attendance records are available for this reporting period.",
      classTeacherProgressNote: undefined,
      principalSummaryNote: undefined,
    },
    learningAreas: isLegacy ? [] : buildLearningAreas(input.data.competencies),
    marksSupplement: canUseMarks ? buildMarksSupplement(mark, input.data.fields) : [],
    coreCompetencies: isLegacy
      ? []
      : input.data.competencies.map((item) => ({
          competency: item.competency,
          level: item.status,
          evidence: item.evidence,
        })),
    values: isLegacy
      ? []
      : [
          { value: "Responsibility" },
          { value: "Respect" },
          { value: "Integrity" },
        ],
    projects: isLegacy ? [] : [],
    attendance: undefined,
    conduct: settings.allowDisciplineVisibility
      ? { generalConduct: "Conduct summary is available to permitted staff only." }
      : undefined,
    feeSummary: settings.allowFeeVisibility
      ? { balanceLabel: "Fee summary hidden until finance releases report visibility.", releaseStatus: input.row.feeHoldStatus }
      : undefined,
    comments: {
      classTeacher: undefined,
      deanAcademics: undefined,
      principalDeputy: undefined,
    },
    descriptorLegend: isLegacy ? [] : cbcDescriptorFallback,
    gradingScale: canUseMarks ? legacyGradingFallback : [],
    signatures: [
      { role: "Class Teacher" },
      { role: isLegacy ? "Exams Manager" : "Dean/Academics" },
      { role: "Principal/Deputy" },
    ],
    verification: {
      generatedBy: input.generatedBy?.trim() || "MyShule Reports",
      generatedAt: new Date().toISOString(),
      qrValue: `verify:${input.row.id}`,
      securityNote: "Generated from MyShule. Unauthorized alteration is invalid.",
    },
    permissions: {
      canViewFees: settings.allowFeeVisibility,
      canViewConduct: settings.allowDisciplineVisibility,
      canViewMarksSupplement: canUseMarks,
      canApprove: true,
      canPublish: settings.allowParentPortalPublishing,
      canDownload: true,
    },
    auditTrail: [
      {
        actor: "MyShule Reports",
        role: "System",
        action: "Generated draft preview",
        timestamp: new Date().toISOString(),
        reason: "Curriculum-aware preview opened.",
      },
    ],
  };
}
