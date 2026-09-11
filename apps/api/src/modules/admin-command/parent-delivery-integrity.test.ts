import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { NurseCommandService } from './nurse-command.service';
import { TeacherCommandService } from './teacher-command.service';

const TENANT_ID = 'tenant-a';
const ACTOR_USER_ID = '11111111-1111-4111-8111-111111111111';

function requiredText(value: unknown, label: string): string {
  const text = String(value ?? '').trim();
  if (!text) throw new BadRequestException(`${label} is required`);
  return text;
}

test('TeacherCommandService atomically rejects a forged guardian outside the teacher assignment', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TeacherCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {} as never,
    {
      requiredText,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            assigned_scope_count: params[3] === 'guardian-assigned-a' ? 1 : 0,
            guardian_count: params[3] === 'guardian-assigned-a' ? 1 : 0,
            portal_notification_count: params[3] === 'guardian-assigned-a' ? 1 : 0,
            sms_queue_count: params[3] === 'guardian-assigned-a' ? 1 : 0,
            event_id: params[3] === 'guardian-assigned-a' ? 'event-a' : null,
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  await assert.rejects(
    () => service.sendParentMessage({
      audience: 'individual_parent',
      recipient: 'guardian-from-another-school',
      subject: 'Progress follow-up',
      message: 'Please review the learner progress note in the portal.',
    }),
    (error: unknown) => error instanceof ForbiddenException,
  );

  assert.equal(writes.length, 1, 'a forged target must be handled by one all-or-nothing statement');
  assert.deepEqual(writes[0].params.slice(0, 4), [
    TENANT_ID,
    ACTOR_USER_ID,
    'individual_parent',
    'guardian-from-another-school',
  ]);
  assert.match(writes[0].sql, /assignment\.tenant_id = \$1/i);
  assert.match(writes[0].sql, /assignment\.teacher_user_id::text = \$2/i);
  assert.match(writes[0].sql, /guardian\.id::text = \$4/i);
  assert.match(writes[0].sql, /INNER JOIN tenant_memberships membership/i);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/i);
  assert.match(writes[0].sql, /'\["class_teacher","secretary","principal"\]'::jsonb/i);
  assert.doesNotMatch(writes[0].sql, /'\["parent"/i);
});

test('TeacherCommandService reports exact portal and SMS delivery counts from the atomic result', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TeacherCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {} as never,
    {
      requiredText,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            assigned_scope_count: 1,
            guardian_count: 2,
            portal_notification_count: 2,
            sms_queue_count: 1,
            event_id: 'event-a',
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.sendParentMessage({
    audience: 'class_parents',
    recipient: 'class-section-a',
    subject: '   ',
    message: 'The assignment is available in the parent portal.',
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0].params[4], 'Teacher parent communication');
  assert.equal(result.success, true);
  assert.equal(result.queuedCount, 2);
  assert.deepEqual(result.delivery, {
    event_id: 'event-a',
    guardian_count: 2,
    portal_notification_count: 2,
    sms_queue_count: 1,
    sms_processing_count: 0,
    sms_accepted_count: 0,
    sms_needs_review_count: 0,
    sms_outbox_count: 1,
    recipient_scope: 'exact_linked_guardian_users',
  });
  assert.equal(
    result.message,
    'Parent portal message queued for 2 exact guardian accounts (2 portal; SMS: 1 queued, 0 dispatching, 0 provider-accepted, 0 requiring review).',
  );
});

test('TeacherCommandService sent-message history is limited to the exact guardian notification ledger', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new TeacherCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return {
          rows: [{
            id: 'notification-a',
            from: 'You',
            subject: 'Progress follow-up',
            recipient: 'Akinyi Otieno',
            message: 'Please review the learner progress note in the portal.',
            date: '2026-08-22',
            status: 'Available in portal',
          }],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const result = await service.getMessages();

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].recipient, 'Akinyi Otieno');
  assert.deepEqual(queries[0].params, [TENANT_ID, ACTOR_USER_ID]);
  assert.match(queries[0].sql, /FROM notifications notification/i);
  assert.match(queries[0].sql, /INNER JOIN workflow_events event/i);
  assert.match(queries[0].sql, /event\.source_user_id::text = \$2/i);
  assert.match(queries[0].sql, /guardian\.id::text = notification\.recipient_guardian_id::text/i);
  assert.match(queries[0].sql, /guardian\.user_id::text = notification\.recipient_user_id::text/i);
  assert.match(queries[0].sql, /notification\.tenant_id = \$1/i);
  assert.doesNotMatch(queries[0].sql, /FROM communication_sms_outbox/i);
});

