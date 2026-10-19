import { MULTI_HOLDER_STAFF_APPOINTMENT_CODES } from '../../auth/staff-appointment-catalog';

// Create the replacement before dropping the old index. The bootstrap transaction
// keeps uniqueness enforced while existing single-holder schools are upgraded.
export const ACADEMIC_ROLE_APPOINTMENT_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS ux_academics_role_appointments_staff_scope_active_v2
    ON academics_role_appointments (
      tenant_id, role_type,
      COALESCE(department_id::text, ''), COALESCE(academic_year_id, ''),
      COALESCE(class_section_id, ''), COALESCE(stream_id, ''), COALESCE(subject_id, ''),
      (CASE WHEN role_type IN (${MULTI_HOLDER_STAFF_APPOINTMENT_CODES.map(code => `'${code}'`).join(', ')})
        THEN teacher_user_id::text ELSE '' END)
    ) WHERE status = 'active';
  DROP INDEX IF EXISTS ux_academics_role_appointments_staff_scope_active;
  DROP INDEX IF EXISTS ux_academics_role_appointments_active;
  DROP INDEX IF EXISTS ux_academics_role_appointments_subject_active;
`;
