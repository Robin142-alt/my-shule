import type { Implementation300ModuleCode } from '../implementation300/blueprint-registry';

export const BLUEPRINT_INTEGRATION_PROVIDERS = {
  kenyan: [
    'mpesa',
    'bank_apis',
    'sms_gateways',
    'knec_hooks',
    'nemis_hooks',
  ],
  external: [
    'google_workspace',
    'microsoft_365',
    'zoom',
    'google_meet',
    'biometric_devices',
    'rfid_systems',
    'gps_trackers',
    'accounting_systems',
  ],
} as const;

export type KenyanIntegrationProvider = (typeof BLUEPRINT_INTEGRATION_PROVIDERS.kenyan)[number];
export type ExternalIntegrationProvider = (typeof BLUEPRINT_INTEGRATION_PROVIDERS.external)[number];
export type BlueprintIntegrationProvider = KenyanIntegrationProvider | ExternalIntegrationProvider;

export type TenantIntegrationPolicyInput = {
  tenantId: string;
  enabledModules: readonly Implementation300ModuleCode[];
};

export type TenantIntegrationPolicy = {
  tenant_id: string;
  enabled_modules: Implementation300ModuleCode[];
  allowed_providers: BlueprintIntegrationProvider[];
  provider_modules: Record<BlueprintIntegrationProvider, Implementation300ModuleCode>;
};

export type IntegrationConfigInput = {
  tenantId: string;
  provider: BlueprintIntegrationProvider;
  secretEncrypted: boolean;
  configuredFields: readonly string[];
};

export type IntegrationConfigEvaluation = {
  tenant_id: string;
  provider: BlueprintIntegrationProvider;
  status: 'pass' | 'fail';
  required_actions: string[];
};

const providerModules: Record<BlueprintIntegrationProvider, Implementation300ModuleCode> = {
  mpesa: 'finance',
  bank_apis: 'finance',
  sms_gateways: 'communication_sms',
  knec_hooks: 'exams',
  nemis_hooks: 'students',
  google_workspace: 'lms',
  microsoft_365: 'lms',
  zoom: 'lms',
  google_meet: 'lms',
  biometric_devices: 'teacher_biometric_attendance',
  rfid_systems: 'teacher_biometric_attendance',
  gps_trackers: 'transport',
  accounting_systems: 'finance',
};

const requiredFields: Record<BlueprintIntegrationProvider, readonly string[]> = {
  mpesa: ['paybill', 'shortcode', 'passkey_ref'],
  bank_apis: ['bank_code', 'api_key_ref'],
  sms_gateways: ['sender_id', 'api_key_ref'],
  knec_hooks: ['school_code', 'client_ref'],
  nemis_hooks: ['school_code', 'client_ref'],
  google_workspace: ['client_id', 'client_secret_ref'],
  microsoft_365: ['tenant_ref', 'client_secret_ref'],
  zoom: ['account_ref', 'client_secret_ref'],
  google_meet: ['workspace_ref', 'client_secret_ref'],
  biometric_devices: ['device_registry_ref', 'webhook_secret_ref'],
  rfid_systems: ['reader_registry_ref', 'webhook_secret_ref'],
  gps_trackers: ['provider_account_ref', 'webhook_secret_ref'],
  accounting_systems: ['ledger_system_ref', 'api_key_ref'],
};

export function buildTenantIntegrationPolicy(input: TenantIntegrationPolicyInput): TenantIntegrationPolicy {
  const enabledModules = new Set(input.enabledModules);
  const allowedProviders = allProviders().filter((provider) => enabledModules.has(providerModules[provider]));

  return {
    tenant_id: input.tenantId,
    enabled_modules: [...input.enabledModules],
    allowed_providers: allowedProviders,
    provider_modules: providerModules,
  };
}

export function evaluateIntegrationConfig(
  policy: TenantIntegrationPolicy,
  input: IntegrationConfigInput,
): IntegrationConfigEvaluation {
  const actions: string[] = [];
  const owningModule = policy.provider_modules[input.provider];

  if (input.tenantId !== policy.tenant_id) {
    actions.push(`Configuration tenant must match policy tenant ${policy.tenant_id}.`);
  }

  if (!policy.enabled_modules.includes(owningModule)) {
    actions.push(`Activate module ${owningModule} before configuring ${input.provider}.`);
  }

  if (!input.secretEncrypted) {
    actions.push('Encrypt provider secrets before activation.');
  }

  for (const field of requiredFields[input.provider]) {
    if (!input.configuredFields.includes(field)) {
      actions.push(`Configure required field ${field} for ${input.provider}.`);
    }
  }

  return {
    tenant_id: policy.tenant_id,
    provider: input.provider,
    status: actions.length === 0 ? 'pass' : 'fail',
    required_actions: actions,
  };
}

function allProviders(): BlueprintIntegrationProvider[] {
  return [
    ...BLUEPRINT_INTEGRATION_PROVIDERS.kenyan,
    ...BLUEPRINT_INTEGRATION_PROVIDERS.external,
  ];
}
