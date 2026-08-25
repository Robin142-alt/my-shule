// @ts-nocheck
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import 'reflect-metadata';
import { PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';

import {
  DEFAULT_PERMISSION_CATALOG,
  DEFAULT_ROLE_CATALOG,
  PERMISSIONS_KEY,
  ROLES_KEY,
  SCHOOL_EVENT_PUBLISHER_ROLE_CODES,
  SCHOOL_STAFF_ROLE_CODES,
} from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { RbacGuard } from '../../guards/rbac.guard';
import { ApprovalController } from './controllers/approval.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { TaskController } from './controllers/task.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { ApprovalService } from './services/approval.service';
import { DashboardFeedService } from './services/dashboard-feed.service';
import { WorkflowService } from './services/workflow.service';

const tenantA = 'tenant-a';
const teacherId = '00000000-0000-4000-8000-000000000101';
const otherUserId = '00000000-0000-4000-8000-000000000102';

test('AppModule mounts the canonical cross-dashboard workflow routes', () => {
  const appModuleSource = readFileSync('apps/api/src/app.module.ts', 'utf8');

  assert.match(appModuleSource, /import \{ WorkflowModule \} from '.\/modules\/workflow\/workflow\.module';/);
  assert.match(appModuleSource, /\bWorkflowModule,?\s*(?:\r?\n|\])/);
  assert.equal(
    Reflect.getMetadata(PATH_METADATA, DashboardController.prototype.getSummary),
    'communication-summary',
  );
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, WorkflowController.prototype.createEvent),
    [...SCHOOL_EVENT_PUBLISHER_ROLE_CODES],
  );
});

test('mounted workflow routes use catalogued personal-inbox capabilities with write guards on mutations', () => {
  const permissionKeys = new Set(
    DEFAULT_PERMISSION_CATALOG.map((permission) => `${permission.resource}:${permission.action}`),
  );
  assert.equal(permissionKeys.has('events:read'), true);
  assert.equal(permissionKeys.has('events:write'), true);
  assert.equal(permissionKeys.has('events:publish'), true);
  assert.equal(permissionKeys.has('procurement:approve'), true);

  for (const roleCode of ['teacher', 'parent', 'principal']) {
    const permissions = DEFAULT_ROLE_CATALOG.find((role) => role.code === roleCode)?.permissions ?? [];
    assert.equal(permissions.includes('events:read'), true, `${roleCode} must read its addressed inbox`);
    assert.equal(permissions.includes('events:write'), true, `${roleCode} must acknowledge addressed items`);
  }
  assert.equal(
    DEFAULT_ROLE_CATALOG.find((role) => role.code === 'teacher')?.permissions.includes('events:publish'),
    false,
  );
  assert.equal(
    DEFAULT_ROLE_CATALOG.find((role) => role.code === 'parent')?.permissions.includes('events:publish'),
    false,
  );
  const principalPermissions = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'principal')?.permissions ?? [];
  assert.equal(principalPermissions.includes('procurement:approve'), true);

  assert.deepEqual(
    Reflect.getMetadata(PERMISSIONS_KEY, WorkflowController.prototype.getEvents),
    ['events:read'],
  );
  for (const method of ['createEvent', 'dispatchEvent'] as const) {
    assert.deepEqual(
      Reflect.getMetadata(PERMISSIONS_KEY, WorkflowController.prototype[method]),
      ['events:publish'],
    );
    assert.deepEqual(
      Reflect.getMetadata(ROLES_KEY, WorkflowController.prototype[method]),
      [...SCHOOL_EVENT_PUBLISHER_ROLE_CODES],
    );
  }
  assert.deepEqual(
    Reflect.getMetadata(PERMISSIONS_KEY, WorkflowController.prototype.markHandled),
    ['events:write'],
  );
  assert.deepEqual(
    Reflect.getMetadata(ROLES_KEY, WorkflowController.prototype.markHandled),
    [...SCHOOL_STAFF_ROLE_CODES],
  );
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, TaskController.prototype.getTasks), ['events:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, TaskController.prototype.completeTask), ['events:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, ApprovalController.prototype.getApprovals), ['events:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, ApprovalController.prototype.approve), ['events:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, ApprovalController.prototype.reject), ['events:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, DashboardController.prototype.getFeed), ['events:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, DashboardController.prototype.getSummary), ['events:read']);
});

test('RbacGuard admits personal inbox access while restricting generic event publication to school leadership', async () => {
  const requestContext = new RequestContextService();
  const guard = new RbacGuard(new Reflector(), requestContext);
  const executionContext = (handler: Function, controller: Function) => ({
    getHandler: () => handler,
    getClass: () => controller,
  });

  for (const roleCode of ['teacher', 'parent', 'principal']) {
    const permissions = [...(DEFAULT_ROLE_CATALOG.find((role) => role.code === roleCode)?.permissions ?? [])];
    await requestContext.run({
      request_id: `req-rbac-${roleCode}`,
      tenant_id: tenantA,
      user_id: teacherId,
      role: roleCode,
      session_id: `session-rbac-${roleCode}`,
      permissions,
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/workflow/events',
      started_at: '2026-08-15T08:00:00.000Z',
    }, async () => {
      assert.equal(guard.canActivate(executionContext(WorkflowController.prototype.getEvents, WorkflowController)), true);
      assert.equal(guard.canActivate(executionContext(TaskController.prototype.completeTask, TaskController)), true);

      if (roleCode !== 'principal') {
        assert.throws(
          () => guard.canActivate(executionContext(WorkflowController.prototype.createEvent, WorkflowController)),
          /Role-based access denied/,
        );
      } else {
        assert.equal(guard.canActivate(executionContext(WorkflowController.prototype.createEvent, WorkflowController)), true);
      }
    });
  }
});

