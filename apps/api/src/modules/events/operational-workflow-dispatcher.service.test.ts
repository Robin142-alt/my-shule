import assert from 'node:assert/strict';
import test from 'node:test';

import { ForbiddenException, GoneException } from '@nestjs/common';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { OperationalWorkflowDispatcherController } from './operational-workflow-dispatcher.controller';
import { OperationalWorkflowDispatcherService } from './operational-workflow-dispatcher.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('OperationalWorkflowDispatcherService exposes principal action catalog with executable workflow bindings', () => {
  const service = new OperationalWorkflowDispatcherService(
    new RequestContextService(),
    { publish: async () => ({ id: 'unused' }) } as never,
  );

  const catalog = service.getPrincipalCatalog();

  assert.equal(catalog.operationalization.score, 100);
  assert.equal(catalog.operationalization.executionAnswer, 'ACTIONABLE');
  assert.ok(catalog.actions.some((action) => action.actionId === 'approve-results'));
  assert.ok(catalog.actions.every((action) => action.executionHandler));
  assert.ok(catalog.actions.every((action) => action.fallbackHandler));
  assert.ok(catalog.actions.every((action) => action.emittedEvents.length > 0));
});

test('OperationalWorkflowDispatcherService dispatches a governed action through the outbox event bus', async () => {
  const requestContext = new RequestContextService();
  const publishedInputs: Record<string, unknown>[] = [];
  const service = new OperationalWorkflowDispatcherService(
    requestContext,
    {
      publish: async (input: Record<string, unknown>) => {
        publishedInputs.push(input);
        return {
          id: 'event-1',
          event_name: input.event_name,
          aggregate_id: input.aggregate_id,
        };
      },
    } as never,
  );

  await requestContext.run(buildContext(['exam:execute']), async () => {
    const result = await service.dispatchPrincipalAction('approve-results', {
      aggregateId: 'exam-batch-1',
      payload: { comment: 'Approved after Dean review' },
    });

    assert.equal(result.status, 'DISPATCHED');
    assert.equal(result.eventName, 'workflow.action.dispatched');
    assert.equal(result.workflowBinding, 'exam-release');
    assert.equal(result.executionHandler, 'workflows.examRelease.approve');
    assert.equal(result.eventId, 'event-1');
    assert.deepEqual(result.widgetRefresh.events, ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED']);
  });

  const recordedEvent = publishedInputs[0];
  assert.ok(recordedEvent);
  assert.equal(recordedEvent.event_name, 'workflow.action.dispatched');
  assert.equal(recordedEvent.aggregate_type, 'operational_workflow');
  assert.match(recordedEvent.aggregate_id as string, UUID_PATTERN);
  const payload = recordedEvent.payload as Record<string, unknown>;
  assert.equal(payload.tenant_id, 'tenant-1');
  assert.equal(payload.aggregate_id, 'exam-batch-1');
  assert.equal(payload.action_id, 'approve-results');
  assert.equal(payload.audit_action, 'audit.approve-results');
  assert.deepEqual(payload.emitted_events, ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED']);
});

test('OperationalWorkflowDispatcherService blocks unauthorized actions before event emission', async () => {
  const requestContext = new RequestContextService();
  let published = false;
  const service = new OperationalWorkflowDispatcherService(
    requestContext,
    {
      publish: async () => {
        published = true;
        return { id: 'event-1' };
      },
    } as never,
  );

  await requestContext.run(buildContext([]), async () => {
    await assert.rejects(
      () => service.dispatchPrincipalAction('approve-results', { aggregateId: 'exam-batch-1' }),
      ForbiddenException,
    );
  });

  assert.equal(published, false);
});

test('OperationalWorkflowDispatcherService dispatches runtime role actions from dashboard contracts', async () => {
  const requestContext = new RequestContextService();
  const publishedInputs: Record<string, unknown>[] = [];
  const service = new OperationalWorkflowDispatcherService(
    requestContext,
    {
      publish: async (input: Record<string, unknown>) => {
        publishedInputs.push(input);
        return {
          id: 'event-runtime-1',
          event_name: input.event_name,
          aggregate_id: input.aggregate_id,
        };
      },
    } as never,
  );

  await requestContext.run(buildContext(['platform:operational-execute']), async () => {
    const result = await service.dispatchRuntimeRoleAction(
      'class-teacher',
      'class-teacher-attendance-submit',
      {
        aggregateId: 'attendance-queue-1',
        payload: {
          runtimeActionContract: {
            label: 'Submit Attendance',
            capability: 'CAN_SUBMIT_ATTENDANCE',
            workflowBinding: 'Attendance Draft -> Validated -> Submitted',
            executionHandler: 'workflows.class-teacher.attendance.submit',
            eventContract: ['SUBMIT_ATTENDANCE_REQUESTED'],
            auditEvent: 'audit.class-teacher.submit-attendance',
            retryPolicy: 'RETRY',
            fallbackHandler: 'fallback.class-teacher.submit-attendance',
          },
        },
      },
    );

    assert.equal(result.status, 'DISPATCHED');
    assert.equal(result.eventName, 'workflow.action.dispatched');
    assert.equal(result.workflowBinding, 'Attendance Draft -> Validated -> Submitted');
    assert.equal(result.executionHandler, 'workflows.class-teacher.attendance.submit');
    assert.deepEqual(result.widgetRefresh.events, ['SUBMIT_ATTENDANCE_REQUESTED']);
  });

  const recordedEvent = publishedInputs[0];
  assert.ok(recordedEvent);
  assert.equal(recordedEvent.event_name, 'workflow.action.dispatched');
  const payload = recordedEvent.payload as Record<string, unknown>;
  assert.equal(payload.role, 'class-teacher');
  assert.equal(payload.action_id, 'class-teacher-attendance-submit');
  assert.equal(payload.capability_required, 'CAN_SUBMIT_ATTENDANCE');
  assert.equal(payload.audit_action, 'audit.class-teacher.submit-attendance');
});

test('OperationalWorkflowDispatcherController disables the legacy split-brain approval decision route', () => {
  const requestContext = new RequestContextService();
  const controller = new OperationalWorkflowDispatcherController(
    {} as never,
    requestContext,
    {} as never,
  );

  assert.throws(
    () => controller.decideApproval(
      '00000000-0000-4000-8000-000000000410',
      { decision: 'APPROVED', decision_note: 'Must use the canonical workflow' },
    ),
    (error: unknown) => {
      assert.ok(error instanceof GoneException);
      assert.deepEqual(error.getResponse(), {
        code: 'LEGACY_APPROVAL_ROUTE_DISABLED',
        message: 'This legacy approval route is disabled. Use the canonical approval approve or reject route.',
        canonical_routes: [
          'POST /approvals/:id/approve',
          'POST /approvals/:id/reject',
        ],
      });
      return true;
    },
  );
});

test('OperationalWorkflowDispatcherController reads offline sync metrics with a slug tenant boundary', async () => {
  const requestContext = new RequestContextService();
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const controller = new OperationalWorkflowDispatcherController(
    {} as never,
    requestContext,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rows: [{ count: 7 }], rowCount: 1 };
      },
    } as never,
  );

  await requestContext.run(
    { ...buildContext(['platform:operational-execute']), tenant_id: 'kibabi-high' },
    async () => {
      assert.deepEqual(await controller.getOfflineSync(), {
        pending: 0,
        synced: 7,
        failed: 0,
        conflicts: 0,
        status: 'operational',
      });
    },
  );

  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0]?.params, ['kibabi-high']);
  assert.match(queries[0]?.sql ?? '', /tenant_id::text\s*=\s*\$1::text/i);
  assert.doesNotMatch(queries[0]?.sql ?? '', /\$1::uuid/i);
});

function buildContext(permissions: string[]) {
  return {
    request_id: 'request-1',
    tenant_id: 'tenant-1',
    user_id: 'principal-1',
    role: 'principal',
    session_id: 'session-1',
    permissions,
    is_authenticated: true,
    client_ip: '127.0.0.1',
    user_agent: 'node:test',
    method: 'POST',
    path: '/operational-workflows/principal/actions/approve-results/dispatch',
    started_at: '2026-05-26T00:00:00.000Z',
  };
}
