import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { PATH_METADATA } from '@nestjs/common/constants';
import { firstValueFrom, take, toArray } from 'rxjs';

import '../../interceptors/school-mutation-event.interceptor.test';

import { RequestContextService } from '../../common/request-context/request-context.service';
import {
  PERMISSIONS_KEY,
  ROLES_KEY,
  SCHOOL_EVENT_PUBLISHER_ROLE_CODES,
  SCHOOL_STAFF_ROLE_CODES,
} from '../../auth/auth.constants';
import { DashboardRealtimeController } from './dashboard-realtime.controller';
import { DashboardRealtimeService } from './dashboard-realtime.service';
import { AuditTrailService } from './audit-trail.service';
import { EventConsumerRegistryService } from './event-consumer-registry.service';
import { EventConsumerService } from './event-consumer.service';
import { EventPublisherService } from './event-publisher.service';
import { EventsSchemaService } from './events-schema.service';
import { NotificationRouterController } from './notification-router.controller';
import { NotificationRouterService } from './notification-router.service';
import { OutboxDispatcherService } from './outbox-dispatcher.service';
import { WorkflowRepository } from './repositories/workflow.repository';
import { EventsConsumerWorker } from './queue/events-consumer.worker';
import { SchoolOperationalEventsController } from './school-operational-events.controller';
import { SchoolOperationalEventsService } from './school-operational-events.service';
import {
  DashboardRealtimeSnapshot,
  DomainEvent,
  PaymentCompletedPayload,
  SchoolOperationRecordedPayload,
  WorkflowActionDispatchedPayload,
} from './events.types';

beforeEach(() => {
  EventsSchemaService.resetBootstrapForTests();
});

test('AuditTrailService writes canonical audit rows inside the school tenant session', async () => {
  const actorUserId = '00000000-0000-4000-8000-000000000001';
  const studentId = '00000000-0000-4000-8000-000000000801';
  let scopedTenantId = '';
  let scopedUserId: string | null = null;
  let executedSql = '';
  let executedParams: unknown[] = [];
  const service = new AuditTrailService({
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: unknown) => Promise<unknown>,
    ) => {
      scopedTenantId = tenantId;
      scopedUserId = userId;
      return callback({
        $executeRawUnsafe: async (sql: string, ...params: unknown[]) => {
          executedSql = sql;
          executedParams = params;
          return 1;
        },
      });
    },
  } as never);

  await service.createAuditLog(
    'school-a',
    actorUserId,
    'student.admitted',
    'student',
    studentId,
    { source_dashboard: 'admissions' },
  );

  assert.equal(scopedTenantId, 'school-a');
  assert.equal(scopedUserId, actorUserId);
  assert.match(executedSql, /actor_user_id/);
  assert.match(executedSql, /resource_type/);
  assert.match(executedSql, /entity_type/);
  assert.doesNotMatch(executedSql, /\buser_id\b/);
  assert.doesNotMatch(executedSql, /\baggregate_type\b/);
  assert.equal(executedParams[0], 'school-a');
  assert.equal(executedParams[5], JSON.stringify({ source_dashboard: 'admissions' }));
});

test('EventsSchemaService repairs legacy notifications table for tenant-scoped dashboard alerts', async () => {
  let bootstrapSql = '';
  const service = new EventsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    { onModuleInit: async () => undefined } as never,
  );

  await service.onModuleInit();

  assert.match(bootstrapSql, /ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id text;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_key text;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_module text;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source_record_id text;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '\{\}'::jsonb;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications\s+ALTER COLUMN school_id DROP NOT NULL;/);
  assert.match(bootstrapSql, /ALTER TABLE notifications\s+ALTER COLUMN status TYPE text USING lower\(status::text\);/);
  assert.match(bootstrapSql, /SET recipient_user_id = target_user_id::text::uuid/);
  assert.match(bootstrapSql, /FROM users recipient\s+WHERE recipient\.id::text = target_user_id::text/);
  assert.match(bootstrapSql, /'\{targetUserId\}'/);
  assert.match(bootstrapSql, /WHERE recipient_user_id IS NULL\s+AND target_user_id IS NOT NULL\s+AND btrim\(target_user_id::text\) <> ''/);
  assert.match(bootstrapSql, /SET recipient_role = COALESCE\(NULLIF\(recipient_role, ''\), NULLIF\(target_role, ''\)\)/);
  assert.match(bootstrapSql, /SET source_module = COALESCE\(NULLIF\(source_module, ''\), NULLIF\(module, ''\)\)/);
  assert.match(bootstrapSql, /SET source_record_id = COALESCE\(NULLIF\(source_record_id, ''\), NULLIF\(entity_id::text, ''\)\)/);
  assert.match(bootstrapSql, /CREATE UNIQUE INDEX IF NOT EXISTS ux_notifications_tenant_notification_key/);
  assert.match(bootstrapSql, /CREATE INDEX IF NOT EXISTS ix_notifications_tenant_user_status_created/);
  assert.match(bootstrapSql, /CREATE POLICY notifications_rls_policy ON notifications/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS module text;/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type text;/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id text;/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ALTER COLUMN module SET DEFAULT 'system';/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ALTER COLUMN entity_type SET DEFAULT 'unknown';/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ALTER COLUMN entity_id SET DEFAULT '';/);
  assert.match(bootstrapSql, /ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS aggregate_id uuid;/);
  assert.match(bootstrapSql, /SET aggregate_id = resource_id/);
});

