import { normalizeBlueprintRole, type BlueprintUserRole } from './identity-blueprint';

export type RoleGovernanceControl =
  | 'rbac'
  | 'permission_inheritance'
  | 'tenant_bound_assignments'
  | 'mfa_for_privileged_roles'
  | 'module_bound_roles'
  | 'least_privilege_permissions';

export type RoleGovernancePolicyInput = {
  activeModules: readonly string[];
};

export type RoleGovernanceRole = {
  code: BlueprintUserRole;
  scope: 'global' | 'school';
  enabled: boolean;
  mfaRequired: boolean;
  inherits: BlueprintUserRole[];
  permissions: string[];
  requiredModules: string[];
};

export type RoleGovernancePolicy = {
  roles: RoleGovernanceRole[];
  controls: readonly RoleGovernanceControl[];
};

export type RoleAssignmentInput = {
  role: string;
  tenantId?: string | null;
  permissions: readonly string[];
  mfaVerified: boolean;
};

export type RoleGovernanceIssue = {
  id: string;
  severity: 'critical' | 'high';
  message: string;
};

export type RoleGovernanceEvaluation = {
  ok: boolean;
  issues: RoleGovernanceIssue[];
};

const GLOBAL_ROLES = [
  'super_admin',
  'platform_support',
  'finance_admin',
] as const satisfies readonly BlueprintUserRole[];

const SCHOOL_ROLES = [
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
] as const satisfies readonly BlueprintUserRole[];

const CONTROLS = [
  'rbac',
  'permission_inheritance',
  'tenant_bound_assignments',
  'mfa_for_privileged_roles',
  'module_bound_roles',
  'least_privilege_permissions',
] as const satisfies readonly RoleGovernanceControl[];

const ROLE_MODULE_REQUIREMENTS: Partial<Record<BlueprintUserRole, readonly string[]>> = {
  bursar: ['finance'],
  accountant: ['finance'],
  parent: ['parent_portal'],
  student: ['parent_portal'],
  librarian: ['library'],
  nurse: ['clinic_health'],
  storekeeper: ['inventory'],
  driver: ['transport'],
  transport_manager: ['transport'],
  boarding_master: ['boarding'],
  security_officer: ['visitor_management'],
  hr_officer: ['staff'],
  procurement_officer: ['procurement'],
  lab_technician: ['lab_management'],
  admissions_officer: ['admissions'],
  ict_manager: ['lab_management'],
  dean_academics: ['exams'],
  exams_manager: ['exams'],
};

const ROLE_INHERITANCE: Partial<Record<BlueprintUserRole, readonly BlueprintUserRole[]>> = {
  school_admin: ['principal', 'secretary'],
  principal: ['deputy_principal'],
  deputy_principal: ['teacher'],
  grade_master: ['class_teacher'],
  class_teacher: ['teacher'],
  bursar: ['accountant'],
  transport_manager: ['driver'],
};

const ROLE_PERMISSIONS: Partial<Record<BlueprintUserRole, readonly string[]>> = {
  super_admin: ['*:*'],
  platform_support: ['support:view', 'support:manage', 'reports:read'],
  finance_admin: ['billing:read', 'billing:write', 'reports:read'],
  school_admin: ['users:read', 'users:write', 'roles:read', 'roles:write', 'students:read', 'reports:read'],
  principal: ['principal:read', 'principal:write', 'students:read', 'finance:read', 'reports:read'],
  deputy_principal: [
    'deputy:read',
    'deputy:write',
    'students:read',
    'academics:read',
    'academics:write',
    'academics:assign-teachers',
    'discipline:manage',
  ],
  secretary: ['secretary:read', 'secretary:write', 'admissions:read', 'documents:write', 'school_sms:send'],
  bursar: ['finance:read', 'finance:write', 'billing:read', 'billing:write', 'payments:create'],
  accountant: ['finance:read', 'billing:read', 'payments:create'],
  dean_academics: ['academics:read', 'exams:read', 'exams:review', 'exams:approve', 'reports:read'],
  exams_manager: ['academics:read', 'exams:read', 'exams:write', 'exams:enter-marks', 'exams:review', 'reports:read'],
  hod: ['academics:read', 'academics:assign-teachers', 'exams:review'],
  teacher: ['students:read', 'academics:read', 'exams:enter-marks', 'discipline:write'],
  class_teacher: ['students:read', 'academics:read', 'exams:enter-marks', 'discipline:write', 'portal:message_school'],
  grade_master: ['students:read', 'academics:read', 'exams:review', 'discipline:read', 'discipline:reports', 'reports:read'],
  parent: ['auth:read', 'portal:read_own_children', 'portal:message_school'],
  student: ['auth:read', 'student-portal:read', 'student-portal:write', 'academics:read', 'lms:read'],
  librarian: ['library:read', 'library:write'],
  nurse: ['clinic:read', 'clinic:write', 'clinic:dispense'],
  storekeeper: ['inventory:read', 'inventory:write'],
  driver: ['transport:read'],
  boarding_master: ['boarding:read', 'boarding:write', 'hostel:read', 'hostel:write'],
  security_officer: ['visitors:read', 'visitors:write'],
  hr_officer: ['hr:read', 'hr:write'],
  procurement_officer: ['procurement:read', 'procurement:write'],
  transport_manager: ['transport:read', 'transport:write'],
  lab_technician: ['labs:read', 'labs:write', 'labs:inventory'],
  admissions_officer: ['admissions:read', 'admissions:write', 'students:read', 'students:write'],
  ict_manager: ['assets:read', 'inventory:read', 'labs:read', 'reports:read'],
};

