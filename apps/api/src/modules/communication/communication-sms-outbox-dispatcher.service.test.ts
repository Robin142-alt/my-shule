import assert from 'node:assert/strict';
import test from 'node:test';

import { CommunicationSchemaService } from './communication-schema.service';
import { CommunicationSmsService } from './communication-sms.service';
import { CommunicationSmsOutboxDispatcherService } from './communication-sms-outbox-dispatcher.service';
import {
  ClaimedCommunicationSms,
  CommunicationSmsOutboxRepository,
} from './communication-sms-outbox.repository';
import { SmsProviderDispatchError } from '../integrations/sms-dispatch.service';

const MESSAGE: ClaimedCommunicationSms = {
  id: '00000000-0000-4000-8000-000000000010',
  tenant_id: 'tenant-a',
  recipient_phone: '0700000001',
  message: 'School notice',
  sent_by: '00000000-0000-4000-8000-000000000020',
  attempt_count: 1,
  dispatch_key: 'school-notice:1',
  lease_token: '00000000-0000-4000-8000-000000000030',
};

function createDispatcher(options: {
  message?: ClaimedCommunicationSms;
  send?: () => Promise<Record<string, unknown>>;
  markAccepted?: () => Promise<boolean>;
  markUnknownAfterAcceptance?: (input: any, tx: any) => Promise<boolean>;
} = {}) {
  let claimed = false;
  const calls: Array<{ name: string; input?: any; tx?: any }> = [];
  const tx = { transaction: 'tenant-a' };
  const repository = {
    claimDueBatch: async (batchSize: number) => {
      calls.push({ name: 'claim', input: { batchSize } });
      if (claimed) return [];
      claimed = true;
      return [options.message ?? MESSAGE];
    },
    markDispatchStarted: async (input: any, actualTx: any) => {
      calls.push({ name: 'started', input, tx: actualTx });
      return true;
    },
    markProviderAccepted: async (input: any, actualTx: any) => {
      calls.push({ name: 'accepted', input, tx: actualTx });
      return options.markAccepted ? options.markAccepted() : true;
    },
    markProviderAcceptanceUnknown: async (input: any, actualTx: any) => {
      calls.push({ name: 'accepted-unknown', input, tx: actualTx });
      return options.markUnknownAfterAcceptance
        ? options.markUnknownAfterAcceptance(input, actualTx)
        : true;
    },
    markDeliveryFailure: async (input: any, actualTx: any) => {
      calls.push({ name: 'failure', input, tx: actualTx });
      return true;
    },
  };
  const dispatcher = new CommunicationSmsOutboxDispatcherService(
    {
      get: (key: string) => ({
        'communication.smsOutboxWorkerEnabled': true,
        'communication.smsOutboxBatchSize': 1,
        'communication.smsOutboxConcurrency': 1,
      } as Record<string, unknown>)[key],
    } as never,
    { run: async (_context: unknown, callback: () => Promise<unknown>) => callback() } as never,
    { executeWithTenant: async (_tenant: string, _user: string | null, callback: (value: any) => Promise<unknown>) => callback(tx) } as never,
    {} as never,
    repository as never,
    {
      send: options.send ?? (async () => ({
        status: 'provider_accepted',
        provider_id: '00000000-0000-4000-8000-000000000040',
        provider_code: 'africas_talking',
        provider_message_id: 'AT-1',
      })),
    } as never,
    {
      publish: async (event: any, actualTx: any) => {
        calls.push({ name: `event:${event.event_name}`, input: event, tx: actualTx });
        return event;
      },
    } as never,
  );

  return { dispatcher, calls, tx };
}

test('dispatcher validates queued SMS before marking provider dispatch started', async () => {
  const { dispatcher, calls } = createDispatcher({
    message: { ...MESSAGE, recipient_phone: 'not-a-phone' },
  });

  assert.equal(await dispatcher.dispatchPendingSms(), 1);
  assert.equal(calls.some((call) => call.name === 'started'), false);
  const failure = calls.find((call) => call.name === 'failure');
  assert.equal(failure?.input.outcome, 'failed');
});