function runAs<T>(
  requestContext: RequestContextService,
  input: { tenantId?: string; userId?: string; role?: string },
  callback: () => Promise<T>,
) {
  return requestContext.run({
    request_id: 'req-workflow-communication',
    tenant_id: input.tenantId ?? tenantA,
    user_id: input.userId ?? teacherId,
    role: input.role ?? 'teacher',
    session_id: 'session-a',
    permissions: ['auth:read'],
    is_authenticated: true,
    client_ip: '127.0.0.1',
    user_agent: 'workflow-test',
    method: 'GET',
    path: '/tasks',
    started_at: '2026-08-15T08:00:00.000Z',
  }, callback);
}

test('TaskController reads only canonical tasks addressed to the authenticated school user or active role', async () => {
  const requestContext = new RequestContextService();
  const calls: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
  const prisma = {
    executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, userId, sql, params });
        return [];
      },
      $executeRawUnsafe: async () => 1,
    }),
  };
  const controller = new TaskController(prisma as never, requestContext);

  await runAs(requestContext, { role: 'Deputy Principal' }, () => controller.getTasks());

  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenantId, tenantA);
  assert.equal(calls[0].userId, teacherId);
  assert.deepEqual(calls[0].params, [tenantA, teacherId, 'deputy_principal']);
  assert.match(calls[0].sql, /FROM tasks task/);
  assert.doesNotMatch(calls[0].sql, /dashboard_tasks/);
  assert.match(calls[0].sql, /assigned_to_user_id/);
  assert.match(calls[0].sql, /assigned_to_user_id IS NULL/);
  assert.match(calls[0].sql, /assigned_to_role/);
  assert.match(calls[0].sql, /task\.tenant_id::text = \$1::text/);
});

test('TaskController completion derives tenant and actor from context and cannot mutate an unaddressed task', async () => {
  const requestContext = new RequestContextService();
  let updateSql = '';
  let updateParams: unknown[] = [];
  const prisma = {
    executeWithTenant: async (_tenantId: string, _userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        updateSql = sql;
        updateParams = params;
        return [];
      },
      $executeRawUnsafe: async () => 1,
    }),
  };
  const controller = new TaskController(prisma as never, requestContext);

  await assert.rejects(
    () => runAs(requestContext, { role: 'teacher' }, () => controller.completeTask('task-from-another-role')),
    /not found for the active school role/i,
  );
  assert.deepEqual(updateParams, ['task-from-another-role', tenantA, teacherId, 'teacher']);
  assert.match(updateSql, /task\.tenant_id::text = \$2::text/);
  assert.match(updateSql, /assigned_to_user_id::text = \$3/);
  assert.match(updateSql, /assigned_to_user_id IS NULL/);
  assert.match(updateSql, /assigned_to_role/);
});

test('ApprovalController ignores forged tenant and actor fields and binds decisions to RequestContext', async () => {
  const requestContext = new RequestContextService();
  const decisions: unknown[] = [];
  const service = {
    listPendingForApprover: async () => [],
    createApprovalRequest: async () => ({}),
    decideRequest: async (input: unknown) => {
      decisions.push(input);
      return input;
    },
  };
  const controller = new ApprovalController(service as never, requestContext);

  await runAs(requestContext, { role: 'principal' }, () => controller.approve('approval-a', {
    schoolId: 'tenant-b',
    userId: otherUserId,
    comment: 'Approved after review',
  }));

  assert.deepEqual(decisions[0], {
    tenantId: tenantA,
    approvalId: 'approval-a',
    actorUserId: teacherId,
    actorRole: 'principal',
    requestId: 'req-workflow-communication',
    decision: 'APPROVED',
    note: 'Approved after review',
  });
});

test('ApprovalService rejects unsupported shared-inbox approval creation before tenant persistence', async () => {
  let tenantTransactions = 0;
  const service = new ApprovalService({
    executeWithTenant: async () => {
      tenantTransactions += 1;
      throw new Error('unsupported approval must not reach persistence');
    },
  } as never, {
    getStore: () => ({ permissions: ['procurement:approve'] }),
  } as never, {
    publish: async () => ({}),
  } as never);
  const base = {
    tenantId: tenantA,
    requestedByUserId: teacherId,
    requestedByRole: 'teacher',
    requestId: 'req-create-approval',
    approverRole: 'principal',
    recordId: '00000000-0000-4000-8000-000000000209',
    title: 'Review request',
  };

  for (const contract of [
    { module: 'exams', approvalType: 'procurement' },
    { module: 'procurement', approvalType: 'report_card_publish' },
    { module: 'finance', approvalType: 'budget' },
  ]) {
    await assert.rejects(
      () => service.createApprovalRequest({ ...base, ...contract }),
      /only create procurement approvals with a supported domain transition/i,
    );
  }

  assert.equal(tenantTransactions, 0);
});

