import type { Implementation300ModuleCode } from './blueprint-registry';

export type ApiCategory = 'public' | 'internal' | 'third_party';
export type ApiAudience = 'parent_student' | 'school_user' | 'internal_service' | 'provider_callback';

export type ApiCategoryDefinition = {
  code: string;
  category: ApiCategory;
  module_code: Implementation300ModuleCode;
  path_prefixes: readonly string[];
  audience: ApiAudience;
  tenant_scoped: boolean;
  requires_signature: boolean;
  rate_limit_per_minute: number;
};

export type ApiCategoryPolicyInput = {
  tenantId: string;
  enabledModules: readonly Implementation300ModuleCode[];
};

export type ApiCategoryPolicy = {
  tenant_id: string;
  routes: ApiCategoryDefinition[];
};

export type ApiRouteClassification =
  | {
    status: 'pass';
    route: ApiCategoryDefinition;
  }
  | {
    status: 'fail';
    reason: string;
  };

export const API_CATEGORY_REGISTRY = {
  public: [
    api('parent', 'public', 'parent_portal', ['/api/parent'], 'parent_student', true, false, 120),
    api('student', 'public', 'students', ['/api/student'], 'parent_student', true, false, 120),
    api('payment', 'public', 'finance', ['/api/payments'], 'parent_student', true, false, 90),
  ],
  internal: [
    api('ai_engine', 'internal', 'ai_insights', ['/api/internal/ai'], 'internal_service', true, true, 600),
    api('analytics_engine', 'internal', 'reports', ['/api/internal/analytics'], 'internal_service', true, true, 600),
    api('notification_engine', 'internal', 'communication_sms', ['/api/internal/notifications'], 'internal_service', true, true, 600),
    api('integration_engine', 'internal', 'communication_sms', ['/api/internal/integrations'], 'internal_service', true, true, 600),
  ],
  third_party: [
    api('mpesa', 'third_party', 'finance', ['/api/payments/mpesa'], 'provider_callback', true, true, 300),
    api('sms_provider', 'third_party', 'communication_sms', ['/api/providers/sms'], 'provider_callback', true, true, 300),
    api('email_provider', 'third_party', 'communication_sms', ['/api/providers/email'], 'provider_callback', true, true, 300),
    api('biometric_system', 'third_party', 'teacher_biometric_attendance', ['/api/providers/biometric'], 'provider_callback', true, true, 300),
    api('gps_system', 'third_party', 'transport', ['/api/providers/gps'], 'provider_callback', true, true, 300),
  ],
} as const;

export function buildApiCategoryPolicy(input: ApiCategoryPolicyInput): ApiCategoryPolicy {
  const enabledModules = new Set(input.enabledModules);

  return {
    tenant_id: input.tenantId,
    routes: allApiDefinitions().filter((definition) => enabledModules.has(definition.module_code)),
  };
}

export function classifyApiRoute(policy: ApiCategoryPolicy, path: string): ApiRouteClassification {
  const route = policy.routes.find((definition) =>
    definition.path_prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
  );

  if (!route) {
    return {
      status: 'fail',
      reason: `No enabled API category matches ${path}.`,
    };
  }

  return {
    status: 'pass',
    route,
  };
}

function allApiDefinitions(): ApiCategoryDefinition[] {
  return [
    ...API_CATEGORY_REGISTRY.public,
    ...API_CATEGORY_REGISTRY.internal,
    ...API_CATEGORY_REGISTRY.third_party,
  ];
}

function api(
  code: string,
  category: ApiCategory,
  moduleCode: Implementation300ModuleCode,
  pathPrefixes: readonly string[],
  audience: ApiAudience,
  tenantScoped: boolean,
  requiresSignature: boolean,
  rateLimitPerMinute: number,
): ApiCategoryDefinition {
  return {
    code,
    category,
    module_code: moduleCode,
    path_prefixes: pathPrefixes,
    audience,
    tenant_scoped: tenantScoped,
    requires_signature: requiresSignature,
    rate_limit_per_minute: rateLimitPerMinute,
  };
}
