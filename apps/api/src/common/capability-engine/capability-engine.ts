import type { BillingAccessContextState } from '../request-context/request-context.types';

export type CapabilityEnforcementLevel =
  | 'FULL_ACCESS'
  | 'GRACE_WARNING'
  | 'FUNCTIONAL_LIMITATION'
  | 'OPERATIONAL_LOCKDOWN'
  | 'SUSPENSION';

export type CapabilityWriteMode = 'full' | 'limited' | 'read_only' | 'blocked';

export interface ApiCapabilityEnforcement {
  level: CapabilityEnforcementLevel;
  canLogin: boolean;
  writeMode: CapabilityWriteMode;
  message: string;
}

function enforcement(
  level: CapabilityEnforcementLevel,
  message: string,
): ApiCapabilityEnforcement {
  const writeModeByLevel: Record<CapabilityEnforcementLevel, CapabilityWriteMode> = {
    FULL_ACCESS: 'full',
    GRACE_WARNING: 'full',
    FUNCTIONAL_LIMITATION: 'limited',
    OPERATIONAL_LOCKDOWN: 'read_only',
    SUSPENSION: 'blocked',
  };

  return {
    level,
    canLogin: level !== 'SUSPENSION',
    writeMode: writeModeByLevel[level],
    message,
  };
}

export function resolveApiCapabilityEnforcement(
  billing?: Partial<Pick<BillingAccessContextState, 'lifecycle_state' | 'access_mode' | 'status'>> | null,
): ApiCapabilityEnforcement {
  if (!billing?.access_mode) {
    return enforcement('FULL_ACCESS', 'Full access');
  }

  if (billing.access_mode === 'billing_only' || billing.lifecycle_state === 'SUSPENDED') {
    return enforcement('SUSPENSION', 'School access is suspended');
  }

  if (billing.access_mode === 'read_only' || billing.lifecycle_state === 'RESTRICTED') {
    return enforcement('OPERATIONAL_LOCKDOWN', 'School is in read-only operational lockdown');
  }

  if (billing.lifecycle_state === 'ACTIVE_LIMITED' || billing.lifecycle_state === 'PAYMENT_OVERDUE') {
    return enforcement('FUNCTIONAL_LIMITATION', 'School access is functionally limited');
  }

  if (billing.lifecycle_state === 'GRACE_PERIOD' || billing.status === 'past_due') {
    return enforcement('GRACE_WARNING', 'Payment grace warning is active');
  }

  return enforcement('FULL_ACCESS', 'Full access');
}
