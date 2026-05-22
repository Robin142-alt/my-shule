export type TenantBillingCycle = 'term' | 'annual';
export type TenantBillingContractType = 'manual' | 'module_based' | 'enterprise';
export type TenantUsageMetric = 'storage_gb' | 'sms' | 'devices';

export type TenantBillingModulePrice = {
  code: string;
  name: string;
  baseAmountMinor?: number;
  perStudentAmountMinor?: number;
};

export type TenantBillingContractInput = {
  tenantId: string;
  schoolName: string;
  currencyCode: string;
  billingCycle: TenantBillingCycle;
  contractType: TenantBillingContractType;
  studentCount: number;
  negotiatedAmountMinor?: number;
  modules: TenantBillingModulePrice[];
  quotas?: Partial<Record<TenantUsageMetric, number>>;
  usage?: Partial<Record<TenantUsageMetric, number>>;
  overageRates?: Partial<Record<TenantUsageMetric, number>>;
};

export type TenantBillingContractLineItem = {
  code: string;
  description: string;
  quantity: number;
  unit_amount_minor: number;
  amount_minor: number;
};

export type TenantBillingQuotaSnapshot = Record<
  TenantUsageMetric,
  {
    quota: number;
    used: number;
    overage: number;
  }
>;

export type TenantBillingContractInvoice = {
  tenant_id: string;
  school_name: string;
  billing_cycle: TenantBillingCycle;
  contract_type: TenantBillingContractType;
  currency_code: string;
  active_module_codes: string[];
  quota_snapshot: TenantBillingQuotaSnapshot;
  line_items: TenantBillingContractLineItem[];
  subtotal_amount_minor: number;
  total_amount_minor: number;
};

const usageMetrics: TenantUsageMetric[] = ['storage_gb', 'sms', 'devices'];

export function calculateTenantBillingContractInvoice(
  input: TenantBillingContractInput,
): TenantBillingContractInvoice {
  const activeModuleCodes = input.modules.map((modulePrice) => modulePrice.code);
  const quotaSnapshot = buildQuotaSnapshot(input.quotas, input.usage);
  const lineItems = input.negotiatedAmountMinor !== undefined
    ? [
        {
          code: `contract:${input.contractType}`,
          description: `${input.schoolName} negotiated ${input.billingCycle} contract`,
          quantity: 1,
          unit_amount_minor: input.negotiatedAmountMinor,
          amount_minor: input.negotiatedAmountMinor,
        },
      ]
    : [
        ...input.modules.map((modulePrice) =>
          buildModuleLineItem(modulePrice, input.studentCount),
        ),
        ...buildUsageOverageLineItems(quotaSnapshot, input.overageRates),
      ];
  const subtotal = lineItems.reduce((sum, lineItem) => sum + lineItem.amount_minor, 0);

  return {
    tenant_id: input.tenantId,
    school_name: input.schoolName,
    billing_cycle: input.billingCycle,
    contract_type: input.contractType,
    currency_code: input.currencyCode,
    active_module_codes: activeModuleCodes,
    quota_snapshot: quotaSnapshot,
    line_items: lineItems,
    subtotal_amount_minor: subtotal,
    total_amount_minor: subtotal,
  };
}

function buildModuleLineItem(
  modulePrice: TenantBillingModulePrice,
  studentCount: number,
): TenantBillingContractLineItem {
  const baseAmount = modulePrice.baseAmountMinor ?? 0;
  const perStudentAmount = modulePrice.perStudentAmountMinor ?? 0;
  const amount = baseAmount + (studentCount * perStudentAmount);

  return {
    code: `module:${modulePrice.code}`,
    description: modulePrice.name,
    quantity: perStudentAmount > 0 ? studentCount : 1,
    unit_amount_minor: perStudentAmount > 0 ? perStudentAmount : baseAmount,
    amount_minor: amount,
  };
}

function buildQuotaSnapshot(
  quotas: TenantBillingContractInput['quotas'] = {},
  usage: TenantBillingContractInput['usage'] = {},
): TenantBillingQuotaSnapshot {
  return Object.fromEntries(
    usageMetrics.map((metric) => {
      const quota = quotas[metric] ?? 0;
      const used = usage[metric] ?? 0;

      return [
        metric,
        {
          quota,
          used,
          overage: Math.max(used - quota, 0),
        },
      ];
    }),
  ) as TenantBillingQuotaSnapshot;
}

function buildUsageOverageLineItems(
  quotaSnapshot: TenantBillingQuotaSnapshot,
  overageRates: TenantBillingContractInput['overageRates'] = {},
): TenantBillingContractLineItem[] {
  return usageMetrics.flatMap((metric) => {
    const snapshot = quotaSnapshot[metric];
    const overage = snapshot.overage;
    const unitAmount = overageRates[metric] ?? 0;

    if (overage <= 0 || unitAmount <= 0) {
      return [];
    }

    return [
      {
        code: `usage:${metric}`,
        description: `${metric} overage`,
        quantity: overage,
        unit_amount_minor: unitAmount,
        amount_minor: overage * unitAmount,
      },
    ];
  });
}
