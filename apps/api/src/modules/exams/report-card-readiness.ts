import { examRosterSql } from './exam-mark-roster';
import { paperClassScopeSql } from './exam-result-policy';
// Shared by the generation preflight and the report-card selector. Do not derive
// readiness from paginated mark sheets: missing learner marks have no row there.
// Parameters: school, optional exam, optional class, optional stream name.
export function reportCardReadinessCtes(options: {
  selectedWindowsSql?: string;
  streamNameSql?: string;
  studentIdSql?: string;
} = {}): string {
  const selectedWindowsSql = options.selectedWindowsSql ?? `
  SELECT DISTINCT exam_series_id, class_section_id, subject_id
  FROM exam_mark_entry_windows
  WHERE tenant_id = $1
    AND ($2::uuid IS NULL OR exam_series_id = $2::uuid)
    AND ($3::uuid IS NULL OR class_section_id = $3::uuid)`;
  const streamNameSql = options.streamNameSql ?? '$4::text';
  return `selected_windows AS (
  ${selectedWindowsSql}
), expected AS (
  SELECT DISTINCT roster.student_id,
    mark_window.exam_series_id, mark_window.class_section_id, mark_window.subject_id
  FROM selected_windows mark_window
  JOIN exam_series roster_series ON roster_series.tenant_id=$1 AND roster_series.id=mark_window.exam_series_id
  CROSS JOIN LATERAL (SELECT $1::text AS tenant_id, mark_window.*) roster_window
  JOIN LATERAL (${examRosterSql('roster_window','roster_series')}) roster ON TRUE
  LEFT JOIN class_streams stream ON stream.tenant_id=$1 AND stream.id::text=roster.stream_id::text
  WHERE (${streamNameSql} IS NULL OR stream.name = ${streamNameSql})
    ${options.studentIdSql ? `AND roster.student_id = ${options.studentIdSql}` : ''}
), readiness AS (
  SELECT expected.*, COALESCE(evidence.is_ready, FALSE) AS is_ready,
    COALESCE(evidence.mark_state, 0) AS mark_state
  FROM expected
  LEFT JOIN LATERAL (
    SELECT BOOL_AND(COALESCE(mark.status IN ('locked', 'published'), FALSE)) AS is_ready,
      MIN(CASE mark.status WHEN 'draft' THEN 1 WHEN 'submitted' THEN 2
        WHEN 'reviewed' THEN 3 WHEN 'locked' THEN 4 WHEN 'published' THEN 4 ELSE 0 END) AS mark_state
    FROM exam_assessments paper
    LEFT JOIN exam_marks mark ON mark.tenant_id = paper.tenant_id AND mark.assessment_id = paper.id
      AND mark.exam_series_id = paper.exam_series_id AND mark.subject_id = paper.subject_id
      AND mark.student_id::text = expected.student_id
      AND mark.class_section_id = expected.class_section_id
    WHERE paper.tenant_id = $1 AND paper.exam_series_id = expected.exam_series_id
      AND paper.subject_id = expected.subject_id AND ${paperClassScopeSql('paper', 'expected.class_section_id')}
  ) evidence ON TRUE
)`;
}

export const REPORT_CARD_READINESS_CTES = `WITH ${reportCardReadinessCtes()}`;

export const REPORT_CARD_READINESS_COUNTS = `
  COUNT(student_id)::integer AS expected_mark_count,
  COUNT(*) FILTER (WHERE is_ready)::integer AS ready_mark_count,
  COUNT(*) FILTER (WHERE NOT is_ready)::integer AS not_ready_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 0)::integer AS missing_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 1)::integer AS draft_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 2)::integer AS submitted_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 3)::integer AS reviewed_mark_count,
  COUNT(DISTINCT student_id)::integer AS learner_count`;
