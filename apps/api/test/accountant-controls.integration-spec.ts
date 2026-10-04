import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { AccountantCommandService } from '../src/modules/admin-command/accountant-command.service';
import { SIDEBAR_WORKSPACE_SCHEMA_SQL } from '../src/modules/admin-command/sidebar-workspace-schema';
import { BillingSchemaService } from '../src/modules/billing/billing-schema.service';
import { ManualFeePaymentService } from '../src/modules/billing/manual-fee-payment.service';
import { ManualFeePaymentsRepository } from '../src/modules/billing/repositories/manual-fee-payments.repository';

describe('Accountant persisted approvals and atomic reversals', () => {
  const schema=`finance_controls_${randomUUID().replaceAll('-','')}`;
  const role=`${schema}_role`;
  const context=new RequestContextService();
  const scope=new AsyncLocalStorage<PoolClient>();
  const accountant=randomUUID(), principal=randomUUID(), student=randomUUID(), receipt=randomUUID(), invoice=randomUUID();
  let pool: Pool; let failEvent=false;
  async function transaction<T>(work:()=>Promise<T>):Promise<T> {
    if(scope.getStore()) return work();
    const client=await pool.connect();
    try {
      await client.query('BEGIN'); await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[context.requireStore().tenant_id]);
      const value=await scope.run(client,work); await client.query('COMMIT'); return value;
    } catch(error) { await client.query('ROLLBACK');throw error; }
    finally {client.release();}
  }
  const db={withRequestTransaction:transaction,
    query:(sql:string,args:unknown[]=[])=>scope.getStore()?scope.getStore()!.query(sql,args):transaction(()=>scope.getStore()!.query(sql,args)),
    executeWithTenant:(_tenant:string,_actor:string,work:(tx:unknown)=>Promise<unknown>)=>transaction(()=>work({$queryRawUnsafe:async(sql:string,...args:unknown[])=>(await scope.getStore()!.query(sql,args)).rows})),
  };
  const as=<T>(work:()=>Promise<T>, actor='accountant', tenant='school-a')=>context.run({tenant_id:tenant,role:actor,user_id:actor==='principal'?principal:accountant,is_authenticated:true} as never,work);
  async function event() { if(failEvent) throw Error('Outbox unavailable'); await db.query('INSERT INTO evidence(tenant_id) VALUES($1)',[context.requireStore().tenant_id]);return {id:randomUUID()}; }
  const expenses=new AccountantCommandService(context,db as never,{recordWorkflowAction:event,notifyRoles:async()=>{}} as never);
  const receipts=new ManualFeePaymentService(context,db as never,new ManualFeePaymentsRepository(db as never),{
    reverseManualFeeInvoicePayment:async(input:{tenantId:string;invoiceId:string;amountMinor:string})=>db.query('UPDATE invoices SET paid=paid-$3::bigint WHERE tenant_id=$1 AND id=$2::uuid',[input.tenantId,input.invoiceId,input.amountMinor]),
  } as never,{findByCode:async()=>({id:randomUUID(),is_active:true})} as never,{
    postTransaction:async()=>{await db.query('INSERT INTO evidence(tenant_id) VALUES($1)',[context.requireStore().tenant_id]);return {transaction_id:randomUUID()};},
  } as never,{recordSchoolOperation:event} as never);
  beforeAll(async()=>{
    const url=new URL(process.env.DATABASE_URL??'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))throw Error('Requires disposable PostgreSQL');
    pool=new Pool({connectionString:url.toString(),options:`-c search_path=${schema},public`});
    await pool.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role}; GRANT USAGE ON SCHEMA ${schema} TO ${role};`);
    let billing='';await new BillingSchemaService({runSchemaBootstrap:async(sql:string)=>{billing=sql;}} as never).onModuleInit();
    const table=(name:string)=>billing.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\n      \\);`))![0];
    await pool.query(table('manual_fee_payments'));
    await pool.query(table('manual_fee_payment_allocations'));
    await pool.query(billing.slice(billing.indexOf('CREATE TABLE IF NOT EXISTS manual_fee_reversal_requests'),billing.indexOf('DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at')));
    await pool.query(SIDEBAR_WORKSPACE_SCHEMA_SQL.slice(SIDEBAR_WORKSPACE_SCHEMA_SQL.indexOf('CREATE TABLE IF NOT EXISTS school_expenses'),SIDEBAR_WORKSPACE_SCHEMA_SQL.indexOf('CREATE TABLE IF NOT EXISTS academics_lesson_plans')));
    await pool.query(`CREATE TABLE workflow_events(tenant_id text,entity_id text,event_type text,source_user_id uuid,created_at timestamptz);
      CREATE TABLE collection_payments(id uuid,tenant_id text,manual_fee_payment_id uuid);
      CREATE TABLE collection_reversal_requests(tenant_id text,payment_id uuid,status text,reviewed_by uuid);
      CREATE TABLE invoices(id uuid,tenant_id text,paid bigint);
      CREATE TABLE evidence(tenant_id text);
      GRANT ALL ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    for(const table of ['school_expenses','manual_fee_payments','manual_fee_payment_allocations']) await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;CREATE POLICY school_only ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
  });
  beforeEach(async()=>{
    failEvent=false;
    await pool.query(`TRUNCATE manual_fee_reversal_requests,manual_fee_payment_allocations,manual_fee_payments,school_expenses,invoices,evidence;
      INSERT INTO manual_fee_payments(id,tenant_id,idempotency_key,receipt_number,payment_method,status,student_id,amount_minor) VALUES('${receipt}','school-a','seed','RCT-001','cash','cleared','${student}',10000);
      INSERT INTO invoices VALUES('${invoice}','school-a',10000);
      INSERT INTO manual_fee_payment_allocations(tenant_id,manual_payment_id,invoice_id,student_id,allocation_type,amount_minor) VALUES('school-a','${receipt}','${invoice}','${student}','invoice',10000);`);
  });
  afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`);await pool.end();}});
  it('persists one expense on concurrent retry, refuses self approval and records Principal decision',async()=>{
    const dto={category:'utilities',description:'Electricity',amount_minor:'1000',idempotency_key:'same-expense'};
    const [a,b]=await Promise.all([as(()=>expenses.createExpense(dto)),as(()=>expenses.createExpense(dto))]);
    expect(a.expense.id).toBe(b.expense.id);
    expect((await pool.query('SELECT * FROM evidence')).rows).toHaveLength(1);
    await expect(context.run({tenant_id:'school-a',role:'principal',user_id:accountant} as never,()=>expenses.decideExpense(a.expense.id,'approve','Budget checked'))).rejects.toThrow('different');
    await expect(as(()=>expenses.decideExpense(a.expense.id,'approve','Budget checked'),'principal','school-b')).rejects.toThrow('not found');
    await as(()=>expenses.decideExpense(a.expense.id,'approve','Budget checked'),'principal');
    expect((await pool.query('SELECT status,reviewed_by,decision_notes FROM school_expenses')).rows[0]).toEqual({status:'approved',reviewed_by:principal,decision_notes:'Budget checked'});
  });
  it('rolls back expense and decision if the event cannot be stored',async()=>{
    failEvent=true;await expect(as(()=>expenses.createExpense({category:'utilities',description:'Electricity',amount_minor:'1000',idempotency_key:'fail-expense'}))).rejects.toThrow('Outbox');
    expect((await pool.query('SELECT * FROM school_expenses')).rows).toHaveLength(0);
  });
  it('pages and filters all school expenses without losing older approved records',async()=>{
    await pool.query(`INSERT INTO school_expenses(tenant_id,category,description,amount_minor,status)
      SELECT 'school-a','utilities','Approved expense '||n,1000,'approved' FROM generate_series(1,51) n`);
    await pool.query(`INSERT INTO school_expenses(tenant_id,category,description,amount_minor,status)
      VALUES('school-a','utilities','Pending review',1000,'pending'),('school-b','utilities','Private',1000,'approved')`);
    const page1=await as(()=>expenses.getExpenses(50,0,'approved'));
    const page2=await as(()=>expenses.getExpenses(50,50,'approved'));
    expect(page1.items).toHaveLength(50);expect(page2.items).toHaveLength(1);
    expect(new Set([...page1.items,...page2.items].map(item=>item.id)).size).toBe(51);
    expect((await as(()=>expenses.getExpenses(50,0,'pending'))).items.map(item=>item.description)).toEqual(['Pending review']);
  });
  it('cheque deposit and bounce retain events, and an event failure rolls the status back',async()=>{
    await pool.query(`UPDATE manual_fee_payments SET payment_method='cheque',status='received',cheque_number='CHQ-001',drawer_bank='Test bank' WHERE id=$1`,[receipt]);
    failEvent=true;
    await expect(as(()=>receipts.depositManualFeePayment(receipt,{deposit_reference:'BANK-1'}))).rejects.toThrow('Outbox');
    expect((await pool.query('SELECT status FROM manual_fee_payments')).rows[0].status).toBe('received');
    failEvent=false;
    await as(()=>receipts.depositManualFeePayment(receipt,{deposit_reference:'BANK-1'}));
    await as(()=>receipts.bounceManualFeePayment(receipt,{notes:'Bank returned cheque'}));
    expect((await pool.query('SELECT status FROM manual_fee_payments')).rows[0].status).toBe('bounced');
    expect((await pool.query('SELECT * FROM evidence')).rows).toHaveLength(2);
  });
  it('approved reversal restores the invoice, changes the receipt and cannot be repeated',async()=>{
    const request=await as(()=>receipts.requestReversal(receipt,'Duplicate cash entry'));
    await expect(as(()=>receipts.decideReversal(request.id,'approve','Confirmed duplicate'),'principal','school-b')).rejects.toThrow('not found');
    await as(()=>receipts.decideReversal(request.id,'approve','Confirmed duplicate'),'principal');
    expect((await pool.query('SELECT status FROM manual_fee_payments')).rows[0].status).toBe('reversed');
    expect((await pool.query('SELECT paid::text FROM invoices')).rows[0].paid).toBe('0');
    await expect(as(()=>receipts.decideReversal(request.id,'approve','Confirmed duplicate'),'principal')).rejects.toThrow('already');
  });
  it('failed reversal event rolls back decision, ledger work, receipt and invoice together',async()=>{
    const request=await as(()=>receipts.requestReversal(receipt,'Duplicate cash entry'));
    failEvent=true;await expect(as(()=>receipts.decideReversal(request.id,'approve','Confirmed duplicate'),'principal')).rejects.toThrow('Outbox');
    expect((await pool.query('SELECT status FROM manual_fee_reversal_requests')).rows[0].status).toBe('pending');
    expect((await pool.query('SELECT status FROM manual_fee_payments')).rows[0].status).toBe('cleared');
    expect((await pool.query('SELECT paid::text FROM invoices')).rows[0].paid).toBe('10000');
    expect((await pool.query('SELECT * FROM evidence')).rows).toHaveLength(1);
  });
  it('tenant RLS hides another school’s pending reversal even with its exact ID',async()=>{
    const request=await as(()=>receipts.requestReversal(receipt,'Duplicate cash entry'));
    const result=await as(()=>db.query('SELECT id FROM manual_fee_reversal_requests WHERE id=$1::uuid',[request.id]),'principal','school-b');
    expect(result.rows).toHaveLength(0);
  });
});