const PRIVILEGED_ROLES = new Set<BlueprintUserRole>([
  'super_admin',
  'platform_support',
  'finance_admin',
  'school_admin',
  'principal',
  'deputy_principal',
  'bursar',
  'accountant',
  'nurse',
]);

export const ROLE_GOVERNANCE_BLUEPRINT = {
  globalRoles: GLOBAL_ROLES,
  schoolRoles: SCHOOL_ROLES,
  controls: CONTROLS,
} as const;

export function buildRoleGovernancePolicy(
  input: RoleGovernancePolicyInput,
): RoleGovernancePolicy {
  const activeModules = new Set(input.activeModules);
  const roles = [...GLOBAL_ROLES, ...SCHOOL_ROLES].map((role) => {
    const requiredModules = [...(ROLE_MODULE_REQUIREMENTS[role] ?? [])];
    const moduleEnabled = requiredModules.every((moduleCode) => activeModules.has(moduleCode));

    return {
      code: role,
      scope: (GLOBAL_ROLES as readonly string[]).includes(role) ? 'global' as const : 'school' as const,
      enabled: requiredModules.length === 0 || moduleEnabled,
      mfaRequired: PRIVILEGED_ROLES.has(role),
      inherits: [...(ROLE_INHERITANCE[role] ?? [])],
      permissions: expandedPermissions(role),
      requiredModules,
    };
  });

  return {
    roles,
    controls: CONTROLS,
  };
}

export function evaluateRoleAssignment(
  input: RoleAssignmentInput,
  policy: RoleGovernancePolicy,
): RoleGovernanceEvaluation {
  const roleCode = normalizeBlueprintRole(input.role);
  const role = policy.roles.find((candidate) => candidate.code === roleCode);
  const tenantId = input.tenantId?.trim() ?? '';
  const issues: RoleGovernanceIssue[] = [];

  if (!role) {
    return {
      ok: false,
      issues: [issue('unknown-role', 'critical', `${roleCode} is not part of the role governance policy.`)],
    };
  }

  if (role.scope === 'global' && tenantId && tenantId !== 'global') {
    issues.push(issue('global-role-must-not-bind-school', 'critical', 'Global roles must not be assigned inside a school tenant.'));
  }

  if (role.scope === 'school' && !tenantId) {
    issues.push(issue('school-role-requires-tenant', 'critical', 'School roles require a tenant id.'));
  }

  if (!role.enabled) {
    issues.push(issue('module-role-disabled', 'critical', `${role.code} requires active modules: ${role.requiredModules.join(', ')}.`));
  }

  if (role.mfaRequired && !input.mfaVerified) {
    issues.push(issue('mfa-required', 'critical', `${role.code} requires MFA verification.`));
  }

  if (input.permissions.includes('*:*') && role.code !== 'super_admin' && role.code !== 'school_admin') {
    issues.push(issue('wildcard-permission-denied', 'critical', 'Wildcard permissions are reserved for global or school administration.'));
  }

  for (const permission of input.permissions) {
    if (!role.permissions.includes(permission) && permission !== '*:*') {
      issues.push(issue('permission-not-inherited', 'high', `${permission} is not inherited by ${role.code}.`));
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function expandedPermissions(role: BlueprintUserRole, seen = new Set<BlueprintUserRole>()): string[] {
  if (seen.has(role)) {
    return [];
  }

  seen.add(role);

  const own = ROLE_PERMISSIONS[role] ?? [];
  const inherited = (ROLE_INHERITANCE[role] ?? [])
    .flatMap((parentRole) => expandedPermissions(parentRole, seen));

  return [...new Set([...own, ...inherited])];
}

function issue(
  id: string,
  severity: RoleGovernanceIssue['severity'],
  message: string,
): RoleGovernanceIssue {
  return { id, severity, message };
}
