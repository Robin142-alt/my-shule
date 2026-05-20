import { Injectable } from '@nestjs/common';

import type { ReportArtifactInput, ReportArtifactValue } from '../../../common/reports/report-artifact';

export interface ReportCardSubjectPayload {
  subject_id: string;
  subject_name: string;
  score: number;
  max_score: number;
  grade_label: string | null;
  remarks: string | null;
  points?: number | null;
  descriptor?: string | null;
  competency_outcome?: string | null;
}

export interface ReportCardPayload {
  exam_series: Record<string, unknown>;
  student: Record<string, unknown>;
  attendance: Record<string, unknown> | null;
  subjects: ReportCardSubjectPayload[];
  totals: {
    total_score: number;
    total_max_score: number;
    mean_score: number;
    percentage: number;
  };
  template_fields: {
    school_name: string;
    school_address: string | null;
    school_contacts: string | null;
    learner_name: string;
    admission_number: string | null;
    class_stream: string | null;
    academic_year: string | null;
    term: string | null;
    exam_series: string | null;
    class_teacher_comment: string | null;
    principal_comment: string | null;
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
    const subjects = this.normalizeSubjects(data.subjects);
    const totalScore = subjects.reduce((sum, subject) => sum + subject.score, 0);
    const totalMaxScore = subjects.reduce((sum, subject) => sum + subject.max_score, 0);
    const meanScore = subjects.length > 0 ? Number((totalScore / subjects.length).toFixed(2)) : 0;
    const percentage = totalMaxScore > 0
      ? Number(((totalScore / totalMaxScore) * 100).toFixed(2))
      : 0;
    const school = asRecord(data.school) ?? {};
    const student = asRecord(data.student) ?? {};
    const series = asRecord(data.exam_series) ?? {};
    const comments = asRecord(data.comments) ?? {};
    const nextTerm = asRecord(data.next_term) ?? {};
    const policy = asRecord(data.school_policy) ?? {};

    return {
      exam_series: series,
      student,
      attendance: asRecord(data.attendance),
      subjects,
      totals: {
        total_score: totalScore,
        total_max_score: totalMaxScore,
        mean_score: meanScore,
        percentage,
      },
      template_fields: {
        school_name: text(school.name) ?? 'School',
        school_address: text(school.address),
        school_contacts: [text(school.phone), text(school.email)].filter(Boolean).join(' | ') || null,
        learner_name: text(student.full_name) ?? 'Learner',
        admission_number: text(student.admission_number),
        class_stream: [text(student.class_name), text(student.stream_name)].filter(Boolean).join(' ') || null,
        academic_year: text(series.academic_year_name),
        term: text(series.academic_term_name),
        exam_series: text(series.name),
        class_teacher_comment: text(comments.class_teacher),
        principal_comment: text(comments.principal),
        principal_signature_ref: text(comments.principal_signature_ref),
        next_term_opening_date: text(nextTerm.opening_date),
        conduct_summary: text(comments.conduct_summary),
        fee_balance_note: text(policy.include_fee_balance) === 'true' ? text(data.fee_balance_note) : null,
      },
      generated_at: generatedAt,
    };
  }

  renderHtml(payload: ReportCardPayload, verificationCode: string): Buffer {
    const rows = payload.subjects.map((subject) => `
      <tr>
        <td>${escapeHtml(subject.subject_name)}</td>
        <td>${subject.score}</td>
        <td>${subject.max_score}</td>
        <td>${escapeHtml(subject.grade_label ?? '')}</td>
        <td>${escapeHtml(subject.remarks ?? subject.descriptor ?? '')}</td>
      </tr>
    `).join('');

    return Buffer.from(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(payload.template_fields.learner_name)} Report Card</title>
  <style>
    body { font-family: Arial, sans-serif; color: #172033; margin: 32px; }
    header { border-bottom: 2px solid #172033; padding-bottom: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border: 1px solid #d7dde8; padding: 8px; text-align: left; }
    th { background: #eef2f7; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 24px; }
    .verification { margin-top: 24px; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(payload.template_fields.school_name)}</h1>
    <p>${escapeHtml(payload.template_fields.school_address ?? '')}</p>
    <p>${escapeHtml(payload.template_fields.school_contacts ?? '')}</p>
  </header>
  <section class="meta">
    <div><strong>Learner:</strong> ${escapeHtml(payload.template_fields.learner_name)}</div>
    <div><strong>Admission:</strong> ${escapeHtml(payload.template_fields.admission_number ?? '')}</div>
    <div><strong>Class/Stream:</strong> ${escapeHtml(payload.template_fields.class_stream ?? '')}</div>
    <div><strong>Term:</strong> ${escapeHtml(payload.template_fields.term ?? '')}</div>
    <div><strong>Academic Year:</strong> ${escapeHtml(payload.template_fields.academic_year ?? '')}</div>
    <div><strong>Exam:</strong> ${escapeHtml(payload.template_fields.exam_series ?? '')}</div>
  </section>
  <table>
    <thead><tr><th>Subject</th><th>Marks</th><th>Out Of</th><th>Grade</th><th>Comment</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p><strong>Total:</strong> ${payload.totals.total_score}/${payload.totals.total_max_score}</p>
  <p><strong>Mean:</strong> ${payload.totals.mean_score} | <strong>Percentage:</strong> ${payload.totals.percentage}%</p>
  <p><strong>Class Teacher:</strong> ${escapeHtml(payload.template_fields.class_teacher_comment ?? '')}</p>
  <p><strong>Principal:</strong> ${escapeHtml(payload.template_fields.principal_comment ?? '')}</p>
  <p><strong>Next Term:</strong> ${escapeHtml(payload.template_fields.next_term_opening_date ?? '')}</p>
  <p class="verification">Verification code: ${escapeHtml(verificationCode)}</p>
  <p>Generated at: ${escapeHtml(payload.generated_at)}</p>
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
        subject.score,
        subject.max_score,
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

    return value.map((subject) => {
      const row = asRecord(subject) ?? {};
      const score = Number(row.score ?? 0);
      const maxScore = Number(row.max_score ?? 100);

      return {
        subject_id: text(row.subject_id) ?? '',
        subject_name: text(row.subject_name) ?? 'Subject',
        score: Number.isFinite(score) ? score : 0,
        max_score: Number.isFinite(maxScore) && maxScore > 0 ? maxScore : 100,
        grade_label: text(row.grade_label),
        remarks: text(row.remarks),
        points: numberOrNull(row.points),
        descriptor: text(row.descriptor),
        competency_outcome: text(row.competency_outcome),
      };
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
