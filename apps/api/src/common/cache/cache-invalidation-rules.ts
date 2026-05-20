export type CacheInvalidationStrategy = 'tenant_namespace';

export interface ModuleCacheInvalidationRule {
  module: string;
  mutationEvents: string[];
  namespaces: string[];
  ttlSeconds: number;
  strategy: CacheInvalidationStrategy;
}

export const MODULE_CACHE_INVALIDATION_RULES: readonly ModuleCacheInvalidationRule[] = [
  {
    module: 'students',
    mutationEvents: ['student.created', 'student.updated', 'student.deleted'],
    namespaces: ['students:list', 'students:detail', 'dashboard:principal'],
    ttlSeconds: 60,
    strategy: 'tenant_namespace',
  },
  {
    module: 'admissions',
    mutationEvents: ['admission.application_created', 'admission.application_updated'],
    namespaces: ['admissions:list', 'students:lookup', 'dashboard:principal'],
    ttlSeconds: 60,
    strategy: 'tenant_namespace',
  },
  {
    module: 'billing',
    mutationEvents: ['invoice.created', 'invoice.updated', 'manual_fee_payment.posted'],
    namespaces: ['billing:balances', 'billing:statements', 'dashboard:principal'],
    ttlSeconds: 45,
    strategy: 'tenant_namespace',
  },
  {
    module: 'payments',
    mutationEvents: ['mpesa.callback_verified', 'mpesa.reconciliation.completed', 'mpesa.review.resolved'],
    namespaces: ['payments:mpesa', 'billing:balances', 'dashboard:principal'],
    ttlSeconds: 30,
    strategy: 'tenant_namespace',
  },
  {
    module: 'exams',
    mutationEvents: ['exam.mark_updated', 'report_card.generated', 'report_card.published'],
    namespaces: ['exams:mark-sheets', 'exams:report-cards', 'dashboard:principal'],
    ttlSeconds: 45,
    strategy: 'tenant_namespace',
  },
  {
    module: 'support',
    mutationEvents: ['support.ticket_created', 'support.ticket_updated'],
    namespaces: ['support:tickets', 'support:status'],
    ttlSeconds: 60,
    strategy: 'tenant_namespace',
  },
];

export function listModuleCacheInvalidationRules(): ModuleCacheInvalidationRule[] {
  return MODULE_CACHE_INVALIDATION_RULES.map((rule) => ({
    ...rule,
    mutationEvents: [...rule.mutationEvents],
    namespaces: [...rule.namespaces],
  }));
}

export function resolveCacheInvalidationNamespaces(
  module: string,
  mutationEvent: string,
): string[] {
  const rule = MODULE_CACHE_INVALIDATION_RULES.find((candidate) => candidate.module === module);

  if (!rule || !rule.mutationEvents.includes(mutationEvent)) {
    return [];
  }

  return [...rule.namespaces];
}

export function validateModuleCacheInvalidationRules(
  rules: readonly ModuleCacheInvalidationRule[] = MODULE_CACHE_INVALIDATION_RULES,
): string[] {
  const errors: string[] = [];
  const requiredModules = ['students', 'billing', 'payments', 'exams'];
  const seenModules = new Set<string>();

  for (const rule of rules) {
    if (seenModules.has(rule.module)) {
      errors.push(`Duplicate cache invalidation rule for module ${rule.module}.`);
    }
    seenModules.add(rule.module);

    if (rule.strategy !== 'tenant_namespace') {
      errors.push(`Cache invalidation for ${rule.module} must be tenant-scoped.`);
    }

    if (rule.mutationEvents.length === 0 || rule.namespaces.length === 0) {
      errors.push(`Cache invalidation for ${rule.module} needs events and namespaces.`);
    }
  }

  for (const module of requiredModules) {
    if (!seenModules.has(module)) {
      errors.push(`Missing cache invalidation rule for module ${module}.`);
    }
  }

  return errors;
}