test('provider timeout becomes DeliveryUnknown and is never scheduled for retry', async () => {
  const { dispatcher, calls } = createDispatcher({
    send: async () => {
      throw new SmsProviderDispatchError('provider timed out', false, null, true);
    },
  });

  await dispatcher.dispatchPendingSms();
  assert.equal(calls.find((call) => call.name === 'failure')?.input.outcome, 'unknown');
  assert.equal(calls.some((call) => call.input?.outcome === 'retry'), false);
  assert.equal(calls.some((call) => call.name === 'event:communication.sms.delivery_unknown'), true);
});

test('provider rejection is terminal while an explicit pre-accept retryable response is requeued', async () => {
  const rejected = createDispatcher({
    send: async () => {
      throw new SmsProviderDispatchError('provider rejected', false, 400, false);
    },
  });
  await rejected.dispatcher.dispatchPendingSms();
  assert.equal(rejected.calls.find((call) => call.name === 'failure')?.input.outcome, 'failed');

  const retryable = createDispatcher({
    send: async () => {
      throw new SmsProviderDispatchError('provider busy', true, 429, false);
    },
  });
  await retryable.dispatcher.dispatchPendingSms();
  assert.equal(retryable.calls.find((call) => call.name === 'failure')?.input.outcome, 'retry');
});

test('accepted receipt and event share one tenant transaction', async () => {
  const { dispatcher, calls, tx } = createDispatcher();

  await dispatcher.dispatchPendingSms();
  const accepted = calls.find((call) => call.name === 'accepted');
  const event = calls.find((call) => call.name === 'event:communication.sms.provider_accepted');
  assert.equal(accepted?.tx, tx);
  assert.equal(event?.tx, tx);
  assert.equal(accepted?.input.lease_token, MESSAGE.lease_token);
  assert.equal(event?.input.payload.provider_accepted_at !== undefined, true);
});

test('post-accept receipt failure retains provider evidence as DeliveryUnknown without resend', async () => {
  const { dispatcher, calls } = createDispatcher({
    markAccepted: async () => {
      throw new Error('receipt transaction failed');
    },
  });

  await dispatcher.dispatchPendingSms();
  const unknown = calls.find((call) => call.name === 'accepted-unknown');
  assert.equal(unknown?.input.provider_id, '00000000-0000-4000-8000-000000000040');
  assert.equal(unknown?.input.provider_reference, 'AT-1');
  assert.equal(calls.some((call) => call.input?.outcome === 'retry'), false);
});

test('repository releases an unstarted claim when tenant payload cannot be read', async () => {
  const sql: string[] = [];
  let tenantCall = 0;
  const repository = new CommunicationSmsOutboxRepository({
    $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      $queryRawUnsafe: async (query: string) => {
        sql.push(query);
        return [{
          id: MESSAGE.id,
          tenant_id: MESSAGE.tenant_id,
          attempt_count: 1,
          dispatch_key: MESSAGE.dispatch_key,
          lease_token: MESSAGE.lease_token,
        }];
      },
    }),
    executeWithTenant: async (_tenant: string, _user: null, callback: (tx: any) => Promise<unknown>) => {
      tenantCall += 1;
      return callback({
        $queryRawUnsafe: async (query: string) => {
          sql.push(query);
          return tenantCall === 1 ? [] : [];
        },
      });
    },
  } as never);

  assert.deepEqual(await repository.claimDueBatch(1, 120_000), []);
  const releaseSql = sql.find((query) => query.includes("SET status = 'Pending'")) ?? '';
  assert.match(releaseSql, /dispatch_started_at IS NULL/);
  assert.match(releaseSql, /lease_token = \$3::uuid/);
});