test('ApprovalService rejects assignees without procurement approval capability before approval persistence', async () => {
  const approverUserId = '00000000-0000-4000-8000-000000000208';
  const scenarios = [
    {
      label: 'explicit user',
      approverUserId,
      approverRole: null,
      validation: {
        user_exists: true,
        role_exists: true,
        user_can_approve: false,
        role_can_approve: true,
      },
      expected: /Approver user does not have procurement approval permission/i,
    },
    {
      label: 'role inbox',
      approverUserId: null,
      approverRole: 'Principal',
      validation: {
        user_exists: true,
        role_exists: true,
        user_can_approve: true,
        role_can_approve: false,
      },
      expected: /Approver role does not have procurement approval permission/i,
    },
  ];

  for (const scenario of scenarios) {
    const calls: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
    let tenantTransactions = 0;
    const service = new ApprovalService({
      executeWithTenant: async (
        tenantId: string,
        userId: string,
        callback: (tx: unknown) => Promise<unknown>,
      ) => {
        tenantTransactions += 1;
        return callback({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
            calls.push({ tenantId, userId, sql, params });
            return [scenario.validation];
          },
        });
      },
    } as never, {
      getStore: () => ({ permissions: ['procurement:approve'] }),
    } as never, {
      publish: async () => ({}),
    } as never);

    await assert.rejects(
      () => service.createApprovalRequest({
        tenantId: tenantA,
        requestedByUserId: teacherId,
        requestedByRole: 'teacher',
        requestId: `req-${scenario.label}`,
        approverUserId: scenario.approverUserId,
        approverRole: scenario.approverRole,
        approvalType: 'PROCUREMENT',
        module: 'procurement',
        recordId: '00000000-0000-4000-8000-000000000209',
        title: 'Review procurement request',
      }),
      scenario.expected,
    );

    assert.equal(tenantTransactions, 1, `${scenario.label} must stop after capability validation`);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].params, [
      tenantA,
      scenario.approverUserId,
      scenario.approverRole ? 'principal' : null,
    ]);
    assert.match(calls[0].sql, /membership\.tenant_id = \$1/);
    assert.match(calls[0].sql, /FROM user_roles user_role/);
    assert.match(calls[0].sql, /upper\(user_role\.status::text\) = 'ACTIVE'/);
    assert.match(calls[0].sql, /role_permission\.tenant_id = assigned_role\.tenant_id/);
    assert.match(calls[0].sql, /permission\.tenant_id = role_permission\.tenant_id/);
    assert.match(calls[0].sql, /'procurement:approve'/);
  }
});

test('ApprovalService resolves direct procurement decisions only through the canonical addressed projection', async () => {
  const approvalId = '00000000-0000-4000-8000-000000000214';
  const procurementRequestId = '00000000-0000-4000-8000-000000000215';
  const lookups: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
  let includeAddressedProjection = true;
  const service = new ApprovalService({
    executeWithTenant: async (
      tenantId: string,
      userId: string,
      callback: (tx: unknown) => Promise<unknown>,
    ) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        lookups.push({ tenantId, userId, sql, params });
        return includeAddressedProjection ? [{ id: approvalId }] : [];
      },
    }),
  } as never, {
    getStore: () => ({ permissions: ['procurement:approve'] }),
  } as never, {
    publish: async () => ({}),
  } as never);
  const delegated: unknown[] = [];
  service.decideRequest = async (input) => {
    delegated.push(input);
    return {
      id: approvalId,
      title: 'Procurement request',
      reason: null,
      status: 'approved',
      approval_type: 'PROCUREMENT',
      module: 'procurement',
      record_id: procurementRequestId,
      requested_by_user_id: otherUserId,
      approver_user_id: teacherId,
      approver_role: 'principal',
      decision_note: 'Within budget',
      created_at: new Date(),
      updated_at: new Date(),
    };
  };

  await service.decideProcurementRequest({
    tenantId: tenantA,
    procurementRequestId,
    actorUserId: teacherId,
    actorRole: 'Principal',
    requestId: 'req-direct-procurement',
    decision: 'APPROVED',
    note: 'Within budget',
  });

  assert.equal(lookups.length, 1);
  assert.equal(lookups[0].tenantId, tenantA);
  assert.equal(lookups[0].userId, teacherId);
  assert.deepEqual(lookups[0].params, [
    tenantA,
    `procurement-approval-${procurementRequestId}`,
    procurementRequestId,
    teacherId,
    'principal',
    'APPROVED',
  ]);
  assert.match(lookups[0].sql, /approval\.tenant_id::text = \$1::text/);
  assert.match(lookups[0].sql, /approval\.approval_key = \$2/);
  assert.match(lookups[0].sql, /requested_by_user_id::text IS DISTINCT FROM \$4::text/);
  assert.match(lookups[0].sql, /approver_user_id::text = \$4::text/);
  assert.match(lookups[0].sql, /approver_role/);
  assert.match(lookups[0].sql, /lower\(approval\.status\) = lower\(\$6\)/);
  assert.match(lookups[0].sql, /metadata->>'decisionByRole'/);
  assert.deepEqual(delegated, [{
    tenantId: tenantA,
    approvalId,
    actorUserId: teacherId,
    actorRole: 'Principal',
    requestId: 'req-direct-procurement',
    decision: 'APPROVED',
    note: 'Within budget',
  }]);

  includeAddressedProjection = false;
  await assert.rejects(
    () => service.decideProcurementRequest({
      tenantId: tenantA,
      procurementRequestId,
      actorUserId: teacherId,
      actorRole: 'Principal',
      requestId: 'req-unaddressed-procurement',
      decision: 'REJECTED',
      note: 'Not assigned',
    }),
    /not found for the active school assignee/i,
  );
  assert.equal(delegated.length, 1);
});

