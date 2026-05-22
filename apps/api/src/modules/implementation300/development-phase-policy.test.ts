import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEVELOPMENT_PHASE_BLUEPRINT,
  buildDevelopmentPhasePlan,
  evaluateDevelopmentPhaseProgress,
} from './development-phase-policy';

test('DEVELOPMENT_PHASE_BLUEPRINT models all four recommended implementation phases', () => {
  assert.deepEqual(DEVELOPMENT_PHASE_BLUEPRINT.map((phase) => phase.id), [
    'phase_1_core_erp',
    'phase_2_operations',
    'phase_3_advanced',
    'phase_4_enterprise_intelligence',
  ]);
  assert.deepEqual(DEVELOPMENT_PHASE_BLUEPRINT[0]?.requiredModules, [
    'authentication',
    'tenant_management',
    'students',
    'finance',
    'exams',
    'communication_sms',
    'reports',
  ]);
  assert.equal(DEVELOPMENT_PHASE_BLUEPRINT[3]?.capabilities.includes('advanced_integrations'), true);
});

test('buildDevelopmentPhasePlan blocks later phases until earlier modules are complete', () => {
  const plan = buildDevelopmentPhasePlan({
    completedModules: ['authentication', 'tenant_management', 'students', 'finance', 'exams', 'communication_sms', 'reports', 'inventory'],
  });

  assert.equal(plan[0]?.status, 'complete');
  assert.equal(plan[1]?.status, 'in_progress');
  assert.equal(plan[2]?.status, 'blocked');
  assert.deepEqual(plan[1]?.missingModules, ['hr', 'library', 'transport', 'timetable', 'parent_portal']);
  assert.equal(plan[2]?.blockedBy, 'phase_2_operations');
});

test('evaluateDevelopmentPhaseProgress flags out-of-order activation and missing release gates', () => {
  const result = evaluateDevelopmentPhaseProgress({
    completedModules: ['authentication', 'tenant_management', 'students', 'finance', 'exams', 'communication_sms', 'reports'],
    activeModules: ['ai_insights'],
    releaseGates: ['test:implementation300', 'release:readiness'],
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.id === 'out-of-order-module:ai_insights'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-release-gate:implementation300:certify'), true);
  assert.equal(result.issues.some((issue) => issue.id === 'missing-release-gate:npm test'), true);
});

test('evaluateDevelopmentPhaseProgress passes complete phased enterprise rollout', () => {
  const allModules = DEVELOPMENT_PHASE_BLUEPRINT.flatMap((phase) => phase.requiredModules);
  const result = evaluateDevelopmentPhaseProgress({
    completedModules: allModules,
    activeModules: ['ai_insights', 'iot', 'automation_engine', 'advanced_integrations'],
    releaseGates: ['npm test', 'test:implementation300', 'implementation300:certify', 'release:readiness'],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.phases.every((phase) => phase.status === 'complete'), true);
});
