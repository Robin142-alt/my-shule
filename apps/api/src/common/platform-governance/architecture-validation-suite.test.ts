import assert from 'node:assert/strict';
import test from 'node:test';

import {
  architectureValidationScenarioIds,
  runArchitectureValidationSuite,
} from './architecture-validation-suite';

test('ArchitectureValidationSuite covers every production-readiness failure scenario', () => {
  assert.deepEqual(architectureValidationScenarioIds, [
    'BUTTON_HANDLER_MISSING',
    'FAILED_API',
    'FORM_FIELD_REMOVED',
    'FORM_VALIDATION_FAILED',
    'EVENT_EMISSION',
    'EVENT_CONSUMER_FAILED',
    'WIDGET_DATASOURCE_FAILED',
    'CAPABILITY_REMOVED',
    'CROSS_TENANT_QUERY',
    'TENANT_EVENT_LEAK',
    'SERVICE_CRASH',
    'DATABASE_CONNECTION_FAILURE',
    'MODULE_REMOVED',
    'OVERDUE_SCHOOL_ENFORCEMENT',
    'DIRECT_DATABASE_MUTATION',
    'UNAUTHORIZED_ACTION',
  ]);
});

test('ArchitectureValidationSuite passes only when visibility, events, recovery, governance, and tenant isolation all hold', () => {
  const report = runArchitectureValidationSuite();

  assert.equal(report.status, 'pass');
  assert.equal(report.score, 100);
  assert.equal(report.finalQuestionAnswer, 'YES');
  assert.deepEqual(report.passConditions, {
    buttonsSurviveFailure: 'YES',
    formsSurviveSchemaMismatch: 'YES',
    widgetsDegradeInsteadOfVanish: 'YES',
    eventReplayWorks: 'YES',
    tenantLeakageImpossible: 'YES',
    selfHealingTriggersAutomatically: 'YES',
    dashboardsRemainStable: 'YES',
    agpBlocksBypassAttempts: 'YES',
  });
  assert.equal(report.results.length, 16);
  assert.equal(report.results.every((result) => result.status === 'pass'), true);
  assert.equal(report.results.every((result) => result.dashboardStable), true);
  assert.equal(report.results.every((result) => result.noSilentFailure), true);
});

test('ArchitectureValidationSuite emits the required failure and recovery events', () => {
  const report = runArchitectureValidationSuite();
  const emittedEvents = new Set(report.results.flatMap((result) => result.eventsEmitted));

  for (const eventName of [
    'BUTTON_MAPPING_MISSING',
    'REPAIR_TRIGGERED',
    'API_ENDPOINT_FAILED',
    'SCHEMA_MISMATCH_DETECTED',
    'VALIDATION_REJECTED',
    'STUDENT_CREATED',
    'EVENT_CONSUMER_FAILED',
    'WIDGET_FAILED',
    'CAPABILITY_REVOKED',
    'TENANT_ISOLATION_BREACH_ATTEMPT',
    'TENANT_EVENT_SUBSCRIPTION_REJECTED',
    'SERVICE_DEGRADED',
    'DATABASE_CONNECTION_FAILED',
    'MODULE_DISABLED',
    'TENANT_ENFORCEMENT_CHANGED',
    'DIRECT_DB_MUTATION_REJECTED',
    'UNAUTHORIZED_ACTION_BLOCKED',
  ]) {
    assert.equal(emittedEvents.has(eventName), true, `${eventName} was not emitted`);
  }
});

test('ArchitectureValidationSuite proves overdue enforcement is progressive and non-destructive', () => {
  const report = runArchitectureValidationSuite();
  const overdue = report.results.find((result) => result.id === 'OVERDUE_SCHOOL_ENFORCEMENT');

  assert.ok(overdue);
  assert.deepEqual(overdue.evidence.enforcementLevels, [
    'FULL_ACCESS',
    'GRACE_WARNING',
    'FUNCTIONAL_LIMITATION',
    'OPERATIONAL_LOCKDOWN',
    'SUSPENSION',
  ]);
  assert.equal(overdue.evidence.dashboardVisible, true);
  assert.equal(overdue.evidence.dataDestroyed, false);
});
