import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { FeeCreditApplicationService } from '../src/modules/billing/fee-credit-application.service';
import { FEE_CREDIT_APPLICATION_SCHEMA_SQL } from '../src/modules/billing/fee-credit-application-schema';
import { FEE_CREDIT_READ_SQL } from '../src/modules/billing/fee-credit-read-sql';
import { ManualFeePaymentsRepository } from '../src/modules/billing/repositories/manual-fee-payments.repository';
import { BillingService } from '../src/modules/billing/billing.service';

describe('Audited fee credit application', () => {
  const schema = `fee_credit_${randomUUID().replaceAll('-', '')}`;
  const school = randomUUID(), student = randomUUID(), actor = randomUUID();
  let pool: Pool;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)
      || !url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Disposable local PostgreSQL required');
    pool = new Pool({ connectionString: url.toString(), max: 6, options: `-c search_path=${schema},public` });
    await pool.query(`CREATE SCHEMA ${schema}; CREATE SCHEMA IF NOT EXISTS app;
      CREATE TABLE students(id uuid PRIMARY KEY,tenant_id text,deleted_at timestamptz);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,metadata jsonb,status text DEFAULT 'open',
        currency_code text DEFAULT 'KES',total_amount_minor bigint,amount_paid_minor bigint DEFAULT 0,paid_at timestamptz,
        due_at timestamptz DEFAULT now(),issued_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE manual_fee_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,student_id text,invoice_id uuid,
        amount_minor bigint,currency_code text DEFAULT 'KES',status text DEFAULT 'cleared',created_at timestamptz DEFAULT now());
      CREATE TABLE manual_fee_payment_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,manual_payment_id uuid,
        student_id text,invoice_id uuid,allocation_type text,amount_minor bigint);
      CREATE TABLE student_fee_credits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,student_id uuid,
        amount_minor bigint,remaining_amount_minor bigint,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE events(id text,tenant_id text,payload jsonb);
      ALTER TABLE invoices ADD invoice_number text DEFAULT 'INV-CREDIT',ADD description text DEFAULT 'Fees';
      ALTER TABLE manual_fee_payments ADD idempotency_key text DEFAULT 'test-receipt',ADD receipt_number text DEFAULT 'RCT-CREDIT',
        ADD payment_method text DEFAULT 'cash',ADD payer_name text,ADD received_at timestamptz DEFAULT now(),ADD deposited_at timestamptz,
        ADD cleared_at timestamptz DEFAULT now(),ADD bounced_at timestamptz,ADD reversed_at timestamptz,ADD cheque_number text,
        ADD drawer_bank text,ADD deposit_reference text,ADD external_reference text,ADD asset_account_code text,ADD fee_control_account_code text,
        ADD ledger_transaction_id uuid,ADD reversal_ledger_transaction_id uuid,ADD notes text,ADD metadata jsonb DEFAULT '{}',
        ADD created_by_user_id text,ADD updated_at timestamptz DEFAULT now();
      ALTER TABLE student_fee_credits ADD payment_intent_id uuid;
      CREATE TABLE payment_intents(id uuid,tenant_id text,student_id text,amount_minor bigint,currency_code text,payment_owner text,
        status text,ledger_transaction_id uuid,completed_at timestamptz,created_at timestamptz,updated_at timestamptz,user_id text);
      CREATE TABLE mpesa_transactions(tenant_id text,payment_intent_id uuid,mpesa_receipt_number text,ledger_transaction_id uuid,created_at timestamptz);
      CREATE TABLE student_fee_payment_allocations(tenant_id text,payment_intent_id uuid,invoice_id uuid,amount_minor bigint);
    `);
    await pool.query(FEE_CREDIT_APPLICATION_SCHEMA_SQL);
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE fee_credit_application_reversals,fee_credit_applications,students,invoices,manual_fee_payments,manual_fee_payment_allocations,student_fee_credits,payment_intents,events');
    await pool.query('INSERT INTO students(id,tenant_id) VALUES($1,$2)',[student,school]);
  });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });

  function service(client: PoolClient, tenant = school, role = 'accountant') {
    return new FeeCreditApplicationService(
      { requireStore: () => ({ tenant_id: tenant, user_id: actor, role }) } as never,
      { query: (sql: string, args: unknown[]) => client.query(sql,args), withRequestTransaction: async (work: () => unknown) => work() } as never,
      { recordSchoolOperation: async ({ schoolId, event }: any) => client.query('INSERT INTO events VALUES($1,$2,$3)',[event.id,schoolId,event.payload]) } as never,
    );
  }
  async function transaction<T>(work:(client:PoolClient)=>Promise<T>) {
    const client=await pool.connect();
    try { await client.query('BEGIN'); await client.query("SELECT set_config('app.tenant_id',$1,true)",[school]);
      const result=await work(client); await client.query('COMMIT'); return result;
    } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  }
  async function invoice(amount:string, tenant=school) {
    return (await pool.query('INSERT INTO invoices(tenant_id,metadata,total_amount_minor) VALUES($1,$2,$3) RETURNING id',
      [tenant,{ student_id:student },amount])).rows[0].id;
  }
  async function manualCredit(amount:string, legacy=false) {
    const id=(await pool.query('INSERT INTO manual_fee_payments(tenant_id,student_id,amount_minor) VALUES($1,$2,$3) RETURNING id',[school,student,amount])).rows[0].id;
    if(!legacy) await pool.query("INSERT INTO manual_fee_payment_allocations(tenant_id,manual_payment_id,student_id,allocation_type,amount_minor) VALUES($1,$2,$3,'credit',$4)",[school,id,student,amount]);
    return id;
  }
  async function apply() { return transaction(client=>service(client).applyAvailable(student,'Apply existing fee credit')); }

  it('applies a prior receipt to a later invoice without another cash posting and safely retries',async()=>{
    await manualCredit('12500'); const id=await invoice('10000');
    expect((await apply()).applied_amount_minor).toBe('10000');
    expect((await apply()).applied_amount_minor).toBe('0');
    expect((await pool.query('SELECT amount_paid_minor::text,status FROM invoices WHERE id=$1',[id])).rows[0]).toEqual({amount_paid_minor:'10000',status:'paid'});
    expect((await pool.query('SELECT count(*)::int AS n FROM manual_fee_payments')).rows[0].n).toBe(1);
    expect((await pool.query('SELECT count(*)::int AS n FROM events')).rows[0].n).toBe(1);
    const remaining=await transaction(client=>client.query(`SELECT sum(amount_minor)::text AS credit FROM (${FEE_CREDIT_READ_SQL}) credits`));
    expect(remaining.rows[0].credit).toBe('2500');
  });
  it('consumes online and legacy receipt credits and leaves a precise partial balance',async()=>{
    await manualCredit('2000',true);
    await pool.query('INSERT INTO student_fee_credits(tenant_id,student_id,amount_minor,remaining_amount_minor) VALUES($1,$2,3000,3000)',[school,student]);
    await invoice('7000'); expect((await apply()).applied_amount_minor).toBe('5000');
    expect((await pool.query('SELECT remaining_amount_minor::text FROM student_fee_credits')).rows[0].remaining_amount_minor).toBe('0');
    expect((await pool.query('SELECT amount_paid_minor::text,status FROM invoices')).rows[0]).toEqual({amount_paid_minor:'5000',status:'pending_payment'});
  });
  it('serializes concurrent application without spending credit twice',async()=>{
    await manualCredit('10000'); await invoice('20000');
    const results=await Promise.all([apply(),apply(),apply()]);
    expect(results.reduce((sum,row)=>sum+BigInt(row.applied_amount_minor),0n)).toBe(10000n);
    expect((await pool.query('SELECT sum(amount_minor)::text AS n FROM fee_credit_applications')).rows[0].n).toBe('10000');
  });
  it('reverses applied receipt credit once, preserves history and restores the invoice',async()=>{
    const source=await manualCredit('12000'); await invoice('10000'); await apply();
    await transaction(async client=>{
      await service(client).reverseManualApplications(source,'Approved receipt reversal');
      await client.query("UPDATE manual_fee_payments SET status='reversed' WHERE id=$1",[source]);
    });
    await transaction(client=>service(client).reverseManualApplications(source,'Retry approved reversal'));
    expect((await pool.query('SELECT amount_paid_minor::text,status FROM invoices')).rows[0]).toEqual({amount_paid_minor:'0',status:'open'});
    expect((await pool.query('SELECT count(*)::int AS n FROM fee_credit_application_reversals')).rows[0].n).toBe(1);
    expect((await apply()).applied_amount_minor).toBe('0');
  });
  it('rejects foreign students and unauthorized roles and never touches foreign invoices',async()=>{
    const other=randomUUID(); await manualCredit('5000'); await invoice('5000',other);
    expect((await apply()).applied_amount_minor).toBe('0');
    await expect(transaction(client=>service(client,other).applyAvailable(student,'Apply fee credit'))).rejects.toThrow(/Learner/);
    await expect(transaction(client=>service(client,school,'teacher').applyAvailable(student,'Apply fee credit'))).rejects.toThrow(/permission/i);
  });
  it('rolls back invoice and credit changes if audit/event recording fails',async()=>{
    await manualCredit('5000'); await invoice('5000');
    await expect(transaction(async client=>{
      const instance=service(client); (instance as any).schoolEvents={recordSchoolOperation:async()=>{throw Error('event unavailable');}};
      return instance.applyAvailable(student,'Apply existing fee credit');
    })).rejects.toThrow('event unavailable');
    expect((await pool.query('SELECT amount_paid_minor::text FROM invoices')).rows[0].amount_paid_minor).toBe('0');
    expect((await pool.query('SELECT count(*)::int AS n FROM fee_credit_applications')).rows[0].n).toBe(0);
  });
  it('recovers an old unowned overpayment only through its same-school invoice',async()=>{
    const oldInvoice=await invoice('10000');
    await pool.query("UPDATE invoices SET amount_paid_minor=10000,status='paid' WHERE id=$1",[oldInvoice]);
    const payment=(await pool.query('INSERT INTO manual_fee_payments(tenant_id,invoice_id,amount_minor) VALUES($1,$2,12500) RETURNING id',[school,oldInvoice])).rows[0].id;
    await pool.query("INSERT INTO manual_fee_payment_allocations(tenant_id,manual_payment_id,invoice_id,student_id,allocation_type,amount_minor) VALUES($1,$2,$3,$4,'invoice',10000),($1,$2,NULL,NULL,'credit',2500)",[school,payment,oldInvoice,student]);
    await invoice('3000'); expect((await apply()).applied_amount_minor).toBe('2500');
    const remaining=await transaction(client=>client.query(`SELECT sum(amount_minor)::text AS credit FROM (${FEE_CREDIT_READ_SQL}) credits`));
    expect(remaining.rows[0].credit).toBe('0');
  });
  it('protects application history from edits and enforces PostgreSQL row security',async()=>{
    await manualCredit('5000'); await invoice('5000'); await apply();
    await expect(pool.query("UPDATE fee_credit_applications SET amount_minor=1")).rejects.toThrow(/immutable/);
    const runtime=`credit_runtime_${randomUUID().replaceAll('-','')}`;
    await pool.query(`CREATE ROLE ${runtime} NOLOGIN; GRANT USAGE ON SCHEMA ${schema} TO ${runtime};
      GRANT SELECT,INSERT ON fee_credit_applications,fee_credit_application_reversals TO ${runtime}`);
    try {
      await transaction(async client=>{
        await client.query(`SET LOCAL ROLE ${runtime}`);
        expect((await client.query('SELECT * FROM fee_credit_applications')).rowCount).toBe(1);
        await client.query("SELECT set_config('app.tenant_id',$1,true)",[randomUUID()]);
        expect((await client.query('SELECT * FROM fee_credit_applications')).rowCount).toBe(0);
      });
      await expect(transaction(async client=>{
        await client.query(`SET LOCAL ROLE ${runtime}`);
        await client.query(`INSERT INTO fee_credit_applications(tenant_id,student_id,source_kind,source_id,invoice_id,amount_minor,reason,created_by)
          VALUES($1,$2,'manual',$3,$4,1,'Foreign write attempt',$5)`,[randomUUID(),student,randomUUID(),randomUUID(),actor]);
      })).rejects.toThrow(/row-level security/);
    } finally { await pool.query(`DROP OWNED BY ${runtime}; DROP ROLE ${runtime}`); }
  });
  it.each(['manual','online'])('keeps the actual %s receipt projection and running balance accurate after credit application',async kind=>{
    if(kind==='manual') await manualCredit('12500');
    else {
      const intent=randomUUID();
      await pool.query(`INSERT INTO payment_intents(id,tenant_id,student_id,amount_minor,currency_code,payment_owner,status,ledger_transaction_id,completed_at,created_at,updated_at)
        VALUES($1,$2,$3,12500,'KES','tenant','completed',$4,now(),now(),now())`,[intent,school,student,randomUUID()]);
      await pool.query('INSERT INTO student_fee_credits(tenant_id,student_id,amount_minor,remaining_amount_minor,payment_intent_id) VALUES($1,$2,12500,12500,$3)',[school,student,intent]);
    }
    await invoice('10000'); await apply();
    await transaction(async client=>{
      const context={requireStore:()=>({tenant_id:school,user_id:actor,role:'accountant'})};
      const db={query:(sql:string,args:unknown[])=>client.query(sql,args)};
      const receipts=new ManualFeePaymentsRepository(db as never);
      const billing=new BillingService(context as never,db as never,{} as never,{} as never,{} as never,{} as never,
        {listStudentInvoices:async()=>(await client.query('SELECT *,total_amount_minor::text,amount_paid_minor::text FROM invoices WHERE tenant_id=$1',[school])).rows} as never,
        undefined,receipts);
      const statement=await billing.getStudentStatement(student);
      expect(statement.summary.paid_amount_minor).toBe('10000');
      expect(statement.summary.credit_amount_minor).toBe('2500');
      expect(statement.entries.filter(entry=>entry.kind==='receipt')).toHaveLength(1);
      expect(statement.entries.at(-1)?.balance_after_minor).toBe('-2500');
    });
  });
});
