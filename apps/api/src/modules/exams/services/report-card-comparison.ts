import type { ReportCardPayload } from './report-card-template.service';
import { examGradeOverrideSql, paperClassScopeSql } from '../exam-result-policy';

// Compare exam chronology, never the time a teacher last corrected a mark.
function comparisonSql(previousExams: 1 | 2) { return `
WITH current_exam AS (
  SELECT series.id, series.name AS label, series.created_at,
    COALESCE(series.starts_on::timestamptz, series.created_at) AS exam_at
  FROM exam_series series WHERE series.tenant_id = $1 AND series.id = $2::uuid
), previous_exam AS (
  SELECT series.id, series.name AS label, series.created_at,
    COALESCE(series.starts_on::timestamptz, series.created_at) AS exam_at
  FROM exam_series series CROSS JOIN current_exam current
  WHERE series.tenant_id = $1
    AND (COALESCE(series.starts_on::timestamptz, series.created_at), series.created_at, series.id)
      < (current.exam_at, current.created_at, current.id)
    AND EXISTS (SELECT 1 FROM exam_marks mark WHERE mark.tenant_id = $1
      AND mark.exam_series_id = series.id AND mark.student_id = $3::uuid
      AND mark.status IN ('locked', 'published'))
  ORDER BY exam_at DESC, series.created_at DESC, series.id DESC LIMIT ${previousExams}
), comparison AS (
  SELECT * FROM previous_exam UNION ALL SELECT * FROM current_exam
), expected_keys AS (
  SELECT DISTINCT mark.exam_series_id, mark.class_section_id, mark.subject_id
  FROM exam_marks mark JOIN comparison series ON series.id = mark.exam_series_id
  WHERE mark.tenant_id = $1 AND mark.student_id = $3::uuid
  UNION
  SELECT entry_window.exam_series_id, entry_window.class_section_id, entry_window.subject_id
  FROM exam_mark_entry_windows entry_window JOIN comparison series ON series.id = entry_window.exam_series_id
  JOIN exam_series exam ON exam.tenant_id = entry_window.tenant_id AND exam.id = entry_window.exam_series_id
  JOIN student_subject_enrollments enrollment ON enrollment.tenant_id = entry_window.tenant_id
    AND enrollment.student_id = $3::text AND enrollment.class_section_id = entry_window.class_section_id::text
    AND enrollment.subject_id = entry_window.subject_id::text AND enrollment.status = 'active'
    AND (to_jsonb(enrollment)->>'academic_term_id' IS NULL OR to_jsonb(enrollment)->>'academic_term_id' = exam.academic_term_id::text)
  WHERE entry_window.tenant_id = $1 AND EXISTS (SELECT 1 FROM student_class_assignments placement
    WHERE placement.tenant_id = $1 AND placement.student_id = enrollment.student_id
      AND placement.class_section_id = enrollment.class_section_id AND placement.status IN ('active', 'completed', 'transferred'))
)
SELECT series.id::text AS exam_series_id, series.label, series.exam_at, series.created_at, key.subject_id::text,
  COALESCE(subject.name, MAX(assessment.name), '') AS subject_name,
  ${examGradeOverrideSql("COALESCE(mark.score_status, 'missing')")} AS override_grade,
  BOOL_AND(mark.score_status = 'exempt') AS exempt,
  CASE WHEN BOOL_AND(COALESCE(mark.score_status = 'exempt' OR (mark.score_status = 'entered' AND mark.score IS NOT NULL
      AND assessment.max_score > 0 AND mark.score BETWEEN 0 AND assessment.max_score), FALSE))
    THEN ROUND(SUM(mark.score / NULLIF(assessment.max_score, 0) * COALESCE(assessment.weight, assessment.max_score)) FILTER (WHERE mark.score_status = 'entered')
      / NULLIF(SUM(COALESCE(assessment.weight, assessment.max_score)) FILTER (WHERE mark.score_status = 'entered'), 0) * 100, 2)::float
    ELSE NULL END AS percentage
FROM comparison series
LEFT JOIN expected_keys key ON key.exam_series_id = series.id
LEFT JOIN exam_assessments assessment ON assessment.tenant_id = $1 AND assessment.exam_series_id = series.id
  AND assessment.subject_id = key.subject_id AND ${paperClassScopeSql('assessment', 'key.class_section_id')}
LEFT JOIN exam_marks mark ON mark.tenant_id = $1 AND mark.exam_series_id = series.id AND mark.assessment_id = assessment.id
  AND mark.student_id = $3::uuid AND mark.class_section_id = key.class_section_id AND mark.subject_id = key.subject_id
  AND mark.status IN ('locked', 'published')
LEFT JOIN subjects subject ON subject.tenant_id = $1 AND subject.id = key.subject_id::text
GROUP BY series.id, series.label, series.exam_at, series.created_at, key.subject_id, subject.name
ORDER BY series.exam_at, series.created_at, series.id, subject.name`; }

