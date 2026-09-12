import { Injectable } from '@nestjs/common';

import type { ReportArtifactInput, ReportArtifactValue } from '../../../common/reports/report-artifact';

export interface ReportCardSubjectPayload {
  subject_id: string;
  subject_name: string;
  assessment_name?: string | null;
  assessment_weight?: number | null;
  score: number | null;
  score_status: string;
  max_score: number;
  percentage?: number | null;
  grade_label: string | null;
  remarks: string | null;
  points?: number | null;
  descriptor?: string | null;
  competency_outcome?: string | null;
  assessment_components?: Array<{
    name: string;
    weight: number | null;
    score: number | null;
    max_score: number;
    percentage: number | null;
    score_status: string;
  }>;
}

export interface ReportCardPayload {
  exam_series: Record<string, unknown>;
  student: Record<string, unknown>;
  attendance: Record<string, unknown> | null;
  subjects: ReportCardSubjectPayload[];
  analytics: {
    term_history: Array<{ exam_series_id: string; label: string; percentage: number }>;
    subject_history: Array<{ exam_series_id: string; label: string; subject_id: string; subject_name: string; percentage: number }>;
  };
  totals: {
    total_score: number;
    total_max_score: number;
    mean_score: number;
    percentage: number;
    overall_grade?: string | null;
    class_position?: string | null;
    improvement?: string | null;
  };
  template_fields: {
    school_name: string;
    school_logo_ref: string | null;
    school_motto: string | null;
    school_address: string | null;
    school_phone: string | null;
    school_email: string | null;
    school_contacts: string | null;
    learner_name: string;
    admission_number: string | null;
    learner_class: string | null;
    learner_stream: string | null;
    class_stream: string | null;
    academic_year: string | null;
    term: string | null;
    exam_series: string | null;
    class_teacher_comment: string | null;
    class_teacher_comment_source: string | null;
    class_teacher_name: string | null;
    class_teacher_signature_ref: string | null;
    principal_comment: string | null;
    principal_comment_source: string | null;
    principal_name: string | null;
    principal_signature_ref: string | null;
    next_term_opening_date: string | null;
    conduct_summary: string | null;
    fee_balance_note: string | null;
  };
  generated_at: string;
}

@Injectable()
export class ReportCardTemplateService {
  buildPayload(data: Record<string, unknown>, generatedAt: string): ReportCardPayload {
    const gradingPolicy = asRecord(data.grading_policy) ?? {};
    const resultSnapshot = asRecord(data.result_snapshot) ?? {};
    const subjects: ReportCardSubjectPayload[] = this.normalizeSubjects(data.subjects).map((subject) => {
      const subjectPercentage = reportSubjectPercentage(subject);
      const boundary = subjectPercentage === null ? null : resolveGradeBoundary(gradingPolicy, subjectPercentage);
      return {
        ...subject,
        grade_label: boundary?.label ?? subject.grade_label,
        points: boundary?.points ?? subject.points,
        descriptor: boundary?.descriptor ?? subject.descriptor,
        remarks: boundary?.remark ?? boundary?.descriptor ?? subject.remarks,
      };
    });
    const enteredSubjects = subjects.filter(isEnteredSubject);
    const totalScore = enteredSubjects.reduce((sum, subject) => sum + subject.score, 0);
    const totalMaxScore = enteredSubjects.reduce((sum, subject) => sum + subject.max_score, 0);
    const derivedPercentage = totalMaxScore > 0
      ? Number(((totalScore / totalMaxScore) * 100).toFixed(2))
      : 0;
    const snapshotPercentage = numberOrNull(resultSnapshot.percentage);
    const percentage = snapshotPercentage ?? derivedPercentage;
    const meanScore = percentage;
    const school = asRecord(data.school) ?? {};
    const student = asRecord(data.student) ?? {};
    const series = asRecord(data.exam_series) ?? {};
    const comments = asRecord(data.comments) ?? {};
    const nextTerm = asRecord(data.next_term) ?? {};
    const policy = asRecord(data.school_policy) ?? {};
    const analytics = asRecord(data.analytics) ?? {};
    const termHistory = normalizeTermHistory(analytics.term_history);
    const subjectHistory = normalizeSubjectHistory(analytics.subject_history);
    const position = numberOrNull(resultSnapshot.position);
    const cohortSize = numberOrNull(resultSnapshot.cohort_size);
    const overallGrade = resolveOverallGrade(gradingPolicy, percentage) ?? text(resultSnapshot.grade_label);
    const persistedImprovement = text(analytics.improvement) ?? text(analytics.improvement_percentage);
    const derivedImprovement = termHistory.length > 1
      ? `${termHistory[0]!.percentage - termHistory[1]!.percentage >= 0 ? '+' : ''}${formatNumber(termHistory[0]!.percentage - termHistory[1]!.percentage)}%`
      : null;
    const generatedComments = buildPersonalizedReportCardComments({
      student,
      subjects,
      percentage,
      overallGrade,
      termHistory,
      attendance: asRecord(data.attendance),
    });
    const classTeacherComment = text(comments.class_teacher);
    const principalComment = text(comments.principal);

    return {
      exam_series: {
        ...series,
        reporting_mode: text(gradingPolicy.reporting_mode) ?? text(series.reporting_mode),
      },
      student,
      attendance: asRecord(data.attendance),
      subjects,
      analytics: {
        term_history: termHistory,
        subject_history: subjectHistory,
      },
      totals: {
        total_score: totalScore,
        total_max_score: totalMaxScore,
        mean_score: meanScore,
        percentage,
        overall_grade: overallGrade,
        class_position: position !== null
          ? `${Math.trunc(position)}${cohortSize !== null ? ` of ${Math.trunc(cohortSize)}` : ''}`
          : null,
        improvement: persistedImprovement ?? derivedImprovement,
      },
      template_fields: {
        school_name: text(school.name) ?? '',
        school_logo_ref: text(school.logo_ref),
        school_motto: text(school.motto),
        school_address: text(school.address),
        school_phone: text(school.phone),
        school_email: text(school.email),
        school_contacts: [text(school.phone), text(school.email)].filter(Boolean).join(' | ') || null,
        learner_name: text(student.full_name) ?? '',
        admission_number: text(student.admission_number),
        learner_class: text(student.class_name),
        learner_stream: text(student.stream_name),
        class_stream: [text(student.class_name), text(student.stream_name)].filter(Boolean).join(' ') || null,
        academic_year: text(series.academic_year_name),
        term: text(series.academic_term_name),
        exam_series: text(series.name),
        class_teacher_comment: classTeacherComment ?? generatedComments.classTeacher,
        class_teacher_comment_source: classTeacherComment
          ? text(comments.class_teacher_source) ?? 'manual'
          : generatedComments.classTeacher
            ? 'automated_performance_v1'
            : null,
        class_teacher_name: text(comments.class_teacher_name) ?? text(student.class_teacher_name),
        class_teacher_signature_ref: text(comments.class_teacher_signature_ref),
        principal_comment: principalComment ?? generatedComments.principal,
        principal_comment_source: principalComment
          ? text(comments.principal_source) ?? 'manual'
          : generatedComments.principal
            ? 'automated_performance_v1'
            : null,
        principal_name: text(comments.principal_name),
        principal_signature_ref: text(comments.principal_signature_ref),
        next_term_opening_date: text(nextTerm.opening_date) ?? text(series.next_term_opening_date),
        conduct_summary: text(comments.conduct_summary),
        fee_balance_note: text(policy.include_fee_balance) === 'true' ? text(data.fee_balance_note) : null,
      },
      generated_at: generatedAt,
    };
  }

