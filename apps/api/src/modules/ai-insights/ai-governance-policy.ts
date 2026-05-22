import {
  normalizeBlueprintRole,
  type BlueprintUserRole,
} from '../../auth/identity-blueprint';
import type { Implementation300ModuleCode } from '../implementation300/blueprint-registry';

export const AI_INSIGHT_CAPABILITIES = [
  'predictive_analytics',
  'fee_default_prediction',
  'performance_forecasting',
  'risk_detection',
  'attendance_anomalies',
  'resource_optimization',
  'executive_recommendations',
  'natural_language_summaries',
  'operational_intelligence',
] as const;

export type AiInsightCapability = (typeof AI_INSIGHT_CAPABILITIES)[number];

export type AiGovernancePolicyInput = {
  tenantId: string;
  activeModules: readonly Implementation300ModuleCode[];
};

export type AiGovernancePolicy = {
  tenant_id: string;
  audit_required: true;
  allowed_capabilities: AiInsightCapability[];
  blocked_modules: Implementation300ModuleCode[];
  human_review_required_for: AiInsightCapability[];
  data_boundary: 'tenant_scoped';
};

export type AuditableAiInsightInput = AiGovernancePolicyInput & {
  capability: AiInsightCapability;
  targetModule: Implementation300ModuleCode;
  provider: string;
  model: string;
  datasetVersion: string;
  promptSummary: string;
  explanation: string;
  recommendation: string;
  recommendationOwnerRole: string;
  confidenceScore?: number;
  sourceRecordIds: readonly string[];
  generatedAt?: string;
};

export type AuditableAiInsight = {
  tenant_id: string;
  target_module: Implementation300ModuleCode;
  capability: AiInsightCapability;
  dataset_version: string;
  explanation: string;
  recommendation: string;
  recommendation_owner_role: BlueprintUserRole;
  confidence_score: number;
  human_review_required: boolean;
  decision_status: 'pending_human_review' | 'ready_for_publish';
  generated_at: string;
  audit_log: {
    audit_id: string;
    tenant_id: string;
    target_module: Implementation300ModuleCode;
    capability: AiInsightCapability;
    model_provider: string;
    model_name: string;
    dataset_version: string;
    prompt_summary: string;
    explanation_present: true;
    recommendation_owner_role: BlueprintUserRole;
    source_record_count: number;
    data_boundary: 'tenant_scoped';
  };
};

const capabilityTargets: Record<AiInsightCapability, Implementation300ModuleCode> = {
  predictive_analytics: 'principal_dashboard',
  fee_default_prediction: 'finance',
  performance_forecasting: 'exams',
  risk_detection: 'principal_dashboard',
  attendance_anomalies: 'teacher_biometric_attendance',
  resource_optimization: 'finance',
  executive_recommendations: 'principal_dashboard',
  natural_language_summaries: 'principal_dashboard',
  operational_intelligence: 'principal_dashboard',
};

const humanReviewCapabilities = new Set<AiInsightCapability>([
  'fee_default_prediction',
  'performance_forecasting',
  'risk_detection',
  'attendance_anomalies',
  'executive_recommendations',
]);

export function buildAiGovernancePolicy(input: AiGovernancePolicyInput): AiGovernancePolicy {
  const activeModules = new Set(input.activeModules);
  const allowedCapabilities = AI_INSIGHT_CAPABILITIES.filter((capability) =>
    activeModules.has(capabilityTargets[capability]),
  );
  const blockedModules = unique(
    AI_INSIGHT_CAPABILITIES
      .filter((capability) => !allowedCapabilities.includes(capability))
      .map((capability) => capabilityTargets[capability])
      .filter((moduleCode) => moduleCode === 'teacher_biometric_attendance'),
  );

  return {
    tenant_id: input.tenantId,
    audit_required: true,
    allowed_capabilities: allowedCapabilities,
    blocked_modules: blockedModules,
    human_review_required_for: allowedCapabilities.filter((capability) =>
      humanReviewCapabilities.has(capability),
    ),
    data_boundary: 'tenant_scoped',
  };
}

export function createAuditableAiInsight(input: AuditableAiInsightInput): AuditableAiInsight {
  const policy = buildAiGovernancePolicy(input);
  const activeModules = new Set(input.activeModules);
  const requiredModule = capabilityTargets[input.capability];

  if (!activeModules.has(input.targetModule)) {
    throw new Error(`AI capability ${input.capability} cannot run for disabled module ${input.targetModule}.`);
  }

  if (requiredModule !== input.targetModule) {
    throw new Error(`AI capability ${input.capability} requires target module ${requiredModule}.`);
  }

  if (!policy.allowed_capabilities.includes(input.capability)) {
    throw new Error(`AI capability ${input.capability} is not enabled for tenant ${input.tenantId}.`);
  }

  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const ownerRole = normalizeBlueprintRole(input.recommendationOwnerRole);
  const humanReviewRequired = humanReviewCapabilities.has(input.capability);

  return {
    tenant_id: input.tenantId,
    target_module: input.targetModule,
    capability: input.capability,
    dataset_version: input.datasetVersion,
    explanation: input.explanation,
    recommendation: input.recommendation,
    recommendation_owner_role: ownerRole,
    confidence_score: clampConfidence(input.confidenceScore ?? 0),
    human_review_required: humanReviewRequired,
    decision_status: humanReviewRequired ? 'pending_human_review' : 'ready_for_publish',
    generated_at: generatedAt,
    audit_log: {
      audit_id: buildAuditId(input.tenantId, input.capability, input.targetModule, generatedAt),
      tenant_id: input.tenantId,
      target_module: input.targetModule,
      capability: input.capability,
      model_provider: input.provider,
      model_name: input.model,
      dataset_version: input.datasetVersion,
      prompt_summary: input.promptSummary,
      explanation_present: true,
      recommendation_owner_role: ownerRole,
      source_record_count: input.sourceRecordIds.length,
      data_boundary: 'tenant_scoped',
    },
  };
}

function clampConfidence(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.min(1, Math.max(0, score));
}

function buildAuditId(
  tenantId: string,
  capability: AiInsightCapability,
  targetModule: Implementation300ModuleCode,
  generatedAt: string,
): string {
  const timestamp = generatedAt.replace(/[^0-9]/g, '').slice(0, 14) || 'undated';
  return `${tenantId}:${targetModule}:${capability}:${timestamp}`;
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
