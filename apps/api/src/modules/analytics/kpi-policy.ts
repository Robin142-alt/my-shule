import type { Implementation300ModuleCode } from '../implementation300/blueprint-registry';

export type KpiCategoryCode = 'financial' | 'academic' | 'operational' | 'executive';
export type KpiMetricCode =
  | 'collection_rate'
  | 'arrears_percentage'
  | 'revenue_trends'
  | 'mean_score'
  | 'grade_distribution'
  | 'cbc_competency_trends'
  | 'attendance_rates'
  | 'staff_punctuality'
  | 'inventory_turnover'
  | 'enrollment_growth'
  | 'parent_engagement'
  | 'operational_efficiency'
  | 'risk_indicators';

export type KpiCategory = {
  code: KpiCategoryCode;
  modules: Implementation300ModuleCode[];
  metrics: KpiMetricCode[];
};

export type KpiPolicyInput = {
  tenantId: string;
  enabledModules: readonly Implementation300ModuleCode[];
};

export type KpiPolicy = {
  tenant_id: string;
  enabled_categories: KpiCategory[];
  enabled_metrics: KpiMetricCode[];
};

export type KpiSnapshot = Partial<Record<KpiMetricCode, number>>;

export type KpiSnapshotEvaluation = {
  tenant_id: string;
  status: 'pass' | 'fail';
  required_actions: string[];
};

export const BLUEPRINT_KPI_CATEGORIES: KpiCategory[] = [
  {
    code: 'financial',
    modules: ['finance'],
    metrics: ['collection_rate', 'arrears_percentage', 'revenue_trends'],
  },
  {
    code: 'academic',
    modules: ['exams'],
    metrics: ['mean_score', 'grade_distribution', 'cbc_competency_trends'],
  },
  {
    code: 'operational',
    modules: ['staff', 'inventory'],
    metrics: ['attendance_rates', 'staff_punctuality', 'inventory_turnover'],
  },
  {
    code: 'executive',
    modules: ['principal_dashboard'],
    metrics: ['enrollment_growth', 'parent_engagement', 'operational_efficiency', 'risk_indicators'],
  },
];

const metricThresholds: Partial<Record<KpiMetricCode, { min?: number; max?: number }>> = {
  collection_rate: { min: 0.8 },
  arrears_percentage: { max: 0.25 },
  parent_engagement: { min: 0.4 },
  attendance_rates: { min: 0.85 },
  staff_punctuality: { min: 0.8 },
  operational_efficiency: { min: 0.75 },
  risk_indicators: { max: 0.2 },
};

export function buildKpiPolicy(input: KpiPolicyInput): KpiPolicy {
  const enabledModules = new Set(input.enabledModules);
  const enabledCategories = BLUEPRINT_KPI_CATEGORIES.filter((category) =>
    category.modules.some((moduleCode) => enabledModules.has(moduleCode)),
  );

  return {
    tenant_id: input.tenantId,
    enabled_categories: enabledCategories,
    enabled_metrics: unique(enabledCategories.flatMap((category) => category.metrics)),
  };
}

export function evaluateKpiSnapshot(
  policy: KpiPolicy,
  snapshot: KpiSnapshot,
): KpiSnapshotEvaluation {
  const actions: string[] = [];

  for (const metric of policy.enabled_metrics) {
    const value = snapshot[metric];
    const threshold = metricThresholds[metric];

    if (value === undefined && threshold) {
      actions.push(`Submit KPI value for ${metric}.`);
      continue;
    }

    if (!threshold || value === undefined) {
      continue;
    }

    if (threshold.min !== undefined && value < threshold.min) {
      actions.push(`Improve ${metric} to at least ${threshold.min}.`);
    }

    if (threshold.max !== undefined && value > threshold.max) {
      actions.push(`Reduce ${metric} to at most ${threshold.max}.`);
    }
  }

  return {
    tenant_id: policy.tenant_id,
    status: actions.length === 0 ? 'pass' : 'fail',
    required_actions: actions,
  };
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
