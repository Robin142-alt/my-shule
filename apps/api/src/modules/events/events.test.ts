import assert from 'node:assert/strict';
import test from 'node:test';
import { PATH_METADATA } from '@nestjs/common/constants';
import { firstValueFrom, take, toArray } from 'rxjs';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { DashboardRealtimeController } from './dashboard-realtime.controller';
import { DashboardRealtimeService } from './dashboard-realtime.service';
import { EventConsumerRegistryService } from './event-consumer-registry.service';
import { EventConsumerService } from './event-consumer.service';
import { EventPublisherService } from './event-publisher.service';
import { SchoolOperationalEventsController } from './school-operational-events.controller';
import { SchoolOperationalEventsService } from './school-operational-events.service';
import {
  DashboardRealtimeSnapshot,
  DomainEvent,
  PaymentCompletedPayload,
  SchoolOperationRecordedPayload,
  WorkflowActionDispatchedPayload,
} from './events.types';

test('EventPublisherService writes student.created events with request headers', async () => {
  const requestContext = new RequestContextService();
  let publishedEvent: Record<string, unknown> | null = null;
  const service = new EventPublisherService(requestContext, {
    createEvent: async (input: Record<string, unknown>) => {
      publishedEvent = input;
      return {
        id: 'event-1',
        tenant_id: input.tenant_id,
        event_key: input.event_key,
        event_name: input.event_name,
        aggregate_type: input.aggregate_type,
        aggregate_id: input.aggregate_id,
        payload: input.payload,
        headers: input.headers,
        status: 'pending',
        attempt_count: 0,
        available_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
        published_at: null,
        last_error: null,
        created_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
        updated_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
      };
    },
  } as never);

  await requestContext.run(
    {
      request_id: 'req-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'owner',
      session_id: 'session-1',
      permissions: ['*:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/events/student-created',
      started_at: '2026-04-26T00:00:00.000Z',
    },
    () =>
      service.publishStudentCreated({
        tenant_id: 'tenant-a',
        student_id: '00000000-0000-0000-0000-000000000101',
        created_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
        created_by_user_id: '00000000-0000-0000-0000-000000000001',
        admission_number: 'ADM-1001',
      }),
  );

  assert.ok(publishedEvent);
  const writtenEvent = publishedEvent as Record<string, unknown>;

  assert.equal(writtenEvent.tenant_id, 'tenant-a');
  assert.equal(
    writtenEvent.event_key,
    'student.created:00000000-0000-0000-0000-000000000101',
  );
  assert.equal(writtenEvent.event_name, 'student.created');
  assert.equal(writtenEvent.aggregate_type, 'student');
  assert.equal(
    writtenEvent.aggregate_id,
    '00000000-0000-0000-0000-000000000101',
  );
  assert.deepEqual(writtenEvent.payload, {
    tenant_id: 'tenant-a',
    student_id: '00000000-0000-0000-0000-000000000101',
    created_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
    created_by_user_id: '00000000-0000-0000-0000-000000000001',
    admission_number: 'ADM-1001',
  });
  const headers = writtenEvent.headers as Record<string, unknown>;

  assert.equal(headers.request_id, 'req-1');
  assert.equal(headers.trace_id, 'req-1');
  assert.equal(
    headers.user_id,
    '00000000-0000-0000-0000-000000000001',
  );
  assert.equal(headers.role, 'owner');
  assert.equal(headers.session_id, 'session-1');
  assert.equal(typeof headers.span_id, 'string');
  assert.equal(headers.parent_span_id, null);
  assert.equal(writtenEvent.available_at, undefined);
});

test('SchoolOperationalEventsService records frontend school operations inside the current tenant only', async () => {
  const requestContext = new RequestContextService();
  let publishedInput: Record<string, unknown> | null = null;
  const materializedNotifications: Record<string, unknown>[] = [];
  const service = new SchoolOperationalEventsService(requestContext, {
    publish: async (input: Record<string, unknown>) => {
      publishedInput = input;
      return {
        id: 'event-school-operation-1',
        tenant_id: 'tenant-a',
        event_key: input.event_key,
        event_name: input.event_name,
        aggregate_type: input.aggregate_type,
        aggregate_id: input.aggregate_id,
        payload: input.payload,
        headers: input.headers ?? {},
        status: 'pending',
        attempt_count: 0,
        available_at: '2026-05-31T06:30:00.000Z',
        published_at: null,
        last_error: null,
        created_at: '2026-05-31T06:30:00.000Z',
        updated_at: '2026-05-31T06:30:00.000Z',
      };
    },
  } as never, {
    upsertFromSchoolOperation: async (input: Record<string, unknown>) => {
      materializedNotifications.push(input);
    },
  } as never);

  await requestContext.run(
    {
      request_id: 'req-school-operation-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000010',
      role: 'accountant',
      session_id: 'session-school-operation-1',
      permissions: ['auth:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/events/school-operations',
      started_at: '2026-05-31T06:30:00.000Z',
    },
    () =>
      service.recordSchoolOperation({
        schoolId: 'tenant-a',
        event: {
          id: 'event-local-1',
          schoolId: 'tenant-a',
          type: 'FEE_REVERSAL_REQUESTED',
          module: 'finance',
          actorRole: 'accountant',
          title: 'Fee reversal requested',
          body: 'Receipt KBI-RCPT-400 needs approval.',
          entityId: 'approval-400',
          severity: 'warning',
          payload: { amount: 'KSh 4,500' },
          createdAt: '2026-05-31T06:30:00.000Z',
        },
        notifications: [
          {
            id: 'notification-local-1',
            schoolId: 'tenant-a',
            title: 'Fee reversal requested',
            body: 'Receipt KBI-RCPT-400 needs approval.',
            audienceRoles: ['principal', 'deputy-principal'],
            priority: 'urgent',
            sourceModule: 'finance',
            relatedModule: 'finance',
            relatedRecordId: 'approval-400',
            read: false,
            createdAt: '2026-05-31T06:30:00.000Z',
          },
        ],
        sms: [],
      }),
  );

  assert.ok(publishedInput);
  const writtenEvent = publishedInput as Record<string, unknown>;
  assert.equal(writtenEvent.tenant_id, 'tenant-a');
  assert.equal(writtenEvent.event_name, 'school.operation.recorded');
  assert.equal(writtenEvent.aggregate_type, 'school_operation');
  assert.equal(
    writtenEvent.event_key,
    'school.operation.recorded:tenant-a:event-local-1',
  );
  assert.deepEqual(writtenEvent.headers, {
    source: 'web.dashboard',
    frontend_event_id: 'event-local-1',
    source_module: 'finance',
    actor_role: 'accountant',
  });

  const payload = writtenEvent.payload as SchoolOperationRecordedPayload;
  assert.equal(payload.tenant_id, 'tenant-a');
  assert.equal(payload.school_id, 'tenant-a');
  assert.equal(payload.operation_id, 'event-local-1');
  assert.equal(payload.module, 'finance');
  assert.equal(payload.entity_id, 'approval-400');
  assert.deepEqual(payload.target_roles, ['principal', 'deputy-principal']);
  assert.deepEqual(materializedNotifications, [
    {
      tenantId: 'tenant-a',
      operationId: 'event-local-1',
      notification: {
        id: 'notification-local-1',
        schoolId: 'tenant-a',
        title: 'Fee reversal requested',
        body: 'Receipt KBI-RCPT-400 needs approval.',
        audienceRoles: ['principal', 'deputy-principal'],
        priority: 'urgent',
        sourceModule: 'finance',
        relatedModule: 'finance',
        relatedRecordId: 'approval-400',
        read: false,
        createdAt: '2026-05-31T06:30:00.000Z',
      },
    },
  ]);
});

test('SchoolOperationalEventsService rejects school operations posted to another tenant', async () => {
  const requestContext = new RequestContextService();
  const service = new SchoolOperationalEventsService(requestContext, {
    publish: async () => {
      throw new Error('publish should not be called for cross-tenant data');
    },
  } as never, {
    upsertFromSchoolOperation: async () => {
      throw new Error('notification materialization should not be called for cross-tenant data');
    },
  } as never);

  await assert.rejects(
    requestContext.run(
      {
        request_id: 'req-school-operation-2',
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-0000-0000-000000000010',
        role: 'accountant',
        session_id: 'session-school-operation-2',
        permissions: ['auth:read'],
        is_authenticated: true,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
        method: 'POST',
        path: '/events/school-operations',
        started_at: '2026-05-31T06:35:00.000Z',
      },
      () =>
        service.recordSchoolOperation({
          schoolId: 'tenant-b',
          event: {
            id: 'event-local-2',
            schoolId: 'tenant-b',
            type: 'FEE_REVERSAL_REQUESTED',
            module: 'finance',
            actorRole: 'accountant',
            title: 'Fee reversal requested',
            body: 'Cross-school request should fail.',
            createdAt: '2026-05-31T06:35:00.000Z',
          },
          notifications: [],
          sms: [],
        }),
    ),
    /does not match the current school/,
  );
});

test('SchoolOperationNotificationsRepository lists unread notifications for the current tenant role', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const { SchoolOperationNotificationsRepository } = await import(
    './repositories/school-operation-notifications.repository'
  );
  const repository = new SchoolOperationNotificationsRepository({
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      return {
        rows: [
          {
            id: '00000000-0000-4000-8000-000000000401',
            notification_key: 'school-operation:event-local-1:notification-local-1',
            type: 'school.operation.recorded',
            title: 'Fee reversal requested',
            body: 'Receipt KBI-RCPT-400 needs approval.',
            status: 'unread',
            read_at: null,
            metadata: {
              priority: 'urgent',
              sourceModule: 'finance',
              relatedModule: 'finance',
              relatedRecordId: 'approval-400',
              target_roles: ['principal', 'deputy-principal'],
            },
            created_at: '2026-05-31T06:30:00.000Z',
            updated_at: '2026-05-31T06:30:00.000Z',
          },
        ],
      };
    },
  } as never);

  const result = await repository.listForTenantRole('tenant-a', 'principal', {
    limit: 8,
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /FROM notifications/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /target_roles/);
  assert.match(queries[0].sql, /LIMIT \$3::integer/);
  assert.deepEqual(queries[0].values, ['tenant-a', 'principal', 8]);
  assert.deepEqual(result, [
    {
      id: '00000000-0000-4000-8000-000000000401',
      title: 'Fee reversal requested',
      detail: 'Receipt KBI-RCPT-400 needs approval.',
      status: 'unread',
      tone: 'critical',
      href: '/finance?record=approval-400',
      sourceModule: 'finance',
      relatedModule: 'finance',
      relatedRecordId: 'approval-400',
      createdAt: '2026-05-31T06:30:00.000Z',
      readAt: null,
    },
  ]);
});

test('SchoolOperationNotificationsRepository marks only tenant-role visible notifications as read', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const { SchoolOperationNotificationsRepository } = await import(
    './repositories/school-operation-notifications.repository'
  );
  const repository = new SchoolOperationNotificationsRepository({
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      return {
        rows: [
          {
            id: '00000000-0000-4000-8000-000000000401',
            notification_key: 'school-operation:event-local-1:notification-local-1',
            type: 'school.operation.recorded',
            title: 'Fee reversal requested',
            body: 'Receipt KBI-RCPT-400 needs approval.',
            status: 'read',
            read_at: '2026-05-31T06:45:00.000Z',
            metadata: {
              priority: 'urgent',
              sourceModule: 'finance',
              relatedModule: 'finance',
              relatedRecordId: 'approval-400',
              target_roles: ['principal', 'deputy-principal'],
            },
            created_at: '2026-05-31T06:30:00.000Z',
            updated_at: '2026-05-31T06:45:00.000Z',
          },
        ],
      };
    },
  } as never);

  const result = await repository.markReadForTenantRole(
    'tenant-a',
    'principal',
    '00000000-0000-4000-8000-000000000401',
  );

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /UPDATE notifications/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /id = \$2::uuid/);
  assert.match(queries[0].sql, /target_roles/);
  assert.deepEqual(queries[0].values, [
    'tenant-a',
    '00000000-0000-4000-8000-000000000401',
    'principal',
  ]);
  assert.equal(result?.status, 'read');
  assert.equal(result?.readAt, '2026-05-31T06:45:00.000Z');
});

