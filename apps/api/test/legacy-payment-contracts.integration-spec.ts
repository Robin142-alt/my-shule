import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { LEGACY_RECEIPT_SCHEMA } from '../src/modules/billing/legacy-receipt-schema';
import { LEGACY_RECONCILIATION_SCHEMA } from '../src/modules/payments/legacy-reconciliation-schema';
import { LEGACY_C2B_SCHEMA } from '../src/modules/payments/legacy-c2b-schema';

describe('Historical payment database contract migration',()=>{
  let pool:Pool;
  beforeAll(()=>{
    const url=new URL(process.env.DATABASE_URL??'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))
      throw new Error('Disposable local PostgreSQL required');
    pool=new Pool({connectionString:url.toString()});
  });
  afterAll(()=>pool?.end());
  async function fixture(work:(db:any)=>Promise<void>){
    const db=await pool.connect(),schema=`legacy_${randomUUID().replaceAll('-','')}`;
    try{
      await db.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema},public;
        CREATE TABLE manual_fee_payments(tenant_id text,idempotency_key text,receipt_number text,amount_minor numeric(10,2),metadata jsonb,updated_at timestamp NOT NULL);
        CREATE TABLE manual_fee_payment_allocations(invoice_id uuid NOT NULL,student_id uuid NOT NULL,amount_minor numeric(10,2),metadata jsonb,updated_at timestamp NOT NULL);
        CREATE TABLE student_fee_payment_allocations(tenant_id text,idempotency_key text,invoice_id uuid,amount_minor numeric(10,2),parent_user_id uuid NOT NULL,ledger_transaction_id uuid NOT NULL,metadata jsonb,updated_at timestamp NOT NULL);
        CREATE TABLE student_fee_credits(tenant_id text,idempotency_key text,amount_minor numeric(10,2),remaining_amount_minor numeric(10,2),parent_user_id uuid NOT NULL,ledger_transaction_id uuid NOT NULL,metadata jsonb,updated_at timestamp NOT NULL);
        CREATE TABLE finance_approval_requests(amount_minor numeric(10,2),evidence text,reconciliation_batch_id uuid NOT NULL,reconciliation_discrepancy_id uuid NOT NULL,updated_at timestamp NOT NULL);
        CREATE TABLE mpesa_reconciliation_discrepancies(evidence text,provider_transaction_id uuid NOT NULL,approving_user_id uuid NOT NULL,fee_invoice_id uuid NOT NULL,ledger_transaction_id uuid NOT NULL,mpesa_transaction_id uuid NOT NULL,payment_intent_id uuid NOT NULL,updated_at timestamp NOT NULL);
        CREATE TABLE mpesa_reconciliation_batches(summary text,report_date text,payment_channel_id uuid NOT NULL,generated_by_user_id uuid NOT NULL,generated_at timestamp NOT NULL,updated_at timestamp NOT NULL,discrepancy_count integer NOT NULL);`);
      await work(db);
    }finally{await db.query(`ROLLBACK; SET search_path TO public; DROP SCHEMA ${schema} CASCADE`);db.release();}
  }
  it('preserves exact balances, enables nullable credit allocations and rejects duplicate identities after repeat migration',()=>fixture(async db=>{
    await db.query(`INSERT INTO manual_fee_payments VALUES('school','original','RCPT',12345,'{"evidence":"preserved"}',now());
      INSERT INTO finance_approval_requests VALUES(1200,'{"original":"preserved"}',gen_random_uuid(),gen_random_uuid(),now())`);
    for(let pass=0;pass<2;pass++)await db.query(LEGACY_RECEIPT_SCHEMA+LEGACY_RECONCILIATION_SCHEMA);
    expect((await db.query('SELECT amount_minor::text,metadata FROM manual_fee_payments')).rows[0]).toEqual({amount_minor:'12345',metadata:{evidence:'preserved'}});
    expect((await db.query('SELECT amount_minor::text,evidence FROM finance_approval_requests')).rows[0]).toEqual({amount_minor:'1200',evidence:{original:'preserved'}});
    await db.query('INSERT INTO manual_fee_payment_allocations(amount_minor) VALUES(100)');
    await db.query("INSERT INTO student_fee_credits(tenant_id,idempotency_key,amount_minor,remaining_amount_minor) VALUES('school','credit',100,100)");
    await db.query("INSERT INTO finance_approval_requests(amount_minor) VALUES(100)");
    await expect(db.query("INSERT INTO manual_fee_payments(tenant_id,idempotency_key,receipt_number,amount_minor) VALUES('school','original','NEW',100)")).rejects.toMatchObject({code:'23505'});
    await expect(db.query("INSERT INTO student_fee_credits(tenant_id,idempotency_key,amount_minor,remaining_amount_minor) VALUES('school','credit',100,100)")).rejects.toMatchObject({code:'23505'});
  }));
  it.each(['0','-1','10.01'])('refuses to clamp or round receipt amount %s',amount=>fixture(async db=>{
    await db.query("INSERT INTO manual_fee_payments VALUES('school','key','RCPT',$1,'{}',now())",[amount]);
    await expect(db.query(LEGACY_RECEIPT_SCHEMA)).rejects.toThrow(/invalid minor units/);
    expect((await db.query('SELECT amount_minor::text AS amount FROM manual_fee_payments')).rows[0].amount).toBe(Number(amount).toFixed(2));
  }));
  it('rolls back malformed historical evidence instead of replacing it',()=>fixture(async db=>{
    await db.query("INSERT INTO finance_approval_requests VALUES(100,'invalid evidence',gen_random_uuid(),gen_random_uuid(),now())");
    await expect(db.query(LEGACY_RECONCILIATION_SCHEMA)).rejects.toMatchObject({code:'22P02'});
    expect((await db.query('SELECT evidence FROM finance_approval_requests')).rows[0].evidence).toBe('invalid evidence');
  }));
  it('preserves C2B and encrypted evidence while accepting real provider references and callback retries',()=>fixture(async db=>{
    await db.query(`CREATE TABLE mpesa_c2b_payments(tenant_id text,trans_id uuid,third_party_trans_id uuid NOT NULL,
      amount_minor numeric(10,2),org_account_balance numeric(10,2) NOT NULL,mpesa_config_id uuid NOT NULL,payment_channel_id uuid NOT NULL,
      bill_ref_number text NOT NULL,invoice_number text NOT NULL,phone_number text NOT NULL,payer_name text NOT NULL,
      raw_payload_encrypted_ref jsonb NOT NULL,payload_sha256 jsonb NOT NULL,metadata jsonb NOT NULL,raw_payload jsonb NOT NULL,updated_at timestamp NOT NULL);
      CREATE TABLE mpesa_payload_vault(tenant_id text,source_id uuid,raw_payload_encrypted_ref jsonb,payload_sha256 jsonb,encrypted_payload jsonb,updated_at timestamp NOT NULL);
      INSERT INTO mpesa_payload_vault VALUES('school',gen_random_uuid(),'"original-ref"','"original-hash"','"enc:v1:original"',now());`);
    for(let pass=0;pass<2;pass++)await db.query(LEGACY_C2B_SCHEMA);
    expect((await db.query('SELECT raw_payload_encrypted_ref,encrypted_payload FROM mpesa_payload_vault')).rows[0]).toEqual({raw_payload_encrypted_ref:'original-ref',encrypted_payload:'enc:v1:original'});
    await db.query("INSERT INTO mpesa_c2b_payments(tenant_id,trans_id,amount_minor) VALUES('school','SAFARICOMREF',1000)");
    await expect(db.query("INSERT INTO mpesa_c2b_payments(tenant_id,trans_id,amount_minor) VALUES('school','SAFARICOMREF',1000)")).rejects.toMatchObject({code:'23505'});
  }));
});