test('EventsSchemaService migrates dashboard tasks without assuming optional legacy columns exist', async () => {
  let bootstrapSql = '';
  const service = new EventsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    { onModuleInit: async () => undefined } as never,
  );

  await service.onModuleInit();

  assert.match(bootstrapSql, /to_jsonb\(legacy\) ->> 'assigned_to_user_id'/);
  assert.match(bootstrapSql, /to_jsonb\(legacy\) ->> 'target_user_id'/);
  assert.match(bootstrapSql, /'legacyDueDate', to_jsonb\(legacy\) -> 'due_date'/);
  assert.match(bootstrapSql, /FROM tasks canonical/);
  assert.match(bootstrapSql, /ROW_NUMBER\(\) OVER \(/);
  assert.match(bootstrapSql, /ALTER TABLE tasks ALTER COLUMN assigned_to_user_id DROP NOT NULL/);
  assert.match(bootstrapSql, /ALTER COLUMN tenant_id TYPE text USING tenant_id::text/);
  assert.match(bootstrapSql, /ALTER COLUMN record_id TYPE text USING record_id::text/);
  assert.match(bootstrapSql, /USING \(tenant_id::text = current_setting\('app\.tenant_id', true\)\)/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS dashboard_approval_requests/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS workflow_events/);
  assert.match(bootstrapSql, /ALTER COLUMN target_roles TYPE jsonb/);
  assert.match(bootstrapSql, /ALTER TABLE workflow_events FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /CREATE POLICY workflow_events_rls_policy ON workflow_events/);
  assert.doesNotMatch(bootstrapSql, /legacy\.assigned_to_user_id/);
  assert.doesNotMatch(bootstrapSql, /ON CONFLICT \(tenant_id, task_key\)/);
  assert.doesNotMatch(bootstrapSql, /ALTER TABLE approval_requests/);
  assert.doesNotMatch(bootstrapSql, /DROP TABLE IF EXISTS (?:outbox_events|event_consumer_runs)/);
});

