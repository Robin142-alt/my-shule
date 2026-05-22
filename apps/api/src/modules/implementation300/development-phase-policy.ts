export type DevelopmentPhaseId =
  | 'phase_1_core_erp'
  | 'phase_2_operations'
  | 'phase_3_advanced'
  | 'phase_4_enterprise_intelligence';

export type DevelopmentPhaseDefinition = {
  id: DevelopmentPhaseId;
  label: string;
  requiredModules: readonly string[];
  capabilities: readonly string[];
};

export type DevelopmentPhasePlanItem = DevelopmentPhaseDefinition & {
  status: 'blocked' | 'in_progress' | 'complete';
  missingModules: string[];
  blockedBy?: DevelopmentPhaseId;
};

export type DevelopmentPhaseInput = {
  completedModules: readonly string[];
};

export type DevelopmentPhaseProgressInput = DevelopmentPhaseInput & {
  activeModules: readonly string[];
  releaseGates: readonly string[];
};

export type DevelopmentPhaseIssue = {
  id: string;
  severity: 'critical' | 'high';
  message: string;
};

export type DevelopmentPhaseProgressResult = {
  ok: boolean;
  phases: DevelopmentPhasePlanItem[];
  issues: DevelopmentPhaseIssue[];
};

const REQUIRED_RELEASE_GATES = [
  'npm test',
  'test:implementation300',
  'implementation300:certify',
  'release:readiness',
] as const;

export const DEVELOPMENT_PHASE_BLUEPRINT: readonly DevelopmentPhaseDefinition[] = [
  {
    id: 'phase_1_core_erp',
    label: 'Core ERP',
    requiredModules: [
      'authentication',
      'tenant_management',
      'students',
      'finance',
      'exams',
      'communication_sms',
      'reports',
    ],
    capabilities: ['tenant_onboarding', 'billing', 'exam_results', 'communication', 'reports'],
  },
  {
    id: 'phase_2_operations',
    label: 'Operations',
    requiredModules: ['hr', 'inventory', 'library', 'transport', 'timetable', 'parent_portal'],
    capabilities: ['staff_operations', 'stock_control', 'library', 'transport', 'timetable', 'parent_access'],
  },
  {
    id: 'phase_3_advanced',
    label: 'Advanced',
    requiredModules: ['cbt_exams', 'lms', 'ai_insights', 'iot', 'biometrics'],
    capabilities: ['online_exams', 'elearning', 'ai_insights', 'smart_campus', 'biometrics'],
  },
  {
    id: 'phase_4_enterprise_intelligence',
    label: 'Enterprise Intelligence',
    requiredModules: ['predictive_analytics', 'executive_ai', 'automation_engine', 'advanced_integrations'],
    capabilities: ['predictive_analytics', 'executive_ai', 'automation_engine', 'advanced_integrations'],
  },
] as const;

export function buildDevelopmentPhasePlan(
  input: DevelopmentPhaseInput,
): DevelopmentPhasePlanItem[] {
  const completedModules = new Set(input.completedModules);
  let firstIncompletePhase: DevelopmentPhaseId | undefined;

  return DEVELOPMENT_PHASE_BLUEPRINT.map((phase) => {
    const missingModules = phase.requiredModules.filter((moduleCode) => !completedModules.has(moduleCode));

    if (firstIncompletePhase) {
      return {
        ...phase,
        status: 'blocked',
        missingModules,
        blockedBy: firstIncompletePhase,
      };
    }

    if (missingModules.length > 0) {
      firstIncompletePhase = phase.id;

      return {
        ...phase,
        status: 'in_progress',
        missingModules,
      };
    }

    return {
      ...phase,
      status: 'complete',
      missingModules,
    };
  });
}

export function evaluateDevelopmentPhaseProgress(
  input: DevelopmentPhaseProgressInput,
): DevelopmentPhaseProgressResult {
  const phases = buildDevelopmentPhasePlan(input);
  const activeModules = new Set(input.activeModules);
  const completedModules = new Set(input.completedModules);
  const issues: DevelopmentPhaseIssue[] = [];

  for (const gate of REQUIRED_RELEASE_GATES) {
    if (!input.releaseGates.includes(gate)) {
      issues.push(issue('missing-release-gate', gate, 'critical', `${gate} must be part of the phase release gate.`));
    }
  }

  for (const phase of DEVELOPMENT_PHASE_BLUEPRINT) {
    const phaseIsAvailable = phase.requiredModules.every((moduleCode) => completedModules.has(moduleCode));

    if (phaseIsAvailable) {
      continue;
    }

    for (const moduleCode of phase.requiredModules) {
      if (activeModules.has(moduleCode) && !completedModules.has(moduleCode)) {
        issues.push(issue(
          `active-before-complete:${moduleCode}`,
          moduleCode,
          'critical',
          `${moduleCode} is active before its phase is complete.`,
        ));
      }
    }

    for (const futurePhase of phasesAfter(phase.id)) {
      for (const moduleCode of futurePhase.requiredModules) {
        if (activeModules.has(moduleCode)) {
          issues.push(issue(
            `out-of-order-module:${moduleCode}`,
            moduleCode,
            'critical',
            `${moduleCode} cannot activate before ${phase.id} is complete.`,
          ));
        }
      }
    }

    break;
  }

  return {
    ok: issues.length === 0,
    phases,
    issues,
  };
}

function phasesAfter(id: DevelopmentPhaseId): readonly DevelopmentPhaseDefinition[] {
  const index = DEVELOPMENT_PHASE_BLUEPRINT.findIndex((phase) => phase.id === id);

  return index < 0 ? [] : DEVELOPMENT_PHASE_BLUEPRINT.slice(index + 1);
}

function issue(
  id: string,
  subject: string,
  severity: DevelopmentPhaseIssue['severity'],
  message: string,
): DevelopmentPhaseIssue {
  return {
    id: id.startsWith('missing-release-gate') ? `${id}:${subject}` : id,
    severity,
    message,
  };
}
