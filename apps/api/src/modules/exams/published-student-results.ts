import { latestPublishedReportSql } from './report-card-scope';

// Portals read the accepted report snapshot, never a live mark that is being
// corrected. Legacy published marks remain visible until a report exists.
export const PUBLISHED_STUDENT_RESULTS_JOIN = `JOIN LATERAL (
  SELECT card.id::text || ':' || result.ordinality::text AS id,
    card.exam_series_id, NULLIF(result.subject->>'subject_id','') AS subject_id,
    (SELECT COALESCE(original.assigned_teacher_user_id, original.entered_by_user_id)
      FROM exam_marks original WHERE original.tenant_id=card.tenant_id
        AND original.exam_series_id=card.exam_series_id AND original.student_id=card.student_id
        AND original.subject_id::text=result.subject->>'subject_id'
      ORDER BY original.id LIMIT 1) AS entered_by_user_id,
    (result.subject->>'score')::numeric AS score,
    COALESCE(result.subject->>'score_status','entered') AS score_status,
    result.subject->>'remarks' AS remarks, 'published'::text AS status,
    card.published_at, card.updated_at
  FROM student_report_cards card
  CROSS JOIN LATERAL jsonb_array_elements(CASE
    WHEN jsonb_typeof(card.metadata->'report_card'->'subjects')='array'
      THEN card.metadata->'report_card'->'subjects' ELSE '[]'::jsonb END)
    WITH ORDINALITY AS result(subject, ordinality)
  WHERE card.tenant_id = student.tenant_id AND card.student_id::text = student.id::text
    AND ${latestPublishedReportSql()}
  UNION ALL
  SELECT original.id::text, original.exam_series_id, original.subject_id::text,
    original.entered_by_user_id, original.score, original.score_status,
    original.remarks, original.status, original.published_at, original.updated_at
  FROM exam_marks original
  WHERE original.tenant_id = student.tenant_id AND original.student_id::text = student.id::text
    AND original.status = 'published'
    AND NOT EXISTS (SELECT 1 FROM student_report_cards released
      WHERE released.tenant_id = original.tenant_id AND released.exam_series_id = original.exam_series_id
        AND released.student_id = original.student_id AND (released.status = 'withdrawn'
          OR (released.status = 'published' AND jsonb_typeof(released.metadata->'report_card'->'subjects')='array')))
) mark ON TRUE`;