test('EventsSchemaService additively upgrades legacy outbox and consumer tables before their dependants', async () => {
  let bootstrapSql = '';
  const service = new EventsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    { onModuleInit: async () => undefined } as never,
  );

  await service.onModuleInit();

  const requiredOutboxColumns = [
    'school_id text',
    'event_key text',
    'event_name text',
    'aggregate_type text',
    'aggregate_id uuid',
    "payload jsonb DEFAULT '{}'::jsonb",
    "headers jsonb DEFAULT '{}'::jsonb",
    "status text DEFAULT 'pending'",
    'attempt_count integer DEFAULT 0',
    'available_at timestamptz DEFAULT NOW()',
    'published_at timestamptz',
    'last_error text',
    'actor_user_id uuid',
    'actor_role text',
    'source_dashboard text',
    'correlation_id uuid',
    'created_at timestamptz DEFAULT NOW()',
    'updated_at timestamptz DEFAULT NOW()',
  ];
  for (const column of requiredOutboxColumns) {
    assert.ok(
      bootstrapSql.includes(`ALTER TABLE outbox_events ADD COLUMN IF NOT EXISTS ${column};`),
      `missing additive outbox migration for ${column}`,
    );
  }

  const requiredConsumerColumns = [
    'school_id text',
    'outbox_event_id uuid',
    'event_key text',
    'consumer_name text',
    "status text DEFAULT 'processing'",
    'attempt_count integer DEFAULT 0',
    'last_error text',
    'processed_at timestamptz',
    'created_at timestamptz DEFAULT NOW()',
    'updated_at timestamptz DEFAULT NOW()',
  ];
  for (const column of requiredConsumerColumns) {
    assert.ok(
      bootstrapSql.includes(`ALTER TABLE event_consumer_runs ADD COLUMN IF NOT EXISTS ${column};`),
      `missing additive consumer migration for ${column}`,
    );
  }

  assert.match(bootstrapSql, /UPDATE outbox_events\s+SET school_id = tenant_id::text/);
  assert.match(bootstrapSql, /UPDATE event_consumer_runs\s+SET school_id = tenant_id::text/);
  assert.match(bootstrapSql, /ck_outbox_events_school_matches_tenant/);
  assert.match(bootstrapSql, /ck_event_consumer_runs_school_matches_tenant/);
  assert.match(bootstrapSql, /ADD CONSTRAINT fk_event_consumer_runs_outbox_event/);

  const outboxBackfill = bootstrapSql.indexOf('UPDATE outbox_events\n      SET school_id = tenant_id::text');
  const consumerBackfill = bootstrapSql.indexOf('UPDATE event_consumer_runs\n      SET school_id = tenant_id::text');
  const claimFunction = bootstrapSql.indexOf('CREATE OR REPLACE FUNCTION app.claim_outbox_events');
  const dispatchIndex = bootstrapSql.indexOf('CREATE INDEX IF NOT EXISTS ix_outbox_events_dispatch');
  const syncTrigger = bootstrapSql.indexOf('CREATE TRIGGER trg_outbox_events_sync_school_columns');

  assert.ok(outboxBackfill >= 0 && outboxBackfill < claimFunction);
  assert.ok(consumerBackfill >= 0 && consumerBackfill < claimFunction);
  assert.ok(claimFunction < dispatchIndex);
  assert.ok(dispatchIndex < syncTrigger);
  assert.doesNotMatch(bootstrapSql, /DROP TABLE IF EXISTS (?:outbox_events|event_consumer_runs)/);
});

test('EventsSchemaService preserves outbox claim function identity across bootstraps', async () => {
  let bootstrapSql = '';
  const service = new EventsSchemaService(
    {
      runSchemaBootstrap: async (sql: string) => {
        bootstrapSql = sql;
      },
    } as never,
    { onModuleInit: async () => undefined } as never,
  );

  await service.onModuleInit();

  assert.doesNotMatch(bootstrapSql, /DROP FUNCTION IF EXISTS app\.claim_outbox_events/);
  assert.match(bootstrapSql, /CREATE OR REPLACE FUNCTION app\.claim_outbox_events/);
  assert.match(
    bootstrapSql,
    /ALTER FUNCTION app\.claim_outbox_events\(integer, integer\) OWNER TO CURRENT_USER/,
  );
});

test('WorkflowRepository persists generic approvals in the dashboard projection under a slug tenant session', async () => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  const repository = new WorkflowRepository({
    executeWithTenant: async (tenantId: string, _userId: string | null, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, sql, params });
        return [];
      },
    }),
  } as never);

  await repository.createApprovalRequest({
    tenant_id: 'kibabi-high',
    approval_key: 'procurement:request-a',
    approver_role: 'principal',
    approval_type: 'procurement',
  });

  assert.equal(calls[0].tenantId, 'kibabi-high');
  assert.match(calls[0].sql, /INSERT INTO dashboard_approval_requests/);
  assert.doesNotMatch(calls[0].sql, /INSERT INTO approval_requests/);
});

test('NotificationRouterService applies explicit-recipient precedence and rejects an unaddressed task mutation', async () => {
  const calls: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
  const prisma = {
    executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, userId, sql, params });
        return [];
      },
    }),
  };
  const notifications = {
    getUserNotifications: async () => [],
    safeMarkAsRead: async () => ({}),
  };
  const service = new NotificationRouterService(prisma as never, notifications as never);
  const userId = '00000000-0000-4000-8000-000000000001';

  await service.getPendingApprovals('kibabi-high', userId, 'Deputy Principal');
  assert.match(calls[0].sql, /FROM dashboard_approval_requests approval/);
  assert.match(calls[0].sql, /approver_user_id IS NULL/);
  assert.deepEqual(calls[0].params, ['kibabi-high', userId, 'deputy_principal']);

  await assert.rejects(
    () => service.markTaskCompleted('kibabi-high', userId, 'Deputy Principal', 'task-a'),
    /not found for the active school role/i,
  );
  assert.match(calls[1].sql, /task\.tenant_id::text = \$1::text/);
  assert.match(calls[1].sql, /task\.assigned_to_user_id IS NULL/);
  assert.deepEqual(calls[1].params, ['kibabi-high', 'task-a', userId, 'deputy_principal']);
});

