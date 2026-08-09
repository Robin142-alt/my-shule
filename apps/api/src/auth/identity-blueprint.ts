export const BLUEPRINT_AUTHENTICATION_METHODS = [
  'email_password',
  'phone_otp',
  'google',
  'microsoft',
  'sso',
  'biometric',
  'rfid',
  'nfc',
] as const;

export const BLUEPRINT_IDENTITY_SECURITY_CONTROLS = [
  'mfa',
  'device_session_management',
  'audit_logs',
  'ip_restrictions',
  'rbac',
  'permission_inheritance',
  'password_policies',
  'tenant_bound_sessions',
] as const;

export const BLUEPRINT_USER_ROLES = [
  'super_admin',
  'platform_support',
  'finance_admin',
  'school_admin',
  'principal',
  'deputy_principal',
  'secretary',
  'bursar',
  'accountant',
  'dean_academics',
  'exams_manager',
  'hod',
  'teacher',
  'class_teacher',
  'grade_master',
  'school_counsellor',
  'discipline_master',
  'parent',
  'student',
  'librarian',
  'nurse',
  'storekeeper',
  'driver',
  'boarding_master',
  'security_officer',
  'hr_officer',
  'procurement_officer',
  'transport_manager',
  'lab_technician',
  'admissions_officer',
  'ict_manager',
] as const;

export type BlueprintAuthenticationMethod = (typeof BLUEPRINT_AUTHENTICATION_METHODS)[number];
export type BlueprintUserRole = (typeof BLUEPRINT_USER_ROLES)[number];

export type IdentityAssertionInput = {
  tenantId: string;
  method: BlueprintAuthenticationMethod;
  subject: string;
  role: string;
  userId?: string;
  deviceId?: string;
  assertedAt?: string;
};

export type IdentityAssertion = {
  tenant_id: string;
  user_id?: string;
  method: BlueprintAuthenticationMethod;
  subject: string;
  role: BlueprintUserRole;
  device_id?: string;
  confidence: 'low' | 'medium' | 'high';
  asserted_at: string;
  audit_required: true;
};

const blueprintRoleAliases: Record<string, BlueprintUserRole> = {
  owner: 'school_admin',
  admin: 'school_admin',
  administrator: 'school_admin',
  superadmin: 'super_admin',
  'super admin': 'super_admin',
  'platform owner': 'super_admin',
  platform_owner: 'super_admin',
  support_agent: 'platform_support',
  'platform support': 'platform_support',
  bursar: 'bursar',
  nurse: 'nurse',
  clinic_staff: 'nurse',
  'clinic staff': 'nurse',
  boarding: 'boarding_master',
  'boarding master': 'boarding_master',
  security: 'security_officer',
  'security officer': 'security_officer',
  lab: 'lab_technician',
  'lab technician': 'lab_technician',
  admissions: 'admissions_officer',
  'admissions officer': 'admissions_officer',
  ict: 'ict_manager',
  'ict manager': 'ict_manager',
  'computer lab manager': 'ict_manager',
  transport: 'transport_manager',
  'transport manager': 'transport_manager',
  procurement: 'procurement_officer',
  'procurement officer': 'procurement_officer',
  hr: 'hr_officer',
  'hr officer': 'hr_officer',
  deputy: 'deputy_principal',
  'deputy principal': 'deputy_principal',
  dean_academics: 'dean_academics',
  'dean academics': 'dean_academics',
  dean_of_academics: 'dean_academics',
  'dean of academics': 'dean_academics',
  academic_dean: 'dean_academics',
  'academic dean': 'dean_academics',
  exams_manager: 'exams_manager',
  'exams manager': 'exams_manager',
  exam_officer: 'exams_manager',
  'exam officer': 'exams_manager',
  examination_officer: 'exams_manager',
  'examination officer': 'exams_manager',
  hod: 'hod',
  head_of_department: 'hod',
  'head of department': 'hod',
  department_head: 'hod',
  'department head': 'hod',
  class_teacher: 'class_teacher',
  'class teacher': 'class_teacher',
  grade_master: 'grade_master',
  'grade master': 'grade_master',
  form_master: 'grade_master',
  'form master': 'grade_master',
  'grade/form master': 'grade_master',
  school_counsellor: 'school_counsellor',
  counsellor: 'school_counsellor',
  counselor: 'school_counsellor',
  'school counsellor': 'school_counsellor',
  'school counselor': 'school_counsellor',
  discipline_master: 'discipline_master',
  'discipline master': 'discipline_master',
  dean_of_students: 'discipline_master',
  'dean of students': 'discipline_master',
};

export function normalizeBlueprintRole(role: string): BlueprintUserRole {
  const normalized = role.trim().toLowerCase().replace(/[-\s]+/g, '_');
  const spaced = role.trim().toLowerCase().replace(/[_-]+/g, ' ');
  const direct = BLUEPRINT_USER_ROLES.find((candidate) => candidate === normalized);
  const aliased = blueprintRoleAliases[normalized] ?? blueprintRoleAliases[spaced];

  if (direct) {
    return direct;
  }

  if (aliased) {
    return aliased;
  }

  throw new Error(`Unsupported blueprint role "${role}".`);
}

export function buildIdentityAssertion(input: IdentityAssertionInput): IdentityAssertion {
  return {
    tenant_id: input.tenantId,
    user_id: input.userId,
    method: input.method,
    subject: input.subject,
    role: normalizeBlueprintRole(input.role),
    device_id: input.deviceId,
    confidence: confidenceForMethod(input.method),
    asserted_at: input.assertedAt ?? new Date().toISOString(),
    audit_required: true,
  };
}

function confidenceForMethod(method: BlueprintAuthenticationMethod): IdentityAssertion['confidence'] {
  if (method === 'biometric' || method === 'rfid' || method === 'nfc') {
    return 'high';
  }

  if (method === 'phone_otp' || method === 'sso' || method === 'google' || method === 'microsoft') {
    return 'medium';
  }

  return 'low';
}
