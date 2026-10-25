// Repository-owned SQL expressions only. Exam dates, not an extended entry
// deadline or today's enrolment, define historical eligibility. Optional legacy
// columns are read through JSON so upgraded schools retain their old records.
export function examRosterSql(window: string, series: string): string {
  return `SELECT DISTINCT ON (student.id) student.id::text AS student_id, membership.stream_id,
      CASE WHEN enrollment.student_id IS NULL THEN 'historical_mark' ELSE 'enrollment' END AS eligibility_source
    FROM students student
    JOIN student_class_assignments membership ON membership.tenant_id = student.tenant_id
      AND membership.student_id = student.id::text
      AND membership.class_section_id = ${window}.class_section_id::text
    LEFT JOIN student_subject_enrollments enrollment ON enrollment.tenant_id = student.tenant_id
      AND enrollment.student_id = student.id::text
      AND enrollment.class_section_id = ${window}.class_section_id::text
      AND enrollment.subject_id = ${window}.subject_id::text
      AND (to_jsonb(enrollment)->>'academic_term_id' IS NULL
        OR to_jsonb(enrollment)->>'academic_term_id' = ${series}.academic_term_id::text)
      AND COALESCE((to_jsonb(enrollment)->>'effective_from')::date,
        (to_jsonb(enrollment)->>'created_at')::timestamptz::date, '-infinity'::date) <= ${series}.ends_on
      AND COALESCE((to_jsonb(enrollment)->>'effective_to')::date,
        CASE WHEN enrollment.status='completed' THEN (to_jsonb(enrollment)->>'updated_at')::timestamptz::date END,
        'infinity'::date) >= ${series}.starts_on
      AND (enrollment.status = 'active' OR (enrollment.status = 'completed'
          AND to_jsonb(enrollment)->>'updated_at' IS NOT NULL)
        OR (to_jsonb(enrollment)->>'effective_to' IS NOT NULL
          AND enrollment.status IN ('completed','transferred','inactive','dropped')))
    WHERE student.tenant_id = ${window}.tenant_id
      AND COALESCE((to_jsonb(membership)->>'created_at')::timestamptz::date, '-infinity'::date) <= ${series}.ends_on
      AND (membership.status = 'active' OR (membership.status IN ('completed','transferred','inactive')
        AND (to_jsonb(membership)->>'updated_at')::timestamptz::date >= ${series}.starts_on))
      AND (enrollment.student_id IS NOT NULL OR EXISTS (
        SELECT 1 FROM exam_marks historical_mark
        WHERE historical_mark.tenant_id=${window}.tenant_id
          AND historical_mark.exam_series_id=${window}.exam_series_id
          AND historical_mark.class_section_id=${window}.class_section_id
          AND historical_mark.subject_id=${window}.subject_id
          AND historical_mark.student_id::text=student.id::text))
    ORDER BY student.id, (enrollment.student_id IS NOT NULL) DESC,
      (to_jsonb(membership)->>'created_at')::timestamptz DESC NULLS LAST,
      membership.stream_id NULLS LAST`;
}

export function examStudentEligibleSql(window: string, series: string, student: string): string {
  return `EXISTS (SELECT 1 FROM (${examRosterSql(window, series)}) exam_roster
    WHERE exam_roster.student_id = ${student}::text)`;
}

export function recordedMarkSql(mark: string): string {
  return `((${mark}.score IS NOT NULL AND COALESCE(${mark}.score_status,'entered') = 'entered')
    OR lower(${mark}.score_status) IN ('x','y','absent','exempt','not_assessed','incomplete',
      'withheld','medical_exception','transfer_student','irregularity','missing'))`;
}

export function markSheetStatusSql(input: {
  total: string; recorded: string; submitted: string; examStatus: string;
  started: string; closed: string; teacher: string; lastAction: string;
}): string {
  return `CASE WHEN ${input.total} = 0 THEN 'No students'
    WHEN ${input.submitted} THEN 'Submitted'
    WHEN ${input.examStatus} = 'draft' THEN 'Draft'
    WHEN ${input.lastAction} = 'returned' THEN 'Returned'
    WHEN NOT ${input.started} AND NOT ${input.closed} THEN 'Scheduled'
    WHEN ${input.teacher} IS NULL AND ${input.recorded} = 0 THEN 'Unassigned'
    WHEN ${input.recorded} = 0 THEN 'Not started'
    WHEN ${input.recorded} = ${input.total} THEN 'Awaiting submission'
    ELSE 'In progress' END`;
}
