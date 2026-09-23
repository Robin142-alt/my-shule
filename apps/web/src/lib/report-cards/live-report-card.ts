import type { LiveExamReportCard } from "@/lib/modules/exams-client";
import type {
  ClassReportingMode,
  ReportCardDocumentData,
  ReportCardStatus,
  ReportCardType,
  SchoolCurriculumDirection,
} from "@/lib/report-cards/curriculum-report-cards";

export type ReportCardAudience = "exams-manager" | "dean" | "principal";

type UnknownRecord = Record<string, unknown>;

const scoreStatusLabels: Record<string, string> = {
  absent: "Absent",
  exempt: "Exempt",
  not_assessed: "Not assessed",
  incomplete: "Incomplete",
  withheld: "Withheld",
  medical_exception: "Medical exception",
  transfer_student: "Transfer student",
};

const reportStatusLabels: Record<string, ReportCardStatus> = {
  draft: "Draft",
  draft_generated: "Draft",
  regeneration_required: "Returned for correction",
  under_review: "Submitted for review",
  approved: "Dean/Exams reviewed",
  published: "Published",
  withdrawn: "Archived",
};

function asRecord(value: unknown): UnknownRecord {
  if (typeof value === "string") {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      return {};
    }
  }

  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function asRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerValue(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed === null ? undefined : Math.trunc(parsed);
}

function formatNumber(value: number | null, digits = 2) {
  if (value === null) {
    return undefined;
  }

  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(digits).replace(/\.?0+$/, "");
}

function formatPercentage(value: number | null) {
  const formatted = formatNumber(value);
  return formatted === undefined ? undefined : `${formatted}%`;
}

function formatDate(value: unknown) {
  const raw = text(value);
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.valueOf())
    ? raw
    : parsed.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function safeLogoUrl(value: unknown, fallback?: string | null) {
  const candidate = text(value);
  if (
    candidate.startsWith("/")
    || candidate.startsWith("https://")
    || candidate.startsWith("http://")
    || candidate.startsWith("data:")
  ) {
    return candidate;
  }

  return fallback?.trim() || undefined;
}

function scoreStatusLabel(statusValue: unknown) {
  const status = text(statusValue).toLowerCase();
  if (!status) return undefined;
  return scoreStatusLabels[status] ?? status.replaceAll("_", " ").replace(/^./, (value) => value.toUpperCase());
}

function reportStatus(statusValue: unknown): ReportCardStatus {
  return reportStatusLabels[text(statusValue).toLowerCase()] ?? "Draft";
}

function reportingConfiguration(input: {
  metadata: UnknownRecord;
  reportCard: UnknownRecord;
  subjects: UnknownRecord[];
}) {
  const gradingPolicy = asRecord(input.metadata.grading_policy);
  const series = asRecord(input.reportCard.exam_series);
  const hint = [
    gradingPolicy.reporting_mode,
    gradingPolicy.name,
    input.reportCard.reporting_mode,
    input.reportCard.report_card_type,
    series.reporting_mode,
    series.curriculum_model,
  ].map((value) => text(value).toLowerCase()).join(" ");
  const hasEnteredScores = input.subjects.some((subject) =>
    text(subject.score_status, "entered").toLowerCase() === "entered"
    && numberValue(subject.score) !== null,
  );

  let classReportingMode: ClassReportingMode;
  let reportCardType: ReportCardType;
  let schoolDirection: SchoolCurriculumDirection;

  if (/legacy|8-4-4|844|kcse/.test(hint)) {
    classReportingMode = "LEGACY_844_KCSE";
    reportCardType = "LEGACY_844_KCSE";
    schoolDirection = "HYBRID_TRANSITION";
  } else if (hasEnteredScores) {
    classReportingMode = "HYBRID_CBC_MARKS";
    reportCardType = "HYBRID_CBC_MARKS";
    schoolDirection = "HYBRID_TRANSITION";
  } else {
    classReportingMode = "CBC_CBE";
    reportCardType = "CBC_CBE_COMPETENCY";
    schoolDirection = "CBC_CBE";
  }

  return { classReportingMode, reportCardType, schoolDirection };
}

