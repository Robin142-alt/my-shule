import type { BlueprintUserRole } from '../../auth/identity-blueprint';
import type { Implementation300ModuleCode } from '../implementation300/blueprint-registry';

export type MobileAppCode = 'parent_app' | 'teacher_app' | 'student_app' | 'admin_app';

export type MobileCapability =
  | 'fees'
  | 'communication'
  | 'reports'
  | 'attendance'
  | 'results'
  | 'marks_entry'
  | 'timetable'
  | 'assignments'
  | 'elearning'
  | 'approvals'
  | 'analytics';

export type MobileOfflineCapability = 'attendance' | 'mark_entry' | 'assignments' | 'fees' | 'communication' | 'reports' | 'results';

export type MobileAppProfile = {
  code: MobileAppCode;
  roles: BlueprintUserRole[];
  capabilities: MobileCapability[];
  required_modules: Implementation300ModuleCode[];
  offline_capabilities: MobileOfflineCapability[];
  requires_mfa: boolean;
  requires_trusted_device: boolean;
};

export type MobileAccessPolicyInput = {
  tenantId: string;
  role: BlueprintUserRole;
  enabledModules: readonly Implementation300ModuleCode[];
};

export type EnabledMobileApp = MobileAppProfile & {
  enabled_capabilities: MobileCapability[];
};

export type MobileAccessPolicy = {
  tenant_id: string;
  role: BlueprintUserRole;
  enabled_apps: EnabledMobileApp[];
};

export type MobileSessionInput = {
  appCode: MobileAppCode;
  deviceTrusted: boolean;
  mfaVerified: boolean;
  offlineRequested: boolean;
};

export type MobileSessionEvaluation = {
  tenant_id: string;
  app_code: MobileAppCode;
  status: 'pass' | 'fail';
  required_actions: string[];
  offline_bundle: {
    namespace: string;
    capabilities: MobileOfflineCapability[];
  } | null;
};

export const BLUEPRINT_MOBILE_APPS: MobileAppProfile[] = [
  {
    code: 'parent_app',
    roles: ['parent'],
    capabilities: ['fees', 'communication', 'reports', 'attendance', 'results'],
    required_modules: ['parent_portal'],
    offline_capabilities: ['fees', 'communication', 'reports', 'results'],
    requires_mfa: false,
    requires_trusted_device: false,
  },
  {
    code: 'teacher_app',
    roles: ['teacher', 'class_teacher', 'hod'],
    capabilities: ['attendance', 'marks_entry', 'timetable', 'communication'],
    required_modules: ['academics', 'exams', 'timetable'],
    offline_capabilities: ['attendance', 'mark_entry'],
    requires_mfa: false,
    requires_trusted_device: false,
  },
  {
    code: 'student_app',
    roles: ['student'],
    capabilities: ['assignments', 'results', 'elearning', 'timetable'],
    required_modules: ['students', 'lms'],
    offline_capabilities: ['assignments', 'results'],
    requires_mfa: false,
    requires_trusted_device: false,
  },
  {
    code: 'admin_app',
    roles: ['principal', 'deputy_principal', 'school_admin', 'bursar', 'accountant'],
    capabilities: ['approvals', 'analytics', 'fees', 'reports'],
    required_modules: ['principal_dashboard'],
    offline_capabilities: ['reports'],
    requires_mfa: true,
    requires_trusted_device: true,
  },
];

const capabilityModules: Record<MobileCapability, Implementation300ModuleCode[]> = {
  fees: ['finance', 'parent_portal'],
  communication: ['communication_sms', 'parent_portal'],
  reports: ['reports', 'parent_portal', 'principal_dashboard'],
  attendance: ['academics', 'teacher_biometric_attendance', 'parent_portal'],
  results: ['exams', 'parent_portal'],
  marks_entry: ['exams'],
  timetable: ['timetable'],
  assignments: ['academics', 'lms'],
  elearning: ['lms'],
  approvals: ['principal_dashboard'],
  analytics: ['principal_dashboard'],
};

export function buildMobileAccessPolicy(input: MobileAccessPolicyInput): MobileAccessPolicy {
  const enabledModules = new Set(input.enabledModules);
  const enabledApps = BLUEPRINT_MOBILE_APPS
    .filter((profile) => profile.roles.includes(input.role))
    .filter((profile) => profile.required_modules.some((moduleCode) => enabledModules.has(moduleCode)))
    .map((profile) => ({
      ...profile,
      enabled_capabilities: profile.capabilities.filter((capability) =>
        capabilityModules[capability].some((moduleCode) => enabledModules.has(moduleCode)),
      ),
    }))
    .filter((profile) => profile.enabled_capabilities.length > 0);

  return {
    tenant_id: input.tenantId,
    role: input.role,
    enabled_apps: enabledApps,
  };
}

export function evaluateMobileSession(
  policy: MobileAccessPolicy,
  input: MobileSessionInput,
): MobileSessionEvaluation {
  const app = policy.enabled_apps.find((candidate) => candidate.code === input.appCode);
  const requiredActions: string[] = [];

  if (!app) {
    requiredActions.push(`Enable ${input.appCode} for role ${policy.role}.`);
  }

  if (app?.requires_mfa && !input.mfaVerified) {
    requiredActions.push(`Verify MFA before opening ${input.appCode}.`);
  }

  if (app?.requires_trusted_device && !input.deviceTrusted) {
    requiredActions.push(`Trust this device before opening ${input.appCode}.`);
  }

  return {
    tenant_id: policy.tenant_id,
    app_code: input.appCode,
    status: requiredActions.length === 0 ? 'pass' : 'fail',
    required_actions: requiredActions,
    offline_bundle: input.offlineRequested && app && requiredActions.length === 0
      ? {
        namespace: `tenant:${policy.tenant_id}:mobile:${app.code}`,
        capabilities: app.offline_capabilities.filter((capability) =>
          app.enabled_capabilities.includes(capabilityToMobileCapability(capability)),
        ),
      }
      : null,
  };
}

function capabilityToMobileCapability(capability: MobileOfflineCapability): MobileCapability {
  if (capability === 'mark_entry') {
    return 'marks_entry';
  }

  return capability;
}
