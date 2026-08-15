// @ts-nocheck
import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { RequestContextService } from '../../common/request-context/request-context.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import '../workflow/workflow-communication.test';

type StoredNotification = {
  id: string;
  tenant_id: string;
  notification_key: string;
  recipient_user_id: string | null;
  recipient_role: string | null;
  type: string;
  title: string;
  body: string;
  status: string;
  priority: string;
  source_module: string;
  source_record_id: string | null;
  metadata: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function createNotificationsHarness() {
  const rows: StoredNotification[] = [];
  const tenantCalls: Array<{ tenantId: string; userId: string | null }> = [];
  const sqlCalls: Array<{ sql: string; params: unknown[] }> = [];
  let sequence = 0;

  const normalizeRole = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const isRecipient = (row: StoredNotification, userId: string, role: string) => {
    const effectiveUserId = row.recipient_user_id
      ?? (typeof row.metadata.targetUserId === 'string' ? row.metadata.targetUserId : null)
      ?? (typeof row.metadata.recipientUserId === 'string' ? row.metadata.recipientUserId : null);
    if (effectiveUserId) return effectiveUserId === userId;
    const metadataRoles = [
      ...(Array.isArray(row.metadata.target_roles) ? row.metadata.target_roles : []),
      ...(Array.isArray(row.metadata.audienceRoles) ? row.metadata.audienceRoles : []),
    ].map(normalizeRole);
    const normalizedRole = normalizeRole(role);
    return normalizeRole(row.recipient_role) === normalizedRole
      || normalizeRole(row.metadata.recipientRole) === normalizedRole
      || normalizeRole(row.metadata.targetRole) === normalizedRole
      || metadataRoles.includes(normalizedRole);
  };

  const prisma = {
    executeWithTenant: async (
      tenantId: string,
      userId: string | null,
      callback: (tx: { $queryRawUnsafe: (sql: string, ...params: unknown[]) => Promise<unknown[]> }) => Promise<unknown>,
    ) => {
      tenantCalls.push({ tenantId, userId });
      return callback({
        $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
          sqlCalls.push({ sql, params });

          if (/INSERT INTO notifications/.test(sql)) {
            const [tenant, key, recipientUserId, recipientRole, type, title, body, status, priority, moduleName, recordId, metadataJson] = params;
            const existing = rows.find((row) => row.tenant_id === tenant && row.notification_key === key);
            const now = new Date('2026-08-15T08:00:00.000Z');
            const values = {
              tenant_id: String(tenant),
              notification_key: String(key),
              recipient_user_id: recipientUserId ? String(recipientUserId) : null,
              recipient_role: recipientRole ? String(recipientRole) : null,
              type: String(type),
              title: String(title),
              body: String(body),
              status: String(status),
              priority: String(priority),
              source_module: String(moduleName),
              source_record_id: recordId ? String(recordId) : null,
              metadata: JSON.parse(String(metadataJson)),
              updated_at: now,
            };
            if (existing) {
              Object.assign(existing, values);
              return [existing];
            }

            const created: StoredNotification = {
              id: `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
              ...values,
              read_at: null,
              created_at: now,
            };
            rows.push(created);
            return [created];
          }

          if (/UPDATE notifications notification/.test(sql)) {
            const [tenantIdParam, userIdParam, roleParam, idParam] = params.map((value) => value === null ? '' : String(value));
            let matches = rows.filter((row) => row.tenant_id === tenantIdParam
              && isRecipient(row, userIdParam, roleParam)
              && (!idParam || row.id === idParam));
            if (params.length === 3) {
              matches = matches.filter((row) => ['unread', 'action_required'].includes(row.status));
            }
            for (const row of matches) {
              if (/status = 'dismissed'/.test(sql)) row.status = 'dismissed';
              else if (/status = 'action_taken'/.test(sql)) row.status = 'action_taken';
              else if (/status = 'read'/.test(sql)) {
                row.status = 'read';
                row.read_at = new Date('2026-08-15T08:05:00.000Z');
              }
            }
            return params.length === 3 ? matches.map((row) => ({ id: row.id })) : matches;
          }

          if (/FROM notifications notification/.test(sql)) {
            const [tenantIdParam, userIdParam, roleParam, moduleParam, statusParam, limitParam, skipParam] = params;
            let matches = rows.filter((row) => row.tenant_id === tenantIdParam
              && isRecipient(row, String(userIdParam), String(roleParam)));
            if (moduleParam) matches = matches.filter((row) => row.source_module === moduleParam);
            if (statusParam === 'unread') matches = matches.filter((row) => ['unread', 'action_required'].includes(row.status));
            else if (statusParam) matches = matches.filter((row) => row.status === statusParam);

            if (/COALESCE\(\s*notification\.source_module/.test(sql)) {
              return matches
                .filter((row) => ['unread', 'action_required'].includes(row.status))
                .map((row) => ({ module: row.source_module, priority: row.priority }));
            }

            const skip = Number(skipParam ?? 0);
            const limit = Number(limitParam ?? 50);
            return matches.slice(skip, skip + limit);
          }

          throw new Error(`Unexpected notification SQL: ${sql}`);
        },
      });
    },
  };

  return { prisma, rows, tenantCalls, sqlCalls };
}

test('NotificationsController sources tenant, user, and active role from RequestContextService for every endpoint', async () => {
  const requestContext = new RequestContextService();
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const service = {
    getUserNotifications: async (...args: unknown[]) => { calls.push({ method: 'list', args }); return []; },
    getBadges: async (...args: unknown[]) => { calls.push({ method: 'badges', args }); return {}; },
    markAllAsRead: async (...args: unknown[]) => { calls.push({ method: 'read-all', args }); return {}; },
    safeMarkAsRead: async (...args: unknown[]) => { calls.push({ method: 'read', args }); return {}; },
    dismiss: async (...args: unknown[]) => { calls.push({ method: 'dismiss', args }); return {}; },
    markActionTaken: async (...args: unknown[]) => { calls.push({ method: 'action', args }); return {}; },
  };
  const controller = new NotificationsController(service as never, requestContext);

  await requestContext.run(
    {
      request_id: 'req-notifications',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-4000-8000-000000000101',
      role: 'teacher',
      session_id: 'session-a',
      permissions: ['notifications:*'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'GET',
      path: '/v1/notifications',
      started_at: '2026-08-15T08:00:00.000Z',
    },
    async () => {
      await controller.getUserNotifications('UNREAD', 'academics', '25', '0');
      await controller.getBadges();
      await controller.markAllAsRead();
      await controller.markAsRead('notification-1');
      await controller.dismiss('notification-2');
      await controller.markActionTaken('notification-3');
    },
  );

  assert.deepEqual(calls[0], {
    method: 'list',
    args: [
      'tenant-a',
      '00000000-0000-4000-8000-000000000101',
      'teacher',
      { status: 'UNREAD', module: 'academics', limit: '25', skip: '0' },
    ],
  });
  for (const call of calls.slice(1, 3)) {
    assert.deepEqual(call.args.slice(0, 3), [
      'tenant-a',
      '00000000-0000-4000-8000-000000000101',
      'teacher',
    ]);
  }
  for (const call of calls.slice(3)) {
    assert.deepEqual(call.args.slice(1), [
      'tenant-a',
      '00000000-0000-4000-8000-000000000101',
      'teacher',
    ]);
  }
});

test('NotificationsService isolates two tenants and authorizes user or active-role recipients on reads and mutations', async () => {
  const harness = createNotificationsHarness();
  const service = new NotificationsService(harness.prisma as never);
  const userOne = '00000000-0000-4000-8000-000000000101';
  const userTwo = '00000000-0000-4000-8000-000000000102';

  const userNotification = await service.createNotification({
    schoolId: 'tenant-a',
    actorUserId: userTwo,
    targetUserId: userOne,
    module: 'academics',
    eventType: 'marks.submitted',
    entityType: 'marks_batch',
    entityId: 'batch-a',
    title: 'Marks submitted',
    message: 'Your marks batch is ready for review.',
  });
  const teacherNotification = await service.createNotification({
    schoolId: 'tenant-a',
    actorUserId: userTwo,
    targetRole: 'teacher',
    module: 'timetable',
    eventType: 'relief.assigned',
    entityType: 'relief',
    entityId: 'relief-a',
    title: 'Relief assigned',
    message: 'Open your timetable.',
    actionUrl: '/school/teacher/my-timetable',
  });
  const roleAliasNotification = await service.createNotification({
    schoolId: 'tenant-a',
    actorUserId: userTwo,
    targetRole: 'deputy_principal',
    module: 'discipline',
    eventType: 'case.escalated',
    entityType: 'discipline_case',
    entityId: 'case-a',
    title: 'Case escalated',
    message: 'A deputy review is required.',
  });
  const specificallyAssignedNotification = await service.createNotification({
    schoolId: 'tenant-a',
    actorUserId: userTwo,
    targetUserId: userTwo,
    targetRole: 'teacher',
    module: 'academics',
    eventType: 'marks.returned',
    entityType: 'marks_batch',
    entityId: 'batch-private',
    title: 'Marks returned',
    message: 'Only the assigned teacher may see this.',
  });
  const bursarNotification = await service.createNotification({
    schoolId: 'tenant-a',
    actorUserId: userTwo,
    targetRole: 'accountant',
    module: 'finance',
    eventType: 'payment.received',
    entityType: 'payment',
    entityId: 'payment-a',
    title: 'Payment received',
    message: 'A payment was received.',
  });
  const otherTenantNotification = await service.createNotification({
    schoolId: 'tenant-b',
    actorUserId: userTwo,
    targetUserId: userOne,
    module: 'discipline',
    eventType: 'incident.created',
    entityType: 'incident',
    entityId: 'incident-b',
    title: 'Other school incident',
    message: 'This must not cross the school boundary.',
  });

  const visible = await service.getUserNotifications('tenant-a', userOne, 'teacher', { status: 'UNREAD' });
  assert.deepEqual(visible.map((item) => item.id).sort(), [userNotification.id, teacherNotification.id].sort());
  assert.equal(visible.some((item) => item.id === bursarNotification.id), false);
  assert.equal(visible.some((item) => item.id === otherTenantNotification.id), false);
  assert.equal(visible.some((item) => item.id === specificallyAssignedNotification.id), false);
  assert.equal(teacherNotification.message, 'Open your timetable.');
  assert.equal(teacherNotification.status, 'ACTION_REQUIRED');
  assert.equal(teacherNotification.actionUrl, '/school/teacher/my-timetable');

  const badges = await service.getBadges('tenant-a', userOne, 'teacher');
  assert.deepEqual(badges, {
    unreadCount: 2,
    urgentCount: 0,
    byModule: { academics: 1, timetable: 1 },
  });

  const deputyVisible = await service.getUserNotifications('tenant-a', userOne, 'Deputy Principal');
  assert.deepEqual(
    deputyVisible.map((item) => item.id).sort(),
    [userNotification.id, roleAliasNotification.id].sort(),
  );

  await assert.rejects(
    () => service.dismiss(teacherNotification.id, 'tenant-a', userOne, 'parent'),
    /not found for the active school role/i,
  );
  await assert.rejects(
    () => service.dismiss(userNotification.id, 'tenant-b', userOne, 'teacher'),
    /not found for the active school role/i,
  );

  const read = await service.safeMarkAsRead(teacherNotification.id, 'tenant-a', userOne, 'teacher');
  assert.equal(read.status, 'READ');
  const result = await service.markAllAsRead('tenant-a', userOne, 'teacher');
  assert.equal(result.count, 1);
  assert.equal(harness.rows.find((row) => row.id === otherTenantNotification.id)?.status, 'unread');
  assert.equal(harness.tenantCalls.every((call) => ['tenant-a', 'tenant-b'].includes(call.tenantId)), true);
  assert.equal(harness.tenantCalls.some((call) => call.tenantId === 'tenant-b'), true);

  const readSql = harness.sqlCalls.find((call) => /FROM notifications notification/.test(call.sql))?.sql ?? '';
  const mutationSql = harness.sqlCalls.find((call) => /UPDATE notifications notification/.test(call.sql))?.sql ?? '';
  assert.match(readSql, /notification\.tenant_id = \$1/);
  assert.match(readSql, /recipient_user_id/);
  assert.match(readSql, /recipient_role/);
  assert.match(mutationSql, /notification\.tenant_id = \$1/);
  assert.match(mutationSql, /recipient_user_id/);
  assert.match(mutationSql, /recipient_role/);
});