test('NotificationRouterController uses catalogued personal-inbox read and write capabilities', () => {
  assert.equal(Reflect.getMetadata(PATH_METADATA, NotificationRouterController), 'workflow/inbox');
  for (const method of ['getNotifications', 'getTasks', 'getApprovals'] as const) {
    assert.deepEqual(
      Reflect.getMetadata(PERMISSIONS_KEY, NotificationRouterController.prototype[method]),
      ['events:read'],
    );
  }
  for (const method of ['markNotificationRead', 'markTaskCompleted'] as const) {
    assert.deepEqual(
      Reflect.getMetadata(PERMISSIONS_KEY, NotificationRouterController.prototype[method]),
      ['events:write'],
    );
  }
});

test('EventsSchemaService uses a single bootstrap promise for concurrent startup callers', async () => {
  let bootstrapRuns = 0;
  const service = new EventsSchemaService(
    {
      runSchemaBootstrap: async () => {
        bootstrapRuns += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
      },
    } as never,
    { onModuleInit: async () => undefined } as never,
  );

  await Promise.all([service.onModuleInit(), service.onModuleInit()]);

  assert.equal(bootstrapRuns, 1);
});

test('EventsSchemaService shares schema bootstrap across instances', async () => {
  let bootstrapRuns = 0;
  const prisma = () => ({
    runSchemaBootstrap: async () => {
      bootstrapRuns += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
    },
  }) as never;
  const authSchemaService = { onModuleInit: async () => undefined } as never;
  const firstService = new EventsSchemaService(prisma(), authSchemaService);
  const secondService = new EventsSchemaService(prisma(), authSchemaService);

  await Promise.all([firstService.onModuleInit(), secondService.onModuleInit()]);

  assert.equal(bootstrapRuns, 1);
});

test('OutboxDispatcherService waits for event schema bootstrap before polling outbox events', async () => {
  const order: string[] = [];
  const transaction = { id: 'outbox-transaction' };
  let observedTransaction: unknown;
  const dispatcher = new OutboxDispatcherService(
    {
      get: <T>(key: string) =>
        ({
          'events.dispatcherEnabled': true,
          'events.dispatcherIntervalMs': 60000,
          'events.dispatcherBatchSize': 10,
          'events.staleProcessingAfterMs': 30000,
        })[key] as T | undefined,
    } as never,
    {
      run: async (_context: unknown, callback: () => Promise<unknown>) => callback(),
    } as never,
    {
      withRequestTransaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(transaction),
    } as never,
    {
      isDegraded: () => false,
      addBulk: async () => [],
    } as never,
    {
      onModuleInit: async () => {
        order.push('schema-start');
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push('schema-done');
      },
    } as never,
    {
      lockPendingBatch: async (_batchSize: number, _staleAfterMs: number, tx: unknown) => {
        observedTransaction = tx;
        order.push('lock-pending');
        return [];
      },
    } as never,
  );

  await dispatcher.onModuleInit();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await dispatcher.onModuleDestroy();

  assert.deepEqual(order, ['schema-start', 'schema-done', 'lock-pending']);
  assert.equal(observedTransaction, transaction);
});

test('OutboxDispatcherService leaves outbox events pending when the queue is degraded', async () => {
  let lockCalls = 0;
  const dispatcher = new OutboxDispatcherService(
    {
      get: <T>(key: string) =>
        ({
          'events.dispatcherBatchSize': 10,
          'events.staleProcessingAfterMs': 30000,
        })[key] as T | undefined,
    } as never,
    {
      run: async (_context: unknown, callback: () => Promise<unknown>) => callback(),
    } as never,
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
    } as never,
    {
      isDegraded: () => true,
      addBulk: async () => {
        throw new Error('queue should not be used while degraded');
      },
    } as never,
    {
      onModuleInit: async () => undefined,
    } as never,
    {
      lockPendingBatch: async () => {
        lockCalls += 1;
        return [];
      },
    } as never,
  );

  const dispatched = await dispatcher.dispatchPendingEvents();

  assert.equal(dispatched, 0);
  assert.equal(lockCalls, 0);
});