test('ApprovalService bridges an addressed procurement projection atomically and safely replays the same completed decision', async () => {
  const approvalId = '00000000-0000-4000-8000-000000000201';
  const procurementRequestId = '00000000-0000-4000-8000-000000000202';
  const procurementApprovalId = '00000000-0000-4000-8000-000000000203';
  const calls: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
  const sideEffects: Array<{ sql: string; params: unknown[] }> = [];
  const publishedEvents: Array<{ input: Record<string, unknown>; hasTransaction: boolean }> = [];
  const prisma = {
    executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, userId, sql, params });
        if (/FROM dashboard_approval_requests approval/.test(sql) && /FOR UPDATE OF approval/.test(sql)) {
          return [{
            id: approvalId,
            approval_key: `procurement-approval-${procurementRequestId}`,
            title: 'Chemistry reagents',
            reason: 'Restock laboratory',
            status: 'pending',
            approval_type: 'PROCUREMENT',
            module: 'procurement',
            record_id: procurementRequestId,
            requested_by_user_id: otherUserId,
            approver_user_id: null,
            approver_role: 'deputy_principal',
            decision_note: null,
            created_at: new Date(),
            updated_at: new Date(),
          }];
        }
        if (/FROM procurement_requests request/.test(sql)) {
          return [{ id: procurementRequestId, status: 'submitted', requested_by_user_id: otherUserId }];
        }
        if (/INSERT INTO procurement_approvals/.test(sql)) {
          return [{ id: procurementApprovalId }];
        }
        if (/UPDATE procurement_requests request/.test(sql)) {
          return [{ id: procurementRequestId, status: 'approved' }];
        }
        if (/UPDATE dashboard_approval_requests/.test(sql)) {
          return [{
            id: approvalId,
            title: 'Chemistry reagents',
            reason: 'Restock laboratory',
            status: 'approved',
            approval_type: 'PROCUREMENT',
            module: 'procurement',
            record_id: procurementRequestId,
            requested_by_user_id: otherUserId,
            approver_user_id: teacherId,
            approver_role: 'deputy_principal',
            decision_note: 'Checked',
            created_at: new Date(),
            updated_at: new Date(),
          }];
        }
        return [];
      },
      $executeRawUnsafe: async (sql: string, ...params: unknown[]) => {
        sideEffects.push({ sql, params });
        return 1;
      },
    }),
  };
  const service = new ApprovalService(prisma as never, {
    getStore: () => ({ permissions: ['procurement:approve'] }),
  } as never, {
    publish: async (input: Record<string, unknown>, tx: unknown) => {
      publishedEvents.push({ input, hasTransaction: Boolean(tx) });
      return input;
    },
  } as never);

  await service.listPendingForApprover({
    tenantId: tenantA,
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
  });
  assert.deepEqual(calls[0].params, [tenantA, teacherId, 'deputy_principal']);
  assert.match(calls[0].sql, /FROM dashboard_approval_requests approval/);
  assert.match(calls[0].sql, /approval\.tenant_id::text = \$1::text/);
  assert.match(calls[0].sql, /requested_by_user_id::text IS DISTINCT FROM \$2/);
  assert.match(calls[0].sql, /approver_user_id IS NOT NULL/);
  assert.match(calls[0].sql, /approver_user_id IS NULL/);

  const approved = await service.decideRequest({
    tenantId: tenantA,
    approvalId,
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
    requestId: 'req-approval',
    decision: 'APPROVED',
    note: 'Checked',
  });
  assert.equal(approved.status, 'approved');
  assert.equal(calls[1].tenantId, tenantA);
  assert.equal(calls[1].userId, teacherId);
  assert.match(calls[1].sql, /FOR UPDATE OF approval/);
  assert.match(calls[1].sql, /requested_by_user_id::text IS DISTINCT FROM \$3/);
  assert.match(calls[1].sql, /approver_user_id IS NULL/);
  assert.match(calls[2].sql, /FROM procurement_requests request/);
  assert.deepEqual(calls[2].params, [tenantA, procurementRequestId, otherUserId]);
  assert.match(calls[2].sql, /request\.tenant_id::text = \$1::text/);
  assert.match(calls[2].sql, /lower\(request\.status\) = 'submitted'/);
  assert.match(calls[2].sql, /FOR UPDATE OF request/);
  assert.match(calls[3].sql, /INSERT INTO procurement_approvals/);
  assert.deepEqual(calls[3].params, [tenantA, procurementRequestId, 'approved', 'Checked', teacherId]);
  assert.match(calls[4].sql, /UPDATE procurement_requests request/);
  assert.deepEqual(calls[4].params, [tenantA, procurementRequestId, 'approved']);
  assert.match(calls[5].sql, /UPDATE dashboard_approval_requests approval/);
  assert.equal(sideEffects.length, 3);
  assert.match(sideEffects[0].sql, /INSERT INTO procurement_audit_logs/);
  assert.match(sideEffects[0].sql, /procurement\.request\.approval_recorded/);
  assert.match(sideEffects[1].sql, /INSERT INTO audit_logs/);
  assert.ok(sideEffects[1].params.includes('approval.approved'));
  assert.match(sideEffects[2].sql, /INSERT INTO notifications/);
  assert.match(sideEffects[2].sql, /ON CONFLICT \(tenant_id, notification_key\) DO NOTHING/);
  assert.equal(sideEffects[2].params[0], tenantA);
  assert.equal(
    sideEffects[2].params[1],
    `procurement-decision:${approvalId}:approved:requester`,
  );
  assert.equal(sideEffects[2].params[2], otherUserId);
  assert.equal(sideEffects[2].params[3], 'PROCUREMENT_REQUEST_APPROVED');
  assert.equal(publishedEvents.length, 1);
  assert.equal(publishedEvents[0].hasTransaction, true);
  assert.equal(publishedEvents[0].input.event_name, 'procurement.request.approved');
  assert.equal(
    publishedEvents[0].input.event_key,
    `procurement.request.approved:${procurementRequestId}:${approvalId}`,
  );
  assert.equal(publishedEvents[0].input.aggregate_id, procurementRequestId);
  assert.equal(
    (publishedEvents[0].input.payload as Record<string, unknown>).requested_by_user_id,
    otherUserId,
  );

  await assert.rejects(
    () => service.decideRequest({
      tenantId: tenantA,
      approvalId,
      actorUserId: teacherId,
      actorRole: 'Deputy Principal',
      requestId: 'req-approval',
      decision: 'REJECTED',
      note: null,
    }),
    /rejection reason is required/i,
  );
});

