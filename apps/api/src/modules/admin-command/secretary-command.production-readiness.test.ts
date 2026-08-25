import assert from 'node:assert/strict';
import test from 'node:test';

import { SecretaryCommandService } from './secretary-command.service';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '22222222-2222-4222-8222-222222222222';
const GUARDIAN_ID = '33333333-3333-4333-8333-333333333333';
const GUARDIAN_USER_ID = '44444444-4444-4444-8444-444444444444';
const STAFF_PROFILE_ID = '55555555-5555-4555-8555-555555555555';
const STAFF_USER_ID = '66666666-6666-4666-8666-666666666666';

function requiredText(value: unknown, label: string) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function uuidOrNull(value: unknown) {
  const text = String(value ?? '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}

function requestContext() {
  return {
    getStore: () => ({ tenant_id: 'tenant-a', user_id: ACTOR_ID, role: 'secretary' }),
  };
}

test('Secretary command read contracts return the envelopes consumed by calls, parent messages, and document workspaces', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new SecretaryCommandService(
    requestContext() as never,
    {
      query: async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        const eventType = String(params[1]);
        if (eventType === 'frontoffice.call_logged') {
          return {
            rows: [{
              id: 'call-1',
              title: 'Call from Akinyi',
              message: 'Asked about term dates.',
              status: 'pending',
              priority: 'normal',
              is_today: true,
              created_at: '2026-08-22 09:15:00+03',
              payload: { caller: 'Akinyi', phone_number: '+254700000001', direction: 'incoming', subject: 'Term dates', action_required: true },
            }],
            rowCount: 1,
          };
        }
        if (eventType === 'frontoffice.parent_message') {
          return {
            rows: [{
              id: 'message-1',
              title: 'Document request',
              message: 'Please prepare the transfer letter.',
              status: 'replied',
              priority: 'high',
              is_today: true,
              created_at: '2026-08-22 10:00:00+03',
              payload: {
                guardian_name: 'Rose Akinyi',
                guardian_phone: '+254700000002',
                guardian_id: GUARDIAN_ID,
                guardian_user_id: GUARDIAN_USER_ID,
                student_id: STUDENT_ID,
                student_name: 'Brian Otieno',
                class_name: 'Grade 8 East',
                request_type: 'Document',
              },
            }],
            rowCount: 1,
          };
        }
        return {
          rows: [{
            id: 'document-1',
            source_user_id: ACTOR_ID,
            title: 'Transfer letter',
            message: 'Approved transfer letter.',
            status: 'generated',
            priority: 'normal',
            is_today: true,
            created_at: '2026-08-22 11:00:00+03',
            payload: { type: 'letter', recipient: 'Rose Akinyi', artifact: { filename: 'transfer-letter.txt', file_format: 'txt' } },
          }],
          rowCount: 1,
        };
      },
    } as never,
    {} as never,
  );

  const calls = await service.getCallsLog();
  const parentMessages = await service.getParentMessages();
  const documents = await service.getLettersDocuments();

  assert.equal(calls.metrics.total_today, 1);
  assert.equal(calls.metrics.pending_follow_up, 1);
  assert.equal(calls.calls[0]?.caller_recipient, 'Akinyi');
  assert.equal(parentMessages.metrics.replied, 1);
  assert.equal(parentMessages.requests[0]?.guardian_user_id, GUARDIAN_USER_ID);
  assert.equal(documents.metrics.letters, 1);
  assert.equal(documents.documents[0]?.file_format, 'txt');
  assert.equal(queries.every((query) => /WHERE tenant_id = \$1 AND event_type = \$2/.test(query.sql)), true);
});

test('Secretary parent messages resolve one same-tenant active guardian and atomically write an exact-user notification and audit', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  let roleNotifications = 0;
  const service = new SecretaryCommandService(
    requestContext() as never,
    {} as never,
    {
      requiredText,
      uuidOrNull,
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return {
          rows: [{
            student_id: STUDENT_ID,
            admission_number: 'ADM-008',
            student_name: 'Brian Otieno',
            class_name: 'Grade 8 East',
            guardian_id: GUARDIAN_ID,
            guardian_user_id: GUARDIAN_USER_ID,
            guardian_name: 'Rose Akinyi',
            guardian_email: 'rose@example.test',
            guardian_phone: '+254700000002',
          }],
          rowCount: 1,
        };
      },
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '77777777-7777-4777-8777-777777777777',
            title: 'Document request',
            notification_count: 1,
          }],
          rowCount: 1,
        };
      },
      notifyRoles: async () => { roleNotifications += 1; },
    } as never,
  );

  const result = await service.sendParentMessage({
    student_name: 'Brian Otieno',
    parent_name: 'Rose Akinyi',
    phone_number: '+254700000002',
    subject: 'Document request',
    message: 'Please prepare the transfer letter.',
  });

  assert.equal(result.recipient.guardian_user_id, GUARDIAN_USER_ID);
  assert.equal(roleNotifications, 0);
  assert.match(reads[0].sql, /student\.tenant_id = \$1/);
  assert.match(reads[0].sql, /INNER JOIN student_guardians guardian/);
  assert.match(reads[0].sql, /INNER JOIN tenant_memberships membership/);
  assert.match(writes[0].sql, /WITH valid_recipient AS/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.doesNotMatch(writes[0].sql, /recipient_role/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[9], GUARDIAN_ID);
  assert.equal(writes[0].params[10], GUARDIAN_USER_ID);
});