test('SchoolOperationalEventsService exposes notification inbox and read updates in the current school context', async () => {
  const requestContext = new RequestContextService();
  const repositoryCalls: Array<Record<string, unknown>> = [];
  const service = new SchoolOperationalEventsService(requestContext, {
    publish: async () => {
      throw new Error('publish should not be called while reading notifications');
    },
  } as never, {
    upsertFromSchoolOperation: async () => undefined,
    listForTenantRole: async (tenantId: string, role: string, options: { limit: number }) => {
      repositoryCalls.push({ action: 'list', tenantId, role, limit: options.limit });
      return [
        {
          id: 'notification-1',
          title: 'Store request approved',
          detail: 'Two boxes of chalk are ready for collection.',
          status: 'unread',
          tone: 'ok',
          href: '/inventory?record=stock-request-44',
          sourceModule: 'inventory',
          relatedModule: 'inventory',
          relatedRecordId: 'stock-request-44',
          createdAt: '2026-05-31T07:00:00.000Z',
          readAt: null,
        },
      ];
    },
    markReadForTenantRole: async (tenantId: string, role: string, notificationId: string) => {
      repositoryCalls.push({ action: 'mark-read', tenantId, role, notificationId });
      return {
        id: notificationId,
        title: 'Store request approved',
        detail: 'Two boxes of chalk are ready for collection.',
        status: 'read',
        tone: 'ok',
        href: '/inventory?record=stock-request-44',
        sourceModule: 'inventory',
        relatedModule: 'inventory',
        relatedRecordId: 'stock-request-44',
        createdAt: '2026-05-31T07:00:00.000Z',
        readAt: '2026-05-31T07:05:00.000Z',
      };
    },
  } as never);

  const result = await requestContext.run(
    {
      request_id: 'req-notification-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000010',
      role: 'teacher',
      session_id: 'session-notification-1',
      permissions: ['auth:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/events/notifications',
      started_at: '2026-05-31T07:00:00.000Z',
    },
    async () => ({
      inbox: await service.listCurrentTenantNotifications({ limit: 8 }),
      read: await service.markCurrentTenantNotificationRead('notification-1'),
    }),
  );

  assert.deepEqual(repositoryCalls, [
    { action: 'list', tenantId: 'tenant-a', role: 'teacher', limit: 8 },
    { action: 'mark-read', tenantId: 'tenant-a', role: 'teacher', notificationId: 'notification-1' },
  ]);
  assert.equal(result.inbox.data[0].title, 'Store request approved');
  assert.equal(result.read.data.status, 'read');
});

test('EventConsumerService skips already-completed consumers', async () => {
  const requestContext = new RequestContextService();
  let consumerInvocations = 0;
  const event: DomainEvent<'student.created'> = {
    id: 'event-1',
    tenant_id: 'tenant-a',
    event_key: 'student.created:student-1',
    event_name: 'student.created',
    aggregate_type: 'student',
    aggregate_id: '00000000-0000-0000-0000-000000000111',
    payload: {
      tenant_id: 'tenant-a',
      student_id: '00000000-0000-0000-0000-000000000111',
      created_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
      created_by_user_id: null,
    },
    headers: {
      request_id: 'req-1',
    },
    status: 'processing',
    attempt_count: 1,
    available_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
    published_at: null,
    last_error: null,
    created_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
    updated_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
  };
  const consumer = {
    name: 'student-created.audit',
    event_name: 'student.created' as const,
    handle: async (): Promise<void> => {
      consumerInvocations += 1;
    },
  };
  const service = new EventConsumerService(
    {
      get: (key: string): number | undefined => {
        if (key === 'events.retryDelayMs') {
          return 5000;
        }

        if (key === 'events.maxAttempts') {
          return 25;
        }

        return undefined;
      },
    } as never,
    requestContext,
    {
      withRequestTransaction: async <T>(callback: () => Promise<T>): Promise<T> => callback(),
    } as never,
    {
      findById: async (): Promise<DomainEvent> => event,
      markPublished: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
    } as never,
    {
      acquireRun: async () => ({
        id: 'run-1',
        tenant_id: 'tenant-a',
        outbox_event_id: event.id,
        event_key: event.event_key,
        consumer_name: consumer.name,
        status: 'completed' as const,
        attempt_count: 1,
        last_error: null,
        processed_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
        created_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
        updated_at: new Date('2026-04-26T00:00:00.000Z').toISOString(),
      }),
      markAttempt: async (): Promise<void> => undefined,
      markCompleted: async (): Promise<void> => undefined,
      markFailed: async (): Promise<void> => undefined,
    } as never,
    {
      getConsumersForEvent: () => [consumer],
    } as unknown as EventConsumerRegistryService,
  );

  await service.consume({
    outbox_event_id: event.id,
    tenant_id: event.tenant_id,
    request_id: 'req-1',
  });

  assert.equal(consumerInvocations, 0);
});

test('DashboardRealtimeService maps outbox domain events into dashboard envelopes', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event: DomainEvent<'payment.completed'> = {
    id: 'event-payment-1',
    tenant_id: 'tenant-a',
    event_key: 'payment.completed:payment-1',
    event_name: 'payment.completed',
    aggregate_type: 'payment',
    aggregate_id: '00000000-0000-0000-0000-000000000901',
    payload: {
      tenant_id: 'tenant-a',
      payment_intent_id: '00000000-0000-0000-0000-000000000901',
      mpesa_transaction_id: 'mpesa-1',
      checkout_request_id: 'checkout-1',
      merchant_request_id: 'merchant-1',
      ledger_transaction_id: 'ledger-1',
      amount_minor: '120000',
      currency_code: 'KES',
      account_reference: 'ADM-1001',
      external_reference: null,
      mpesa_receipt_number: 'RCP123',
      phone_number: '+254700000000',
      completed_at: '2026-05-25T08:30:00.000Z',
    } satisfies PaymentCompletedPayload,
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-25T08:30:00.000Z',
    published_at: '2026-05-25T08:30:01.000Z',
    last_error: null,
    created_at: '2026-05-25T08:30:00.000Z',
    updated_at: '2026-05-25T08:30:01.000Z',
  };

  const dashboardEvent = service.toDashboardEvent(event, {
    enabledModules: ['finance'],
    permissions: ['finance:read'],
  });

  assert.deepEqual(dashboardEvent, {
    id: 'event-payment-1',
    type: 'FEE_PAYMENT_COMPLETED',
    tenantId: 'tenant-a',
    sourceModule: 'finance',
    entityId: '00000000-0000-0000-0000-000000000901',
    occurredAt: '2026-05-25T08:30:00.000Z',
    payload: event.payload,
    channels: ['tenant:tenant-a', 'module:finance', 'role:bursar', 'role:accountant', 'role:principal'],
    notification: {
      id: 'notification:event-payment-1',
      eventType: 'FEE_PAYMENT_COMPLETED',
      title: 'Fee payment completed',
      body: 'KES 1200 received for ADM-1001.',
      tone: 'ok',
      targetChannels: ['module:finance', 'role:bursar', 'role:accountant', 'role:principal'],
      createdAt: '2026-05-25T08:30:00.000Z',
    },
  });
});

