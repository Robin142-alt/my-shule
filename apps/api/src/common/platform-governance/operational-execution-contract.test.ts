import assert from 'node:assert/strict';
import test from 'node:test';

import { RequestContextService } from '../request-context/request-context.service';
import { AutoRepairService } from '../auto-repair/auto-repair.service';
import { ArchitectureRuntimeService } from './architecture-runtime.controller';
import {
  createPrincipalOperationalCommandCenter,
  evaluateOperationalExecutionContract,
  type OperationalDashboardContract,
} from './operational-execution-contract';

test('OperationalExecutionContract accepts dashboards where every surface is an executable workflow node', () => {
  const report = evaluateOperationalExecutionContract(createPrincipalOperationalCommandCenter());

  assert.equal(report.status, 'pass');
  assert.equal(report.score, 100);
  assert.deepEqual(report.violations, []);
  assert.equal(report.summary.criticalActionNodes, 3);
  assert.equal(report.summary.workflowExecutionNodes, 3);
  assert.equal(report.summary.supportingAnalyticsNodes, 1);
  assert.equal(report.summary.executableActions, 14);
  assert.equal(report.summary.governedForms, 3);
  assert.equal(report.summary.workflowStateMachines, 4);
  assert.equal(report.executionAnswer, 'ACTIONABLE');
});

test('OperationalExecutionContract rejects passive metric-only widgets and dead-end cards', () => {
  const passiveDashboard: OperationalDashboardContract = {
    dashboardId: 'principal-dashboard',
    role: 'principal',
    staticLayout: true,
    sections: [
      {
        sectionId: 'top',
        priority: 'CRITICAL_ACTIONS',
        nodes: [
          {
            nodeId: 'finance.collection-rate',
            nodeType: 'CARD',
            title: 'Fee Collection',
            visible: true,
            primaryQuestion: 'What information exists?',
            actions: [],
            forms: [],
            queues: [],
            workflowBindings: [],
            supportingAnalytics: true,
          },
        ],
      },
    ],
    workflows: [],
  };

  const report = evaluateOperationalExecutionContract(passiveDashboard);

  assert.equal(report.status, 'fail');
  assert.equal(
    report.violations.some((violation) => violation.rule === 'Every operational node must execute workflow logic'),
    true,
  );
  assert.equal(
    report.violations.some((violation) => violation.rule === 'Dashboard must prioritize action requirements'),
    true,
  );
});

test('OperationalExecutionContract rejects decorative buttons without execution handlers, events, retry, and audit', () => {
  const dashboard = createPrincipalOperationalCommandCenter();
  dashboard.sections[0].nodes[0].actions[0] = {
    actionId: 'approve-results',
    label: 'Approve Results',
    capabilityRequirements: ['exams:approve'],
    workflowBinding: 'exam-release',
    executionHandler: null,
    fallbackHandler: null,
    retryPolicy: null,
    emittedEvents: [],
    auditAction: null,
  };

  const report = evaluateOperationalExecutionContract(dashboard);

  assert.equal(report.status, 'fail');
  assert.equal(
    report.violations.some((violation) => violation.rule === 'Buttons must execute real governed logic'),
    true,
  );
  assert.deepEqual(
    report.repairPlan
      .filter((step) => step.target === 'approve-results')
      .map((step) => step.action),
    [
      'BIND_EXECUTION_HANDLER',
      'ATTACH_FALLBACK_HANDLER',
      'ATTACH_RETRY_POLICY',
      'DECLARE_EMITTED_EVENTS',
      'DECLARE_AUDIT_ACTION',
    ],
  );
});

test('OperationalExecutionContract requires explicit workflow state machines with guarded transitions', () => {
  const dashboard = createPrincipalOperationalCommandCenter();
  dashboard.workflows[0].transitions[0].emittedEvent = null;
  dashboard.workflows[0].transitions[1].rollbackAction = null;

  const report = evaluateOperationalExecutionContract(dashboard);

  assert.equal(report.status, 'fail');
  assert.equal(
    report.violations.some((violation) => violation.rule === 'Workflows must be executable state machines'),
    true,
  );
  assert.equal(
    report.repairPlan.some((step) => step.action === 'REPAIR_WORKFLOW_TRANSITION'),
    true,
  );
});

test('Architecture runtime health includes operationalization proof for active command-center behavior', async () => {
  const requestContext = new RequestContextService();
  const service = new ArchitectureRuntimeService(requestContext, new AutoRepairService());

  const health = await requestContext.run(
    {
      request_id: 'req-operational-health',
      tenant_id: 'tenant-alpha',
      user_id: '00000000-0000-4000-8000-000000000001',
      role: 'principal',
      session_id: 'session-operational-health',
      permissions: ['platform:auto-repair'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/platform-governance/runtime-health',
      started_at: '2026-05-26T18:00:00.000Z',
    },
    () => service.getRuntimeHealth(),
  );

  assert.equal(health.operationalization.status, 'pass');
  assert.equal(health.operationalization.score, 100);
  assert.equal(health.operationalization.executionAnswer, 'ACTIONABLE');
});