test('EventsConsumerWorker does not create a BullMQ worker while Redis is degraded', async () => {
  const worker = new EventsConsumerWorker(
    {
      get: <T>(key: string) =>
        ({
          'events.workerEnabled': true,
          'events.queueName': 'events',
        })[key] as T | undefined,
    } as never,
    {
      ping: async () => 'degraded',
      getBullConnectionOptions: () => {
        throw new Error('BullMQ worker connection options should not be requested while Redis is degraded');
      },
    } as never,
    {
      consume: async () => undefined,
    } as never,
  );

  await worker.onModuleInit();
  await worker.onModuleDestroy();
});

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

test('EventPublisherService gives authenticated tenant and actor context precedence over forged event identity', async () => {
  const requestContext = new RequestContextService();
  let written: Record<string, unknown> | null = null;
  const service = new EventPublisherService(requestContext, {
    createEvent: async (input: Record<string, unknown>) => {
      written = input;
      return input;
    },
  } as never);
  const actorUserId = '00000000-0000-4000-8000-000000000001';

  await requestContext.run(
    {
      request_id: 'req-authoritative-event',
      tenant_id: 'tenant-a',
      user_id: actorUserId,
      role: 'teacher',
      session_id: 'session-authoritative-event',
      permissions: ['events:write'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/workflow/events',
      started_at: '2026-08-15T08:00:00.000Z',
    },
    async () => {
      await service.publish({
        tenant_id: 'tenant-a',
        actor_user_id: '00000000-0000-4000-8000-000000000999',
        actor_role: 'platform_owner',
        source_dashboard: 'superadmin',
        event_key: 'student.created:authoritative-context',
        event_name: 'student.created',
        aggregate_type: 'student',
        aggregate_id: '00000000-0000-4000-8000-000000000101',
        payload: {
          tenant_id: 'tenant-a',
          student_id: '00000000-0000-4000-8000-000000000101',
          created_at: '2026-08-15T08:00:00.000Z',
          created_by_user_id: actorUserId,
        },
        headers: {
          source: 'server.test',
          request_id: 'forged-request',
          user_id: 'forged-user',
          role: 'platform_owner',
          session_id: 'forged-session',
          tenant_id: 'tenant-b',
          actor_role: 'platform_owner',
          source_dashboard: 'superadmin',
        },
      });

      await assert.rejects(
        () => service.publish({
          tenant_id: 'tenant-b',
          event_key: 'student.created:wrong-tenant',
          event_name: 'student.created',
          aggregate_type: 'student',
          aggregate_id: '00000000-0000-4000-8000-000000000102',
          payload: {
            tenant_id: 'tenant-b',
            student_id: '00000000-0000-4000-8000-000000000102',
            created_at: '2026-08-15T08:00:00.000Z',
            created_by_user_id: actorUserId,
          },
        }),
        /does not match the authenticated school/i,
      );
    },
  );

  assert.ok(written);
  const event = written as Record<string, unknown>;
  assert.equal(event.tenant_id, 'tenant-a');
  assert.equal(event.school_id, 'tenant-a');
  assert.equal(event.actor_user_id, actorUserId);
  assert.equal(event.actor_role, 'teacher');
  assert.equal(event.source_dashboard, 'teacher');
  const headers = event.headers as Record<string, unknown>;
  assert.equal(headers.source, 'server.test');
  assert.equal(headers.request_id, 'req-authoritative-event');
  assert.equal(headers.user_id, actorUserId);
  assert.equal(headers.role, 'teacher');
  assert.equal(headers.session_id, 'session-authoritative-event');
  assert.equal(headers.tenant_id, 'tenant-a');
  assert.equal(headers.school_id, 'tenant-a');
  assert.equal(headers.actor_role, 'teacher');
  assert.equal(headers.source_dashboard, 'teacher');
});

test('EventPublisherService keeps attendance aggregate IDs valid for the UUID outbox contract', async () => {
  const requestContext = new RequestContextService();
  let publishedEvent: Record<string, unknown> | null = null;
  const service = new EventPublisherService(requestContext, {
    createEvent: async (input: Record<string, unknown>) => {
      publishedEvent = input;
      return input;
    },
  } as never);
  const streamId = '00000000-0000-4000-8000-000000000611';

  await requestContext.run(
    {
      request_id: 'req-attendance-event',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'class-teacher',
      session_id: 'session-attendance-event',
      permissions: ['attendance:write'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/class-teacher/attendance',
      started_at: '2026-07-19T08:00:00.000Z',
    },
    () => service.publishAttendanceRegisterMarked({
      tenant_id: 'tenant-a',
      stream_id: streamId,
      marked_by_user_id: '00000000-0000-0000-0000-000000000001',
      date: '2026-07-19',
      present_count: 42,
      absent_count: 3,
    }),
  );

  assert.ok(publishedEvent);
  const writtenEvent = publishedEvent as Record<string, unknown>;
  assert.equal(writtenEvent.aggregate_id, streamId);
  assert.equal(
    writtenEvent.event_key,
    `attendance.register.marked:${streamId}:2026-07-19`,
  );
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
          actorRole: 'platform_owner',
          title: 'Fee reversal requested',
          body: 'Receipt KBI-RCPT-400 needs approval.',
          entityId: 'approval-400',
          severity: 'warning',
          payload: {
            amount: 'KSh 4,500',
            schoolId: 'tenant-b',
            school_id: 'tenant-b',
            tenantId: 'tenant-b',
            tenant_id: 'tenant-b',
            actorRole: 'platform_owner',
            actor_role: 'platform_owner',
            sourceDashboard: 'superadmin',
            source_dashboard: 'superadmin',
            targetUserId: '00000000-0000-4000-8000-000000000999',
            target_user_id: '00000000-0000-4000-8000-000000000999',
            audienceRoles: ['system_monitor'],
            audience_roles: ['system_monitor'],
          },
          createdAt: '2026-05-31T06:30:00.000Z',
        },
        notifications: [
          {
            id: 'notification-local-1',
            schoolId: 'tenant-a',
            title: 'Fee reversal requested',
            body: 'Receipt KBI-RCPT-400 needs approval.',
            audienceRoles: [
              'principal',
              'deputy-principal',
              'finance',
              'admissions',
              'facility-manager',
              'system-monitor',
              'superadmin',
              'support',
            ],
            priority: 'urgent',
            sourceModule: 'finance',
            relatedModule: 'finance',
            relatedRecordId: 'approval-400',
            read: false,
            createdAt: '2026-05-31T06:30:00.000Z',
          },
          {
            id: 'notification-exact-parent',
            schoolId: 'tenant-a',
            title: 'Learner-specific update',
            body: 'A private update is ready for your linked learner.',
            audienceRoles: ['parent'],
            targetUserId: '00000000-0000-4000-8000-000000000123',
            sourceModule: 'finance',
            relatedRecordId: 'approval-400',
          },
          {
            id: 'notification-platform-only',
            audienceRoles: ['system-monitor', 'superadmin', 'support'],
            title: 'Platform-only alert',
            body: 'This must not be routed through a school notification projection.',
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
  assert.deepEqual(payload.target_roles, [
    'principal',
    'deputy_principal',
    'accountant',
    'bursar',
    'admissions_officer',
    'ict_manager',
  ]);
  assert.deepEqual(payload.target_user_ids, [
    '00000000-0000-4000-8000-000000000123',
  ]);
  assert.deepEqual(payload.payload, { amount: 'KSh 4,500' });
  assert.equal(payload.notifications.length, 2);
  assert.deepEqual(materializedNotifications, [
    {
      tenantId: 'tenant-a',
      operationId: 'event-local-1',
      notification: {
        id: 'notification-local-1',
        schoolId: 'tenant-a',
        title: 'Fee reversal requested',
        body: 'Receipt KBI-RCPT-400 needs approval.',
        audienceRoles: [
          'principal',
          'deputy_principal',
          'accountant',
          'bursar',
          'admissions_officer',
          'ict_manager',
        ],
        priority: 'urgent',
        sourceModule: 'finance',
        relatedModule: 'finance',
        relatedRecordId: 'approval-400',
        read: false,
        createdAt: '2026-05-31T06:30:00.000Z',
      },
    },
    {
      tenantId: 'tenant-a',
      operationId: 'event-local-1',
      notification: {
        id: 'notification-exact-parent',
        schoolId: 'tenant-a',
        title: 'Learner-specific update',
        body: 'A private update is ready for your linked learner.',
        audienceRoles: ['parent'],
        targetUserId: '00000000-0000-4000-8000-000000000123',
        sourceModule: 'finance',
        relatedRecordId: 'approval-400',
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

test('SchoolOperationalEventsService rejects malformed exact recipients instead of falling back to a role broadcast', async () => {
  const requestContext = new RequestContextService();
  let published = false;
  const service = new SchoolOperationalEventsService(requestContext, {
    publish: async () => {
      published = true;
      throw new Error('malformed exact recipients must fail before publish');
    },
  } as never, {
    upsertFromSchoolOperation: async () => {
      throw new Error('malformed exact recipients must not materialize');
    },
  } as never);

  await assert.rejects(
    requestContext.run(
      {
        request_id: 'req-school-operation-malformed-recipient',
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-4000-8000-000000000010',
        role: 'principal',
        session_id: 'session-school-operation-malformed-recipient',
        permissions: ['auth:read'],
        is_authenticated: true,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
        method: 'POST',
        path: '/events/school-operations',
        started_at: '2026-08-22T08:00:00.000Z',
      },
      () => service.recordSchoolOperation({
        event: {
          id: 'event-malformed-recipient',
          type: 'PRIVATE_PARENT_UPDATE',
          module: 'communication',
          title: 'Private parent update',
          body: 'A linked learner update is ready.',
        },
        notifications: [{
          id: 'notification-malformed-recipient',
          audienceRoles: ['parent'],
          targetUserId: '   ',
          title: 'Private parent update',
          body: 'A linked learner update is ready.',
        }],
      }),
    ),
    /targetUserId must be a non-empty string/,
  );

  assert.equal(published, false);
});

test('SchoolOperationNotificationsRepository lists unread notifications for the current tenant role', async () => {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const { SchoolOperationNotificationsRepository } = await import(
    './repositories/school-operation-notifications.repository'
  );
  const repository = new SchoolOperationNotificationsRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
              requestStatus: 'Pending',
              actionType: 'FEE_REVERSAL_REQUESTED',
              originRole: 'accountant',
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

  const userId = '00000000-0000-4000-8000-000000000010';
  const result = await repository.listForTenantRole('tenant-a', userId, 'principal', { limit: 8 });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /FROM notifications/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /notification_key LIKE 'school-operation:%'/);
  assert.match(queries[0].sql, /recipient_user_id::text/);
  assert.match(queries[0].sql, /metadata->>'targetUserId'/);
  assert.match(queries[0].sql, /IS NULL/);
  assert.match(queries[0].sql, /target_roles/);
  assert.match(queries[0].sql, /audienceRoles/);
  assert.match(queries[0].sql, /LIMIT \$4::integer/);
  assert.deepEqual(queries[0].values, ['tenant-a', userId, 'principal', 8]);
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
      priority: 'urgent',
      requestStatus: 'Pending',
      actionType: 'FEE_REVERSAL_REQUESTED',
      originRole: 'accountant',
      targetRoles: ['principal', 'deputy-principal'],
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
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
    '00000000-0000-4000-8000-000000000010',
    'principal',
    '00000000-0000-4000-8000-000000000401',
  );

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /UPDATE notifications/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.match(queries[0].sql, /id::text = \$2::text/);
  assert.match(queries[0].sql, /notification_key LIKE 'school-operation:%'/);
  assert.match(queries[0].sql, /recipient_user_id::text/);
  assert.match(queries[0].sql, /metadata->>'targetUserId'/);
  assert.match(queries[0].sql, /IS NULL/);
  assert.match(queries[0].sql, /target_roles/);
  assert.deepEqual(queries[0].values, [
    'tenant-a',
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000010',
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
    listForTenantRole: async (tenantId: string, userId: string, role: string, options: { limit: number }) => {
      repositoryCalls.push({ action: 'list', tenantId, userId, role, limit: options.limit });
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
    markReadForTenantRole: async (tenantId: string, userId: string, role: string, notificationId: string) => {
      repositoryCalls.push({ action: 'mark-read', tenantId, userId, role, notificationId });
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
    {
      action: 'list',
      tenantId: 'tenant-a',
      userId: '00000000-0000-0000-0000-000000000010',
      role: 'teacher',
      limit: 8,
    },
    {
      action: 'mark-read',
      tenantId: 'tenant-a',
      userId: '00000000-0000-0000-0000-000000000010',
      role: 'teacher',
      notificationId: 'notification-1',
    },
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

  assert.equal(service.toDashboardEvent(event, {
    enabledModules: ['finance'],
    permissions: ['finance:read'],
    role: 'teacher',
  }), null);
  assert.equal(service.toDashboardEvent(event, {
    enabledModules: ['finance'],
    permissions: ['finance:read'],
    role: 'Accountant',
  })?.type, 'FEE_PAYMENT_COMPLETED');
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

test('DashboardRealtimeService routes exact school-operation recipients by user without a role-wide broadcast', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const exactUserId = '00000000-0000-4000-8000-000000000123';
  const event: DomainEvent<'school.operation.recorded'> = {
    id: 'event-school-operation-exact-1',
    tenant_id: 'tenant-a',
    event_key: 'school.operation.recorded:tenant-a:event-exact-1',
    event_name: 'school.operation.recorded',
    aggregate_type: 'school_operation',
    aggregate_id: '00000000-0000-4000-8000-000000000780',
    payload: {
      tenant_id: 'tenant-a',
      school_id: 'tenant-a',
      operation_id: 'event-exact-1',
      operation_type: 'TRANSPORT_ROUTE_ASSIGNED',
      module: 'transport',
      actor_role: 'transport_manager',
      title: 'Transport route assigned',
      body: 'Your linked learner has a transport route.',
      entity_id: 'manifest-1',
      severity: 'info',
      target_roles: [],
      target_user_ids: [exactUserId],
      notifications: [],
      sms: [],
      payload: {},
      occurred_at: '2026-08-22T08:00:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 0,
    available_at: '2026-08-22T08:00:00.000Z',
    published_at: '2026-08-22T08:00:01.000Z',
    last_error: null,
    created_at: '2026-08-22T08:00:00.000Z',
    updated_at: '2026-08-22T08:00:01.000Z',
  };

  const exactRecipientEvent = service.toDashboardEvent(event, {
    enabledModules: ['transport'],
    permissions: ['auth:read'],
    role: 'parent',
    userId: exactUserId,
  });
  const otherParentEvent = service.toDashboardEvent(event, {
    enabledModules: ['transport'],
    permissions: ['auth:read'],
    role: 'parent',
    userId: '00000000-0000-4000-8000-000000000124',
  });

  assert.ok(exactRecipientEvent?.channels.includes(`user:${exactUserId}`));
  assert.ok(!exactRecipientEvent?.channels.includes('role:parent'));
  assert.equal(otherParentEvent, null);
});

test('DashboardRealtimeService exposes system refresh events to authenticated tenant roles', () => {
  const service = new DashboardRealtimeService(
    {} as never,
    {} as never,
    {} as never,
  );
  const event: DomainEvent<'school.operation.recorded'> = {
    id: 'event-school-refresh-1',
    tenant_id: 'tenant-a',
    event_key: 'school.operation.recorded:tenant-a:refresh-1',
    event_name: 'school.operation.recorded',
    aggregate_type: 'school_mutation',
    aggregate_id: '00000000-0000-4000-8000-000000000779',
    payload: {
      tenant_id: 'tenant-a',
      school_id: 'tenant-a',
      operation_id: 'refresh-1',
      operation_type: 'POST /students',
      module: 'platform',
      actor_role: 'admissions-officer',
      title: 'School data updated',
      body: 'A school workspace saved new data.',
      entity_id: null,
      severity: 'info',
      target_roles: [],
      notifications: [],
      sms: [],
      payload: { method: 'POST', path: '/students', system_refresh_only: true },
      occurred_at: '2026-07-19T10:00:00.000Z',
    },
    headers: {},
    status: 'published',
    attempt_count: 0,
    available_at: '2026-07-19T10:00:00.000Z',
    published_at: '2026-07-19T10:00:01.000Z',
    last_error: null,
    created_at: '2026-07-19T10:00:00.000Z',
    updated_at: '2026-07-19T10:00:01.000Z',
  };

  const dashboardEvent = service.toDashboardEvent(event, {
    enabledModules: [],
    permissions: ['auth:read'],
    role: 'teacher',
  });

  assert.equal(dashboardEvent?.type, 'SCHOOL_OPERATION_RECORDED');
  assert.equal(dashboardEvent?.tenantId, 'tenant-a');
  assert.equal(dashboardEvent?.notification.title, 'School data updated');
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
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, recordDescriptor.value), ['events:publish']);
  assert.deepEqual(Reflect.getMetadata(ROLES_KEY, recordDescriptor.value), [...SCHOOL_EVENT_PUBLISHER_ROLE_CODES]);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, listDescriptor.value), ['events:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, markReadDescriptor.value), ['events:write']);
});