test('DashboardRealtimeService maps operational workflow dispatches into command-center notifications', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event: DomainEvent<'workflow.action.dispatched'> = {
    id: 'event-workflow-1',
    tenant_id: 'tenant-a',
    event_key: 'workflow.action.dispatched:tenant-a:req-1:approve-results',
    event_name: 'workflow.action.dispatched',
    aggregate_type: 'operational_workflow',
    aggregate_id: '00000000-0000-4000-8000-000000000777',
    payload: {
      tenant_id: 'tenant-a',
      command_id: 'req-1',
      dashboard_id: 'principal-dashboard',
      role: 'principal',
      node_id: 'results.awaiting-approval',
      action_id: 'approve-results',
      workflow_id: 'exam-release',
      execution_handler: 'workflows.examRelease.approve',
      fallback_handler: 'fallback.workflows.examRelease.approve',
      retry_policy: {
        maxAttempts: 3,
        backoff: 'exponential',
      },
      emitted_events: ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED'],
      audit_action: 'audit.approve-results',
      aggregate_id: 'exam-batch-1',
      requested_by_user_id: 'principal-1',
      requested_at: '2026-05-26T00:00:00.000Z',
      payload: { comment: 'Approved after Dean review' },
    } satisfies WorkflowActionDispatchedPayload,
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-26T00:00:00.000Z',
    published_at: '2026-05-26T00:00:01.000Z',
    last_error: null,
    created_at: '2026-05-26T00:00:00.000Z',
    updated_at: '2026-05-26T00:00:01.000Z',
  };

  const dashboardEvent = service.toDashboardEvent(event, {
    enabledModules: [],
    permissions: ['platform:operational-execute'],
  });

  assert.equal(dashboardEvent?.type, 'WORKFLOW_ACTION_DISPATCHED');
  assert.equal(dashboardEvent?.sourceModule, 'platform');
  assert.equal(dashboardEvent?.entityId, 'exam-batch-1');
  assert.ok(dashboardEvent?.channels.includes('role:principal'));
  assert.equal(dashboardEvent?.notification.title, 'Workflow action dispatched');
  assert.equal(
    dashboardEvent?.notification.body,
    'approve-results dispatched through exam-release.',
  );
  assert.equal(dashboardEvent?.notification.tone, 'info');
});

