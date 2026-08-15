// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { ApprovalController } from './controllers/approval.controller';
import { TaskController } from './controllers/task.controller';
import { ApprovalService } from './services/approval.service';

const tenantA = 'tenant-a';
const teacherId = '00000000-0000-4000-8000-000000000101';
const otherUserId = '00000000-0000-4000-8000-000000000102';

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
  assert.match(calls[0].sql, /assigned_to_role/);
  assert.match(calls[0].sql, /task\.tenant_id = \$1/);
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
  assert.match(updateSql, /task\.tenant_id = \$2/);
  assert.match(updateSql, /assigned_to_user_id::text = \$3/);
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

test('ApprovalService enforces tenant, explicit-user precedence, role aliases, self-approval denial, and transactional audit', async () => {
  const calls: Array<{ tenantId: string; userId: string; sql: string; params: unknown[] }> = [];
  const audits: Array<{ sql: string; params: unknown[] }> = [];
  const prisma = {
    executeWithTenant: async (tenantId: string, userId: string, callback: (tx: unknown) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
        calls.push({ tenantId, userId, sql, params });
        if (/UPDATE approval_requests/.test(sql)) {
          return [{
            id: 'approval-a',
            title: 'Publish report cards',
            reason: 'Term release',
            status: 'approved',
            approval_type: 'report_card_publish',
            module: 'exams',
            record_id: 'term-a',
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
        audits.push({ sql, params });
        return 1;
      },
    }),
  };
  const service = new ApprovalService(prisma as never);

  await service.listPendingForApprover({
    tenantId: tenantA,
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
  });
  assert.deepEqual(calls[0].params, [tenantA, teacherId, 'deputy_principal']);
  assert.match(calls[0].sql, /approval\.tenant_id = \$1/);
  assert.match(calls[0].sql, /requested_by_user_id::text IS DISTINCT FROM \$2/);
  assert.match(calls[0].sql, /approver_user_id IS NOT NULL/);
  assert.match(calls[0].sql, /approver_user_id IS NULL/);

  const approved = await service.decideRequest({
    tenantId: tenantA,
    approvalId: 'approval-a',
    actorUserId: teacherId,
    actorRole: 'Deputy Principal',
    requestId: 'req-approval',
    decision: 'APPROVED',
    note: 'Checked',
  });
  assert.equal(approved.status, 'approved');
  assert.equal(calls[1].tenantId, tenantA);
  assert.equal(calls[1].userId, teacherId);
  assert.match(calls[1].sql, /requested_by_user_id::text IS DISTINCT FROM \$2/);
  assert.match(calls[1].sql, /approver_user_id IS NULL/);
  assert.equal(audits.length, 1);
  assert.match(audits[0].sql, /INSERT INTO audit_logs/);
  assert.ok(audits[0].params.includes('approval.approved'));

  await assert.rejects(
    () => service.decideRequest({
      tenantId: tenantA,
      approvalId: 'approval-a',
      actorUserId: teacherId,
      actorRole: 'Deputy Principal',
      requestId: 'req-approval',
      decision: 'REJECTED',
      note: null,
    }),
    /rejection reason is required/i,
  );
});
