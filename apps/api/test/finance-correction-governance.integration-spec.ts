import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { MpesaReconciliationService } from '../src/modules/payments/services/mpesa-reconciliation.service';
import { FinanceCorrectionService } from '../src/modules/payments/finance-correction.service';
import { MpesaC2bPaymentsRepository } from '../src/modules/payments/repositories/mpesa-c2b-payments.repository';

/** Real PostgreSQL governance/transaction boundaries. The collection reversal is
 * an isolated executor fixture; this is not a bank-to-ledger certification test. */
describe('Financial correction approval and execution boundary',()=>{
  const schema=`correction_${randomUUID().replaceAll('-','')}`,role=`${schema}_role`;
  const context=new RequestContextService(),scope=new AsyncLocalStorage<PoolClient>();
  const requester=randomUUID(),reviewer=randomUUID(),principal=randomUUID(),batch=randomUUID();
  let pool:Pool,failExecution=false,failEvent=false,omitLedger=false;
  async function transaction<T>(work:()=>Promise<T>):Promise<T> {
    if(scope.getStore()) return work();
    const client=await pool.connect();
    try {
      await client.query('BEGIN');await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[context.requireStore().tenant_id]);
      const result=await scope.run(client,work);await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  const db={withRequestTransaction:transaction,query:(sql:string,args:unknown[]=[])=>scope.getStore()?scope.getStore()!.query(sql,args):transaction(()=>scope.getStore()!.query(sql,args))};
  const as=<T>(work:()=>Promise<T>,user=requester,actor='accountant',school='school-a')=>context.run({tenant_id:school,user_id:user,role:actor,is_authenticated:true,permissions:['billing:write']} as never,work);
  const events={recordSchoolOperation:async(dto:any)=>{if(failEvent)throw Error('Outbox unavailable');await db.query('INSERT INTO audit_evidence VALUES($1,$2)',[context.requireStore().tenant_id,JSON.stringify(dto)]);}};
  const corrections=new FinanceCorrectionService(db as never,context,{decideReversal:async(id:string)=>{
    if(failExecution) throw Error('Injected financial execution failure');
    const request=(await db.query('SELECT * FROM collection_reversal_requests WHERE id=$1',[id])).rows[0];
    const payment=(await db.query('SELECT * FROM collection_payments WHERE id=$1',[request.payment_id])).rows[0];
    const reversal=randomUUID();
    if(!omitLedger) await db.query('INSERT INTO transactions VALUES($1,$2,$3,$4)',[reversal,'school-a',payment.currency_code,payment.amount_minor]);
    await db.query("UPDATE collection_payments SET status='reversed' WHERE id=$1",[payment.id]);
    await db.query("UPDATE manual_fee_payments SET status='reversed',reversal_ledger_transaction_id=$2 WHERE id=$1",[payment.manual_fee_payment_id,reversal]);
    await db.query("UPDATE collection_reversal_requests SET status='approved' WHERE id=$1",[id]);
  }} as never);
  const service=new MpesaReconciliationService({get:()=>undefined} as never,context,db as never,undefined,corrections,events as never,
    {record:async(dto:any)=>db.query('INSERT INTO audit_evidence VALUES($1,$2)',[context.requireStore().tenant_id,JSON.stringify(dto)])} as never);
  async function seed() {
    const discrepancy=randomUUID(),payment=randomUUID(),receipt=randomUUID(),ledger=randomUUID(),ref=`MPESA-${discrepancy}`;
    await pool.query(`INSERT INTO mpesa_reconciliation_discrepancies(id,tenant_id,reconciliation_batch_id,provider_transaction_id,ledger_transaction_id)
      VALUES($1,'school-a',$2,$3,$4)`,[discrepancy,batch,ref,ledger]);
    await pool.query("INSERT INTO manual_fee_payments VALUES($1,'school-a','cleared',NULL)",[receipt]);
    await pool.query("INSERT INTO collection_payments VALUES($1,'school-a','safaricom',$2,12500,'KES','posted',$3,$4)",[payment,ref,ledger,receipt]);
    return {discrepancy,payment,receipt};
  }
  async function request(discrepancy:string) {
    return as(()=>service.requestFinanceApproval({action:'reversal',subject_type:'mpesa_reconciliation_discrepancy',subject_id:discrepancy,
      reconciliation_discrepancy_id:discrepancy,reconciliation_batch_id:batch,amount_minor:12500,reason:'Confirmed duplicate collection in the fee register',
      evidence:{correction_execution:{reversal_ledger_transaction_id:'forged'}}}));
  }
  beforeAll(async()=>{
    const url=new URL(process.env.DATABASE_URL??'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))throw Error('Disposable PostgreSQL required');
    pool=new Pool({connectionString:url.toString(),options:`-c search_path=${schema},public`});
    await pool.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role};GRANT USAGE ON SCHEMA ${schema} TO ${role};
      CREATE TABLE finance_approval_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,action text,status text DEFAULT 'pending_first_approval',
        subject_type text,subject_id uuid,amount_minor bigint,currency_code text,reason text,reconciliation_batch_id uuid,reconciliation_discrepancy_id uuid,
        close_period_id uuid,requested_by_user_id uuid,first_approver_user_id uuid,first_approved_at timestamptz,second_approver_user_id uuid,second_approved_at timestamptz,
        rejected_by_user_id uuid,rejected_at timestamptz,evidence jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE mpesa_reconciliation_discrepancies(id uuid PRIMARY KEY,tenant_id text,reconciliation_batch_id uuid,provider_transaction_id text,ledger_transaction_id uuid,payment_intent_id uuid,
        resolution_status text DEFAULT 'open',resolved_by_user_id uuid,resolved_at timestamptz,approving_user_id uuid,evidence jsonb DEFAULT '{}',updated_at timestamptz DEFAULT now());
      CREATE TABLE collection_payments(id uuid PRIMARY KEY,tenant_id text,provider_code text,provider_transaction_id text,amount_minor bigint,currency_code text,status text,ledger_transaction_id uuid,manual_fee_payment_id uuid);
      CREATE TABLE collection_reversal_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,payment_id uuid,reason text,requested_by uuid,status text DEFAULT 'pending');
      CREATE TABLE manual_fee_payments(id uuid PRIMARY KEY,tenant_id text,status text,reversal_ledger_transaction_id uuid);
      CREATE TABLE transactions(id uuid PRIMARY KEY,tenant_id text,currency_code text,total_amount_minor bigint);
      CREATE TABLE audit_evidence(tenant_id text,payload text);
      CREATE TABLE mpesa_c2b_payments(id uuid PRIMARY KEY,tenant_id text,mpesa_config_id uuid,payment_channel_id uuid,trans_id text,transaction_type text,
        business_short_code text,bill_ref_number text,invoice_number text,amount_minor bigint,currency_code text,phone_number text,payer_name text,
        org_account_balance text,third_party_trans_id text,status text,matched_invoice_id uuid,matched_student_id text,manual_fee_payment_id uuid,ledger_transaction_id uuid,
        received_at timestamptz DEFAULT now(),matched_at timestamptz,raw_payload jsonb DEFAULT '{}',raw_payload_encrypted_ref text,payload_sha256 text,
        metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      GRANT ALL ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    for(const table of ['finance_approval_requests','mpesa_reconciliation_discrepancies','collection_payments','collection_reversal_requests','manual_fee_payments','transactions','audit_evidence','mpesa_c2b_payments'])
      await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY school_only ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
  });
  afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);await pool.end();}});
  it('requires independent reviewers, executes once under retries and stores actual financial proof',async()=>{
    const row=await seed(),approval=await request(row.discrepancy),id=String(approval.id);
    expect(approval.evidence).not.toHaveProperty('correction_execution');
    await expect(as(()=>service.approveFinanceApproval(id))).rejects.toThrow(/own request/);
    await as(()=>service.approveFinanceApproval(id),reviewer);
    await expect(as(()=>service.approveFinanceApproval(id),reviewer,'principal')).rejects.toThrow(/distinct/);
    await Promise.all([as(()=>service.approveFinanceApproval(id),principal,'principal'),as(()=>service.approveFinanceApproval(id),principal,'principal')]);
    const saved=(await pool.query('SELECT * FROM finance_approval_requests WHERE id=$1',[id])).rows[0];
    expect(saved.status).toBe('approved');expect(saved.evidence.correction_execution.reversal_ledger_transaction_id).toMatch(/^[a-f0-9-]{36}$/);
    expect((await pool.query('SELECT * FROM collection_reversal_requests WHERE payment_id=$1',[row.payment])).rows).toHaveLength(1);
    expect((await pool.query('SELECT resolution_status FROM mpesa_reconciliation_discrepancies WHERE id=$1',[row.discrepancy])).rows[0].resolution_status).toBe('resolved');
  });
  it('rolls back approval, financial changes and resolution when execution or the outbox fails',async()=>{
    const row=await seed(),id=String((await request(row.discrepancy)).id);
    await as(()=>service.approveFinanceApproval(id),reviewer);
    for(const failure of ['execution','event','missing-ledger']) {
      failExecution=failure==='execution';failEvent=failure==='event';omitLedger=failure==='missing-ledger';
      try {await expect(as(()=>service.approveFinanceApproval(id),principal,'principal')).rejects.toThrow(/failure|Outbox|ledger entry/);}
      finally {failExecution=false;failEvent=false;omitLedger=false;}
      expect((await pool.query('SELECT status FROM finance_approval_requests WHERE id=$1',[id])).rows[0].status).toBe('pending_second_approval');
      expect((await pool.query('SELECT resolution_status FROM mpesa_reconciliation_discrepancies WHERE id=$1',[row.discrepancy])).rows[0].resolution_status).toBe('open');
      expect((await pool.query('SELECT status FROM collection_payments WHERE id=$1',[row.payment])).rows[0].status).toBe('posted');
    }
  });
  it('rejects cross-school, wrong-role, mismatched amounts and unsafe numeric amounts',async()=>{
    const row=await seed(),id=String((await request(row.discrepancy)).id);
    await expect(as(()=>service.approveFinanceApproval(id),reviewer,'accountant','school-b')).rejects.toThrow(/not found/);
    await expect(as(()=>service.approveFinanceApproval(id),reviewer,'teacher')).rejects.toThrow(/permission/);
    await as(()=>service.approveFinanceApproval(id),reviewer);
    await pool.query('UPDATE collection_payments SET amount_minor=13000 WHERE id=$1',[row.payment]);
    await expect(as(()=>service.approveFinanceApproval(id),principal,'principal')).rejects.toThrow(/amount/);
    await expect(as(()=>service.requestFinanceApproval({action:'reversal',subject_type:'mpesa_reconciliation_discrepancy',subject_id:row.discrepancy,
      reconciliation_discrepancy_id:row.discrepancy,amount_minor:Number.MAX_SAFE_INTEGER+1,reason:'Reviewed actual payment'}))).rejects.toThrow(/integer/);
    expect((await as(()=>db.query('SELECT * FROM finance_approval_requests'),requester,'accountant','school-b')).rows).toHaveLength(0);
  });
  it('lists permitted review actions and lets the requester cancel an unexecuted correction with an audit',async()=>{
    const row=await seed(),id=String((await request(row.discrepancy)).id);
    expect((await as(()=>service.listFinanceApprovals())).find(item=>item.id===id)).toMatchObject({can_approve:false,can_cancel:true});
    expect((await as(()=>service.listFinanceApprovals(),reviewer)).find(item=>item.id===id)).toMatchObject({can_approve:true,can_cancel:false});
    await expect(as(()=>service.cancelFinanceApproval(id,'Incorrect payment selected'),reviewer)).rejects.toThrow(/requester/);
    await as(()=>service.cancelFinanceApproval(id,'Incorrect payment selected'));
    expect((await pool.query('SELECT status,evidence FROM finance_approval_requests WHERE id=$1',[id])).rows[0]).toMatchObject({status:'cancelled',evidence:{cancellation_reason:'Incorrect payment selected'}});
    expect((await pool.query('SELECT status FROM collection_payments WHERE id=$1',[row.payment])).rows[0].status).toBe('posted');
  });
  it('preserves matched and reversed C2B receipts against delayed verification and rematching',async()=>{
    const repo=new MpesaC2bPaymentsRepository(db as never);
    for(const status of ['matched','reversed']) {
      const id=randomUUID(),receipt=randomUUID(),ledger=randomUUID();
      await pool.query(`INSERT INTO mpesa_c2b_payments(id,tenant_id,trans_id,status,amount_minor,currency_code,manual_fee_payment_id,ledger_transaction_id)
        VALUES($1::uuid,'school-a',$1::text,$2,12500,'KES',$3,$4)`,[id,status,receipt,ledger]);
      await as(()=>repo.markProviderVerified({tenant_id:'school-a',payment_id:id,provider_amount_minor:'12500'}));
      await as(()=>repo.markProviderFailed({tenant_id:'school-a',payment_id:id}));
      await as(()=>repo.markVerificationRequested({tenant_id:'school-a',payment_id:id,reason:'Delayed job'}));
      await as(()=>repo.markMatched({tenant_id:'school-a',payment_id:id,matched_invoice_id:randomUUID(),matched_student_id:randomUUID(),manual_fee_payment_id:randomUUID(),ledger_transaction_id:randomUUID()}));
      expect((await pool.query('SELECT status,manual_fee_payment_id,ledger_transaction_id FROM mpesa_c2b_payments WHERE id=$1',[id])).rows[0])
        .toEqual({status,manual_fee_payment_id:receipt,ledger_transaction_id:ledger});
    }
  });
});