test('Secretary parent messages reject ambiguous guardian resolution before any mutation', async () => {
  let writes = 0;
  const guardian = {
    student_id: STUDENT_ID,
    admission_number: 'ADM-008',
    student_name: 'Brian Otieno',
    class_name: 'Grade 8 East',
    guardian_id: GUARDIAN_ID,
    guardian_user_id: GUARDIAN_USER_ID,
    guardian_name: 'Rose Akinyi',
    guardian_email: 'rose@example.test',
    guardian_phone: '+254700000002',
  };
  const service = new SecretaryCommandService(
    requestContext() as never,
    {} as never,
    {
      requiredText,
      uuidOrNull,
      readSql: async () => ({ rows: [guardian, { ...guardian, guardian_id: STAFF_PROFILE_ID }], rowCount: 2 }),
      writeSql: async () => { writes += 1; return { rows: [], rowCount: 0 }; },
    } as never,
  );

  await assert.rejects(
    () => service.sendParentMessage({ student_name: 'Brian Otieno', parent_name: 'Rose Akinyi', message: 'Follow up.' }),
    /More than one guardian record matches/,
  );
  assert.equal(writes, 0);
});

test('Secretary mail and parcels persist only after exact same-tenant staff resolution and create a direct notification', async () => {
  const reads: Array<{ sql: string; params: unknown[] }> = [];
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new SecretaryCommandService(
    requestContext() as never,
    {} as never,
    {
      requiredText,
      uuidOrNull,
      readSql: async (sql: string, params: unknown[]) => {
        reads.push({ sql, params });
        return {
          rows: [{
            staff_profile_id: STAFF_PROFILE_ID,
            user_id: STAFF_USER_ID,
            staff_name: 'John Kamau',
            staff_number: 'STF-014',
          }],
          rowCount: 1,
        };
      },
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '88888888-8888-4888-8888-888888888888',
            recipient_user_id: STAFF_USER_ID,
            recipient_name: 'John Kamau',
            notification_count: 1,
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.recordMailParcel({
    type: 'parcel',
    sender: 'Kenya Post',
    recipient: 'STF-014',
    description: 'Registered parcel awaiting signature.',
  });

  assert.equal(result.recipient.user_id, STAFF_USER_ID);
  assert.match(reads[0].sql, /profile\.tenant_id = \$1/);
  assert.match(reads[0].sql, /INNER JOIN tenant_memberships membership/);
  assert.match(writes[0].sql, /event_type, entity_type/);
  assert.match(writes[0].sql, /'delivery\.recorded'/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /profile\.id = \$8::uuid/);
  assert.match(writes[0].sql, /profile\.user_id = \$9::uuid/);
  assert.equal(writes[0].params[0], 'tenant-a');
  assert.equal(writes[0].params[7], STAFF_PROFILE_ID);
  assert.equal(writes[0].params[8], STAFF_USER_ID);
});

test('Secretary mail and parcels fail closed when a staff reference is ambiguous', async () => {
  let writes = 0;
  const staff = {
    staff_profile_id: STAFF_PROFILE_ID,
    user_id: STAFF_USER_ID,
    staff_name: 'John Kamau',
    staff_number: 'STF-014',
  };
  const service = new SecretaryCommandService(
    requestContext() as never,
    {} as never,
    {
      requiredText,
      uuidOrNull,
      readSql: async () => ({ rows: [staff, { ...staff, staff_profile_id: GUARDIAN_ID }], rowCount: 2 }),
      writeSql: async () => { writes += 1; return { rows: [], rowCount: 0 }; },
    } as never,
  );

  await assert.rejects(
    () => service.recordMailParcel({ type: 'letter', sender: 'County Office', recipient: 'John Kamau' }),
    /More than one active staff member matches/,
  );
  assert.equal(writes, 0);
});

test('Secretary parent replies revalidate the stored linked guardian and deliver to that exact user', async () => {
  const writes: Array<{ sql: string; params: unknown[] }> = [];
  const service = new SecretaryCommandService(
    requestContext() as never,
    {} as never,
    {
      requiredText,
      uuidOrNull,
      writeSql: async (sql: string, params: unknown[]) => {
        writes.push({ sql, params });
        return {
          rows: [{
            id: '99999999-9999-4999-8999-999999999999',
            guardian_id: GUARDIAN_ID,
            guardian_user_id: GUARDIAN_USER_ID,
            notification_count: 1,
          }],
          rowCount: 1,
        };
      },
    } as never,
  );

  const result = await service.replyToMessage('99999999-9999-4999-8999-999999999999', { reply: 'Your letter is ready.' });

  assert.equal(result.success, true);
  assert.match(writes[0].sql, /event\.event_type = 'frontoffice\.parent_message'/);
  assert.match(writes[0].sql, /INNER JOIN student_guardians guardian/);
  assert.match(writes[0].sql, /INNER JOIN tenant_memberships membership/);
  assert.match(writes[0].sql, /recipient_user_id, recipient_guardian_id/);
  assert.doesNotMatch(writes[0].sql, /recipient_role/);
  assert.equal(writes[0].params[0], 'tenant-a');
});
