import { randomUUID } from 'node:crypto';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.EVENT_BUS_TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const tenantId = process.env.EVENT_BUS_TEST_TENANT_ID?.trim();

if (!connectionString) {
  throw new Error('EVENT_BUS_TEST_DATABASE_URL or DATABASE_URL is required');
}
if (!tenantId || tenantId.toLowerCase() === 'global') {
  throw new Error('EVENT_BUS_TEST_TENANT_ID must identify an existing non-global test school');
}
if (process.env.NODE_ENV === 'production' && process.env.EVENT_BUS_TEST_ALLOW_PRODUCTION !== 'true') {
  throw new Error('Event-bus mutation checks are disabled in production unless explicitly acknowledged');
}

const pool = new Pool({ connectionString });

async function run() {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    console.log('--- Starting rollback-only Event Bus Contract Test ---');
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query(
      `SELECT
         set_config('app.tenant_id', $1, true),
         set_config('app.user_id', '', true),
         set_config('app.role', 'system_monitor', true),
         set_config('app.request_id', $2, true)`,
      [tenantId, `event-bus-contract:${randomUUID()}`],
    );

    const contracts = await client.query<{ outbox_table: string | null; consumer_table: string | null }>(
      `SELECT
         to_regclass('public.outbox_events')::text AS outbox_table,
         to_regclass('public.event_consumer_runs')::text AS consumer_table`,
    );
    if (!contracts.rows[0]?.outbox_table || !contracts.rows[0]?.consumer_table) {
      throw new Error('Canonical event tables are missing; run the API schema bootstrap before this check');
    }

    const studentId = randomUUID();
    const eventId = randomUUID();
    const eventKey = `contract.student.created.${studentId}`;

    await client.query(
      `INSERT INTO outbox_events (
         id, tenant_id, school_id, event_key, event_name, aggregate_type,
         aggregate_id, payload, headers, status, available_at
       )
       VALUES (
         $1::uuid, $2, $2, $3, 'student.created', 'student',
         $4::uuid, $5::jsonb, $6::jsonb, 'pending', NOW()
       )`,
      [
        eventId,
        tenantId,
        eventKey,
        studentId,
        JSON.stringify({ student_id: studentId, contract_test: true }),
        JSON.stringify({ request_id: `event-bus-contract:${eventId}` }),
      ],
    );

    const pending = await client.query<{ status: string }>(
      `SELECT status
       FROM outbox_events
       WHERE tenant_id = $1 AND id = $2::uuid AND event_key = $3`,
      [tenantId, eventId, eventKey],
    );
    if (pending.rows[0]?.status !== 'pending') {
      throw new Error('Canonical outbox event was not persisted in pending state');
    }

    await client.query(
      `UPDATE outbox_events
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE tenant_id = $1 AND id = $2::uuid AND status = 'pending'`,
      [tenantId, eventId],
    );
    await client.query(
      `INSERT INTO event_consumer_runs (
         tenant_id, school_id, outbox_event_id, event_key, consumer_name,
         status, attempt_count, processed_at
       )
       VALUES ($1, $1, $2::uuid, $3, 'event-bus-contract-consumer', 'completed', 1, NOW())`,
      [tenantId, eventId, eventKey],
    );

    const completed = await client.query<{ event_status: string; consumer_status: string }>(
      `SELECT event.status AS event_status, consumer.status AS consumer_status
       FROM outbox_events event
       INNER JOIN event_consumer_runs consumer
         ON consumer.tenant_id = event.tenant_id
        AND consumer.outbox_event_id = event.id
       WHERE event.tenant_id = $1 AND event.id = $2::uuid`,
      [tenantId, eventId],
    );
    if (completed.rows[0]?.event_status !== 'published' || completed.rows[0]?.consumer_status !== 'completed') {
      throw new Error('Event publication and consumer-run lifecycle did not complete');
    }

    await client.query('ROLLBACK');
    transactionStarted = false;
    console.log('--- Event Bus Contract Passed; all test writes rolled back ---');
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK').catch(() => undefined);
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Event Bus Contract Failed:', error);
  process.exitCode = 1;
});