test('schema distinguishes expired unstarted claims from provider-started ambiguous delivery', async () => {
  let schemaSql = '';
  const service = new CommunicationSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql = sql;
    },
  } as never);

  await service.onModuleInit();
  assert.match(schemaSql, /SET row_security = on/);
  assert.doesNotMatch(schemaSql, /SET row_security = off/);
  assert.match(schemaSql, /WHEN stale\.dispatch_started_at IS NULL THEN 'Pending'/);
  assert.match(schemaSql, /ELSE 'DeliveryUnknown'/);
  assert.match(schemaSql, /FOR active_tenant IN[\s\S]+set_config\('app\.tenant_id', active_tenant\.tenant_id, true\)/);
  assert.match(schemaSql, /pg_advisory_xact_lock[\s\S]+app\.claim_communication_sms_outbox/);
  assert.match(schemaSql, /IF active_tenant\.tenant_status = 'active' THEN/);
  assert.match(schemaSql, /Suspended\/inactive schools must still have ambiguous expired/);
  assert.match(schemaSql, /FROM unnest\([\s\S]+candidate_ids/);
  assert.doesNotMatch(schemaSql, /CREATE TEMP TABLE|pg_temp\.communication_sms_claim_candidates/);
});

test('manual enqueue is transactionally audited, event-linked, and caller-idempotent', async () => {
  const sql: Array<{ query: string; params: unknown[] }> = [];
  const events: any[] = [];
  let intent: any;
  const tx = {
    $queryRawUnsafe: async (query: string, ...params: unknown[]) => {
      sql.push({ query, params });
      return [{
        id: '00000000-0000-4000-8000-000000000099',
        status: 'Pending',
        recipient_phone: '+254700000001',
        message: 'School notice',
        created: true,
      }];
    },
    $executeRawUnsafe: async (query: string, ...params: unknown[]) => {
      sql.push({ query, params });
      return 1;
    },
  };
  const service = new CommunicationSmsService(
    {
      executeWithTenant: async (_tenant: string, _user: string, callback: (value: any) => Promise<unknown>) => callback(tx),
    } as never,
    {
      publish: async (event: any, actualTx: any) => {
        events.push({ event, tx: actualTx });
        return event;
      },
    } as never,
    {
      execute: async (input: any) => {
        intent = input;
        return input.handler();
      },
    } as never,
  );

  const result = await service.sendSms({
    tenantId: 'tenant-a',
    userId: '00000000-0000-4000-8000-000000000020',
    recipientPhone: '0700 000 001',
    message: ' School notice ',
    idempotencyKey: 'principal-broadcast:term-1',
  });

  assert.equal(result.messageId, '00000000-0000-4000-8000-000000000099');
  assert.equal(intent.governanceRecordedInHandler, true);
  assert.match(sql[0].query, /ON CONFLICT \(tenant_id, dispatch_key\) DO UPDATE/);
  assert.match(String(sql[0].params[5]), /^communication-sms-idempotency:[a-f0-9]{64}$/);
  assert.equal(events[0].tx, tx);
  assert.equal(events[0].event.aggregate_id, result.messageId);
  assert.equal(events[0].event.payload.recipient_phone_last4, '0001');
  assert.equal(events[0].event.payload.message, undefined);
  assert.equal(sql.some((entry) => entry.query.includes("'SMS_QUEUED'")), true);
});

test('SMS history is tenant-scoped, bounded, and excludes full provider reference', async () => {
  let query = '';
  let params: unknown[] = [];
  const service = new CommunicationSmsService(
    {
      query: async (sql: string, values: unknown[]) => {
        query = sql;
        params = values;
        return { rows: [] };
      },
    } as never,
    {} as never,
    {} as never,
  );

  await service.getSms('tenant-a', 5_000);
  assert.match(query, /WHERE tenant_id = \$1/);
  assert.match(query, /'\*\*\*' \|\| right/);
  assert.match(query, /message_preview/);
  assert.doesNotMatch(query, /SELECT[\s\S]+provider_reference/);
  assert.deepEqual(params, ['tenant-a', 100]);
});
