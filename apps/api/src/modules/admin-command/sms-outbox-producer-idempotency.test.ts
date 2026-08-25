import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import test from 'node:test';

import { ClassTeacherCommandService } from './class-teacher-command.service';

const API_SOURCE_ROOT = resolve(process.cwd(), 'apps/api/src');

const PRODUCER_FILES = [
  'modules/admin-command/class-teacher-command.service.ts',
  'modules/admin-command/nurse-command.service.ts',
  'modules/admin-command/repositories/admin-command.repository.ts',
  'modules/admin-command/teacher-command.service.ts',
  'modules/admin-command/transport-manager-command.service.ts',
] as const;

const EXPECTED_PREFIXES = [
  'class-teacher-parent-message:',
  'class-teacher-communication:',
  'class-teacher-attendance-follow-up:',
  'nurse-parent-notification:',
  'nurse-parent-notification-resend:',
  'principal-broadcast:',
  'teacher-parent-message:',
  'transport-notice:',
] as const;

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
  });
}

function extractSmsInsertBlocks(source: string): string[] {
  const marker = 'INSERT INTO communication_sms_outbox';
  const blocks: string[] = [];
  let cursor = 0;

  while (true) {
    const start = source.indexOf(marker, cursor);
    if (start === -1) break;
    const returning = source.indexOf('RETURNING id, status', start);
    assert.notEqual(returning, -1, 'Every SMS outbox producer insert must return its canonical row id');
    blocks.push(source.slice(start, returning + 'RETURNING id, status'.length));
    cursor = returning + 'RETURNING id, status'.length;
  }

  return blocks;
}

test('all direct SMS outbox producers are explicitly inventoried', () => {
  const directProducerFiles = listTypeScriptFiles(API_SOURCE_ROOT)
    .filter((filePath) => !filePath.endsWith('.test.ts'))
    .filter((filePath) => readFileSync(filePath, 'utf8').includes('INSERT INTO communication_sms_outbox'))
    .map((filePath) => relative(API_SOURCE_ROOT, filePath).replaceAll('\\', '/'))
    .filter((relativePath) => !relativePath.startsWith('modules/communication/'))
    .sort();

  assert.deepEqual(directProducerFiles, [...PRODUCER_FILES].sort());
});

test('direct producers use request-stable tenant-scoped dispatch keys without resetting outcomes', () => {
  const allBlocks = PRODUCER_FILES.flatMap((relativePath) => {
    const source = readFileSync(resolve(API_SOURCE_ROOT, relativePath), 'utf8');
    return extractSmsInsertBlocks(source);
  });

  assert.equal(allBlocks.length, EXPECTED_PREFIXES.length);

  for (const block of allBlocks) {
    assert.match(block, /\([^)]*\bdispatch_key\b[^)]*\)/s);
    assert.match(block, /current_setting\('app\.request_id', true\)/);
    assert.match(block, /\|\| NULLIF\(current_setting\('app\.request_id', true\), ''\)/);
    assert.match(block, /ON CONFLICT \(tenant_id, dispatch_key\) DO UPDATE/);
    assert.match(block, /SET dispatch_key = EXCLUDED\.dispatch_key/);
    assert.match(block, /communication_sms_outbox\.recipient_phone = EXCLUDED\.recipient_phone/);
    assert.match(block, /communication_sms_outbox\.message = EXCLUDED\.message/);
    assert.match(block, /communication_sms_outbox\.sent_by IS NOT DISTINCT FROM EXCLUDED\.sent_by/);
    assert.match(block, /RETURNING id, status/);
    assert.doesNotMatch(block, /SET\s+status\s*=/i);
    assert.doesNotMatch(block, /COALESCE\(NULLIF\(current_setting|gen_random_uuid\(\)::text/);
  }

  const combined = allBlocks.join('\n');
  for (const prefix of EXPECTED_PREFIXES) {
    assert.match(combined, new RegExp(prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(combined, /principal-broadcast:[\s\S]*recipient\.recipient_identity/);
  assert.match(combined, /transport-notice:[\s\S]*recipient\.recipient_identity/);
  assert.doesNotMatch(combined, /md5\(recipient\.phone\)/);

  const producerSources = PRODUCER_FILES
    .map((relativePath) => readFileSync(resolve(API_SOURCE_ROOT, relativePath), 'utf8'))
    .join('\n');
  assert.equal(producerSources.match(/\), sms_outcome AS \(/g)?.length, EXPECTED_PREFIXES.length);
  assert.match(producerSources, /LOWER\(status\) IN \('pending', 'queued'\)/);
  assert.match(producerSources, /LOWER\(status\) IN \('accepted', 'sent', 'provider_accepted'\)/);
  assert.match(producerSources, /sms_needs_review_count/);
  assert.match(producerSources, /sms_outbox_count/);
  assert.doesNotMatch(
    producerSources,
    /\(SELECT COUNT\(\*\)(?:::\w+)? FROM (?:inserted_sms|sms_insert)\) AS sms_(?:count|queue_count|queued)/,
  );
});

test('accepted SMS replay is reported as accepted and never as newly queued', async () => {
  const teacherId = '11111111-1111-4111-8111-111111111111';
  const learnerId = '22222222-2222-4222-8222-222222222222';
  const service = new ClassTeacherCommandService(
    {
      getStore: () => ({
        tenant_id: 'school-a',
        user_id: teacherId,
        role: 'class_teacher',
        is_authenticated: true,
      }),
    } as never,
    { query: async () => ({ rows: [], rowCount: 0 }) } as never,
    {
      requiredText: (value: unknown, label: string) => {
        const text = String(value ?? '').trim();
        if (!text) throw new Error(`${label} is required`);
        return text;
      },
      writeSql: async () => ({
        rows: [{
          learner_count: 1,
          portal_count: 1,
          sms_count: 0,
          sms_processing_count: 0,
          sms_accepted_count: 1,
          sms_needs_review_count: 0,
          sms_outbox_count: 1,
          event_id: 'event-replay',
        }],
        rowCount: 1,
      }),
    } as never,
  );

  const result = await service.sendClassCommunication({
    audience: 'individual_parent',
    learnerId,
    subject: 'Reminder',
    message: 'Bring the signed form tomorrow.',
    sendSms: true,
  });

  assert.equal(result.smsQueuedCount, 0);
  assert.equal(result.smsAcceptedCount, 1);
  assert.equal(result.smsOutboxCount, 1);
  assert.match(result.message, /1 already provider-accepted/);
  assert.doesNotMatch(result.message, /1 SMS message|1 queued/);
});

test('retired and manual scripts cannot bypass the governed SMS outbox', () => {
  const retiredPatch = readFileSync(resolve(process.cwd(), 'scripts/patch-broadcast.js'), 'utf8');
  const eventBusContract = readFileSync(resolve(process.cwd(), 'scripts/test9_event_bus.ts'), 'utf8');

  assert.match(retiredPatch, /is retired/);
  assert.doesNotMatch(retiredPatch, /writeFileSync|content\.replace|INSERT INTO communication_sms_outbox/);

  assert.match(eventBusContract, /EVENT_BUS_TEST_TENANT_ID/);
  assert.match(eventBusContract, /ROLLBACK/);
  assert.doesNotMatch(eventBusContract, /TENANT-001|communication_sms_outbox|CREATE TABLE/);
});
