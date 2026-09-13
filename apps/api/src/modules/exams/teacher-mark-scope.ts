// SQL fragments are supplied only by repository code, never by request input.
export function teacherMarkStudentScopeSql(window: string, series: string, studentId: string, teacherId: string): string {
  return `EXISTS (
    SELECT 1 FROM teacher_subject_assignments assigned_teacher
    JOIN student_class_assignments membership
      ON membership.tenant_id = assigned_teacher.tenant_id
     AND membership.class_section_id = assigned_teacher.class_section_id
     AND membership.student_id = ${studentId}::text
     AND membership.status = 'active'
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

// Completion is submission, not a fully filled draft. Scope to the teacher's
// assigned streams so submitting one stream never hides another teacher's work.
// Returning marks to draft through moderation makes the sheet available again.
export function teacherMarkSheetSubmittedSql(window: string, series: string, assessmentId: string, teacherId: string): string {
  const scope = `completed_mark.tenant_id = ${window}.tenant_id
    AND completed_mark.exam_series_id = ${window}.exam_series_id
    AND completed_mark.class_section_id = ${window}.class_section_id
    AND completed_mark.subject_id = ${window}.subject_id
    AND completed_mark.assessment_id = ${assessmentId}
    AND ${teacherMarkStudentScopeSql(window, series, 'completed_mark.student_id', teacherId)}`;
  return `(EXISTS (SELECT 1 FROM exam_marks completed_mark WHERE ${scope}
      AND completed_mark.status IN ('submitted', 'reviewed', 'locked', 'published'))
    AND NOT EXISTS (SELECT 1 FROM exam_marks completed_mark WHERE ${scope}
      AND completed_mark.status = 'draft'))`;
}