test('NurseCommandService rejects forged learner and guardian IDs without trusting submitted contact text', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new NurseCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => value,
      requiredText,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        const studentIsCanonical = params[2] === 'student-a';
        const guardianIsCanonical = params[3] == null || params[3] === 'guardian-a';
        const eligible = studentIsCanonical && guardianIsCanonical;
        return {
          rows: [{
            student_count: studentIsCanonical ? 1 : 0,
            guardian_count: eligible ? 1 : 0,
            sms_eligible_count: eligible ? 1 : 0,
            portal_notification_count: eligible ? 1 : 0,
            sms_queue_count: params[4] === 'sms' && eligible ? 1 : 0,
            event_id: eligible ? 'nurse-event-a' : null,
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  await assert.rejects(
    () => service.sendParentNotification({
      student_id: 'student-from-another-school',
      guardian_id: 'guardian-a',
      parent_name: 'Forged Parent',
      parent_phone: '+254700000000',
      channel: 'sms',
      message: 'Please contact the clinic.',
    }),
    (error: unknown) => error instanceof BadRequestException,
  );
  await assert.rejects(
    () => service.sendParentNotification({
      student_id: 'student-a',
      guardian_id: 'guardian-from-another-school',
      parent_phone: '+254711111111',
      channel: 'sms',
      message: 'Please contact the clinic.',
    }),
    (error: unknown) => error instanceof BadRequestException,
  );

  assert.equal(writes.length, 2);
  assert.equal(writes[0].params.includes('Forged Parent'), false);
  assert.equal(writes[0].params.includes('+254700000000'), false);
  assert.equal(writes[1].params.includes('+254711111111'), false);
  assert.match(writes[0].sql, /student\.tenant_id = \$1/i);
  assert.match(writes[0].sql, /guardian\.student_id::text = student\.student_id/i);
  assert.match(writes[0].sql, /guardian\.id::text = \$4/i);
  assert.match(writes[0].sql, /INNER JOIN tenant_memberships membership/i);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/i);
  assert.match(writes[0].sql, /'\["nurse","principal","deputy_principal"\]'::jsonb/i);
  assert.doesNotMatch(writes[0].sql, /'\["parent"/i);
});

test('NurseCommandService returns truthful exact delivery counts and rejects unsupported fake email delivery', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new NurseCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => value,
      requiredText,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            student_count: 1,
            guardian_count: 1,
            sms_eligible_count: 1,
            portal_notification_count: 1,
            sms_queue_count: 1,
            event_id: 'nurse-event-a',
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  await assert.rejects(
    () => service.sendParentNotification({
      student_id: 'student-a',
      guardian_id: 'guardian-a',
      channel: 'email',
      message: 'Please contact the clinic.',
    }),
    (error: unknown) => error instanceof BadRequestException,
  );
  assert.equal(writes.length, 0, 'an unsupported channel must fail before persistence');

  const result = await service.sendParentNotification({
    student_id: 'student-a',
    guardian_id: 'guardian-a',
    channel: 'sms',
    message: 'Please contact the clinic.',
  });

  assert.equal(writes.length, 1);
  assert.equal(result.success, true);
  assert.deepEqual(result.delivery, {
    event_id: 'nurse-event-a',
    guardian_count: 1,
    portal_notification_count: 1,
    sms_queue_count: 1,
    sms_processing_count: 0,
    sms_accepted_count: 0,
    sms_needs_review_count: 0,
    sms_outbox_count: 1,
    recipient_scope: 'exact_linked_guardian_users',
  });
  assert.equal(
    result.message,
    'Health alert recorded for 1 exact guardian account (1 portal; SMS: 1 queued, 0 dispatching, 0 provider-accepted, 0 requiring review).',
  );
});

test('NurseCommandService reports queued health alerts without claiming SMS delivery', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const today = new Date().toISOString();
  const service = new NurseCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return /FROM notifications notification/i.test(sql)
          ? {
              rows: [
                { id: 'notification-sms', queued_at: today, status: 'Queued' },
                { id: 'notification-portal', queued_at: today, status: 'Sent' },
              ],
              rowCount: 2,
            }
          : { rows: [], rowCount: 0 };
      },
    } as never,
    {} as never,
  );

  const result = await service.getParentNotifications();

  assert.deepEqual(result.metrics, { queued_today: 2, pending: 1, failed: 0 });
  assert.equal('sent_today' in result.metrics, false);
  assert.equal(queries.length, 2);
  assert.ok(queries.every((query) => query.params[0] === TENANT_ID));
  assert.match(queries[0].sql, /notification\.tenant_id = \$1/i);
  assert.match(queries[0].sql, /recipient_user_id IS NOT NULL/i);
  assert.match(queries[0].sql, /recipient_guardian_id IS NOT NULL/i);
  assert.match(queries[0].sql, /THEN 'sms \+ in-app'/i);
  assert.match(queries[0].sql, /AS queued_at/i);
});

test('NurseCommandService resend is tenant/exact-recipient guarded and requeues the recorded channel', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new NurseCommandService(
    {
      getStore: () => ({ tenant_id: TENANT_ID, user_id: ACTOR_USER_ID }),
    } as never,
    {} as never,
    {
      uuidOrNull: (value: unknown) => value,
      requiredText,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        if (params[2] !== 'notification-a') return { rows: [], rowCount: 0 };
        return {
          rows: [{
            notification_id: 'notification-a',
            channel: 'sms',
            portal_notification_count: 1,
            sms_queue_count: 1,
            event_id: 'resend-event-a',
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  await assert.rejects(
    () => service.resendParentNotification('notification-from-another-school'),
    (error: unknown) => error instanceof NotFoundException,
  );
  const result = await service.resendParentNotification('notification-a');

  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].params, [TENANT_ID, ACTOR_USER_ID, 'notification-from-another-school']);
  assert.match(writes[0].sql, /notification\.tenant_id = \$1/i);
  assert.match(writes[0].sql, /notification\.id::text = \$3/i);
  assert.match(writes[0].sql, /guardian\.id = notification\.recipient_guardian_id/i);
  assert.match(writes[0].sql, /guardian\.user_id = notification\.recipient_user_id/i);
  assert.match(writes[0].sql, /INNER JOIN tenant_memberships membership/i);
  assert.equal(result.success, true);
  assert.deepEqual(result.delivery, {
    event_id: 'resend-event-a',
    notification_id: 'notification-a',
    portal_notification_count: 1,
    sms_queue_count: 1,
    sms_processing_count: 0,
    sms_accepted_count: 0,
    sms_needs_review_count: 0,
    sms_outbox_count: 1,
    recipient_scope: 'exact_linked_guardian_user',
  });
});
