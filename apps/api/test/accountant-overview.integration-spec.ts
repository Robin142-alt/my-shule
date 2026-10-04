import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { AccountantCommandService } from '../src/modules/admin-command/accountant-command.service';
import { ManualFeePaymentsRepository } from '../src/modules/billing/repositories/manual-fee-payments.repository';

describe('Accountant daily figures agree with posted school accounts', () => {
  const schema = `accountant_${randomUUID().replaceAll('-', '')}`;
  const context = new RequestContextService();
  let pool: Pool;
  const prisma = {
    executeWithTenant: async (tenant: string, _actor: string, work: (tx: unknown) => Promise<unknown>) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
        const result = await work({
          $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await client.query(sql, params)).rows,
        });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
  };
  const service = new AccountantCommandService(context, prisma as never, {} as never);
  const overview = (tenant = 'school-a') => context.run(
    { tenant_id: tenant, user_id: randomUUID(), role: 'accountant' } as never,
    () => service.getOverview(),
  );

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1'].includes(url.hostname)
      || !url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Use disposable PostgreSQL harness');
    pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema},public` });
    await pool.query(`CREATE SCHEMA ${schema};
      CREATE TABLE invoices(id text,tenant_id text,invoice_number text,description text,metadata jsonb,status text,total_amount_minor bigint,amount_paid_minor bigint,issued_at timestamptz DEFAULT now());
      CREATE TABLE manual_fee_payments(id text,tenant_id text,student_id text,invoice_id text,receipt_number text,payer_name text,payment_method text,amount_minor bigint,status text,received_at timestamptz DEFAULT now());
      CREATE TABLE manual_fee_payment_allocations(tenant_id text,student_id text,manual_payment_id text,allocation_type text,amount_minor bigint);
      CREATE TABLE student_fee_credits(tenant_id text,student_id text,remaining_amount_minor bigint);
      ALTER TABLE manual_fee_payments ADD COLUMN idempotency_key text, ADD COLUMN currency_code text DEFAULT 'KES',
        ADD COLUMN deposited_at timestamptz, ADD COLUMN cleared_at timestamptz, ADD COLUMN bounced_at timestamptz,
        ADD COLUMN reversed_at timestamptz, ADD COLUMN cheque_number text, ADD COLUMN drawer_bank text,
        ADD COLUMN deposit_reference text, ADD COLUMN external_reference text, ADD COLUMN asset_account_code text,
        ADD COLUMN fee_control_account_code text, ADD COLUMN ledger_transaction_id text, ADD COLUMN reversal_ledger_transaction_id text,
        ADD COLUMN notes text, ADD COLUMN metadata jsonb DEFAULT '{}', ADD COLUMN created_by_user_id text,
        ADD COLUMN created_at timestamptz DEFAULT now(), ADD COLUMN updated_at timestamptz DEFAULT now();
      CREATE TABLE payment_intents(id uuid,tenant_id text,student_id uuid,payment_owner text,status text,amount_minor bigint,
        currency_code text DEFAULT 'KES',external_reference text,completed_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),ledger_transaction_id uuid,user_id uuid);
      CREATE TABLE student_fee_payment_allocations(tenant_id text,payment_intent_id uuid,invoice_id uuid,amount_minor bigint);
      CREATE TABLE mpesa_transactions(tenant_id text,payment_intent_id uuid,mpesa_receipt_number text,created_at timestamptz DEFAULT now());
      INSERT INTO mpesa_transactions(tenant_id,mpesa_receipt_number) VALUES('legacy-school','LEGACY-RECEIPT');
      ALTER TABLE manual_fee_payment_allocations ADD COLUMN invoice_id uuid;
      ALTER TABLE student_fee_credits ADD COLUMN payment_intent_id uuid;
      CREATE TABLE mpesa_c2b_payments(tenant_id text,status text);
      CREATE TABLE fee_structures(tenant_id text,status text);
      CREATE TABLE collection_payments(tenant_id text,status text);
      CREATE TABLE payment_ingress(tenant_id text,environment text,state text,conflict_hash text,created_at timestamptz DEFAULT now());
      CREATE TABLE collection_reversal_requests(tenant_id text,status text);
      CREATE TABLE manual_fee_reversal_requests(tenant_id text,status text);
      CREATE TABLE school_expenses(tenant_id text,status text);
      CREATE TABLE tenant_pending_waivers(tenant_id text,status text);
      INSERT INTO invoices(id,tenant_id,invoice_number,metadata,status,total_amount_minor,amount_paid_minor) VALUES
        ('i1','school-a','INV-1','{"student_id":"learner-a"}','open',20000,10000),
        ('draft','school-a','DRAFT','{"student_id":"learner-a"}','draft',99999,0),
        ('void','school-a','VOID','{"student_id":"learner-a"}','void',99999,0),
        ('writeoff','school-a','WRITEOFF','{"student_id":"learner-a"}','uncollectible',99999,0),
        ('private','school-b','OTHER','{"student_id":"learner-b"}','open',90000000,0);
      INSERT INTO manual_fee_payments(id,tenant_id,student_id,receipt_number,payment_method,amount_minor,status) VALUES
        ('p1','school-a','learner-a','RCT-1','mpesa_c2b',12500,'cleared'),
        ('p2','school-a','learner-a','RCT-2','cash',500,'cleared'),
        ('cheque','school-a','learner-a','RCT-3','cheque',90000,'received'),
        ('reversed','school-a','learner-a','RCT-4','cash',90000,'reversed'),
        ('private','school-b','learner-b','PRIVATE','cash',90000000,'cleared');
      INSERT INTO manual_fee_payment_allocations VALUES
        ('school-a','learner-a','p1','invoice',10000),('school-a','learner-a','p1','credit',2500),
        ('school-a','learner-a','p2','credit',500),('school-a','learner-a','reversed','credit',90000);
      INSERT INTO student_fee_credits VALUES ('school-a','learner-a',1000);
      INSERT INTO collection_payments VALUES ('school-a','unmatched'),('school-a','pending_review'),('school-b','unmatched');
      INSERT INTO payment_ingress(tenant_id,environment,state,created_at) VALUES
        ('school-a','production','review',now()),('school-a','sandbox','review',now()),
        ('school-a','production','verifying',now()),('school-a','production','verifying',now()-interval '1 hour');
      INSERT INTO collection_reversal_requests VALUES ('school-a','pending');
      INSERT INTO school_expenses VALUES ('school-a','pending');
      INSERT INTO tenant_pending_waivers VALUES ('school-a','PENDING');
    `);
    // Upgrade the pre-existing table with the actual startup DDL, without guessing
    // a verified ledger link or deriving money from legacy floating-point values.
    const source = readFileSync(join(__dirname, '../src/modules/payments/payments-schema.service.ts'), 'utf8');
    const upgrade = source.match(/ALTER TABLE mpesa_transactions\s+ADD COLUMN IF NOT EXISTS [\s\S]*?;/g);
    expect(upgrade?.length).toBeGreaterThan(0);
    await pool.query(upgrade!.join('\n'));
    await pool.query(upgrade!.join('\n'));
  });
  it('upgrades legacy provider rows idempotently without inventing verification or financial amounts', async () => {
    const result = await pool.query(`SELECT mpesa_receipt_number,amount_minor,ledger_transaction_id,transaction_occurred_at,processed_at,metadata
      FROM mpesa_transactions WHERE tenant_id='legacy-school'`);
    expect(result.rows).toEqual([{mpesa_receipt_number:'LEGACY-RECEIPT',amount_minor:null,ledger_transaction_id:null,transaction_occurred_at:null,processed_at:null,metadata:{}}]);
  });
  it('counts completed school STK receipts once and excludes platform or unposted intents', async () => {
    const id=randomUUID(), ledger=randomUUID(), learner=randomUUID();
    await pool.query(`INSERT INTO payment_intents(id,tenant_id,student_id,payment_owner,status,amount_minor,completed_at,ledger_transaction_id)
      VALUES($1,'stk-school',$2,'tenant','completed',2500,now(),$3), (gen_random_uuid(),'stk-school',$2,'platform','completed',9999,now(),gen_random_uuid()),
      (gen_random_uuid(),'stk-school',$2,'tenant','processing',9999,now(),NULL)`,[id,learner,ledger]);
    expect((await overview('stk-school')).metrics.collected_today_minor).toBe('2500');
    await pool.query(`INSERT INTO manual_fee_payments(id,tenant_id,student_id,receipt_number,payment_method,amount_minor,status,ledger_transaction_id)
      VALUES('same','stk-school',$1,'RCT-STK','mpesa_c2b',2500,'cleared',$2)`,[learner,ledger]);
    expect((await overview('stk-school')).metrics.collected_today_minor).toBe('2500');
  });

  it('counts a cheque on its clearing day rather than its earlier received day', async () => {
    await pool.query(`INSERT INTO manual_fee_payments(id,tenant_id,receipt_number,payment_method,amount_minor,status,received_at,cleared_at)
      VALUES('late-cheque','cheque-school','RCT-LATE','cheque',5000,'cleared',now()-interval '3 days',now())`);
    expect((await overview('cheque-school')).metrics.collected_today_minor).toBe('5000');
  });

  it('uses the same posted STK receipt and provider reference in registers, statements and reconciliation', async () => {
    const id=randomUUID(), ledger=randomUUID(), learner=randomUUID(), invoice=randomUUID();
    await pool.query(`INSERT INTO payment_intents(id,tenant_id,student_id,payment_owner,status,amount_minor,completed_at,ledger_transaction_id,external_reference)
      VALUES($1,'receipt-school',$2,'tenant','completed',12500,now(),$3,'User reference is not the provider receipt')`,[id,learner,ledger]);
    await pool.query(`INSERT INTO mpesa_transactions(tenant_id,payment_intent_id,ledger_transaction_id,mpesa_receipt_number)
      VALUES('receipt-school',$1,$2,'MPESA-VERIFIED'),('other-school',$1,$2,'PRIVATE')`,[id,ledger]);
    await pool.query(`INSERT INTO student_fee_payment_allocations VALUES('receipt-school',$1,$2,10000)`,[id,invoice]);
    await pool.query(`INSERT INTO student_fee_credits(tenant_id,student_id,remaining_amount_minor,payment_intent_id) VALUES('receipt-school',$1,2500,$2)`,[learner,id]);
    const repo=new ManualFeePaymentsRepository({query:async(sql:string,params:unknown[])=>pool.query(sql,params)} as never);
    const register=await repo.list({tenant_id:'receipt-school',limit:50,offset:0});
    const statement=await repo.listStudentStatementPayments({tenantId:'receipt-school',studentId:learner,invoiceIds:[invoice]});
    const report=await repo.listForReconciliation({tenantId:'receipt-school',from:new Date(Date.now()-60000),to:new Date(Date.now()+60000),method:'mpesa_c2b'});
    for (const rows of [register,statement,report]) {
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({id,student_id:learner,amount_minor:'12500',receipt_number:`STK-${id}`,external_reference:'MPESA-VERIFIED',status:'cleared'});
    }
    expect(statement[0].metadata).toMatchObject({credit_amount_minor:'2500',invoice_allocations:[{invoice_id:invoice,amount_minor:'10000'}]});
    expect(await repo.listStudentStatementPayments({tenantId:'other-school',studentId:learner,invoiceIds:[invoice]})).toEqual([]);
  });

  afterAll(async () => {
    if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); }
  });

  it('counts only cleared receipts once, with method totals equal to the daily total', async () => {
    const result = await overview();
    expect(result.metrics.collected_today_minor).toBe('13000');
    expect(result.metrics.receipts_today_count).toBe(2);
    expect(result.collection_methods).toEqual([
      { method: 'mpesa_c2b', amount_minor: '12500', count: 1 },
      { method: 'cash', amount_minor: '500', count: 1 },
    ]);
  });
  it('uses remaining allocation credits and excludes non-collectible invoices', async () => {
    const result = await overview();
    expect(result.metrics.outstanding_balance_minor).toBe('6000');
    expect(result.metrics.open_invoice_count).toBe(1);
  });
  it('surfaces pending work without counting normal verification or sandbox review as a live exception', async () => {
    expect((await overview()).pending_actions).toEqual({
      unmatched_collections: 1, statement_reviews: 1, provider_exceptions: 2,
      pending_cheques: 1, reversal_approvals: 1, expense_approvals: 1, waiver_approvals: 1,
    });
  });
  it('returns a clean empty school and rejects missing tenant context', async () => {
    const result = await overview('new-school');
    expect(result.metrics.collected_today_minor).toBe('0');
    expect(result.metrics.outstanding_balance_minor).toBe('0');
    expect(result.recent_activity).toEqual([]);
    expect(Object.values(result.pending_actions).every(count => count === 0)).toBe(true);
    await expect(service.getOverview()).rejects.toThrow('Tenant context is required');
  });
  it('uses Nairobi midnight even when the database session is UTC', async () => {
    await pool.query(`INSERT INTO manual_fee_payments(id,tenant_id,receipt_number,payment_method,amount_minor,status,received_at)
      VALUES('boundary','boundary-school','BOUNDARY','cash',700,'cleared',date_trunc('day',timezone('Africa/Nairobi',now())) AT TIME ZONE 'Africa/Nairobi'),
      ('yesterday','boundary-school','OLD','cash',900,'cleared',(date_trunc('day',timezone('Africa/Nairobi',now())) AT TIME ZONE 'Africa/Nairobi') - interval '1 second')`);
    expect((await overview('boundary-school')).metrics.collected_today_minor).toBe('700');
  });
});