function persistedLegend(metadata: UnknownRecord, reportCard: UnknownRecord) {
  const candidates = [
    reportCard.descriptor_legend,
    metadata.descriptor_legend,
    asRecord(metadata.grading_policy).descriptor_legend,
  ];

  for (const candidate of candidates) {
    const rows = asRecords(candidate).map((row) => ({
      code: text(row.code, text(row.label)),
      label: text(row.description, text(row.name, text(row.label))),
    })).filter((row) => row.code && row.label);
    if (rows.length) {
      return rows;
    }
  }

  return [];
}

function persistedGradingScale(metadata: UnknownRecord) {
  const gradingPolicy = asRecord(metadata.grading_policy);
  const policyScope = asRecord(gradingPolicy.scope);
  const boundaries = asRecords(gradingPolicy.boundaries).length
    ? asRecords(gradingPolicy.boundaries)
    : asRecords(policyScope.boundaries);

  return boundaries.map((boundary) => {
    const minimum = numberValue(boundary.min_score);
    const maximum = numberValue(boundary.max_score);
    const range = minimum !== null && maximum !== null
      ? `${formatNumber(minimum)}-${formatNumber(maximum)}`
      : text(boundary.range);

    return {
      grade: text(boundary.label, text(boundary.grade)),
      range,
      points: formatNumber(numberValue(boundary.points)),
    };
  }).filter((row) => row.grade && row.range);
}

function buildAuditTrail(card: LiveExamReportCard, metadata: UnknownRecord) {
  const generatedAt = text(
    asRecord(metadata.report_card).generated_at,
    text(metadata.generated_at, card.created_at ?? ""),
  );
  const generatedBy = text(metadata.generated_by);
  const submittedBy = text(card.submitted_by_user_id);
  const approvedBy = text(card.approved_by_user_id);
  const publishedBy = text(card.published_by_user_id);
  const withdrawnBy = text(card.withdrawn_by_user_id);
  const events: ReportCardDocumentData["auditTrail"] = [];

  if (generatedAt && generatedBy) {
    events.push({
      actor: generatedBy,
      role: "Report generation",
      action: "Generated immutable report-card snapshot",
      timestamp: generatedAt,
    });
  }
  if (card.submitted_at && submittedBy) {
    events.push({
      actor: submittedBy,
      role: "Exams Manager",
      action: "Submitted for review",
      timestamp: card.submitted_at,
    });
  }
  if (card.approved_at && approvedBy) {
    events.push({
      actor: approvedBy,
      role: text(card.approval_role, "Dean/Academics"),
      action: "Approved report card",
      timestamp: card.approved_at,
    });
  }
  if (card.published_at && publishedBy) {
    events.push({
      actor: publishedBy,
      role: "Principal",
      action: "Published report card",
      timestamp: card.published_at,
    });
  }
  if (card.withdrawn_at && withdrawnBy) {
    events.push({
      actor: withdrawnBy,
      role: "Principal",
      action: "Withdrew published report card",
      timestamp: card.withdrawn_at,
      reason: text(metadata.transition_reason) || undefined,
    });
  }

  return events;
}

export function hasPersistedReportCardSnapshot(card: LiveExamReportCard) {
  const metadata = asRecord(card.metadata);
  const reportCard = asRecord(metadata.report_card);
  return Boolean(
    Object.keys(reportCard).length
    && Object.keys(asRecord(reportCard.template_fields)).length
    && Array.isArray(reportCard.subjects),
  );
}