test('DashboardRealtimeService maps operational workflow completion receipts into command-center notifications', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event: DomainEvent<'workflow.action.completed'> = {
    id: 'event-workflow-completed-1',
    tenant_id: 'tenant-a',
    event_key: 'workflow.action.completed:tenant-a:req-1:approve-results',
    event_name: 'workflow.action.completed',
    aggregate_type: 'operational_workflow',
    aggregate_id: '00000000-0000-4000-8000-000000000777',
    payload: {
      tenant_id: 'tenant-a',
      command_id: 'req-1',
      dashboard_id: 'principal-dashboard',
      role: 'principal',
      node_id: 'results.awaiting-approval',
      action_id: 'approve-results',
      workflow_id: 'exam-release',
      execution_handler: 'workflows.examRelease.approve',
      aggregate_id: 'exam-batch-1',
      completed_at: '2026-05-26T00:00:02.000Z',
      emitted_events: ['RESULTS_APPROVED', 'PRINCIPAL_APPROVAL_GRANTED'],
      audit_action: 'audit.approve-results',
      status: 'COMPLETED',
      payload: { comment: 'Approved after Dean review' },
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-26T00:00:02.000Z',
    published_at: '2026-05-26T00:00:03.000Z',
    last_error: null,
    created_at: '2026-05-26T00:00:02.000Z',
    updated_at: '2026-05-26T00:00:03.000Z',
  };

  const dashboardEvent = service.toDashboardEvent(event, {
    enabledModules: [],
    permissions: ['platform:operational-execute'],
  });

  assert.equal(dashboardEvent?.type, 'WORKFLOW_ACTION_COMPLETED');
  assert.equal(dashboardEvent?.sourceModule, 'platform');
  assert.equal(dashboardEvent?.entityId, 'exam-batch-1');
  assert.ok(dashboardEvent?.channels.includes('role:principal'));
  assert.equal(dashboardEvent?.notification.title, 'Workflow action completed');
  assert.equal(
    dashboardEvent?.notification.body,
    'approve-results completed through exam-release.',
  );
  assert.equal(dashboardEvent?.notification.tone, 'ok');
});

