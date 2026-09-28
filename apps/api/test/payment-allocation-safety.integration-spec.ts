import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';

import { InvoicesRepository } from '../src/modules/billing/repositories/invoices.repository';
import { StudentFeePaymentAllocationService } from '../src/modules/billing/student-fee-payment-allocation.service';

// Run through support/run-integration-with-local-postgres.ts. These tests use the
// production allocator and SQL repository in a dedicated disposable schema.
describe('Student payment allocation replay and concurrency safety', () => {
  const schema = `payment_safety_${randomUUID().replaceAll('-', '')}`;
  const tenantId = randomUUID();
  const studentId = randomUUID();
  let pool: Pool;
  let schemaCreated = false;

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL;
    const url = new URL(connectionString ?? 'postgresql://invalid/invalid');

    if (
      process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1'
      || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || !url.pathname.startsWith('/my_shule_disposable_')
    ) {
      throw new Error('Payment regressions require the disposable local PostgreSQL harness');
    }

    pool = new Pool({ connectionString, max: 6, options: `-c search_path=${schema}` });
    await pool.query(`CREATE SCHEMA ${schema}`);
    schemaCreated = true;
    await pool.query(`
      CREATE TABLE invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
        subscription_id uuid, invoice_number text, status text NOT NULL DEFAULT 'open',
        currency_code text NOT NULL DEFAULT 'KES', description text,
        subtotal_amount_minor bigint NOT NULL DEFAULT 0,
        tax_amount_minor bigint NOT NULL DEFAULT 0,
        total_amount_minor bigint NOT NULL, amount_paid_minor bigint NOT NULL DEFAULT 0,
        billing_phone_number text, payment_intent_id uuid,
        issued_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz NOT NULL DEFAULT now(),
        paid_at timestamptz, voided_at timestamptz,
        metadata jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE student_fee_payment_allocations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
        invoice_id uuid NOT NULL, student_id uuid NOT NULL, parent_user_id uuid,
        payment_intent_id uuid NOT NULL, ledger_transaction_id uuid,
        amount_minor bigint NOT NULL, idempotency_key text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',
        UNIQUE (tenant_id, idempotency_key, invoice_id)
      );
      CREATE TABLE student_fee_credits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL,
        student_id uuid NOT NULL, parent_user_id uuid, payment_intent_id uuid NOT NULL,
        ledger_transaction_id uuid, amount_minor bigint NOT NULL,
        remaining_amount_minor bigint NOT NULL, idempotency_key text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}', UNIQUE (tenant_id, idempotency_key)
      );
    `);
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE invoices, student_fee_payment_allocations, student_fee_credits');
  });

  afterAll(async () => {
    if (schemaCreated) await pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await pool?.end();
  });

  function allocator(client: PoolClient): StudentFeePaymentAllocationService {
    const repository = new InvoicesRepository(
      { query: (sql: string, values: unknown[]) => client.query(sql, values) } as never,
      { decryptNullable: (value: string | null) => value } as never,
    );
    return new StudentFeePaymentAllocationService(repository);
  }

  function payment(amountMinor: string, id = randomUUID()) {
    return {
      tenantId,
      paymentIntent: {
        id,
        tenant_id: tenantId,
        student_id: studentId,
        user_id: randomUUID(),
        amount_minor: amountMinor,
        ledger_transaction_id: randomUUID(),
      },
      amountPaidMinor: amountMinor,
    };
  }

  async function addInvoice(amountMinor: string, school = tenantId): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO invoices (tenant_id, invoice_number, total_amount_minor, metadata)
       VALUES ($1, 'INV-001', $2::bigint, $3::jsonb) RETURNING id`,
      [school, amountMinor, JSON.stringify({ student_id: studentId })],
    );
    return result.rows[0].id;
  }

  async function state() {
    const result = await pool.query<{ allocated: string; credited: string; paid: string }>(`
      SELECT
        (SELECT COALESCE(sum(amount_minor), 0)::text FROM student_fee_payment_allocations) AS allocated,
        (SELECT COALESCE(sum(amount_minor), 0)::text FROM student_fee_credits) AS credited,
        (SELECT COALESCE(sum(amount_paid_minor), 0)::text FROM invoices) AS paid
    `);
    return result.rows[0];
  }

  it('does not spend an existing credit again when its payment callback is replayed after a new invoice arrives', async () => {
    const client = await pool.connect();
    const receivedPayment = payment('10000');
    try {
      await client.query('BEGIN');
      const first = await allocator(client).allocateConfirmedPayment(receivedPayment);
      await client.query('COMMIT');
      expect(first.credit_amount_minor).toBe('10000');

      await addInvoice('10000');
      await client.query('BEGIN');
      const repeated = await allocator(client).allocateConfirmedPayment(receivedPayment);
      await client.query('COMMIT');

      expect(repeated.duplicate).toBe(true);
      expect(await state()).toEqual({ allocated: '0', credited: '10000', paid: '0' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  async function concurrentPayments(replay: boolean) {
    const firstClient = await pool.connect();
    const secondClient = await pool.connect();
    const firstPayment = payment('4000');
    const secondPayment = replay ? firstPayment : payment('6000');
    let secondFinished = false;
    let secondResult: ReturnType<StudentFeePaymentAllocationService['allocateConfirmedPayment']> | undefined;

    try {
      const backend = await secondClient.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
      await firstClient.query('BEGIN');
      await secondClient.query('BEGIN');
      await allocator(firstClient).allocateConfirmedPayment(firstPayment);
      secondResult = allocator(secondClient).allocateConfirmedPayment(secondPayment);
      void secondResult.then(() => { secondFinished = true; }, () => { secondFinished = true; });

      // Release the first transaction only after the second is demonstrably
      // waiting on its lock (safe implementation), or has already finished
      // (the original SKIP LOCKED bug). This makes the race reproducible.
      const deadline = Date.now() + 5000;
      while (!secondFinished) {
        const activity = await pool.query<{ waiting: boolean }>(
          `SELECT wait_event_type = 'Lock' AS waiting FROM pg_stat_activity WHERE pid = $1`,
          [backend.rows[0].pid],
        );
        if (activity.rows[0]?.waiting) break;
        if (Date.now() >= deadline) throw new Error('Second allocation neither waited nor completed');
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      await firstClient.query('COMMIT');
      const result = await secondResult;
      await secondClient.query('COMMIT');
      return result;
    } finally {
      await firstClient.query('ROLLBACK');
      if (secondResult) await secondResult.catch(() => undefined);
      await secondClient.query('ROLLBACK');
      firstClient.release();
      secondClient.release();
    }
  }

  it('waits for the same student invoice instead of turning a concurrent payment into false overpayment credit', async () => {
    await addInvoice('10000');
    await concurrentPayments(false);
    expect(await state()).toEqual({ allocated: '10000', credited: '0', paid: '10000' });
  });

  it('records one allocation when the same confirmed payment is processed concurrently', async () => {
    await addInvoice('10000');
    const duplicate = await concurrentPayments(true);
    expect(duplicate.duplicate).toBe(true);
    expect(await state()).toEqual({ allocated: '4000', credited: '0', paid: '4000' });
  });

  it('never allocates payment funds to an invoice belonging to a different school', async () => {
    await addInvoice('10000', randomUUID());
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await allocator(client).allocateConfirmedPayment(payment('10000'));
      await client.query('COMMIT');
      expect(await state()).toEqual({ allocated: '0', credited: '10000', paid: '0' });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