export function mapPersistedReportCardDocument(
  card: LiveExamReportCard,
  options: {
    schoolName: string;
    logoUrl?: string | null;
    audience: ReportCardAudience;
  },
): ReportCardDocumentData {
  const metadata = asRecord(card.metadata);
  const reportCard = asRecord(metadata.report_card);
  const fields = asRecord(reportCard.template_fields);
  const student = asRecord(reportCard.student);
  const series = asRecord(reportCard.exam_series);
  const totals = asRecord(reportCard.totals);
  const analyticsRecord = asRecord(reportCard.analytics);
  const attendanceRecord = asRecord(reportCard.attendance);
  const subjects = asRecords(reportCard.subjects);
  const reporting = reportingConfiguration({ metadata, reportCard, subjects });
  const enteredSubjects = subjects
    .map((subject) => ({
      name: text(subject.subject_name),
      percentage: numberValue(subject.percentage),
      status: text(subject.score_status, "entered").toLowerCase(),
      competency: text(subject.competency_outcome, text(subject.descriptor)),
    }))
    .filter((subject) => subject.name && subject.status === "entered" && subject.percentage !== null)
    .sort((left, right) => (right.percentage ?? 0) - (left.percentage ?? 0));
  const competencySubjects = subjects.map((subject) => ({
    name: text(subject.subject_name),
    descriptor: text(subject.competency_outcome, text(subject.descriptor)),
  })).filter((subject) => subject.name && subject.descriptor);
  const strongestAreas = enteredSubjects.length
    ? enteredSubjects.slice(0, Math.min(3, enteredSubjects.length)).map((subject) => subject.name)
    : competencySubjects.filter((subject) => /exceed|meet|achiev|proficient/i.test(subject.descriptor)).map((subject) => subject.name);
  const supportAreas = enteredSubjects.length > 1
    ? enteredSubjects.slice(-Math.min(3, enteredSubjects.length)).map((subject) => subject.name)
    : competencySubjects.filter((subject) => /approach|below|support|develop/i.test(subject.descriptor)).map((subject) => subject.name);
  const daysPresent = integerValue(attendanceRecord.days_present);
  const daysAbsent = integerValue(attendanceRecord.days_absent);
  const totalDays = integerValue(attendanceRecord.total_days)
    ?? (daysPresent !== undefined && daysAbsent !== undefined ? daysPresent + daysAbsent : undefined);
  const attendancePercentage = numberValue(attendanceRecord.percentage)
    ?? (daysPresent !== undefined && totalDays ? (daysPresent / totalDays) * 100 : null);
  const hasAttendance = [
    daysPresent,
    daysAbsent,
    totalDays,
    integerValue(attendanceRecord.late_arrivals),
    attendancePercentage,
  ].some((value) => value !== undefined && value !== null);
  const totalScore = numberValue(totals.total_score);
  const totalMaxScore = numberValue(totals.total_max_score);
  const meanScore = numberValue(totals.mean_score);
  const overallPercentage = numberValue(totals.percentage);
  const generatedAt = text(reportCard.generated_at, text(metadata.generated_at, text(card.created_at, text(card.updated_at))));
  const verificationCode = text(card.verification_code);
  const termHistory = asRecords(analyticsRecord.term_history).map((row) => ({
    examSeriesId: text(row.exam_series_id),
    label: text(row.label),
    percentage: numberValue(row.percentage),
  })).filter((row): row is { examSeriesId: string; label: string; percentage: number } => (
    Boolean(row.examSeriesId && row.label) && row.percentage !== null
  ));
  const subjectHistory = asRecords(analyticsRecord.subject_history).map((row) => ({
    examSeriesId: text(row.exam_series_id),
    label: text(row.label),
    subjectId: text(row.subject_id),
    subjectName: text(row.subject_name),
    percentage: numberValue(row.percentage),
  })).filter((row): row is { examSeriesId: string; label: string; subjectId: string; subjectName: string; percentage: number } => (
    Boolean(row.examSeriesId && row.label && row.subjectId && row.subjectName) && row.percentage !== null
  ));

  return {
    id: card.id,
    reportNumber: verificationCode || text(card.report_snapshot_id, card.id),
    school: {
      name: text(fields.school_name, options.schoolName),
      logoUrl: safeLogoUrl(fields.school_logo_ref, options.logoUrl),
      motto: text(fields.school_motto) || undefined,
      address: text(fields.school_address) || undefined,
      phone: text(fields.school_phone) || undefined,
      email: text(fields.school_email) || undefined,
    },
    learner: {
      fullName: text(fields.learner_name, text(student.full_name, text(card.student_name))),
      admissionNumber: text(fields.admission_number, text(student.admission_number, text(card.admission_number))),
      upi: text(student.upi_number, text(student.upi, text(student.assessment_number))) || undefined,
      gradeForm: text(fields.learner_class, text(student.class_name)),
      stream: text(fields.learner_stream, text(student.stream_name)),
      gender: text(student.gender) || undefined,
      boardingStatus: text(student.boarding_status) || undefined,
      houseDormitory: text(student.house_dormitory) || undefined,
      classTeacher: text(student.class_teacher_name) || undefined,
      status: text(student.status) || undefined,
    },
    academic: {
      academicYear: text(fields.academic_year, text(series.academic_year_name, text(card.academic_year))),
      term: text(fields.term, text(series.academic_term_name, text(card.term))),
      reportingPeriod: text(fields.exam_series, text(series.name, text(card.exam_series_name))),
      openingDate: formatDate(series.opening_date),
      closingDate: formatDate(series.closing_date),
      nextTermOpeningDate: formatDate(fields.next_term_opening_date),
    },
    curriculum: {
      schoolDirection: reporting.schoolDirection,
      classReportingMode: reporting.classReportingMode,
      reportCardType: reporting.reportCardType,
      reportStatus: reportStatus(card.status),
    },
    analytics: {
      attendancePercentage: formatPercentage(attendancePercentage),
      bestSubject: enteredSubjects[0]?.name || undefined,
      improvement: text(totals.improvement) || undefined,
      conduct: text(fields.conduct_summary) || undefined,
      termHistory,
      subjectHistory,
    },
    cbcProgress: {
      overallDescriptor: text(totals.overall_descriptor, text(reportCard.overall_descriptor)) || undefined,
      learningAreasCompleted: subjects.length ? `${subjects.length} recorded` : undefined,
      learningAreasNeedingSupport: supportAreas.length ? `${supportAreas.length} identified` : undefined,
      strongestAreas,
      areasForImprovement: supportAreas,
      attendancePercentage: formatPercentage(attendancePercentage),
      classTeacherProgressNote: text(fields.class_teacher_comment) || undefined,
      principalSummaryNote: text(fields.principal_comment) || undefined,
    },
    learningAreas: reporting.reportCardType === "LEGACY_844_KCSE"
      ? []
      : subjects.filter((subject) =>
          text(subject.competency_outcome)
          || text(subject.descriptor)
          || text(subject.teacher_observation),
        ).map((subject) => ({
          learningArea: text(subject.subject_name),
          strand: text(subject.strand) || undefined,
          subStrand: text(subject.sub_strand) || undefined,
          task: text(subject.assessment_task, text(subject.task)) || undefined,
          performanceLevel: text(subject.competency_outcome, text(subject.grade_label)) || undefined,
          descriptor: text(subject.descriptor) || undefined,
          teacherObservation: text(subject.teacher_observation, text(subject.remarks)) || undefined,
          learnerStrengths: text(subject.learner_strengths) || undefined,
          areaNeedingSupport: text(subject.area_needing_support) || undefined,
          parentSupport: text(subject.parent_support) || undefined,
          teacher: text(subject.teacher_name) || undefined,
        })),
    marksSupplement: reporting.reportCardType === "CBC_CBE_COMPETENCY"
      ? []
      : subjects.map((subject) => {
          const status = text(subject.score_status, "entered").toLowerCase();
          const score = numberValue(subject.score);
          const maxScore = numberValue(subject.max_score);
          const entered = status === "entered" && score !== null;
          const persistedComponents = asRecords(subject.assessment_components).map((component) => {
            const componentScore = numberValue(component.score);
            const componentMaxScore = numberValue(component.max_score);
            const componentPercentage = numberValue(component.percentage)
              ?? (componentScore !== null && componentMaxScore && componentMaxScore > 0
                ? (componentScore / componentMaxScore) * 100
                : null);
            const componentStatus = text(component.score_status).toLowerCase();
            return {
              name: text(component.name),
              percentage: formatPercentage(componentPercentage),
              score: componentScore !== null
                ? `${formatNumber(componentScore)}${componentMaxScore !== null ? ` / ${formatNumber(componentMaxScore)}` : ""}`
                : undefined,
              weight: formatPercentage(numberValue(component.weight)),
              status: componentPercentage === null ? scoreStatusLabel(componentStatus) : undefined,
            };
          }).filter((component) => component.name);

          return {
            subjectCode: text(subject.subject_code, text(subject.code)) || undefined,
            subjectName: text(subject.subject_name),
            assessmentComponent: text(subject.assessment_name, text(subject.assessment_component)) || undefined,
            assessmentComponents: persistedComponents.length ? persistedComponents : undefined,
            score: entered
              ? `${formatNumber(score)}${maxScore !== null ? ` / ${formatNumber(maxScore)}` : ""}`
              : scoreStatusLabel(status),
            percentage: entered ? formatPercentage(numberValue(subject.percentage)) : undefined,
            grade: entered ? text(subject.grade_label) || undefined : undefined,
            points: entered ? formatNumber(numberValue(subject.points)) : undefined,
            teacherComment: text(subject.remarks, text(subject.descriptor)) || undefined,
            teacherName: text(subject.teacher_name) || undefined,
          };
        }),
    academicSummary: enteredSubjects.length
      ? {
          totalScore: totalScore !== null
            ? `${formatNumber(totalScore)}${totalMaxScore !== null ? ` / ${formatNumber(totalMaxScore)}` : ""}`
            : undefined,
          meanScore: formatNumber(meanScore),
          percentage: formatPercentage(overallPercentage),
          overallGrade: text(totals.overall_grade, text(totals.grade_label)) || undefined,
          classPosition: text(totals.class_position, text(totals.position)) || undefined,
        }
      : undefined,
    coreCompetencies: asRecords(reportCard.core_competencies).map((row) => ({
      competency: text(row.competency, text(row.name)),
      level: text(row.level, text(row.rating)) || undefined,
      observation: text(row.observation, text(row.comment)) || undefined,
      evidence: text(row.evidence) || undefined,
    })).filter((row) => row.competency),
    values: asRecords(reportCard.values).map((row) => ({
      value: text(row.value, text(row.name)),
      rating: text(row.rating, text(row.level)) || undefined,
      comment: text(row.comment, text(row.observation)) || undefined,
    })).filter((row) => row.value),
    projects: asRecords(reportCard.projects).map((row) => ({
      title: text(row.title, text(row.name)),
      category: text(row.category),
      note: text(row.note, text(row.comment)) || undefined,
    })),
    attendance: hasAttendance
      ? {
          totalDays,
          daysPresent,
          daysAbsent,
          lateArrivals: integerValue(attendanceRecord.late_arrivals),
          percentage: formatPercentage(attendancePercentage),
          comment: text(attendanceRecord.comment) || undefined,
        }
      : undefined,
    conduct: text(fields.conduct_summary)
      ? { generalConduct: text(fields.conduct_summary) }
      : undefined,
    feeSummary: text(fields.fee_balance_note)
      ? { balanceLabel: text(fields.fee_balance_note), releaseStatus: "Included by school policy" }
      : undefined,
    comments: {
      classTeacher: text(fields.class_teacher_comment, text(metadata.class_teacher_comment)) || undefined,
      classTeacherSource: text(fields.class_teacher_comment_source) || undefined,
      deanAcademics: text(fields.dean_academics_comment, text(metadata.dean_academics_comment)) || undefined,
      principalDeputy: text(fields.principal_comment, text(metadata.principal_comment)) || undefined,
      principalDeputySource: text(fields.principal_comment_source) || undefined,
    },
    descriptorLegend: persistedLegend(metadata, reportCard),
    gradingScale: persistedGradingScale(metadata),
    signatures: [
      {
        role: "Class Teacher",
        name: text(fields.class_teacher_name, text(student.class_teacher_name)) || undefined,
        imageUrl: text(fields.class_teacher_signature_ref)
          ? `/api/exams/report-cards/${encodeURIComponent(card.id)}/signatures/class_teacher?v=${encodeURIComponent(verificationCode || generatedAt)}`
          : undefined,
        date: formatDate(card.submitted_at),
      },
      {
        role: text(card.approval_role, "Dean/Academics"),
        date: formatDate(card.approved_at),
      },
      {
        role: "Principal",
        name: text(fields.principal_name) || undefined,
        imageUrl: text(fields.principal_signature_ref)
          ? `/api/exams/report-cards/${encodeURIComponent(card.id)}/signatures/principal?v=${encodeURIComponent(verificationCode || generatedAt)}`
          : undefined,
        date: formatDate(card.published_at),
      },
    ],
    verification: {
      generatedBy: text(metadata.generated_by),
      generatedAt,
      publishedAt: card.published_at ?? undefined,
      qrValue: verificationCode || undefined,
      securityNote: verificationCode
        ? `Verify this persisted report-card snapshot using code ${verificationCode}.`
        : "This draft snapshot has not received a verification code.",
    },
    permissions: {
      canViewFees: Boolean(text(fields.fee_balance_note)),
      canViewConduct: Boolean(text(fields.conduct_summary)),
      canViewMarksSupplement: reporting.reportCardType !== "CBC_CBE_COMPETENCY",
      canApprove: options.audience === "dean",
      canPublish: options.audience === "principal",
      canDownload: hasPersistedReportCardSnapshot(card),
    },
    auditTrail: buildAuditTrail(card, metadata),
  };
}
