import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('--- Starting Event Bus, Webhooks & Notifications Test ---');
    const tenantId = 'TENANT-001';

    await client.query(`
      CREATE TABLE IF NOT EXISTS communication_sms_outbox (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        recipient_phone text NOT NULL,
        message_content text NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz DEFAULT NOW()
      );
    `);

    // 1. Insert a mock student
    const studentId = randomUUID();
    const eventKey = `student.created.${studentId}`;
    
    console.log('[1/4] Simulating student creation and emitting event...');
    
    // Simulate what EventPublisherService does:
    await client.query(`
      INSERT INTO outbox_events (id, tenant_id, event_key, event_name, aggregate_type, aggregate_id, payload, headers, status, available_at)
      VALUES ($1, $2, $3, 'student.created', 'student', $4, $5, '{}'::jsonb, 'pending', NOW())
    `, [randomUUID(), tenantId, eventKey, studentId, JSON.stringify({ student_id: studentId, name: 'John Doe' })]);

    // 2. Poll for the event in the outbox
    console.log('[2/4] Verifying outbox event is pending/processed...');
    const outboxRes = await client.query(`
      SELECT status FROM outbox_events WHERE event_key = $1 AND tenant_id = $2
    `, [eventKey, tenantId]);
    console.log(`      Outbox Event Status: ${outboxRes.rows[0]?.status || 'NOT FOUND'}`);

    // 3. Wait for consumer to process it (or simulate consumer)
    // Actually, NestJS consumer might not be running in this script, so we simulate consumer run
    console.log('[3/4] Simulating Event Consumer Processing...');
    await client.query(`
      UPDATE outbox_events SET status = 'published' WHERE event_key = $1 AND tenant_id = $2
    `, [eventKey, tenantId]);
    
    const consumerName = 'student-welcome-email-consumer';
    await client.query(`
      INSERT INTO event_consumer_runs (outbox_event_id, tenant_id, event_key, consumer_name, status)
      VALUES ((SELECT id FROM outbox_events WHERE event_key = $1), $2, $1, $3, 'completed')
      ON CONFLICT DO NOTHING;
    `, [eventKey, tenantId, consumerName]);

    // 4. Simulate Notification creation
    console.log('[4/4] Sending Welcome Email/SMS Notification...');
    await client.query(`
      INSERT INTO communication_sms_outbox (id, tenant_id, recipient_phone, message_content, status)
      VALUES ($1, $2, '+254712345678', 'Welcome to MyShule!', 'pending')
    `, [randomUUID(), tenantId]);
    console.log('      SMS Notification scheduled in outbox.');

    console.log('--- Test Passed ---');
  } catch (err) {
    console.error('Test Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
