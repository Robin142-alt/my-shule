import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { LEGACY_STK_WRITE_SCHEMA } from '../src/modules/payments/legacy-stk-write-schema';
import { PaymentIntentsRepository } from '../src/modules/payments/repositories/payment-intents.repository';
import { CallbackLogsRepository } from '../src/modules/payments/repositories/callback-logs.repository';
import { MpesaTransactionsRepository } from '../src/modules/payments/repositories/mpesa-transactions.repository';

describe('Legacy STK schema compatibility without financial backfill', () => {
  const schema=`stk_legacy_${randomUUID().replaceAll('-','')}`;
  const role=`stk_reader_${randomUUID().replaceAll('-','')}`;
  const legacyIntent=randomUUID(), legacyCallback=randomUUID(), legacyRequest=randomUUID();
  let pool: Pool;
  const encryption={encrypt:(s:string)=>s,decrypt:(s:string)=>s,encryptNullable:(s:string|null)=>s,decryptNullable:(s:string|null)=>s};
  const db={query:async(sql:string,params:unknown[])=>{
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('app.tenant_id','school-a',true)");
      const result=await client.query(sql,params);
      await client.query('COMMIT');return result;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }};
  const intents=new PaymentIntentsRepository(db as never,encryption as never);
  const callbacks=new CallbackLogsRepository(db as never,encryption as never);
  const transactions=new MpesaTransactionsRepository(db as never,encryption as never);
  const pending=()=>({tenant_id:'school-a',idempotency_key_id:randomUUID(),user_id:null,student_id:'ADM-A',request_id:'request-with-prefix',external_reference:null,
    account_reference:'KIB/2026/001',transaction_desc:'Fee payment',phone_number:'254700000000',amount_minor:'1000',currency_code:'KES',
    ledger_debit_account_code:'1110-MPESA-CLEARING',ledger_credit_account_code:'1100-AR-FEES',metadata:{}});
  const callback=()=>({tenant_id:'school-a',merchant_request_id:'merchant-123',checkout_request_id:'ws_CO_20261004_test',delivery_id:'provider-delivery-1',
    request_fingerprint:'test-fingerprint',event_timestamp:null,signature:null,signature_verified:false,headers:{},raw_body:'{}',raw_payload:null,source_ip:null});

  beforeAll(async()=>{
    const url=new URL(process.env.DATABASE_URL??'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))throw Error('Use disposable PostgreSQL harness');
    pool=new Pool({connectionString:url.toString(),options:`-c search_path=${schema},public`});
    await pool.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role} NOLOGIN;`);
    // Start from the canonical columns, then reproduce the observed old types,
    // required legacy columns and absent defaults. No production records copied.
    const source=readFileSync(join(__dirname,'../src/modules/payments/payments-schema.service.ts'),'utf8');
    for(const table of ['payment_intents','callback_logs','mpesa_transactions']) {
      const definition=source.match(new RegExp('CREATE TABLE IF NOT EXISTS '+table+' \\(([\\s\\S]*?),\\s*CONSTRAINT'))?.[1];
      if(!definition)throw Error(`Missing canonical ${table}`);
      await pool.query(`CREATE TABLE ${table} (${definition});`);
      await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY scope ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
    }
    await pool.query(`ALTER TABLE payment_intents ADD UNIQUE(tenant_id,id);
      ALTER TABLE payment_intents ALTER COLUMN account_reference TYPE integer USING account_reference::integer,
        ALTER COLUMN ledger_debit_account_code TYPE integer USING ledger_debit_account_code::integer,
        ALTER COLUMN ledger_credit_account_code TYPE integer USING ledger_credit_account_code::integer,
        ALTER COLUMN request_id TYPE uuid USING request_id::uuid, ALTER COLUMN updated_at DROP DEFAULT;
      ALTER TABLE callback_logs ALTER COLUMN checkout_request_id TYPE uuid USING checkout_request_id::uuid,
        ALTER COLUMN merchant_request_id TYPE uuid USING merchant_request_id::uuid, ALTER COLUMN delivery_id TYPE uuid USING delivery_id::uuid,
        ALTER COLUMN headers DROP DEFAULT, ALTER COLUMN headers TYPE text USING headers::text,
        ALTER COLUMN signature_verified DROP DEFAULT, ALTER COLUMN signature_verified TYPE text USING signature_verified::text,
        ALTER COLUMN event_timestamp TYPE text USING event_timestamp::text, ALTER COLUMN source_ip TYPE text USING source_ip::text,
        ALTER COLUMN payload_sha256 TYPE jsonb USING to_jsonb(payload_sha256),
        ALTER COLUMN raw_payload_encrypted_ref TYPE jsonb USING to_jsonb(raw_payload_encrypted_ref), ALTER COLUMN updated_at DROP DEFAULT;
      ALTER TABLE mpesa_transactions ALTER COLUMN id DROP DEFAULT, ALTER COLUMN id TYPE text USING id::text,
        ADD COLUMN school_id text NOT NULL, ADD COLUMN amount double precision NOT NULL,
        ADD COLUMN transaction_date timestamp NOT NULL, ADD COLUMN match_status text NOT NULL,
        ADD COLUMN raw_payload_json jsonb NOT NULL, ALTER COLUMN updated_at DROP DEFAULT;
      GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    for(const col of ['user_id','student_id','request_id','external_reference','mpesa_config_id','payment_channel_id','mpesa_short_code','payment_channel_type','ledger_debit_account_code','ledger_credit_account_code'])
      await pool.query(`ALTER TABLE payment_intents ALTER COLUMN ${col} SET NOT NULL`);
    for(const col of ['merchant_request_id','checkout_request_id','mpesa_short_code','event_timestamp','signature','raw_payload','raw_payload_encrypted_ref','payload_sha256','source_ip'])
      await pool.query(`ALTER TABLE callback_logs ALTER COLUMN ${col} SET NOT NULL`);
    await pool.query(`INSERT INTO payment_intents(id,tenant_id,idempotency_key_id,user_id,student_id,request_id,external_reference,account_reference,
      transaction_desc,phone_number,amount_minor,currency_code,mpesa_config_id,payment_channel_id,mpesa_short_code,payment_channel_type,
      ledger_debit_account_code,ledger_credit_account_code,status,metadata,updated_at)
      VALUES($1,'legacy-school',gen_random_uuid(),gen_random_uuid(),'legacy-student',$2,'old',42,'Historical record','test',1000,'KES',
        gen_random_uuid(),gen_random_uuid(),'600000','paybill',1110,1100,'pending','{}',now())`,[legacyIntent,legacyRequest]);
    await pool.query(`INSERT INTO callback_logs(id,tenant_id,merchant_request_id,checkout_request_id,delivery_id,mpesa_short_code,event_timestamp,signature,
      raw_payload,raw_payload_encrypted_ref,payload_sha256,source_ip,request_fingerprint,headers,raw_body,signature_verified,callback_trust_status,processing_status,updated_at)
      VALUES($1,'legacy-school',gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'600000','2026-01-01T12:00:00Z','',
      '{}','"vault-reference"','"hash-value"','127.0.0.1','old-fingerprint','{}','encrypted-body','false','received_unverified','received',now())`,[legacyCallback]);
  });
  afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`);await pool.end();}});

  it('reproduces the legacy write failure, can roll back the schema transaction, and applies idempotently',async()=>{
    await expect(intents.createPending(pending())).rejects.toMatchObject({code:'22P02'});
    const client=await pool.connect();
    try{await client.query('BEGIN');await client.query(LEGACY_STK_WRITE_SCHEMA);await client.query('ROLLBACK');}finally{client.release();}
    await expect(intents.createPending(pending())).rejects.toMatchObject({code:'22P02'});
    await pool.query(LEGACY_STK_WRITE_SCHEMA);
    await pool.query(LEGACY_STK_WRITE_SCHEMA);
  });
  it('preserves old references and callback evidence without promoting verification',async()=>{
    expect((await pool.query('SELECT account_reference,request_id,ledger_debit_account_code,amount_minor::text,ledger_transaction_id FROM payment_intents WHERE tenant_id=$1 AND id=$2',['legacy-school',legacyIntent])).rows[0])
      .toEqual({account_reference:'42',request_id:legacyRequest,ledger_debit_account_code:'1110',amount_minor:'1000',ledger_transaction_id:null});
    expect((await pool.query('SELECT raw_body,headers,raw_payload_encrypted_ref,payload_sha256,signature_verified,callback_trust_status FROM callback_logs WHERE tenant_id=$1 AND id=$2',['legacy-school',legacyCallback])).rows[0])
      .toEqual({raw_body:'encrypted-body',headers:{},raw_payload_encrypted_ref:'vault-reference',payload_sha256:'hash-value',signature_verified:false,callback_trust_status:'received_unverified'});
  });
  it('persists alphanumeric references and optional fields; rejects duplicate intent keys',async()=>{
    const input=pending(); const saved=await intents.createPending(input);
    expect(saved).toMatchObject({account_reference:input.account_reference,status:'pending',amount_minor:'1000',ledger_transaction_id:null,student_id:'ADM-A'});
    await expect(intents.createPending(input)).rejects.toMatchObject({code:'23505'});
  });
  it('stores unverified callbacks, handles failures without invented money and upserts replay once',async()=>{
    const intent=await intents.createPending(pending()), log=await callbacks.createLog(callback());
    expect(log).toMatchObject({callback_trust_status:'received_unverified',signature_verified:false,checkout_request_id:callback().checkout_request_id});
    const input={tenant_id:'school-a',payment_intent_id:intent.id,callback_log_id:log.id,raw_payload:null,
      callback:{merchant_request_id:'merchant-123',checkout_request_id:'ws_CO_20261004_test',result_code:1032,result_desc:'Cancelled',status:'failed' as const,amount_minor:null,mpesa_receipt_number:null,transaction_occurred_at:null,phone_number:null,metadata:{}}};
    const first=await transactions.upsertFromCallback(input), again=await transactions.upsertFromCallback(input);
    expect(first).toMatchObject({status:'failed',amount_minor:null,ledger_transaction_id:null});
    expect(again.id).toBe(first.id);
    expect((await pool.query("SELECT count(*)::int AS count FROM mpesa_transactions WHERE tenant_id='school-a'")).rows[0].count).toBe(1);
  });
  it('retains database school isolation and rejects cross-school provider links',async()=>{
    const intent=await intents.createPending(pending());
    const foreign=randomUUID();
    await pool.query("INSERT INTO callback_logs(id,tenant_id,delivery_id,request_fingerprint,headers,raw_body,signature_verified,callback_trust_status,processing_status) VALUES($1,'school-b','other','other','{}','{}',false,'received_unverified','received')",[foreign]);
    expect(await callbacks.findById('school-b',foreign)).toBeNull();
    await expect(db.query("INSERT INTO mpesa_transactions(tenant_id,payment_intent_id,callback_log_id,checkout_request_id,merchant_request_id,result_code,result_desc,status) VALUES('school-a',$1,$2,'cross','cross',1032,'Cancelled','failed')",[intent.id,foreign])).rejects.toMatchObject({code:'23503'});
    await expect(intents.createPending({...pending(),tenant_id:'school-b'})).rejects.toMatchObject({code:'42501'});
  });
});
