// Both appointment entry points grant the existing class workspace over the
// same class. An assistant does not replace the named report-card signatory.
export const CLASS_TEACHER_APPOINTMENT_SCOPE_SQL = `(
  SELECT id::text, tenant_id, teacher_user_id, academic_year_id, class_section_id,
    is_active, status, effective_from, effective_to
  FROM academics_class_teachers appointment
  UNION ALL
  SELECT id::text, tenant_id, teacher_user_id, academic_year_id, class_section_id,
    status = 'active' AS is_active, status, effective_from, effective_to
  FROM academics_role_appointments
  WHERE role_type = 'assistant_class_teacher'
    AND class_section_id IS NOT NULL AND academic_year_id IS NOT NULL
    AND stream_id IS NULL
)`;
