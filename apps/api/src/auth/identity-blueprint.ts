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
  'hod',
  'teacher',
  'class_teacher',
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
  transport: 'transport_manager',
  'transport manager': 'transport_manager',
  procurement: 'procurement_officer',
  'procurement officer': 'procurement_officer',
  hr: 'hr_officer',
  'hr officer': 'hr_officer',
  deputy: 'deputy_principal',
  'deputy principal': 'deputy_principal',
  class_teacher: 'class_teacher',
  'class teacher': 'class_teacher',
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