test('DashboardRealtimeService maps frontend school operations into role-specific updates', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event: DomainEvent<'school.operation.recorded'> = {
    id: 'event-school-operation-dashboard-1',
    tenant_id: 'tenant-a',
    event_key: 'school.operation.recorded:tenant-a:event-local-1',
    event_name: 'school.operation.recorded',
    aggregate_type: 'school_operation',
    aggregate_id: '00000000-0000-4000-8000-000000000778',
    payload: {
      tenant_id: 'tenant-a',
      school_id: 'tenant-a',
      operation_id: 'event-local-1',
      operation_type: 'FEE_REVERSAL_REQUESTED',
      module: 'finance',
      actor_role: 'accountant',
      title: 'Fee reversal requested',
      body: 'Receipt KBI-RCPT-400 needs approval.',
      entity_id: 'approval-400',
      severity: 'warning',
      target_roles: ['principal', 'deputy-principal'],
      notifications: [],
      sms: [],
      payload: { amount: 'KSh 4,500' },
      occurred_at: '2026-05-31T06:30:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 0,
    available_at: '2026-05-31T06:30:00.000Z',
    published_at: '2026-05-31T06:30:01.000Z',
    last_error: null,
    created_at: '2026-05-31T06:30:00.000Z',
    updated_at: '2026-05-31T06:30:01.000Z',
  };

  const dashboardEvent = service.toDashboardEvent(event, {
    enabledModules: ['finance'],
    permissions: ['finance:read'],
  });

  assert.equal(dashboardEvent?.type, 'SCHOOL_OPERATION_RECORDED');
  assert.equal(dashboardEvent?.sourceModule, 'finance');
  assert.equal(dashboardEvent?.entityId, 'approval-400');
  assert.ok(dashboardEvent?.channels.includes('tenant:tenant-a'));
  assert.ok(dashboardEvent?.channels.includes('module:finance'));
  assert.ok(dashboardEvent?.channels.includes('role:principal'));
  assert.ok(dashboardEvent?.channels.includes('role:deputy-principal'));
  assert.equal(dashboardEvent?.notification.title, 'Fee reversal requested');
  assert.equal(
    dashboardEvent?.notification.body,
    'Receipt KBI-RCPT-400 needs approval.',
  );
  assert.equal(dashboardEvent?.notification.tone, 'warning');
});