test('ApprovalService fails closed and rolls back procurement domain changes for wrong-tenant, missing, unsupported, or stale projections', async () => {
  const approvalId = '00000000-0000-4000-8000-000000000211';
  const procurementRequestId = '00000000-0000-4000-8000-000000000212';
  const procurementApprovalId = '00000000-0000-4000-8000-000000000213';

  const createHarness = (options: {
    projectionTenant?: string;
    projectionModule?: string;
    projectionType?: string;
    requestTenant?: string;
    includeRequest?: boolean;
    failProjectionUpdate?: boolean;
    failEventPublish?: boolean;
    failNotificationWrite?: boolean;
    permissions?: string[];
  } = {}) => {
    const state = {
      projection: {
        id: approvalId,
        tenant_id: options.projectionTenant ?? tenantA,
        approval_key: `procurement-approval-${procurementRequestId}`,
        title: 'Chemistry reagents',
        reason: 'Restock laboratory',
        status: 'pending',
        approval_type: options.projectionType ?? 'PROCUREMENT',
        module: options.projectionModule ?? 'procurement',
        record_id: procurementRequestId,
        requested_by_user_id: otherUserId,
        approver_user_id: null,
        approver_role: 'deputy_principal',
        decision_by_role: null as string | null,
        decision_note: null,
        created_at: '2026-08-15T08:00:00.000Z',
        updated_at: '2026-08-15T08:00:00.000Z',
      },
      request: options.includeRequest === false ? null : {
        id: procurementRequestId,
        tenant_id: options.requestTenant ?? tenantA,
        status: 'submitted',
        requested_by_user_id: otherUserId,
      },
      domainApprovals: [] as Array<Record<string, unknown>>,
      sideEffects: [] as Array<{ sql: string; params: unknown[] }>,
      events: [] as Array<{ input: Record<string, unknown>; hasTransaction: boolean }>,
    };
    const prisma = {
      executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => {
        const before = structuredClone(state);
        try {
          return await callback({
            $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
              if (/FROM dashboard_approval_requests approval/.test(sql) && /FOR UPDATE OF approval/.test(sql)) {
                const pendingRoleMatches = state.projection.approver_user_id === userId
                  || (!state.projection.approver_user_id && state.projection.approver_role === params[3]);
                const replayMatches = state.projection.status === String(params[4]).toLowerCase()
                  && state.projection.approver_user_id === userId
                  && state.projection.decision_by_role === params[3];
                return state.projection.id === params[0]
                  && state.projection.tenant_id === params[1]
                  && state.projection.requested_by_user_id !== userId
                  && (
                    (state.projection.status === 'pending' && pendingRoleMatches)
                    || replayMatches
                  )
                  ? [{ ...state.projection }]
                  : [];
              }
              if (/FROM dashboard_approval_requests approval/.test(sql)) {
                const pendingRoleMatches = state.projection.approver_user_id === userId
                  || (!state.projection.approver_user_id && state.projection.approver_role === params[4]);
                const replayMatches = state.projection.status === String(params[5]).toLowerCase()
                  && state.projection.approver_user_id === userId
                  && state.projection.decision_by_role === params[4];
                return state.projection.tenant_id === params[0]
                  && state.projection.approval_key === params[1]
                  && state.projection.record_id === params[2]
                  && state.projection.requested_by_user_id !== userId
                  && (
                    (state.projection.status === 'pending' && pendingRoleMatches)
                    || replayMatches
                  )
                  ? [{ id: state.projection.id }]
                  : [];
              }
              if (/INNER JOIN procurement_approvals domain_approval/.test(sql)) {
                const domainApproval = state.domainApprovals.find((approval) =>
                  approval.tenant_id === params[0]
                  && approval.request_id === params[1]
                  && approval.decision === params[3]
                  && approval.approver_user_id === params[4]);
                return state.request
                  && state.request.tenant_id === params[0]
                  && state.request.id === params[1]
                  && state.request.requested_by_user_id === params[2]
                  && state.request.status === params[3]
                  && domainApproval
                  ? [{ approval_id: domainApproval.id }]
                  : [];
              }
              if (/FROM procurement_requests request/.test(sql)) {
                return state.request
                  && state.request.tenant_id === params[0]
                  && state.request.id === params[1]
                  && state.request.requested_by_user_id === params[2]
                  && state.request.status === 'submitted'
                  ? [{ ...state.request }]
                  : [];
              }
              if (/INSERT INTO procurement_approvals/.test(sql)) {
                state.domainApprovals.push({
                  id: procurementApprovalId,
                  tenant_id: params[0],
                  request_id: params[1],
                  decision: params[2],
                  approver_user_id: params[4],
                });
                return [{ id: procurementApprovalId }];
              }
              if (/UPDATE procurement_requests request/.test(sql)) {
                if (
                  state.request
                  && state.request.tenant_id === params[0]
                  && state.request.id === params[1]
                  && state.request.status === 'submitted'
                ) {
                  state.request.status = String(params[2]);
                  return [{ id: state.request.id, status: state.request.status }];
                }
                return [];
              }
              if (/UPDATE dashboard_approval_requests approval/.test(sql)) {
                if (options.failProjectionUpdate) {
                  return [];
                }
                state.projection.status = String(params[0]).toLowerCase();
                state.projection.approver_user_id = String(params[1]);
                state.projection.decision_by_role = String(params[3]);
                state.projection.decision_note = params[2] === null ? null : String(params[2]);
                return [{ ...state.projection }];
              }
              return [];
            },
            $executeRawUnsafe: async (sql: string, ...params: unknown[]) => {
              if (options.failNotificationWrite && /INSERT INTO notifications/.test(sql)) {
                throw new Error('requester notification unavailable');
              }
              state.sideEffects.push({ sql, params });
              return 1;
            },
          });
        } catch (error) {
          state.projection = before.projection;
          state.request = before.request;
          state.domainApprovals = before.domainApprovals;
          state.sideEffects = before.sideEffects;
          state.events = before.events;
          throw error;
        }
      },
    };

    return {
      state,
      service: new ApprovalService(prisma as never, {
        getStore: () => ({ permissions: options.permissions ?? ['procurement:approve'] }),
      } as never, {
        publish: async (input: Record<string, unknown>, tx: unknown) => {
          state.events.push({ input, hasTransaction: Boolean(tx) });
          if (options.failEventPublish) {
            throw new Error('procurement decision outbox unavailable');
          }
          return input;
        },
      } as never),
    };
  };

  const decide = (service: ApprovalService, tenantId = tenantA) => service.decideRequest({
    tenantId,
    approvalId,
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
    requestId: 'req-approval-bridge',
    decision: 'APPROVED',
    note: 'Verified',
  });

  const success = createHarness();
  await decide(success.service);
  assert.equal(success.state.request?.status, 'approved');
  assert.equal(success.state.projection.status, 'approved');
  assert.equal(success.state.domainApprovals.length, 1);
  assert.equal(success.state.domainApprovals[0].tenant_id, tenantA);
  assert.equal(success.state.sideEffects.length, 3);
  const requesterNotification = success.state.sideEffects.find(({ sql }) => /INSERT INTO notifications/.test(sql));
  assert.ok(requesterNotification);
  assert.equal(requesterNotification.params[0], tenantA);
  assert.equal(requesterNotification.params[2], otherUserId);
  assert.match(requesterNotification.sql, /ON CONFLICT \(tenant_id, notification_key\) DO NOTHING/);
  assert.equal(success.state.events.length, 1);
  assert.equal(success.state.events[0].hasTransaction, true);
  assert.equal(success.state.events[0].input.event_name, 'procurement.request.approved');
  assert.equal(
    success.state.events[0].input.event_key,
    `procurement.request.approved:${procurementRequestId}:${approvalId}`,
  );
  const replay = await success.service.decideProcurementRequest({
    tenantId: tenantA,
    procurementRequestId,
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
    requestId: 'req-approval-replay',
    decision: 'APPROVED',
    note: 'Verified',
  });
  assert.equal(replay.status, 'approved');
  assert.equal(success.state.domainApprovals.length, 1);
  assert.equal(success.state.sideEffects.length, 3);
  assert.equal(success.state.events.length, 1);

  await assert.rejects(
    () => success.service.decideProcurementRequest({
      tenantId: tenantA,
      procurementRequestId,
      actorUserId: teacherId,
      actorRole: 'Deputy Principal',
      requestId: 'req-approval-contradictory-replay',
      decision: 'REJECTED',
      note: 'Changed decision',
    }),
    /not found for the active school assignee/i,
  );
  assert.equal(success.state.domainApprovals.length, 1);
  assert.equal(success.state.sideEffects.length, 3);
  assert.equal(success.state.events.length, 1);

  const inconsistentReplay = createHarness();
  inconsistentReplay.state.projection.status = 'approved';
  inconsistentReplay.state.projection.approver_user_id = teacherId;
  inconsistentReplay.state.projection.decision_by_role = 'deputy_principal';
  if (inconsistentReplay.state.request) {
    inconsistentReplay.state.request.status = 'approved';
  }
  await assert.rejects(
    () => inconsistentReplay.service.decideProcurementRequest({
      tenantId: tenantA,
      procurementRequestId,
      actorUserId: teacherId,
      actorRole: 'Deputy Principal',
      requestId: 'req-approval-inconsistent-replay',
      decision: 'APPROVED',
      note: 'Verified',
    }),
    /completed procurement decision was not found/i,
  );
  assert.equal(inconsistentReplay.state.sideEffects.length, 0);
  assert.equal(inconsistentReplay.state.events.length, 0);

  const rejected = createHarness();
  await rejected.service.decideRequest({
    tenantId: tenantA,
    approvalId,
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
    requestId: 'req-approval-rejected',
    decision: 'REJECTED',
    note: 'Budget unavailable',
  });
  const rejectedNotification = rejected.state.sideEffects.find(({ sql }) => /INSERT INTO notifications/.test(sql));
  assert.ok(rejectedNotification);
  assert.equal(rejectedNotification.params[0], tenantA);
  assert.equal(rejectedNotification.params[2], otherUserId);
  assert.equal(rejectedNotification.params[3], 'PROCUREMENT_REQUEST_REJECTED');
  assert.match(String(rejectedNotification.params[5]), /Budget unavailable/);
  assert.equal(rejected.state.events[0].input.event_name, 'procurement.request.rejected');

  const wrongTenant = createHarness();
  await assert.rejects(() => decide(wrongTenant.service, 'tenant-b'), /active school role/i);
  assert.equal(wrongTenant.state.request?.status, 'submitted');
  assert.equal(wrongTenant.state.domainApprovals.length, 0);
  assert.equal(wrongTenant.state.sideEffects.length, 0);

  const unsupported = createHarness({ projectionModule: 'exams', projectionType: 'report_card_publish' });
  await assert.rejects(() => decide(unsupported.service), /shared inbox has no safe domain transition/i);
  assert.equal(unsupported.state.request?.status, 'submitted');
  assert.equal(unsupported.state.domainApprovals.length, 0);
  assert.equal(unsupported.state.sideEffects.length, 0);

  const missingDomain = createHarness({ requestTenant: 'tenant-b' });
  await assert.rejects(() => decide(missingDomain.service), /pending procurement request was not found/i);
  assert.equal(missingDomain.state.request?.status, 'submitted');
  assert.equal(missingDomain.state.domainApprovals.length, 0);
  assert.equal(missingDomain.state.sideEffects.length, 0);

  const unauthorized = createHarness({ permissions: ['auth:read', 'events:write'] });
  await assert.rejects(() => decide(unauthorized.service), /procurement approval permission is required/i);
  assert.equal(unauthorized.state.request?.status, 'submitted');
  assert.equal(unauthorized.state.domainApprovals.length, 0);
  assert.equal(unauthorized.state.sideEffects.length, 0);

  const staleProjection = createHarness({ failProjectionUpdate: true });
  await assert.rejects(() => decide(staleProjection.service), /active school role/i);
  assert.equal(staleProjection.state.request?.status, 'submitted');
  assert.equal(staleProjection.state.projection.status, 'pending');
  assert.equal(staleProjection.state.domainApprovals.length, 0);
  assert.equal(staleProjection.state.sideEffects.length, 0);

  const failedEvent = createHarness({ failEventPublish: true });
  await assert.rejects(() => decide(failedEvent.service), /procurement decision outbox unavailable/i);
  assert.equal(failedEvent.state.request?.status, 'submitted');
  assert.equal(failedEvent.state.projection.status, 'pending');
  assert.equal(failedEvent.state.domainApprovals.length, 0);
  assert.equal(failedEvent.state.sideEffects.length, 0);
  assert.equal(failedEvent.state.events.length, 0);

  const failedNotification = createHarness({ failNotificationWrite: true });
  await assert.rejects(() => decide(failedNotification.service), /requester notification unavailable/i);
  assert.equal(failedNotification.state.request?.status, 'submitted');
  assert.equal(failedNotification.state.projection.status, 'pending');
  assert.equal(failedNotification.state.domainApprovals.length, 0);
  assert.equal(failedNotification.state.sideEffects.length, 0);
  assert.equal(failedNotification.state.events.length, 0);
});

