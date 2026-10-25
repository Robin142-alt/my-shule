import { examRosterSql } from './exam-mark-roster';
// SQL fragments are supplied only by repository code, never by request input.
export function teacherMarkStudentScopeSql(window: string, series: string, studentId: string, teacherId: string): string {
  return `EXISTS (
    SELECT 1 FROM teacher_subject_assignments assigned_teacher
    JOIN LATERAL (${examRosterSql(window,series)}) membership ON TRUE
      AND membership.student_id = ${studentId}::text
      AND (assigned_teacher.stream_id IS NULL OR assigned_teacher.stream_id = membership.stream_id)
    WHERE assigned_teacher.tenant_id = ${window}.tenant_id
      AND assigned_teacher.teacher_user_id = ${teacherId}::text
      AND assigned_teacher.class_section_id = ${window}.class_section_id::text
      AND assigned_teacher.subject_id = ${window}.subject_id::text
      AND (assigned_teacher.academic_term_id IS NULL OR assigned_teacher.academic_term_id = ${series}.academic_term_id::text)
      AND assigned_teacher.status = 'active'
      AND assigned_teacher.mark_entry_allowed = TRUE
      AND assigned_teacher.effective_from <= CURRENT_DATE
      AND (assigned_teacher.effective_to IS NULL OR assigned_teacher.effective_to >= CURRENT_DATE)
  )`;
}

// Each stream is submitted independently. An unresolved blank in a submitted
// stream stays protected, while a different stream with no marks remains open.
export function teacherMarkSheetSubmittedSql(window: string, series: string, assessmentId: string, teacherId: string): string {
  return submittedStreamsSql(window, series, assessmentId, teacherId);
}

export function markStreamSubmittedSql(window: string, series: string, assessmentId: string, studentId: string): string {
  return submittedStreamsSql(window, series, assessmentId, 'NULL', studentId);
}

function submittedStreamsSql(window: string, series: string, assessmentId: string, teacherId: string, studentId?: string): string {
  return `(WITH sheet_roster AS MATERIALIZED (${examRosterSql(window, series)})
    SELECT COALESCE(BOOL_AND(stream_state.submitted), FALSE) FROM (
      SELECT COALESCE(BOOL_OR(completed_mark.status IN ('submitted','reviewed','approved','locked','published')),FALSE)
        AND NOT COALESCE(BOOL_OR(completed_mark.status='draft'),FALSE) AS submitted
      FROM sheet_roster member
      LEFT JOIN exam_marks completed_mark ON completed_mark.tenant_id=${window}.tenant_id
        AND completed_mark.exam_series_id=${window}.exam_series_id
        AND completed_mark.class_section_id=${window}.class_section_id
        AND completed_mark.subject_id=${window}.subject_id
        AND completed_mark.assessment_id=${assessmentId}
        AND completed_mark.student_id::text=member.student_id
      WHERE (${teacherId}::text IS NULL OR ${teacherMarkStudentScopeSql(window, series, 'member.student_id', teacherId)})
        ${studentId ? `AND member.stream_id IS NOT DISTINCT FROM (SELECT target.stream_id FROM sheet_roster target WHERE target.student_id=${studentId}::text)` : ''}
      GROUP BY member.stream_id
    ) stream_state)`;
}