test('DashboardRealtimeService suppresses disabled modules and permission mismatches', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event = {
    id: 'event-exam-1',
    tenant_id: 'tenant-a',
    event_key: 'exam.submitted:exam-1',
    event_name: 'exam.submitted',
    aggregate_type: 'exam',
    aggregate_id: '00000000-0000-0000-0000-000000000911',
    payload: {
      tenant_id: 'tenant-a',
      exam_id: '00000000-0000-0000-0000-000000000911',
      exam_name: 'Form 2 Midterm',
      class_name: 'Form 2',
      stream_name: 'North',
      submitted_by_user_id: '00000000-0000-0000-0000-000000000001',
      submitted_at: '2026-05-25T09:00:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-25T09:00:00.000Z',
    published_at: '2026-05-25T09:00:01.000Z',
    last_error: null,
    created_at: '2026-05-25T09:00:00.000Z',
    updated_at: '2026-05-25T09:00:01.000Z',
  } as DomainEvent<'exam.submitted'>;

  assert.equal(service.toDashboardEvent(event, {
    enabledModules: ['finance'],
    permissions: ['exams:review'],
  }), null);

  assert.equal(service.toDashboardEvent(event, {
    enabledModules: ['exams'],
    permissions: ['finance:read'],
  }), null);
});

test('DashboardRealtimeService accepts module wildcard permissions', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event: DomainEvent<'payment.completed'> = {
    id: 'event-payment-wildcard',
    tenant_id: 'tenant-a',
    event_key: 'payment.completed:payment-wildcard',
    event_name: 'payment.completed',
    aggregate_type: 'payment',
    aggregate_id: '00000000-0000-4000-8000-000000000905',
    payload: {
      tenant_id: 'tenant-a',
      payment_intent_id: '00000000-0000-4000-8000-000000000905',
      mpesa_transaction_id: 'mpesa-wildcard',
      checkout_request_id: 'checkout-wildcard',
      merchant_request_id: 'merchant-wildcard',
      ledger_transaction_id: 'ledger-wildcard',
      amount_minor: '50000',
      currency_code: 'KES',
      account_reference: 'ADM-1005',
      external_reference: null,
      mpesa_receipt_number: 'RCP125',
      phone_number: '+254722222222',
      completed_at: '2026-05-25T08:45:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-25T08:45:00.000Z',
    published_at: '2026-05-25T08:45:01.000Z',
    last_error: null,
    created_at: '2026-05-25T08:45:00.000Z',
    updated_at: '2026-05-25T08:45:01.000Z',
  };

  const dashboardEvent = service.toDashboardEvent(event, {
    enabledModules: ['finance'],
    permissions: ['finance:*'],
  });

  assert.equal(dashboardEvent?.type, 'FEE_PAYMENT_COMPLETED');
});

test('OutboxEventsRepository reads dashboard stream events with tenant cursor and limit', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const { OutboxEventsRepository } = await import('./repositories/outbox-events.repository');
  const repository = new OutboxEventsRepository({
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      return { rows: [] };
    },
  } as never);

  await repository.listDashboardStreamEvents('tenant-a', {
    since: '2026-05-25T08:00:00.000Z',
    limit: 25,
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /FROM outbox_events/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /status = 'published'/);
  assert.match(queries[0].sql, /created_at > \$2::timestamptz/);
  assert.match(queries[0].sql, /LIMIT \$4::integer/);
  assert.deepEqual(queries[0].values, ['tenant-a', '2026-05-25T08:00:00.000Z', null, 25]);
});

