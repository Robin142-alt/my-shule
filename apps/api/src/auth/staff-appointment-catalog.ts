import { DEFAULT_ROLE_CATALOG, SCHOOL_STAFF_ROLE_CODES } from './auth.constants';

// These posts retain the existing one-holder-per-scope appointment workflow.
export const ACADEMIC_APPOINTMENT_CODES = [
  'class_teacher', 'assistant_class_teacher', 'head_of_department', 'grade_master', 'form_master',
  'dean_of_academics', 'exams_manager', 'head_of_subject', 'timetable_coordinator',
] as const;

const appointmentAliases: Record<string, string> = { hod: 'head_of_department', dean_academics: 'dean_of_academics' };
const labels: Record<string, string> = { hod: 'Head of Department (HOD)', head_of_subject: 'Head of Subject (HOS)' };

export const STAFF_APPOINTMENT_CATALOG = [
  ...DEFAULT_ROLE_CATALOG.filter(role => (SCHOOL_STAFF_ROLE_CODES as readonly string[]).includes(role.code))
    .map(role => ({ code: appointmentAliases[role.code] ?? role.code, label: labels[role.code] ?? role.name,
      dashboardRole: role.code })),
  { code: 'assistant_class_teacher', label: 'Assistant Class Teacher', dashboardRole: 'class_teacher' },
  { code: 'form_master', label: 'Form Master', dashboardRole: 'grade_master' },
  { code: 'timetable_coordinator', label: 'Timetable Coordinator', dashboardRole: 'teacher' },
].sort((a, b) => a.label.localeCompare(b.label));

export const STAFF_APPOINTMENT_CODES = STAFF_APPOINTMENT_CATALOG.map(role => role.code);
export const MULTI_HOLDER_STAFF_APPOINTMENT_CODES = STAFF_APPOINTMENT_CODES
  .filter(code => !(ACADEMIC_APPOINTMENT_CODES as readonly string[]).includes(code));

export function staffAppointmentRestriction(code: string, actorRole: string | null, permissions: readonly string[]): string | null {
  if ((ACADEMIC_APPOINTMENT_CODES as readonly string[]).includes(code)) return null;
  const canManageStaff = permissions.some(permission => ['*:*', 'users:*', 'users:write'].includes(permission));
  if (!canManageStaff || !['owner', 'admin', 'school_admin', 'principal', 'deputy_principal'].includes(actorRole ?? '')) {
    return 'School staff management permission is required for this appointment.';
  }
  if (actorRole === 'deputy_principal' && ['owner', 'admin', 'principal', 'deputy_principal'].includes(code)) {
    return 'A Principal or school administrator must manage this leadership appointment.';
  }
  if (['owner', 'admin'].includes(code) && !permissions.some(permission => ['*:*', 'roles:*', 'roles:write'].includes(permission))) {
    return 'School role administration permission is required for this appointment.';
  }
  return null;
}
