import type { BlueprintUserRole } from '../../auth/identity-blueprint';
import type { Implementation300ModuleCode } from '../implementation300/blueprint-registry';

export const BLUEPRINT_AUTOMATION_TRIGGERS = [
  'fee_overdue',
  'low_stock',
  'attendance_absence',
  'discipline_escalation',
  'timetable_conflict',
  'exam_result_publish',
  'clinic_emergency',
] as const;

export type BlueprintAutomationTrigger = (typeof BLUEPRINT_AUTOMATION_TRIGGERS)[number];

export type AutomationSeverity = 'info' | 'warning' | 'critical';

export type AutomationActionType =
  | 'send_fee_reminder'
  | 'create_reorder_alert'
  | 'notify_attendance_absence'
  | 'escalate_discipline_case'
  | 'notify_timetable_conflict'
  | 'publish_exam_result_notification'
  | 'send_clinic_emergency_alert';

export type AutomationPolicyInput = {
  tenantId: string;
  enabledModules: readonly Implementation300ModuleCode[];
};

export type AutomationPolicy = {
  tenant_id: string;
  enabled_modules: Implementation300ModuleCode[];
  enabled_triggers: BlueprintAutomationTrigger[];
  rules: AutomationRule[];
};

export type AutomationRule = {
  trigger: BlueprintAutomationTrigger;
  module_code: Implementation300ModuleCode;
  action_type: AutomationActionType;
  channel: 'sms' | 'email' | 'in_app' | 'workflow';
  escalation_role: BlueprintUserRole;
};

export type AutomationEvent = {
  id: string;
  trigger: BlueprintAutomationTrigger;
  moduleCode: Implementation300ModuleCode;
  subjectId: string;
  severity: AutomationSeverity;
  occurredAt: string;
};

export type AutomationAction = {
  tenant_id: string;
  event_id: string;
  subject_id: string;
  trigger: BlueprintAutomationTrigger;
  action_type: AutomationActionType;
  channel: AutomationRule['channel'];
  escalation_role: BlueprintUserRole;
  severity: AutomationSeverity;
  scheduled_for: string;
};

export type AutomationEvaluation = {
  tenant_id: string;
  actions: AutomationAction[];
  skipped_event_ids: string[];
  deduplicated_event_ids: string[];
};

const automationRuleCatalog: AutomationRule[] = [
  {
    trigger: 'fee_overdue',
    module_code: 'finance',
    action_type: 'send_fee_reminder',
    channel: 'sms',
    escalation_role: 'bursar',
  },
  {
    trigger: 'low_stock',
    module_code: 'inventory',
    action_type: 'create_reorder_alert',
    channel: 'workflow',
    escalation_role: 'storekeeper',
  },
  {
    trigger: 'attendance_absence',
    module_code: 'teacher_biometric_attendance',
    action_type: 'notify_attendance_absence',
    channel: 'in_app',
    escalation_role: 'deputy_principal',
  },
  {
    trigger: 'discipline_escalation',
    module_code: 'discipline',
    action_type: 'escalate_discipline_case',
    channel: 'workflow',
    escalation_role: 'deputy_principal',
  },
  {
    trigger: 'timetable_conflict',
    module_code: 'timetable',
    action_type: 'notify_timetable_conflict',
    channel: 'in_app',
    escalation_role: 'deputy_principal',
  },
  {
    trigger: 'exam_result_publish',
    module_code: 'exams',
    action_type: 'publish_exam_result_notification',
    channel: 'email',
    escalation_role: 'principal',
  },
  {
    trigger: 'clinic_emergency',
    module_code: 'clinic_health',
    action_type: 'send_clinic_emergency_alert',
    channel: 'sms',
    escalation_role: 'nurse',
  },
];

export function buildAutomationPolicy(input: AutomationPolicyInput): AutomationPolicy {
  const enabledModules = new Set(input.enabledModules);
  const rules = automationRuleCatalog.filter((rule) => enabledModules.has(rule.module_code));

  return {
    tenant_id: input.tenantId,
    enabled_modules: [...input.enabledModules],
    enabled_triggers: rules.map((rule) => rule.trigger),
    rules,
  };
}

export function evaluateAutomationEvents(
  policy: AutomationPolicy,
  events: readonly AutomationEvent[],
): AutomationEvaluation {
  const rulesByTrigger = new Map(policy.rules.map((rule) => [rule.trigger, rule]));
  const seenSubjectTriggers = new Set<string>();
  const actions: AutomationAction[] = [];
  const skipped: string[] = [];
  const deduplicated: string[] = [];

  for (const event of events) {
    const rule = rulesByTrigger.get(event.trigger);

    if (!rule || rule.module_code !== event.moduleCode) {
      skipped.push(event.id);
      continue;
    }

    const dedupeKey = `${event.trigger}:${event.subjectId}`;
    if (seenSubjectTriggers.has(dedupeKey)) {
      deduplicated.push(event.id);
      continue;
    }
    seenSubjectTriggers.add(dedupeKey);

    actions.push({
      tenant_id: policy.tenant_id,
      event_id: event.id,
      subject_id: event.subjectId,
      trigger: event.trigger,
      action_type: rule.action_type,
      channel: rule.channel,
      escalation_role: rule.escalation_role,
      severity: event.severity,
      scheduled_for: event.occurredAt,
    });
  }

  return {
    tenant_id: policy.tenant_id,
    actions,
    skipped_event_ids: skipped,
    deduplicated_event_ids: deduplicated,
  };
}