test('DashboardController derives school and active role from RequestContext and rejects a forged role query', async () => {
  const requestContext = new RequestContextService();
  const summaries: unknown[] = [];
  const service = {
    getDashboardFeed: async () => [],
    getDashboardSummary: async (input: unknown) => {
      summaries.push(input);
      return { openTasks: 0, unreadNotifications: 0, pendingApprovals: 0 };
    },
  };
  const controller = new DashboardController(service as never, requestContext);

  await runAs(requestContext, { role: 'Deputy Principal' }, () => controller.getSummary('deputy_principal'));
  assert.deepEqual(summaries[0], {
    schoolId: tenantA,
    userId: teacherId,
    role: 'Deputy Principal',
  });

  await assert.rejects(
    () => runAs(requestContext, { role: 'Deputy Principal' }, () => controller.getSummary('principal')),
    /not the active school role/i,
  );
});

test('DashboardFeedService reads canonical tenant-scoped communication tables in one summary snapshot', async () => {
  const calls: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
  const prisma = {
    executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, userId, sql, params });
        return [{ open_tasks: 2, unread_notifications: 3, pending_approvals: 1 }];
      },
    }),
  };
  const service = new DashboardFeedService(prisma as never);

  const summary = await service.getDashboardSummary({
    schoolId: tenantA,
    userId: teacherId,
    role: 'Deputy Principal',
  });

  assert.deepEqual(summary, { openTasks: 2, unreadNotifications: 3, pendingApprovals: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].tenantId, tenantA);
  assert.equal(calls[0].userId, teacherId);
  assert.deepEqual(calls[0].params, [tenantA, teacherId, 'deputy_principal']);
  assert.match(calls[0].sql, /FROM tasks task/);
  assert.match(calls[0].sql, /FROM notifications notification/);
  assert.match(calls[0].sql, /metadata->'target_roles'/);
  assert.match(calls[0].sql, /metadata->'audienceRoles'/);
  assert.match(calls[0].sql, /FROM dashboard_approval_requests approval/);
  assert.doesNotMatch(calls[0].sql, /FROM dashboard_tasks|FROM approval_requests/);
  assert.match(calls[0].sql, /tenant_id::text = \$1::text/g);
});