test('OutboxEventsRepository reads dashboard stream events with stable composite cursor', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const { OutboxEventsRepository } = await import('./repositories/outbox-events.repository');
  const repository = new OutboxEventsRepository({
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      return { rows: [] };
    },
  } as never);

  await repository.listDashboardStreamEvents('tenant-a', {
    since: '2026-05-25T08:00:00.000Z|00000000-0000-4000-8000-000000000999',
    limit: 25,
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /\(created_at, id\) > \(\$2::timestamptz, \$3::uuid\)/);
  assert.match(queries[0].sql, /ORDER BY created_at ASC,\s+id ASC/);
  assert.deepEqual(queries[0].values, [
    'tenant-a',
    '2026-05-25T08:00:00.000Z',
    '00000000-0000-4000-8000-000000000999',
    25,
  ]);
});

test('OutboxEventsRepository normalizes invalid dashboard stream cursor and limit', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const { OutboxEventsRepository } = await import('./repositories/outbox-events.repository');
  const repository = new OutboxEventsRepository({
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      return { rows: [] };
    },
  } as never);

  await repository.listDashboardStreamEvents('tenant-a', {
    since: 'not-a-timestamp|not-a-uuid',
    limit: Number.NaN,
  });

  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].values, ['tenant-a', null, null, 50]);
});