  renderHtml(payload: ReportCardPayload, verificationCode: string): Buffer {
    const fields = payload.template_fields;
    const student = asRecord(payload.student) ?? {};
    const series = asRecord(payload.exam_series) ?? {};
    const attendance = asRecord(payload.attendance) ?? {};
    const enteredSubjects = payload.subjects
      .filter(isEnteredSubject)
      .map((subject) => ({
        subject,
        percentage: reportSubjectPercentage(subject),
      }))
      .filter((entry): entry is { subject: ReportCardSubjectPayload & { score: number }; percentage: number } => entry.percentage !== null)
      .sort((left, right) => right.percentage - left.percentage);
    const bestSubject = enteredSubjects[0]?.subject.subject_name ?? null;
    const attendanceLabel = reportAttendanceLabel(attendance);
    const attendancePercentage = reportAttendancePercentage(attendance);
    const overallGrade = recordText(payload.totals, 'overall_grade', 'grade_label');
    const classPosition = recordText(payload.totals, 'class_position', 'position');
    const improvement = recordText(payload.totals, 'improvement', 'improvement_percentage');
    const conduct = fields.conduct_summary;
    const curriculumModel = recordText(series, 'curriculum_model', 'reporting_mode', 'curriculum');
    const logoSource = safeImageSource(fields.school_logo_ref);
    const classTeacherSignatureSource = safeImageSource(fields.class_teacher_signature_ref);
    const principalSignatureSource = safeImageSource(fields.principal_signature_ref);
    const schoolInitials = initials(fields.school_name);
    const generatedLabel = formatReportDate(payload.generated_at);
    const assessmentNames = [...new Set(payload.subjects.flatMap((subject) => (
      getReportCardAssessmentComponents(subject).map((component) => component.name).filter(Boolean)
    )))];
    const hasGrade = payload.subjects.some((subject) => Boolean(subject.grade_label));
    const hasAchievement = payload.subjects.some((subject) => Boolean(subject.descriptor ?? subject.remarks));
    const headers = ['Subject', ...assessmentNames.map((name) => `${name} %`), 'Final %', ...(hasGrade ? ['Grade'] : []), ...(hasAchievement ? ['Achievement Level'] : [])];
    const rows = payload.subjects.map((subject) => {
      const entered = isEnteredSubject(subject);
      const percentage = entered ? reportSubjectPercentage(subject) : null;
      const componentsByName = new Map(getReportCardAssessmentComponents(subject).map((component) => [component.name, component]));
      const values = [
        subject.subject_name,
        ...assessmentNames.map((name) => {
          const component = componentsByName.get(name);
          if (!component) return '';
          return component.percentage === null ? scoreStatusLabel(component.score_status) : formatPercentage(component.percentage);
        }),
        percentage === null ? scoreEvidenceLabel(subject) : `${formatNumber(percentage)}%`,
        ...(hasGrade ? [entered ? subject.grade_label ?? '' : ''] : []),
        ...(hasAchievement ? [entered ? subject.descriptor ?? subject.remarks ?? '' : scoreEvidenceLabel(subject)] : []),
      ];
      return `
        <tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>
      `;
    }).join('');
    const contactItems = [fields.school_address, fields.school_email, fields.school_phone].filter((item): item is string => Boolean(item));
    const summaryItems: Array<[string, string | null]> = [
      ['Average', enteredSubjects.length ? formatPercentage(payload.totals.percentage) : null],
      ['Overall Grade', overallGrade],
      [classPosition ? 'Class Position' : 'Total Score', classPosition ?? (payload.totals.total_max_score > 0 ? `${formatNumber(payload.totals.total_score)} / ${formatNumber(payload.totals.total_max_score)}` : null)],
    ];
    const overviewItems: Array<[string, string | null]> = [
      ['Attendance', attendancePercentage],
      ['Best subject', bestSubject],
      ['Improvement', improvement],
      ['Conduct', conduct],
    ];
    const termChart = renderTermHistoryChart(payload);
    const subjectChart = renderSubjectHistoryChart(payload, enteredSubjects);

    return Buffer.from(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(fields.learner_name)} Report Card</title>
  <style>
    :root { --navy:#071d49; --blue:#123b78; --gold:#efa500; --ink:#16233b; --muted:#607087; --line:#d6e0ee; --soft:#f5f8fc; }
    * { box-sizing:border-box; }
    @page { size:A4 portrait; margin:0; }
    html, body { margin:0; padding:0; background:#eef2f7; color:var(--ink); font-family:Arial, Helvetica, sans-serif; }
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .sheet { box-sizing:border-box; width:210mm; min-height:297mm; margin:0 auto; background:#fff; padding:5mm 6mm 4mm; }
    .header { height:31mm; border-bottom:1.2mm solid var(--navy); position:relative; text-align:center; }
    .brand-grid { display:grid; grid-template-columns:25mm 1fr 25mm; align-items:center; min-height:19mm; }
    .crest { width:20mm; height:20mm; margin:auto; display:flex; align-items:center; justify-content:center; border:1px solid var(--gold); border-radius:4mm; color:var(--navy); font-size:8mm; font-weight:900; overflow:hidden; background:#fff; }
    .crest img { width:100%; height:100%; object-fit:contain; }
    .product { margin:0; color:var(--navy); font-size:6.5mm; font-weight:900; line-height:1; }
    .product span { color:var(--gold); }
    .school-name { margin:1.5mm 0 0; color:var(--navy); font-size:5mm; font-weight:900; }
    .motto { margin:.8mm 0 0; color:var(--muted); font-size:2.3mm; font-style:italic; }
    .report-meta { display:flex; justify-content:center; gap:5mm; margin-top:1.8mm; color:var(--navy); font-size:2.4mm; font-weight:700; }
    .report-meta span + span { border-left:1px solid #9ba9bd; padding-left:5mm; }
    .contacts { display:flex; justify-content:center; gap:5mm; margin-top:1.7mm; padding-top:1.2mm; border-top:.3mm solid #f3c15e; color:var(--navy); font-size:2.15mm; }
    .section { margin-top:2.4mm; border:.35mm solid var(--line); border-radius:2.5mm; overflow:hidden; break-inside:avoid; }
    .section-title { margin:0; padding:1.5mm 3mm; color:var(--navy); font-size:2.8mm; font-weight:900; text-transform:uppercase; letter-spacing:.04em; background:#fff; }
    .section-title.navy { background:var(--navy); color:#fff; }
    .student-grid { display:grid; grid-template-columns:repeat(5,1fr); padding:0 2mm 2mm; }
    .field { min-height:12.5mm; padding:2.1mm 2.3mm; border-right:.3mm solid var(--line); border-top:.3mm solid var(--line); text-align:center; }
    .field:nth-child(5n) { border-right:0; }
    .field label { display:block; color:var(--navy); font-size:2.1mm; font-weight:800; }
    .field strong { display:block; margin-top:1.3mm; color:#111827; font-size:2.65mm; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .performance { margin-top:2.4mm; border:.35mm solid var(--line); border-radius:2.5mm; overflow:hidden; }
    table { width:100%; border-collapse:collapse; table-layout:fixed; font-size:2.15mm; }
    th { padding:1.5mm 1.4mm; color:var(--navy); background:#edf4fb; font-weight:900; border:.25mm solid var(--line); text-align:center; }
    td { padding:1.3mm 1.4mm; border:.25mm solid var(--line); text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    th:first-child, td:first-child { width:25%; text-align:left; }
    th:last-child, td:last-child { width:26%; }
    .summary { display:grid; grid-template-columns:repeat(3,1fr); border-top:.35mm solid var(--gold); background:#fffaf0; }
    .summary div { padding:2mm; text-align:center; border-right:.3mm solid var(--gold); font-size:2.55mm; }
    .summary div:last-child { border-right:0; }
    .summary b { margin-left:1mm; color:var(--navy); font-size:3.4mm; }
    .analytics-grid { display:grid; grid-template-columns:2fr 1fr; gap:2.4mm; margin-top:2.4mm; }
    .analytics-grid .section { margin-top:0; }
    .chart-pair { display:grid; grid-template-columns:1fr 1fr; gap:2mm; padding:1mm 2mm 2mm; }
    .chart { width:100%; min-height:38mm; border:.3mm solid var(--line); border-radius:1.8mm; background:#fbfdff; }
    .chart-title { color:var(--navy); font-size:2.1mm; font-weight:800; text-anchor:middle; }
    .chart-label { fill:var(--muted); font-size:1.65mm; }
    .performance-list { padding:1mm 3mm 2mm; }
    .performance-row { display:grid; grid-template-columns:29mm 1fr 11mm; align-items:center; gap:2mm; min-height:5mm; font-size:2mm; }
    .performance-row span { overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .performance-row b { color:var(--navy); text-align:right; }
    .performance-track { height:1.7mm; overflow:hidden; border-radius:2mm; background:#e5eaf1; }
    .performance-track i { display:block; height:100%; border-radius:2mm; background:linear-gradient(90deg,var(--gold),#f5c34b); }
    .overview { display:grid; grid-template-columns:1fr 1fr; gap:1.5mm; padding:1mm 2mm 2mm; }
    .overview div { min-height:10mm; padding:1.4mm 1.8mm; border:.3mm solid var(--line); border-radius:1.8mm; background:var(--soft); }
    .overview label { display:block; color:var(--muted); font-size:1.85mm; font-weight:800; text-transform:uppercase; }
    .overview strong { display:block; margin-top:1mm; color:var(--navy); font-size:2.6mm; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
    .comments { display:grid; grid-template-columns:1fr 1fr; gap:4mm; padding:1mm 3mm 2mm; }
    .comment { min-height:17mm; padding:1.5mm 2mm; border-left:1mm solid var(--gold); background:#fbfcfe; }
    .comment b { color:var(--navy); font-size:2.2mm; }
    .comment p { margin:1mm 0 0; font-size:2.15mm; line-height:1.35; }
    .signatures { display:grid; grid-template-columns:1fr 1fr; gap:20mm; padding:1.5mm 16mm 1mm; text-align:center; }
    .signature-line { height:9mm; border-bottom:.35mm solid var(--navy); display:flex; align-items:flex-end; justify-content:center; }
    .signature-line img { display:block; max-width:42mm; max-height:8mm; object-fit:contain; }
    .signature-name { min-height:3mm; margin-top:.7mm; color:var(--muted); font-size:1.9mm; }
    .signature-label { margin-top:1mm; color:var(--navy); font-size:2mm; font-weight:700; }
    .footer { display:flex; justify-content:space-between; align-items:center; margin-top:2mm; padding:1.8mm 3mm 0; border-top:.45mm solid var(--gold); color:var(--navy); font-size:1.9mm; }
    .empty-note { margin:3mm; color:var(--muted); font-size:2.1mm; }
    @media print { html, body { background:#fff; } .sheet { margin:0; } }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div class="brand-grid">
        <div class="crest">${logoSource ? `<img src="${escapeHtml(logoSource)}" alt="${escapeHtml(fields.school_name)} logo">` : escapeHtml(schoolInitials)}</div>
        <div>
          <p class="product">My<span>Shule</span></p>
          <h1 class="school-name">${escapeHtml(fields.school_name)}</h1>
          ${fields.school_motto ? `<p class="motto">${escapeHtml(fields.school_motto)}</p>` : ''}
        </div>
        <div></div>
      </div>
      <div class="report-meta">
        <span>Academic Report Card</span>
        ${reportPeriod(fields.term, fields.academic_year) ? `<span>${escapeHtml(reportPeriod(fields.term, fields.academic_year))}</span>` : ''}
        ${curriculumModel ? `<span>Curriculum: ${escapeHtml(curriculumModel)}</span>` : ''}
      </div>
      <div class="contacts">
        ${contactItems.map((item) => `<span>${escapeHtml(item)}</span>`).join('')}
      </div>
    </header>

    <section class="section">
      <h2 class="section-title">Student Information</h2>
      <div class="student-grid">
        ${htmlField('Student name', fields.learner_name)}
        ${htmlField('Adm No.', fields.admission_number)}
        ${htmlField('Grade/Class', fields.learner_class)}
        ${htmlField('Stream', fields.learner_stream)}
        ${htmlField('Gender', recordText(student, 'gender'))}
        ${htmlField('Academic year', fields.academic_year)}
        ${htmlField('Class teacher', recordText(student, 'class_teacher_name'))}
        ${htmlField('Days present', attendanceLabel)}
        ${htmlField('Closing date', reportDateValue(series, 'closing_date'))}
        ${htmlField('Next opening', fields.next_term_opening_date)}
      </div>
    </section>

    <section class="performance">
      <h2 class="section-title navy">Academic Performance</h2>
      <table>
        <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="summary">
        ${summaryItems.filter((item): item is [string, string] => Boolean(item[1])).map(([label, display]) => `<div>${escapeHtml(label)}:<b>${escapeHtml(display)}</b></div>`).join('')}
      </div>
    </section>

    <div class="analytics-grid">
      <section class="section">
        <h2 class="section-title">Performance Analytics</h2>
        <div class="chart-pair">${termChart}${subjectChart}</div>
      </section>
      <section class="section">
        <h2 class="section-title">Summary Overview</h2>
        <div class="overview">
          ${overviewItems.map(([label, display]) => htmlOverview(label, display)).join('')}
        </div>
      </section>
    </div>

    <section class="section">
      <h2 class="section-title">Comments</h2>
      <div class="comments">
        ${fields.class_teacher_comment ? `<div class="comment"><b>Class Teacher Comment</b><p>${escapeHtml(fields.class_teacher_comment)}</p></div>` : ''}
        ${fields.principal_comment ? `<div class="comment"><b>Principal Comment</b><p>${escapeHtml(fields.principal_comment)}</p></div>` : ''}
      </div>
      <div class="signatures">
        <div>
          <div class="signature-line">${classTeacherSignatureSource ? `<img src="${escapeHtml(classTeacherSignatureSource)}" alt="Class teacher signature">` : ''}</div>
          <div class="signature-name">${escapeHtml(fields.class_teacher_name ?? '')}</div>
          <div class="signature-label">Class Teacher Signature</div>
        </div>
        <div>
          <div class="signature-line">${principalSignatureSource ? `<img src="${escapeHtml(principalSignatureSource)}" alt="Principal signature">` : ''}</div>
          <div class="signature-name">${escapeHtml(fields.principal_name ?? '')}</div>
          <div class="signature-label">Principal Signature</div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <span>Generated securely by MyShule School Management System</span>
      <span>Verification: ${escapeHtml(verificationCode)} &middot; ${escapeHtml(generatedLabel)}</span>
    </footer>
  </main>
</body>
</html>`, 'utf8');
  }

  buildPdfInput(payload: ReportCardPayload, verificationCode: string): ReportArtifactInput {
    const fields = payload.template_fields;
    const rows: ReportArtifactValue[][] = [
      ['School', fields.school_name],
      ['Learner', fields.learner_name],
      ['Admission', fields.admission_number],
      ['Class/Stream', fields.class_stream],
      ['Term', fields.term],
      ['Academic Year', fields.academic_year],
      ['Verification Code', verificationCode],
      ['Total', `${payload.totals.total_score}/${payload.totals.total_max_score}`],
      ['Mean', payload.totals.mean_score],
      ['Percentage', `${payload.totals.percentage}%`],
      ...payload.subjects.map((subject) => [
        subject.subject_name,
        scoreEvidenceLabel(subject),
        subject.score_status === 'entered' ? subject.max_score : null,
        subject.grade_label,
        subject.remarks,
      ]),
      ['Class Teacher Comment', fields.class_teacher_comment],
      ['Principal Comment', fields.principal_comment],
      ['Next Term Opening Date', fields.next_term_opening_date],
    ];

    return {
      reportId: `report-card-${verificationCode.toLowerCase()}`,
      title: `${fields.learner_name} Report Card`,
      module: 'exams',
      filename: `report-card-${verificationCode.toLowerCase()}.pdf`,
      headers: ['Field', 'Value', 'Out Of', 'Grade', 'Comment'],
      rows,
      generatedAt: payload.generated_at,
      filters: {
        verification_code: verificationCode,
        exam_series: fields.exam_series,
      },
    };
  }

  private normalizeSubjects(value: unknown): ReportCardSubjectPayload[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const rows = value.map((subject) => {
      const row = asRecord(subject) ?? {};
      const scoreStatus = text(row.score_status) ?? 'entered';
      const score = numberOrNull(row.score);
      const maxScore = Number(row.max_score ?? 100);

      return {
        subject_id: text(row.subject_id) ?? '',
        subject_name: text(row.subject_name) ?? '',
        assessment_name: text(row.assessment_name),
        assessment_weight: numberOrNull(row.assessment_weight),
        score: scoreStatus === 'entered' ? score : null,
        score_status: scoreStatus,
        max_score: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100,
        percentage: numberOrNull(row.percentage),
        grade_label: text(row.grade_label),
        remarks: text(row.remarks),
        points: numberOrNull(row.points),
        descriptor: text(row.descriptor),
        competency_outcome: text(row.competency_outcome),
      };
    }).filter((subject) => subject.subject_id || subject.subject_name);

    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.subject_id || row.subject_name;
      const existing = grouped.get(key) ?? [];
      existing.push(row);
      grouped.set(key, existing);
    }

    return [...grouped.values()].map((group) => {
      const first = group[0]!;
      const components = group.map((subject) => ({
        name: subject.assessment_name ?? '',
        weight: subject.assessment_weight ?? null,
        score: subject.score,
        max_score: subject.max_score,
        percentage: reportSubjectPercentage(subject),
        score_status: subject.score_status,
      }));
      const complete = components.length > 0 && components.every((component) => (
        component.score_status === 'entered'
        && component.score !== null
        && component.percentage !== null
      ));
      const entered = components.filter((component) => component.percentage !== null);
      const hasCompleteWeights = entered.every((component) => component.weight !== null && component.weight > 0);
      const weightTotal = entered.reduce((sum, component) => (
        sum + (component.weight !== null && component.weight > 0 ? component.weight : 0)
      ), 0);
      const percentage = complete
        ? Number((hasCompleteWeights && weightTotal > 0
          ? entered.reduce((sum, component) => (
              sum + (Number(component.percentage) * (component.weight !== null && component.weight > 0 ? component.weight : 0))
            ), 0) / weightTotal
          : entered.reduce((sum, component) => sum + Number(component.percentage), 0) / entered.length
        ).toFixed(2))
        : null;
      const firstIncomplete = components.find((component) => component.score_status !== 'entered');
      const uniqueRemarks = [...new Set(group.map((subject) => subject.remarks).filter((remark): remark is string => Boolean(remark)))];

      return {
        ...first,
        assessment_name: group.length === 1 ? first.assessment_name : null,
        assessment_weight: group.length === 1 ? first.assessment_weight : null,
        assessment_components: components,
        score: percentage,
        max_score: 100,
        percentage,
        score_status: complete ? 'entered' : firstIncomplete?.score_status ?? 'incomplete',
        grade_label: group.length === 1 ? first.grade_label : null,
        points: group.length === 1 ? first.points : null,
        descriptor: group.length === 1 ? first.descriptor : null,
        competency_outcome: group.length === 1 ? first.competency_outcome : null,
        remarks: uniqueRemarks.length ? uniqueRemarks.join(' | ') : null,
      };
    });
  }
}

export function buildPersonalizedReportCardComments(input: {
  student: Record<string, unknown>;
  subjects: ReportCardSubjectPayload[];
  percentage: number;
  overallGrade?: string | null;
  termHistory: ReportCardPayload['analytics']['term_history'];
  attendance?: Record<string, unknown> | null;
}): { classTeacher: string | null; principal: string | null } {
  const enteredSubjects = input.subjects
    .map((subject) => ({ subject, percentage: reportSubjectPercentage(subject) }))
    .filter((entry): entry is { subject: ReportCardSubjectPayload; percentage: number } => entry.percentage !== null)
    .sort((left, right) => right.percentage - left.percentage || left.subject.subject_name.localeCompare(right.subject.subject_name));

  if (enteredSubjects.length === 0) {
    return { classTeacher: null, principal: null };
  }

  const storedFirstName = text(input.student.first_name);
  const fullName = text(input.student.full_name);
  const learnerName = storedFirstName ?? fullName?.split(/\s+/)[0] ?? 'The learner';
  const overall = Math.max(0, Math.min(100, Number(input.percentage.toFixed(2))));
  const grade = text(input.overallGrade);
  const overallFact = `${learnerName} recorded ${formatPercentage(overall)} overall${grade ? ` (${grade})` : ''}.`;
  const strongest = enteredSubjects[0]!;
  const support = enteredSubjects[enteredSubjects.length - 1]!;
  const classTeacherFacts = [overallFact];

  if (enteredSubjects.length === 1) {
    classTeacherFacts.push(
      `${strongest.subject.subject_name} was assessed at ${formatPercentage(strongest.percentage)}.`,
    );
  } else {
    classTeacherFacts.push(
      `${strongest.subject.subject_name} was the highest result at ${formatPercentage(strongest.percentage)}.`,
    );
    if (strongest.percentage - support.percentage >= 5) {
      classTeacherFacts.push(
        `Focused practice in ${support.subject.subject_name}, recorded at ${formatPercentage(support.percentage)}, is the clearest next step.`,
      );
    } else {
      classTeacherFacts.push(
        `Results were balanced across the assessed subjects, ranging from ${formatPercentage(support.percentage)} to ${formatPercentage(strongest.percentage)}.`,
      );
    }
  }

  const trend = reportCardTrendSentence(input.termHistory);
  if (trend) classTeacherFacts.push(trend.classTeacher);

  const attendanceFact = reportCardAttendanceSentence(input.attendance);
  if (attendanceFact) classTeacherFacts.push(attendanceFact);

  const principalFacts = [overallFact];
  if (enteredSubjects.length > 1) {
    principalFacts.push(
      `${strongest.subject.subject_name} led the assessed subjects at ${formatPercentage(strongest.percentage)}.`,
    );
  }
  if (trend) principalFacts.push(trend.principal);

  if (overall >= 80) {
    principalFacts.push('Sustain this high level of effort while continuing to strengthen every assessed subject.');
  } else if (overall >= 65) {
    principalFacts.push('Maintain the strongest areas and follow the class teacher’s focused subject guidance.');
  } else if (overall >= 50) {
    principalFacts.push('Steady, targeted practice and regular follow-up can lift the next reporting result.');
  } else {
    principalFacts.push('A structured academic support plan and regular follow-up are recommended for the next reporting cycle.');
  }

  return {
    classTeacher: classTeacherFacts.join(' '),
    principal: principalFacts.join(' '),
  };
}

function reportCardTrendSentence(
  history: ReportCardPayload['analytics']['term_history'],
): { classTeacher: string; principal: string } | null {
  if (history.length < 2) return null;
  const current = history[0]!;
  const previous = history[1]!;
  const difference = Number((current.percentage - previous.percentage).toFixed(2));
  if (Math.abs(difference) < 0.05) {
    return {
      classTeacher: `This was unchanged from ${previous.label}.`,
      principal: `The overall result was steady compared with ${previous.label}.`,
    };
  }
  const amount = `${formatNumber(Math.abs(difference))} percentage point${Math.abs(difference) === 1 ? '' : 's'}`;
  return difference > 0
    ? {
        classTeacher: `This improved by ${amount} from ${previous.label}.`,
        principal: `The overall result improved by ${amount} from ${previous.label}.`,
      }
    : {
        classTeacher: `This was ${amount} below ${previous.label}, making recovery of that gap a useful next target.`,
        principal: `The overall result was ${amount} below ${previous.label}, so focused follow-up is needed.`,
      };
}

function reportCardAttendanceSentence(attendance?: Record<string, unknown> | null): string | null {
  if (!attendance) return null;
  const present = recordNumber(attendance, 'days_present');
  const total = recordNumber(attendance, 'total_days');
  if (present === null) return null;
  if (total === null || total <= 0) {
    return `Attendance recorded ${formatNumber(present)} present day${present === 1 ? '' : 's'}.`;
  }
  return `Attendance was ${formatNumber(present)} of ${formatNumber(total)} days (${formatPercentage((present / total) * 100)}).`;
}

export function extractPersistedReportCardPayload(metadataValue: unknown): ReportCardPayload | null {
  const metadata = parseRecord(metadataValue);
  const reportCard = parseRecord(metadata?.report_card);
  const templateFields = parseRecord(reportCard?.template_fields);
  const totals = parseRecord(reportCard?.totals);

  if (
    !reportCard
    || !templateFields
    || !totals
    || !Array.isArray(reportCard.subjects)
    || typeof reportCard.generated_at !== 'string'
  ) {
    return null;
  }

  return reportCard as unknown as ReportCardPayload;
}

function isEnteredSubject(
  subject: ReportCardSubjectPayload,
): subject is ReportCardSubjectPayload & { score: number } {
  return subject.score_status === 'entered'
    && typeof subject.score === 'number'
    && Number.isFinite(subject.score);
}

function scoreEvidenceLabel(subject: ReportCardSubjectPayload): string {
  if (isEnteredSubject(subject)) {
    return String(subject.score);
  }

  return scoreStatusLabel(subject.score_status);
}

function scoreStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    absent: 'Absent',
    exempt: 'Exempt',
    not_assessed: 'Not assessed',
    incomplete: 'Incomplete',
    withheld: 'Withheld',
    medical_exception: 'Medical exception',
    transfer_student: 'Transfer student',
  };

  return labels[status] ?? status.replace(/_/g, ' ').replace(/^./, (value) => value.toUpperCase());
}

export function getReportCardAssessmentComponents(subject: ReportCardSubjectPayload): NonNullable<ReportCardSubjectPayload['assessment_components']> {
  if (Array.isArray(subject.assessment_components)) {
    return subject.assessment_components.map((value) => {
      const component = asRecord(value) ?? {};
      const maxScore = numberOrNull(component.max_score) ?? 100;
      const score = numberOrNull(component.score);
      const percentage = numberOrNull(component.percentage)
        ?? (score !== null && maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : null);
      return {
        name: text(component.name) ?? '',
        weight: numberOrNull(component.weight),
        score,
        max_score: maxScore,
        percentage,
        score_status: text(component.score_status) ?? '',
      };
    }).filter((component) => component.name);
  }

  if (!subject.assessment_name) return [];
  return [{
    name: subject.assessment_name,
    weight: subject.assessment_weight ?? null,
    score: subject.score,
    max_score: subject.max_score,
    percentage: reportSubjectPercentage(subject),
    score_status: subject.score_status,
  }];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') {
    return asRecord(value);
  }

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeTermHistory(value: unknown): ReportCardPayload['analytics']['term_history'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      exam_series_id: text(row.exam_series_id) ?? '',
      label: text(row.label) ?? '',
      percentage: numberOrNull(row.percentage),
    };
  }).filter((row): row is ReportCardPayload['analytics']['term_history'][number] => (
    Boolean(row.exam_series_id && row.label) && row.percentage !== null
  )).map((row) => ({ ...row, percentage: Math.max(0, Math.min(100, row.percentage)) }));
}

function normalizeSubjectHistory(value: unknown): ReportCardPayload['analytics']['subject_history'] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = asRecord(item) ?? {};
    return {
      exam_series_id: text(row.exam_series_id) ?? '',
      label: text(row.label) ?? '',
      subject_id: text(row.subject_id) ?? '',
      subject_name: text(row.subject_name) ?? '',
      percentage: numberOrNull(row.percentage),
    };
  }).filter((row): row is ReportCardPayload['analytics']['subject_history'][number] => (
    Boolean(row.exam_series_id && row.label && row.subject_id && row.subject_name) && row.percentage !== null
  )).map((row) => ({ ...row, percentage: Math.max(0, Math.min(100, row.percentage)) }));
}

function resolveOverallGrade(policy: Record<string, unknown>, percentage: number): string | null {
  return resolveGradeBoundary(policy, percentage)?.label ?? null;
}

function resolveGradeBoundary(policy: Record<string, unknown>, percentage: number): {
  label: string;
  points: number | null;
  descriptor: string | null;
  remark: string | null;
} | null {
  const scope = asRecord(policy.scope) ?? {};
  const candidates = [policy.rules, policy.boundaries, scope.boundaries];

  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    const rule = candidate
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item))
      .map((item) => ({
        label: text(item.label) ?? text(item.grade),
        minimum: numberOrNull(item.min ?? item.min_score),
        maximum: numberOrNull(item.max ?? item.max_score),
        points: numberOrNull(item.points),
        descriptor: text(item.descriptor),
        remark: text(item.remark) ?? text(item.remarks),
      }))
      .filter((item) => item.label && item.minimum !== null)
      .sort((left, right) => Number(right.minimum) - Number(left.minimum))
      .find((item) => percentage >= Number(item.minimum)
        && (item.maximum === null || percentage <= item.maximum));
    if (rule?.label) {
      return {
        label: rule.label,
        points: rule.points,
        descriptor: rule.descriptor,
        remark: rule.remark,
      };
    }
  }

  return null;
}

function recordText(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = text(record[key]);
    if (value) return value;
  }
  return null;
}

function recordNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined || value === '') continue;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function reportSubjectPercentage(subject: ReportCardSubjectPayload): number | null {
  if (!isEnteredSubject(subject)) return null;
  if (typeof subject.percentage === 'number' && Number.isFinite(subject.percentage)) {
    return Number(subject.percentage.toFixed(2));
  }
  if (subject.max_score <= 0) return null;
  return Number(((subject.score / subject.max_score) * 100).toFixed(2));
}

function reportAttendanceLabel(attendance: Record<string, unknown>): string | null {
  const present = recordNumber(attendance, 'days_present');
  const total = recordNumber(attendance, 'total_days');
  if (present === null) return null;
  return total === null ? formatNumber(present) : `${formatNumber(present)}/${formatNumber(total)}`;
}

function reportAttendancePercentage(attendance: Record<string, unknown>): string | null {
  const persisted = recordNumber(attendance, 'percentage', 'attendance_percentage');
  if (persisted !== null) return formatPercentage(persisted);
  const present = recordNumber(attendance, 'days_present');
  const total = recordNumber(attendance, 'total_days');
  if (present === null || total === null || total <= 0) return null;
  return formatPercentage((present / total) * 100);
}

function reportDateValue(record: Record<string, unknown>, ...keys: string[]): string | null {
  const value = recordText(record, ...keys);
  return value ? formatReportDate(value) : null;
}

function formatReportDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatPercentage(value: number): string {
  return `${formatNumber(value)}%`;
}

function reportPeriod(term: string | null, year: string | null): string {
  return [term, year].filter(Boolean).join(', ');
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'S';
}

function safeImageSource(value: string | null): string | null {
  if (!value) return null;
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/(?!\/)/.test(value)) return value;
  return null;
}

function htmlField(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const display = String(value);
  return `<div class="field"><label>${escapeHtml(label)}</label><strong>${escapeHtml(display)}</strong></div>`;
}

function htmlOverview(label: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const display = String(value);
  return `<div><label>${escapeHtml(label)}</label><strong>${escapeHtml(display)}</strong></div>`;
}

function renderTermHistoryChart(payload: ReportCardPayload): string {
  const persisted = payload.analytics?.term_history ?? [];
  const history = persisted.length
    ? [...persisted].reverse()
    : payload.totals.total_max_score > 0
      ? [{
          exam_series_id: recordText(payload.exam_series, 'id') ?? 'current',
          label: payload.template_fields.term ?? payload.template_fields.exam_series ?? '',
          percentage: payload.totals.percentage,
        }].filter((entry) => entry.label)
      : [];
  if (!history.length) return '';
  const points = history.map((entry, index) => ({
    ...entry,
    x: 28 + ((144 * index) / Math.max(1, history.length - 1)),
    y: 77 - ((Math.max(0, Math.min(100, entry.percentage)) / 100) * 55),
  }));
  return `<svg class="chart" viewBox="0 0 190 105" role="img" aria-label="Term performance trend">
    <text class="chart-title" x="95" y="12">Term Performance Trend</text>
    ${renderChartAxes()}
    ${points.length > 1 ? `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="#efa500" stroke-width="2"/>` : ''}
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.2" fill="#efa500"/><text x="${point.x}" y="${Math.max(18, point.y - 6)}" text-anchor="middle" font-size="6" font-weight="700" fill="#071d49">${escapeHtml(formatPercentage(point.percentage))}</text><text class="chart-label" x="${point.x}" y="88" text-anchor="middle">${escapeHtml(shortLabel(point.label, 10))}</text>`).join('')}
  </svg>`;
}

function renderSubjectHistoryChart(
  payload: ReportCardPayload,
  currentEntries: Array<{ subject: ReportCardSubjectPayload & { score: number }; percentage: number }>,
): string {
  const history = payload.analytics?.subject_history ?? [];
  const terms = history.length
    ? [...new Map(history.map((entry) => [entry.exam_series_id, entry.label])).entries()].map(([id, label]) => ({ id, label }))
    : (payload.template_fields.term ?? payload.template_fields.exam_series)
      ? [{ id: 'current', label: payload.template_fields.term ?? payload.template_fields.exam_series ?? '' }]
      : [];
  const subjects = history.length
    ? [...new Map(history.map((entry) => [entry.subject_id, entry.subject_name])).entries()].slice(0, 4).map(([id, name]) => ({ id, name }))
    : currentEntries.slice(0, 4).map((entry) => ({ id: entry.subject.subject_id, name: entry.subject.subject_name }));
  if (!terms.length || !subjects.length) return '';
  const colors = ['#071d49', '#efa500', '#6fa83a', '#7244b8'];
  const lines = subjects.map((subject, subjectIndex) => {
    const points = terms.map((term, termIndex) => {
      const persisted = history.find((entry) => entry.exam_series_id === term.id && entry.subject_id === subject.id);
      const current = !history.length ? currentEntries.find((entry) => entry.subject.subject_id === subject.id) : null;
      const percentage = persisted?.percentage ?? current?.percentage;
      return percentage === undefined ? null : {
        x: 28 + ((144 * termIndex) / Math.max(1, terms.length - 1)),
        y: 77 - ((Math.max(0, Math.min(100, percentage)) / 100) * 55),
      };
    }).filter((point): point is { x: number; y: number } => point !== null);
    const color = colors[subjectIndex] ?? '#071d49';
    return `${points.length > 1 ? `<polyline points="${points.map((point) => `${point.x},${point.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="1.7"/>` : ''}${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="2.7" fill="${color}"/>`).join('')}<circle cx="${28 + ((subjectIndex % 2) * 84)}" cy="${96 + (Math.floor(subjectIndex / 2) * 6)}" r="2" fill="${color}"/><text class="chart-label" x="${34 + ((subjectIndex % 2) * 84)}" y="${98 + (Math.floor(subjectIndex / 2) * 6)}">${escapeHtml(shortLabel(subject.name, 13))}</text>`;
  }).join('');
  return `<svg class="chart" viewBox="0 0 190 110" role="img" aria-label="Subject performance over recorded reporting periods">
    <text class="chart-title" x="95" y="12">Subject Performance Over Time</text>
    ${renderChartAxes()}
    ${lines}
    ${terms.map((term, index) => `<text class="chart-label" x="${28 + ((144 * index) / Math.max(1, terms.length - 1))}" y="88" text-anchor="middle">${escapeHtml(shortLabel(term.label, 9))}</text>`).join('')}
  </svg>`;
}

function renderChartAxes(): string {
  return [0, 50, 100].map((tick) => {
    const y = 77 - ((tick / 100) * 55);
    return `<line x1="27" y1="${y}" x2="174" y2="${y}" stroke="${tick === 0 ? '#8c99aa' : '#dfe6ef'}" stroke-width=".7"/><text class="chart-label" x="22" y="${y + 2}" text-anchor="end">${tick}</text>`;
  }).join('') + '<line x1="27" y1="22" x2="27" y2="77" stroke="#8c99aa" stroke-width=".7"/>';
}

function shortLabel(value: string, length: number): string {
  return value.length <= length ? value : `${value.slice(0, Math.max(1, length - 1))}.`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
