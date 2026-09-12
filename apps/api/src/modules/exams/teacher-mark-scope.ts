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