test('DashboardRealtimeService advances the SSE cursor between polls', async () => {
  const requestContext = new RequestContextService();
  const sinceValues: Array<string | null | undefined> = [];
  const paymentEvent: DomainEvent<'payment.completed'> = {
    id: 'event-payment-1',
    tenant_id: 'tenant-a',
    event_key: 'payment.completed:payment-1',
    event_name: 'payment.completed',
    aggregate_type: 'payment',
    aggregate_id: '00000000-0000-0000-0000-000000000901',
    payload: {
      tenant_id: 'tenant-a',
      payment_intent_id: '00000000-0000-0000-0000-000000000901',
      mpesa_transaction_id: 'mpesa-1',
      checkout_request_id: 'checkout-1',
      merchant_request_id: 'merchant-1',
      ledger_transaction_id: 'ledger-1',
      amount_minor: '120000',
      currency_code: 'KES',
      account_reference: 'ADM-1001',
      external_reference: null,
      mpesa_receipt_number: 'RCP123',
      phone_number: '+254700000000',
      completed_at: '2026-05-25T08:30:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-25T08:30:00.000Z',
    published_at: '2026-05-25T08:30:01.000Z',
    last_error: null,
    created_at: '2026-05-25T08:30:00.000Z',
    updated_at: '2026-05-25T08:30:01.000Z',
  };
  const service = new DashboardRealtimeService(
    requestContext,
    {
      listDashboardStreamEvents: async (
        _tenantId: string,
        options: { since?: string | null },
      ) => {
        sinceValues.push(options.since);
        return options.since ? [] : [paymentEvent];
      },
    } as never,
    {
      listCurrentTenantModules: async () => ['finance'],
    } as never,
    {
      get: () => 1000,
    } as never,
  );

  const emissions = await requestContext.run(
    {
      request_id: 'req-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'accountant',
      session_id: 'session-1',
      permissions: ['finance:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/events/dashboard/stream',
      started_at: '2026-05-25T08:30:00.000Z',
    },
    () => firstValueFrom(service.streamCurrentTenantEvents().pipe(take(2), toArray())),
  );

  assert.deepEqual(sinceValues, [undefined, '2026-05-25T08:30:00.000Z|event-payment-1']);
  const firstSnapshot = emissions[0].data as DashboardRealtimeSnapshot;
  const secondSnapshot = emissions[1].data as DashboardRealtimeSnapshot;

  assert.equal(emissions[0].type, 'dashboard.events');
  assert.equal(emissions[1].type, 'dashboard.events');
  assert.equal(firstSnapshot.cursor, '2026-05-25T08:30:00.000Z|event-payment-1');
  assert.equal(firstSnapshot.events.length, 1);
  assert.equal(secondSnapshot.events.length, 0);
});

test('DashboardRealtimeService advances cursor over filtered outbox events', async () => {
  const requestContext = new RequestContextService();
  const sinceValues: Array<string | null | undefined> = [];
  const hiddenExamEvent = {
    id: 'event-exam-hidden',
    tenant_id: 'tenant-a',
    event_key: 'exam.submitted:exam-hidden',
    event_name: 'exam.submitted',
    aggregate_type: 'exam',
    aggregate_id: '00000000-0000-0000-0000-000000000912',
    payload: {
      tenant_id: 'tenant-a',
      exam_id: '00000000-0000-0000-0000-000000000912',
      exam_name: 'Form 3 Mock',
      class_name: 'Form 3',
      stream_name: 'East',
      submitted_by_user_id: '00000000-0000-0000-0000-000000000001',
      submitted_at: '2026-05-25T10:00:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-25T10:00:00.000Z',
    published_at: '2026-05-25T10:00:01.000Z',
    last_error: null,
    created_at: '2026-05-25T10:00:00.000Z',
    updated_at: '2026-05-25T10:00:01.000Z',
  } as DomainEvent<'exam.submitted'>;
  const service = new DashboardRealtimeService(
    requestContext,
    {
      listDashboardStreamEvents: async (
        _tenantId: string,
        options: { since?: string | null },
      ) => {
        sinceValues.push(options.since);
        return options.since ? [] : [hiddenExamEvent];
      },
    } as never,
    {
      listCurrentTenantModules: async () => ['finance'],
    } as never,
    {
      get: () => 1000,
    } as never,
  );

  const emissions = await requestContext.run(
    {
      request_id: 'req-filtered',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'accountant',
      session_id: 'session-1',
      permissions: ['finance:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/events/dashboard/stream',
      started_at: '2026-05-25T10:00:00.000Z',
    },
    () => firstValueFrom(service.streamCurrentTenantEvents().pipe(take(2), toArray())),
  );

  assert.deepEqual(sinceValues, [undefined, '2026-05-25T10:00:00.000Z|event-exam-hidden']);
  assert.equal((emissions[0].data as DashboardRealtimeSnapshot).events.length, 0);
  assert.equal((emissions[0].data as DashboardRealtimeSnapshot).cursor, '2026-05-25T10:00:00.000Z|event-exam-hidden');
  assert.equal((emissions[1].data as DashboardRealtimeSnapshot).events.length, 0);
});

test('DashboardRealtimeService keeps SSE streams alive after a snapshot error', async () => {
  const requestContext = new RequestContextService();
  let attempts = 0;
  const paymentEvent: DomainEvent<'payment.completed'> = {
    id: 'event-payment-2',
    tenant_id: 'tenant-a',
    event_key: 'payment.completed:payment-2',
    event_name: 'payment.completed',
    aggregate_type: 'payment',
    aggregate_id: '00000000-0000-0000-0000-000000000902',
    payload: {
      tenant_id: 'tenant-a',
      payment_intent_id: '00000000-0000-0000-0000-000000000902',
      mpesa_transaction_id: 'mpesa-2',
      checkout_request_id: 'checkout-2',
      merchant_request_id: 'merchant-2',
      ledger_transaction_id: 'ledger-2',
      amount_minor: '250000',
      currency_code: 'KES',
      account_reference: 'ADM-1002',
      external_reference: null,
      mpesa_receipt_number: 'RCP124',
      phone_number: '+254711111111',
      completed_at: '2026-05-25T08:35:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-05-25T08:35:00.000Z',
    published_at: '2026-05-25T08:35:01.000Z',
    last_error: null,
    created_at: '2026-05-25T08:35:00.000Z',
    updated_at: '2026-05-25T08:35:01.000Z',
  };
  const service = new DashboardRealtimeService(
    requestContext,
    {
      listDashboardStreamEvents: async () => {
        attempts += 1;

        if (attempts === 1) {
          throw new Error('temporary outbox failure');
        }

        return [paymentEvent];
      },
    } as never,
    {
      listCurrentTenantModules: async () => ['finance'],
    } as never,
    {
      get: () => 1000,
    } as never,
  );

  const emissions = await requestContext.run(
    {
      request_id: 'req-2',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'accountant',
      session_id: 'session-1',
      permissions: ['finance:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/events/dashboard/stream',
      started_at: '2026-05-25T08:35:00.000Z',
    },
    () => firstValueFrom(service.streamCurrentTenantEvents().pipe(take(2), toArray())),
  );

  assert.equal(emissions.length, 2);
  assert.equal(emissions[0].type, 'dashboard.events.error');
  assert.deepEqual(emissions[0].data, { message: 'temporary outbox failure' });
  assert.equal(emissions[1].type, 'dashboard.events');
  assert.equal((emissions[1].data as DashboardRealtimeSnapshot).events.length, 1);
});

test('DashboardRealtimeController exposes authenticated snapshot and SSE routes', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, DashboardRealtimeController), 'events/dashboard');

  const snapshotDescriptor = Object.getOwnPropertyDescriptor(
    DashboardRealtimeController.prototype,
    'getDashboardSnapshot',
  );
  const streamDescriptor = Object.getOwnPropertyDescriptor(
    DashboardRealtimeController.prototype,
    'streamDashboardEvents',
  );

  assert.ok(snapshotDescriptor?.value);
  assert.ok(streamDescriptor?.value);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, snapshotDescriptor.value), ['auth:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, streamDescriptor.value), ['auth:read']);
});

test('SchoolOperationalEventsController exposes authenticated operation and notification routes', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, SchoolOperationalEventsController), 'events');

  const recordDescriptor = Object.getOwnPropertyDescriptor(
    SchoolOperationalEventsController.prototype,
    'recordSchoolOperation',
  );
  const listDescriptor = Object.getOwnPropertyDescriptor(
    SchoolOperationalEventsController.prototype,
    'listNotifications',
  );
  const markReadDescriptor = Object.getOwnPropertyDescriptor(
    SchoolOperationalEventsController.prototype,
    'markNotificationRead',
  );

  assert.ok(recordDescriptor?.value);
  assert.ok(listDescriptor?.value);
  assert.ok(markReadDescriptor?.value);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, recordDescriptor.value), ['auth:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, listDescriptor.value), ['auth:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, markReadDescriptor.value), ['auth:read']);
});