test('WorkflowController ignores forged actor fields and binds event creation to the authenticated school context', async () => {
  const requestContext = new RequestContextService();
  const calls: unknown[] = [];
  const service = {
    listEvents: async () => [],
    createWorkflowEvent: async (input: unknown, principal: unknown) => {
      calls.push({ input, principal });
      return {};
    },
    dispatchWorkflowEvent: async () => ({}),
    markEventHandled: async () => ({}),
  };
  const controller = new WorkflowController(service as never, requestContext);
  const input = {
    schoolId: 'tenant-b',
    sourceUserId: otherUserId,
    sourceRole: 'principal',
    targetRoles: ['teacher'],
    eventType: 'lesson.coverage_requested',
    entityType: 'lesson',
    title: 'Cover lesson',
  };

  await runAs(requestContext, { role: 'Deputy Principal' }, () => controller.createEvent(input));

  assert.deepEqual(calls[0], {
    input,
    principal: {
      tenantId: tenantA,
      userId: teacherId,
      role: 'Deputy Principal',
      requestId: 'req-workflow-communication',
    },
  });
});

test('WorkflowService persists the server-derived tenant and actor, validates school roles, and audits transactionally', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const audits: Array<{ sql: string; params: unknown[] }> = [];
  const prisma = {
    executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => {
      assert.equal(tenantId, tenantA);
      assert.equal(userId, teacherId);
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          queries.push({ sql, params });
          if (/FROM roles role/.test(sql)) {
            return [{ code: 'teacher' }];
          }
          return [{
            id: 'event-a',
            event_type: 'lesson.coverage_requested',
            entity_type: 'lesson',
            target_roles: ['teacher'],
            status: 'pending',
          }];
        },
        $executeRawUnsafe: async (sql: string, ...params: unknown[]) => {
          audits.push({ sql, params });
          return 1;
        },
      });
    },
  };
  const service = new WorkflowService(prisma as never);

  await service.createWorkflowEvent({
    schoolId: 'tenant-b',
    sourceUserId: otherUserId,
    sourceRole: 'principal',
    targetRoles: ['Teacher'],
    eventType: 'lesson.coverage_requested',
    entityType: 'lesson',
    entityId: 'lesson-a',
    title: 'Cover lesson',
    payload: {
      schoolId: 'tenant-b',
      school_id: 'tenant-b',
      tenantId: 'tenant-b',
      tenant_id: 'tenant-b',
      actorUserId: otherUserId,
      actor_user_id: otherUserId,
      actorRole: 'principal',
      actor_role: 'principal',
      createdBy: otherUserId,
      created_by: otherUserId,
      source: 'forged-source',
      sourceUserId: otherUserId,
      source_user_id: otherUserId,
      sourceRole: 'principal',
      source_role: 'principal',
      sourceDashboard: 'forged-dashboard',
      source_dashboard: 'forged-dashboard',
      sourceModule: 'forged-module',
      source_module: 'forged-module',
      targetUserId: otherUserId,
      target_user_id: otherUserId,
      targetUserIds: [otherUserId],
      target_user_ids: [otherUserId],
      recipientUserId: otherUserId,
      recipient_user_id: otherUserId,
      recipientUserIds: [otherUserId],
      recipient_user_ids: [otherUserId],
      audienceUserIds: [otherUserId],
      audience_user_ids: [otherUserId],
      targetRole: 'principal',
      target_role: 'principal',
      recipientRole: 'principal',
      recipient_role: 'principal',
      targetRoles: ['principal'],
      target_roles: ['principal'],
      audienceRoles: ['principal'],
      audience_roles: ['principal'],
      lessonId: 'lesson-a',
    },
  }, {
    tenantId: tenantA,
    userId: teacherId,
    role: 'Deputy Principal',
    requestId: 'req-workflow',
  });

  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /role\.tenant_id::text = \$1::text/);
  assert.deepEqual(queries[0].params, [tenantA, JSON.stringify(['teacher'])]);
  assert.match(queries[1].sql, /INSERT INTO workflow_events/);
  assert.equal(queries[1].params[0], tenantA);
  assert.equal(queries[1].params[1], teacherId);
  assert.equal(queries[1].params[2], 'deputy_principal');
  assert.deepEqual(JSON.parse(String(queries[1].params[10])), { lessonId: 'lesson-a' });
  assert.equal(audits.length, 1);
  assert.match(audits[0].sql, /INSERT INTO audit_logs/);
  assert.ok(audits[0].params.includes('workflow.event_created'));
});

test('WorkflowService enforces source dispatch and audience handling as forward-only state transitions', async () => {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const prisma = {
    executeWithTenant: async (_tenantId: string, _userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ sql, params });
        return [];
      },
      $executeRawUnsafe: async () => 1,
    }),
  };
  const service = new WorkflowService(prisma as never);
  const principal = {
    tenantId: tenantA,
    userId: teacherId,
    role: 'Deputy Principal',
    requestId: 'req-workflow-transition',
  };

  await assert.rejects(
    () => service.dispatchWorkflowEvent('event-a', principal),
    /not found for the active school role/i,
  );
  assert.match(calls[0].sql, /event\.source_user_id::text = \$2::text/);
  assert.match(calls[0].sql, /lower\(event\.status\) IN \('pending', 'created', 'queued'\)/);

  await assert.rejects(
    () => service.markEventHandled('event-a', principal),
    /not found for the active school role/i,
  );
  assert.match(calls[1].sql, /lower\(event\.status\) = 'dispatched'/);
  assert.match(calls[1].sql, /targetUserId/);
  assert.match(calls[1].sql, /target_roles/);
});
