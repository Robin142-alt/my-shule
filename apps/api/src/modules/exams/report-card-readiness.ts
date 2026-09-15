// Shared by the generation preflight and the report-card selector. Do not derive
// readiness from paginated mark sheets: missing learner marks have no row there.
// Parameters: school, optional exam, optional class, optional stream name.
export const REPORT_CARD_READINESS_CTES = `WITH selected_windows AS (
  SELECT DISTINCT exam_series_id, class_section_id, subject_id
  FROM exam_mark_entry_windows
  WHERE tenant_id = $1
    AND ($2::uuid IS NULL OR exam_series_id = $2::uuid)
    AND ($3::uuid IS NULL OR class_section_id = $3::uuid)
), expected AS (
  SELECT DISTINCT student.id::text AS student_id,
    mark_window.exam_series_id, mark_window.class_section_id, mark_window.subject_id
  FROM selected_windows mark_window
  JOIN student_class_assignments assignment
    ON assignment.tenant_id = $1
   AND assignment.class_section_id = mark_window.class_section_id::text
   AND assignment.status = 'active'
  JOIN students student
    ON student.tenant_id = assignment.tenant_id
   AND student.id::text = assignment.student_id::text
   AND student.status = 'active'
  JOIN student_subject_enrollments enrollment
    ON enrollment.tenant_id = student.tenant_id
   AND enrollment.student_id::text = student.id::text
   AND enrollment.class_section_id = mark_window.class_section_id::text
   AND enrollment.subject_id = mark_window.subject_id::text
   AND enrollment.status = 'active'
  LEFT JOIN class_streams stream
    ON stream.tenant_id = assignment.tenant_id
   AND stream.id::text = assignment.stream_id::text
  WHERE ($4::text IS NULL OR stream.name = $4::text)
), readiness AS (
  SELECT expected.*, COALESCE(evidence.is_ready, FALSE) AS is_ready,
    COALESCE(evidence.mark_state, 0) AS mark_state
  FROM expected
  LEFT JOIN LATERAL (
    SELECT BOOL_AND(mark.status IN ('locked', 'published')) AS is_ready,
      MIN(CASE mark.status WHEN 'draft' THEN 1 WHEN 'submitted' THEN 2
        WHEN 'reviewed' THEN 3 WHEN 'locked' THEN 4 WHEN 'published' THEN 4 ELSE 0 END) AS mark_state
    FROM exam_marks mark
    WHERE mark.tenant_id = $1
      AND mark.exam_series_id = expected.exam_series_id
      AND mark.student_id::text = expected.student_id
      AND mark.class_section_id = expected.class_section_id
      AND mark.subject_id = expected.subject_id
  ) evidence ON TRUE
)`;

export const REPORT_CARD_READINESS_COUNTS = `
  COUNT(student_id)::integer AS expected_mark_count,
  COUNT(*) FILTER (WHERE is_ready)::integer AS ready_mark_count,
  COUNT(*) FILTER (WHERE NOT is_ready)::integer AS not_ready_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 0)::integer AS missing_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 1)::integer AS draft_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 2)::integer AS submitted_mark_count,
  COUNT(*) FILTER (WHERE mark_state = 3)::integer AS reviewed_mark_count,
  COUNT(DISTINCT student_id)::integer AS learner_count`;
