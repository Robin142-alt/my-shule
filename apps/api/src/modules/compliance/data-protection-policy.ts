import type { Implementation300ModuleCode } from '../implementation300/blueprint-registry';

export const KENYAN_DATA_PROTECTION_CONTROLS = [
  'tenant_isolation',
  'encryption_at_rest',
  'encryption_in_transit',
  'audit_logs',
  'consent_management',
  'data_retention',
  'data_subject_rights',
  'child_data_dpia',
  'breach_response',
  'backup_encryption',
] as const;

export type KenyanDataProtectionControl = (typeof KENYAN_DATA_PROTECTION_CONTROLS)[number];

export type DataCategory =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'sensitive_child_data'
  | 'sensitive_health_data'
  | 'sensitive_biometric_data'
  | 'payment_data';

export type DataProcessingPurpose =
  | 'admissions'
  | 'fee_billing'
  | 'medical_processing'
  | 'biometric_attendance'
  | 'parent_communication'
  | 'academic_reporting'
  | 'ai_insights';

export type DataRetentionSchedule = {
  subject: string;
  category: DataCategory;
  retention: string;
};

export type DataProtectionPolicyInput = {
  tenantId: string;
  schoolName: string;
  enabledModules: readonly Implementation300ModuleCode[];
};

export type DataProtectionPolicy = {
  tenant_id: string;
  school_name: string;
  jurisdiction: 'KE';
  legal_framework: 'Kenyan Data Protection Act';
  enabled_modules: Implementation300ModuleCode[];
  controls: KenyanDataProtectionControl[];
  data_subject_request_sla_days: 30;
  encryption: {
    at_rest: true;
    in_transit: true;
    backups: true;
  };
  consent_purposes: DataProcessingPurpose[];
  retention_schedules: DataRetentionSchedule[];
};

export type DataProcessingActivityInput = {
  moduleCode: Implementation300ModuleCode;
  purpose: DataProcessingPurpose;
  categories: readonly DataCategory[];
  hasConsent: boolean;
  encryptedAtRest: boolean;
  encryptedInTransit: boolean;
};

export type DataProcessingEvaluation = {
  tenant_id: string;
  module_code: Implementation300ModuleCode;
  purpose: DataProcessingPurpose;
  status: 'pass' | 'fail';
  audit_required: boolean;
  required_actions: string[];
};

const consentRequiredPurposes = new Set<DataProcessingPurpose>([
  'medical_processing',
  'biometric_attendance',
  'parent_communication',
  'ai_insights',
]);

const defaultRetentionSchedules: DataRetentionSchedule[] = [
  { subject: 'student_records', category: 'sensitive_child_data', retention: 'school-record-policy' },
  { subject: 'payment_records', category: 'payment_data', retention: 'finance-legal-policy' },
  { subject: 'health_records', category: 'sensitive_health_data', retention: 'health-policy-and-legal-review' },
  { subject: 'biometric_templates', category: 'sensitive_biometric_data', retention: 'biometric-consent-period' },
  { subject: 'audit_logs', category: 'confidential', retention: 'audit-policy' },
  { subject: 'offline_sync_cache', category: 'sensitive_child_data', retention: 'short-lived-sync-policy' },
];

export function buildDataProtectionPolicy(input: DataProtectionPolicyInput): DataProtectionPolicy {
  return {
    tenant_id: input.tenantId,
    school_name: input.schoolName,
    jurisdiction: 'KE',
    legal_framework: 'Kenyan Data Protection Act',
    enabled_modules: [...input.enabledModules],
    controls: [...KENYAN_DATA_PROTECTION_CONTROLS],
    data_subject_request_sla_days: 30,
    encryption: {
      at_rest: true,
      in_transit: true,
      backups: true,
    },
    consent_purposes: [
      'admissions',
      'fee_billing',
      'medical_processing',
      'biometric_attendance',
      'parent_communication',
      'academic_reporting',
      'ai_insights',
    ],
    retention_schedules: defaultRetentionSchedules,
  };
}

export function evaluateDataProcessingActivity(
  policy: DataProtectionPolicy,
  input: DataProcessingActivityInput,
): DataProcessingEvaluation {
  const requiredActions: string[] = [];

  if (!policy.enabled_modules.includes(input.moduleCode)) {
    requiredActions.push(`Activate module ${input.moduleCode} before processing.`);
  }

  if (consentRequiredPurposes.has(input.purpose) && !input.hasConsent) {
    requiredActions.push(`Capture consent for ${input.purpose}.`);
  }

  if (!input.encryptedAtRest) {
    requiredActions.push('Enable encryption at rest before processing.');
  }

  if (!input.encryptedInTransit) {
    requiredActions.push('Enable encryption in transit before processing.');
  }

  if (requiresChildDataDpia(input.categories) && !input.hasConsent) {
    requiredActions.push('Complete child-data DPIA review.');
  }

  return {
    tenant_id: policy.tenant_id,
    module_code: input.moduleCode,
    purpose: input.purpose,
    status: requiredActions.length === 0 ? 'pass' : 'fail',
    audit_required: input.categories.some((category) => category !== 'public' && category !== 'internal'),
    required_actions: requiredActions,
  };
}

function requiresChildDataDpia(categories: readonly DataCategory[]): boolean {
  return categories.some((category) =>
    category === 'sensitive_child_data' ||
    category === 'sensitive_health_data' ||
    category === 'sensitive_biometric_data',
  );
}
