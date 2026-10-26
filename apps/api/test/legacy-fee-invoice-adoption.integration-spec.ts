import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { LegacyFeeInvoiceAdoptionService } from '../src/modules/billing/legacy-fee-invoice-adoption.service';
import { LEGACY_FEE_INVOICE_ADOPTION_SCHEMA, LEGACY_FEE_INVOICE_ADOPTION_DOWN_SQL } from '../src/modules/billing/legacy-fee-invoice-adoption.schema';
import { FEE_INVOICE_READ_SQL } from '../src/modules/billing/fee-invoice-read-sql';
import { assertNoUnadoptedLegacyCharges } from '../src/modules/billing/legacy-fee-invoice-guard';
import { BillingService } from '../src/modules/billing/billing.service';

describe('Audited legacy invoice adoption',()=>{
  const schema=`invoice_adoption_${randomUUID().replaceAll('-','')}`,role=`${schema}_role`;
  const school='school-a',other='school-b',student=randomUUID(),principal=randomUUID();
  const context=new RequestContextService(),scope=new AsyncLocalStorage<PoolClient>();
  let pool:Pool,failEvent=false;
  async function transaction<T>(work:()=>Promise<T>):Promise<T>{
    if(scope.getStore()) return work();
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[context.requireStore().tenant_id]);
      const result=await scope.run(client,work);await client.query('COMMIT');return result;
    } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  const db={withRequestTransaction:transaction,query:(sql:string,args:unknown[]=[])=>scope.getStore()?scope.getStore()!.query(sql,args):transaction(()=>scope.getStore()!.query(sql,args))};
  const service=new LegacyFeeInvoiceAdoptionService(context,db as never,{recordSchoolOperation:async(dto:any)=>{
    if(failEvent) throw Error('Outbox unavailable');await db.query('INSERT INTO evidence VALUES($1,$2)',[school,JSON.stringify(dto)]);
  }} as never,{record:async(dto:any)=>db.query('INSERT INTO evidence VALUES($1,$2)',[school,JSON.stringify(dto)])} as never);
  const as=<T>(work:()=>Promise<T>,actor='principal',tenant=school)=>context.run({tenant_id:tenant,role:actor,user_id:principal,
    is_authenticated:true,permissions:['*:*']} as never,work);
  async function seed(changes:{tenant?:string;student?:string;amount?:string;balance?:string;number?:string;status?:string}={}) {
    const id=randomUUID();
    await pool.query(`INSERT INTO student_invoices(id,tenant_id,student_id,invoice_number,term,academic_year,amount_minor,balance_minor,status,created_at)
      VALUES($1,$2,$3,$4,'Term 1','2025',$5,$6,$7,'2025-01-05T08:00:00Z')`,
      [id,changes.tenant ?? school,changes.student ?? student,changes.number ?? `LEGACY-${id}`,changes.amount ?? '10000',changes.balance ?? '4000',changes.status ?? 'open']);
    return id;
  }
  async function selected(id:string) {
    const preview=await as(()=>service.preview(100,0),'accountant');
    const row=preview.items.find(item=>item.legacy_id===id)!;
    return {legacy_id:id,fingerprint:row.fingerprint};
  }
  beforeAll(async()=>{
    const url=new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))throw Error('Disposable PostgreSQL required');
    pool=new Pool({connectionString:url.toString(),options:`-c search_path=${schema},public`});
    await pool.query(`CREATE SCHEMA ${schema};CREATE SCHEMA IF NOT EXISTS app;CREATE ROLE ${role} NOLOGIN;
      CREATE TABLE students(id uuid PRIMARY KEY,tenant_id text,first_name text,last_name text,admission_number text);
      CREATE TABLE subscriptions(id uuid DEFAULT gen_random_uuid(),tenant_id text,status text,currency_code text,created_at timestamptz DEFAULT now());
      CREATE TABLE student_invoices(id uuid PRIMARY KEY,tenant_id text,student_id uuid,invoice_number text,fee_structure_id uuid,term text,academic_year text,
        amount_minor bigint,balance_minor bigint,status text,created_at timestamptz,updated_at timestamptz DEFAULT now());
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,subscription_id uuid,invoice_number text,status text,currency_code text,
        description text,subtotal_amount_minor bigint,tax_amount_minor bigint,total_amount_minor bigint,amount_paid_minor bigint,
        issued_at timestamptz,due_at timestamptz,paid_at timestamptz,voided_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),
        metadata jsonb,UNIQUE(tenant_id,invoice_number));
      CREATE TABLE evidence(tenant_id text,payload text);
      INSERT INTO students VALUES('${student}','${school}','Amina','Learner','ADM-1');
      INSERT INTO subscriptions(tenant_id,status,currency_code) VALUES('school-a','active','KES');
      ${LEGACY_FEE_INVOICE_ADOPTION_SCHEMA}
      ${LEGACY_FEE_INVOICE_ADOPTION_DOWN_SQL}
      ${LEGACY_FEE_INVOICE_ADOPTION_SCHEMA}
      GRANT USAGE ON SCHEMA ${schema},app TO ${role};GRANT ALL ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    for(const table of ['students','subscriptions','student_invoices','invoices'])
      await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY school_only ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
  });
  afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE;REVOKE USAGE ON SCHEMA app FROM ${role};DROP ROLE ${role}`);await pool.end();}});
  it('adopts historical totals once under concurrency without recreating receipts or losing the source',async()=>{
    const id=await seed(),choice=await selected(id),reason='Reviewed historical invoice totals and paid balances';
    await Promise.all([as(()=>service.adopt([choice],reason)),as(()=>service.adopt([choice],reason))]);
    const row=(await pool.query('SELECT * FROM invoices')).rows[0];
    expect(row.id).toBe(id);
    expect(row.total_amount_minor).toBe('10000');expect(row.amount_paid_minor).toBe('6000');
    expect(row.metadata.student_id).toBe(student);expect(row.metadata.academic_year).toBe('2025');
    expect((await pool.query('SELECT * FROM legacy_fee_invoice_adoptions')).rows).toHaveLength(1);
    expect((await pool.query('SELECT * FROM student_invoices WHERE id=$1',[id])).rows).toHaveLength(1);
    expect((await as(()=>db.query(`SELECT * FROM (${FEE_INVOICE_READ_SQL}) fees WHERE student_id=$1`,[student]))).rows).toHaveLength(1);
    expect((await as(()=>service.preview(100,0))).items.find(item=>item.legacy_id===id)).toMatchObject({status:'adopted',paid_minor:'6000'});
    await expect(as(()=>db.query("UPDATE student_invoices SET balance_minor=0 WHERE id=$1",[id]))).rejects.toThrow(/adopted|immutable/i);
    await expect(pool.query(LEGACY_FEE_INVOICE_ADOPTION_DOWN_SQL)).rejects.toThrow(/preserve lineage/);
  });
  it('requires Principal governance, same-school ownership, fresh preview and valid balances',async()=>{
    const id=await seed(),choice=await selected(id),reason='Reviewed historical invoice balances';
    await expect(as(()=>service.adopt([choice],reason),'accountant')).rejects.toThrow();
    await expect(as(()=>service.adopt([choice],reason),'principal',other)).rejects.toThrow();
    await pool.query('UPDATE student_invoices SET balance_minor=3000 WHERE id=$1',[id]);
    await expect(as(()=>service.adopt([choice],reason))).rejects.toThrow(/changed|preview/i);
    const invalid=await seed({balance:'10001'}),foreign=await seed({student:randomUUID()}),duplicate=await seed({number:'DUP'});
    await seed({number:'DUP'});
    const preview=await as(()=>service.preview(100,0));
    for(const bad of [invalid,foreign,duplicate]) expect(preview.items.find(item=>item.legacy_id===bad)?.status).toBe('exception');
  });
  it('keeps prior canonical balances intact and rolls back adoption when audit/event delivery fails',async()=>{
    const id=await seed(),choice=await selected(id),before=(await pool.query('SELECT count(*)::int AS n FROM invoices')).rows[0].n;
    failEvent=true;
    try {await expect(as(()=>service.adopt([choice],'Reviewed original invoice and historical balance'))).rejects.toThrow('Outbox');}
    finally {failEvent=false;}
    expect((await pool.query('SELECT count(*)::int AS n FROM invoices')).rows[0].n).toBe(before);
    expect((await pool.query('SELECT * FROM legacy_fee_invoice_adoptions WHERE legacy_id=$1',[id])).rows).toHaveLength(0);
    const own=(await pool.query('SELECT * FROM legacy_fee_invoice_adoptions LIMIT 1')).rows[0];
    expect((await as(()=>db.query('SELECT * FROM legacy_fee_invoice_adoptions WHERE id=$1',[own.id]),'principal',other)).rows).toHaveLength(0);
  });
  it('blocks rebilling legacy charges, releases that block after adoption and labels opening balances truthfully',async()=>{
    const id=await seed(),structure=randomUUID();
    await pool.query('UPDATE student_invoices SET fee_structure_id=$2 WHERE id=$1',[id,structure]);
    const choice=await selected(id);
    await expect(as(()=>assertNoUnadoptedLegacyCharges(db as never,school,structure,[student]))).rejects.toThrow(/Historical invoices/);
    await as(()=>service.adopt([choice],'Reconciled fee register and original paid balance'));
    await expect(as(()=>assertNoUnadoptedLegacyCharges(db as never,school,structure,[student]))).resolves.toBeUndefined();
    const invoice=(await pool.query("SELECT * FROM invoices WHERE metadata->>'legacy_invoice_id'=$1",[id])).rows[0];
    // The statement read model must not pretend that adoption collected new money.
    const billing=Object.create(BillingService.prototype) as any;
    const entries=billing.buildStudentStatementEntries([invoice],[]);
    expect(entries.find((entry:any)=>entry.method==='historical_opening_balance')).toMatchObject({kind:'adjustment',credit_amount_minor:'6000',ledger_transaction_id:null});
    expect(entries.at(-1).balance_after_minor).toBe('4000');
  });
  it('detects conflicting canonical records and preserves cancelled and fully paid history',async()=>{
    for(const status of ['cancelled','paid']) {
      const id=await seed({status,balance:status==='paid'?'0':'4000'}),choice=await selected(id);
      await as(()=>service.adopt([choice],'Reviewed final historical balances and status'));
      expect((await pool.query("SELECT status FROM invoices WHERE metadata->>'legacy_invoice_id'=$1",[id])).rows[0].status).toBe(status==='paid'?'paid':'void');
    }
    const id=await seed({number:'CANONICAL-CONFLICT'});
    await pool.query("INSERT INTO invoices(tenant_id,invoice_number,metadata,total_amount_minor,amount_paid_minor,status,currency_code) VALUES($1,'CANONICAL-CONFLICT',$2,20000,0,'open','KES')",[school,JSON.stringify({student_id:student})]);
    const preview=await as(()=>service.preview(100,0));
    expect(preview.items.find(item=>item.legacy_id===id)).toMatchObject({status:'exception'});
    await expect(as(()=>service.adopt([preview.items.find(item=>item.legacy_id===id)!],'Reviewed original historical invoices'))).rejects.toThrow(/different/);
  });
});
