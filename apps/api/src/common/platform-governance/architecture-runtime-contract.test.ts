import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';
import { MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { CommonModule } from '../common.module';
import { RequestContextService } from '../request-context/request-context.service';
import { AutoRepairService } from '../auto-repair/auto-repair.service';
import {
  ArchitectureRuntimeController,
  ArchitectureRuntimeService,
} from './architecture-runtime.controller';
import {
  evaluateArchitectureRuntimeContract,
  type ArchitectureRuntimeContractInput,
} from './architecture-runtime-contract';

const baseRuntimeInput = (): ArchitectureRuntimeContractInput => ({
  runtime: {
    tenantId: 'tenant-alpha',
    userId: '00000000-0000-4000-8000-000000000001',
    role: 'principal',
    lifecycleState: 'ACTIVE',
    billingState: 'PAID',
    enabledModules: ['exams'],
    capabilities: ['exams:review', 'exams:approve'],
    requestId: 'req-architecture-1',
    traceId: 'trace-architecture-1',
  },
  command: {
    commandId: 'command-exam-review',
    tenantId: 'tenant-alpha',
    action: 'exam.review.open',
    capabilityRequired: 'exams:review',
  },
  event: {
    eventId: 'event-exam-submitted',
    tenantId: 'tenant-alpha',
    name: 'exam.submitted',
    aggregateType: 'exam',
    aggregateId: '00000000-0000-4000-8000-000000000101',
    payloadTenantId: 'tenant-alpha',
    emittedAt: '2026-05-26T18:00:00.000Z',
  },
  projection: {
    name: 'dean.pending_reviews',
    tenantId: 'tenant-alpha',
    sourceEventId: 'event-exam-submitted',
    updatedAt: '2026-05-26T18:00:01.000Z',
  },
  widget: {
    widgetId: 'dean.pending_exam_reviews',
    dashboardId: 'dean-academics',
    moduleSource: 'exams',
    state: 'ACTIVE',
    visible: true,
    capabilitiesRequired: ['exams:review'],
    eventSubscriptions: ['exam.submitted'],
  },
  button: {
    actionId: 'dean.approve-exam-batch',
    state: 'ACTIVE',
    visible: true,
    capabilityRequired: 'exams:approve',
    handler: 'workflow.exam.dean-review.approve',
    failurePolicy: 'RETRY',
  },
  audit: {
    tenantId: 'tenant-alpha',
    actorUserId: '00000000-0000-4000-8000-000000000001',
    action: 'exam.review.open',
    eventId: 'event-exam-submitted',
    recordedAt: '2026-05-26T18:00:02.000Z',
  },
});

test('ArchitectureRuntimeContract proves the governed command-to-widget path is executable', () => {
  const report = evaluateArchitectureRuntimeContract(baseRuntimeInput());

  assert.equal(report.status, 'pass');
  assert.equal(report.score, 100);
  assert.deepEqual(report.violations, []);
  assert.deepEqual(
    report.checks.map((check) => check.name),
    [
      'AGP capability validation',
      'Tenant isolation',
      'Event bus mutation record',
      'Projection contract',
      'Widget synchronization',
      'Button execution mapping',
      'Audit binding',
      'Self-healing visibility',
    ],
  );
  assert.equal(report.runtimeEdges.commandToEvent, 'command-exam-review -> exam.submitted');
  assert.equal(report.runtimeEdges.eventToWidget, 'exam.submitted -> dean.pending_exam_reviews');
});

test('ArchitectureRuntimeContract blocks cross-tenant projection drift', () => {
  const input = baseRuntimeInput();
  assert.ok(input.projection);
  input.projection.tenantId = 'tenant-beta';

  const report = evaluateArchitectureRuntimeContract(input);

  assert.equal(report.status, 'fail');
  assert.equal(report.score < 100, true);
  assert.equal(
    report.violations.some((violation) => violation.rule === 'Strict tenant isolation'),
    true,
  );
  assert.equal(
    report.repairPlan.some((step) => step.action === 'QUARANTINE_CROSS_TENANT_STATE'),
    true,
  );
});

test('ArchitectureRuntimeContract degrades broken visible widgets and attaches repair paths instead of hiding them', () => {
  const input = baseRuntimeInput();
  input.widget.state = 'FAILED';
  input.widget.visible = true;
  input.button.state = 'FAILED';
  input.button.handler = null;

  const report = evaluateArchitectureRuntimeContract(input);

  assert.equal(report.status, 'degraded');
  assert.equal(
    report.repairPlan.some((step) => step.action === 'ATTACH_FALLBACK_HANDLER'),
    true,
  );
  assert.equal(
    report.checks.find((check) => check.name === 'Self-healing visibility')?.status,
    'pass',
  );
});

test('CommonModule deploys the executable architecture runtime health surface', async () => {
  const controllers =
    (Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, CommonModule) as Array<{ name?: string }> | undefined) ?? [];
  const providers =
    (Reflect.getMetadata(MODULE_METADATA.PROVIDERS, CommonModule) as Array<{ name?: string }> | undefined) ?? [];
  const exports =
    (Reflect.getMetadata(MODULE_METADATA.EXPORTS, CommonModule) as Array<{ name?: string }> | undefined) ?? [];

  assert.equal(controllers.some((controller) => controller?.name === 'ArchitectureRuntimeController'), true);
  assert.equal(providers.some((provider) => provider?.name === 'ArchitectureRuntimeService'), true);
  assert.equal(exports.some((provider) => provider?.name === 'ArchitectureRuntimeService'), true);
  assert.equal(Reflect.getMetadata(PATH_METADATA, ArchitectureRuntimeController), 'platform-governance');

  const descriptor = Object.getOwnPropertyDescriptor(
    ArchitectureRuntimeController.prototype,
    'getRuntimeHealth',
  );
  assert.ok(descriptor?.value);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, descriptor.value), ['platform:auto-repair']);

  const requestContext = new RequestContextService();
  const service = new ArchitectureRuntimeService(requestContext, new AutoRepairService());
  const runtimeHealth = await requestContext.run(
    {
      request_id: 'req-runtime-health',
      tenant_id: 'tenant-alpha',
      user_id: '00000000-0000-4000-8000-000000000001',
      role: 'principal',
      session_id: 'session-runtime-health',
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

  assert.equal(runtimeHealth.report.status, 'pass');
  assert.equal(runtimeHealth.report.score, 100);
  assert.equal(runtimeHealth.autoRepair.active, true);
  assert.equal(runtimeHealth.endpoint, 'GET /platform-governance/runtime-health');
});