export const REPORT_COMPARISON_SQL = comparisonSql(1);

// Processed overall results take precedence; older exams without snapshots use the
// same weighted subject averages as report generation, never fabricated totals.
export const REPORT_TREND_SQL = `WITH subject_results AS (${comparisonSql(2)})
SELECT result.exam_series_id, result.label,
  CASE WHEN ${examGradeOverrideSql('result.override_grade')} IS NOT NULL OR snapshot.grade_label IN ('X', 'Y') THEN NULL
    WHEN snapshot.has_snapshot THEN snapshot.average_percentage::float
    WHEN BOOL_AND(result.percentage IS NOT NULL OR result.exempt) THEN ROUND(AVG(result.percentage)::numeric, 2)::float END AS percentage
FROM subject_results result
LEFT JOIN LATERAL (
  SELECT TRUE AS has_snapshot, stored.average_percentage, stored.grade_label FROM exam_result_snapshots stored
  WHERE stored.tenant_id = $1 AND stored.exam_series_id = result.exam_series_id::uuid
    AND stored.student_id = $3::uuid
  ORDER BY stored.processed_at DESC LIMIT 1
) snapshot ON TRUE
GROUP BY result.exam_series_id, result.label, result.exam_at, result.created_at, snapshot.has_snapshot, snapshot.average_percentage, snapshot.grade_label
ORDER BY result.exam_at DESC, result.created_at DESC, result.exam_series_id DESC`;

export function comparisonExams(rows: Array<Record<string, unknown>>) {
  return [...new Map(rows.filter(row => row.exam_series_id && row.label)
    .map(row => [String(row.exam_series_id), { exam_series_id: String(row.exam_series_id), label: String(row.label) }])).values()];
}

export async function hydrateReportComparison(payload: ReportCardPayload, load: () => Promise<Array<Record<string, unknown>>>, loadTrend?: () => Promise<Array<Record<string, unknown>>>) {
  if (payload.analytics.comparison_exams !== undefined || !payload.exam_series.id) return payload;
  const rows = await load();
  const trend = loadTrend ? await loadTrend() : null;
  return { ...payload, analytics: { ...payload.analytics, comparison_exams: comparisonExams(rows),
    ...(trend ? { term_history: trend.filter(row => typeof row.percentage === 'number').map(row => ({ exam_series_id: String(row.exam_series_id), label: String(row.label), percentage: Number(row.percentage) })) } : {}),
    subject_history: rows.filter(row => typeof row.percentage === 'number' && row.subject_id && row.subject_name)
      .map(row => ({ exam_series_id: String(row.exam_series_id), label: String(row.label), subject_id: String(row.subject_id), subject_name: String(row.subject_name), percentage: Number(row.percentage) })) } };
}

export function termComparison(payload: ReportCardPayload) {
  const currentId = String(payload.exam_series.id ?? 'current');
  const previous = [...new Map(payload.analytics.term_history.filter(exam => exam.exam_series_id !== currentId)
    .map(exam => [exam.exam_series_id, exam])).values()].slice(0, 2).reverse();
  const current = payload.subjects.some(subject => subject.score_status === 'entered' && subject.score !== null)
    ? [{ exam_series_id: currentId, label: payload.template_fields.exam_series ?? String(payload.exam_series.name ?? 'Current exam'), percentage: payload.totals.percentage }] : [];
  return [...previous, ...current];
}

export function subjectComparison(payload: ReportCardPayload) {
  const currentId = String(payload.exam_series.id ?? 'current');
  const current = { exam_series_id: currentId, label: payload.template_fields.exam_series ?? String(payload.exam_series.name ?? 'Current exam') };
  const previous = payload.analytics.comparison_exams?.filter(exam => exam.exam_series_id !== currentId).at(-1);
  const exams = previous ? [previous, current] : [current];
  const subjects = payload.subjects.map(subject => {
    const percentage = subject.score_status === 'entered' && subject.score !== null && subject.max_score > 0
      ? subject.percentage ?? subject.score / subject.max_score * 100 : null;
    const prior = previous ? payload.analytics.subject_history.find(row => row.exam_series_id === previous.exam_series_id && row.subject_id === subject.subject_id) : undefined;
    return { id: subject.subject_id, name: subject.subject_name, percentages: previous ? [prior?.percentage ?? null, percentage] : [percentage] };
  });
  return { exams, subjects };
}
