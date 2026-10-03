import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { PAYMENT_CHANNEL_WORKFLOW_SCHEMA } from '../src/modules/tenant-finance/payment-channel-workflow-schema.service';
import { COLLECTION_PAYMENTS_SCHEMA } from '../src/modules/payments/collection-payments-schema.service';
import { PAYMENT_INGRESS_SCHEMA } from '../src/modules/payments/ingress/payment-ingress.schema';
import { PaymentIngressService, IngressRoute } from '../src/modules/payments/ingress/payment-ingress.service';
import { PaymentIngressConfigService } from '../src/modules/tenant-finance/payment-ingress-config.service';
import { CollectionAdapterRegistry } from '../src/modules/payments/ingress/collection-adapter-registry.service';
import { SafaricomCollectionAdapter } from '../src/modules/payments/ingress/safaricom-collection.adapter';
import { MpesaSignatureService } from '../src/modules/payments/services/mpesa-signature.service';
import { CollectionReferenceMatcher } from '../src/modules/payments/collection-reference-matcher.service';
import { CollectionPaymentsService } from '../src/modules/payments/collection-payments.service';
import { PaymentIngressController } from '../src/modules/payments/ingress/payment-ingress.controller';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('Verified collection ingress with real PostgreSQL/RLS', () => {
  jest.setTimeout(60000);
  const schema = `ingress_${randomUUID().replaceAll('-','')}`, role = `${schema}_role`;
  const context = new RequestContextService();
  let db: PrismaService;
  const school='school-a', other='school-b', learner=randomUUID(), invoice=randomUUID();
  const token='a'.repeat(64), credentials={consumer_key:'test',consumer_secret:'test',initiator_name:'test',security_credential:'test',_callback_token:token,_callback_trust_mode:'daraja_direct'};
  let pool:Pool, ingress:PaymentIngressService, matcher:CollectionReferenceMatcher;
  let app:INestApplication;
  let prod:IngressRoute, sandboxA:IngressRoute, sandboxB:IngressRoute;
  const requests = new Map<string,{result:string;timeout:string;conversation:string}>();
  function as<T>(fn:()=>Promise<T>,tenant=school) {return context.run({tenant_id:tenant,user_id:randomUUID(),role:'accountant',is_authenticated:true,request_id:randomUUID(),permissions:['*:*']} as never,fn);}
  async function revision(tenant:string,environment:'sandbox'|'production'):Promise<IngressRoute> {
    const id=randomUUID(),channel=randomUUID();
    await pool.query(`INSERT INTO tenant_payment_channels(id,tenant_id) VALUES($1,$2)`,[channel,tenant]);
    await pool.query(`INSERT INTO tenant_payment_channel_revisions(id,tenant_id,channel_id,provider_code,channel_kind,display_name,account_name,account_number,status,connection_mode,environment,credentials_ciphertext,requested_by,reviewed_by,reviewed_at,reason,activated_at)
      VALUES($1,$2,$3,'safaricom','mpesa_paybill','Fees','School','600000','active','daraja',$4,$5,$6,$7,now(),'Approved school destination',now()-interval '1 year')`,
      [id,tenant,environment==='production'?channel:null,environment,`enc:v1:${JSON.stringify(credentials)}`,randomUUID(),randomUUID()]);
    return {tenant,environment,provider:'safaricom',revision:id,token};
  }
  function callback(receipt:string,reference='ADM-1',amount='100.00') {
    const time=new Date(Date.now()+10800000).toISOString().slice(0,19).replace(/[-:T]/g,'');
    return {TransID:receipt,TransTime:time,BusinessShortCode:'600000',TransAmount:amount,BillRefNumber:reference};
  }
  async function receive(route:IngressRoute,body:ReturnType<typeof callback>) {await as(()=>ingress.receive(route,body,JSON.stringify(body),{}),route.tenant);return (await pool.query(`SELECT id FROM payment_ingress WHERE tenant_id=$1 AND environment=$2 AND provider_transaction_id=$3`,[route.tenant,route.environment,body.TransID.toUpperCase()])).rows[0]?.id as string;}
  function evidence(receipt:string,changes:Record<string,unknown>={}) {const req=requests.get(receipt)!;return {Result:{ConversationID:req.conversation,ResultCode:0,ResultParameters:{ResultParameter:Object.entries({ReceiptNo:receipt,Amount:'100.00',CreditPartyName:'600000 - School',TransactionStatus:'Completed',...changes}).map(([Key,Value])=>({Key,Value}))}}};}
  async function deliver(receipt:string,body=evidence(receipt)) {
    const url=new URL(requests.get(receipt)!.result);
    await request(app.getHttpServer()).post(url.pathname).send(body).expect(200);
  }
  async function state(id:string){return (await pool.query('SELECT * FROM payment_ingress WHERE id=$1',[id])).rows[0];}
  beforeAll(async()=>{
    const url=new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))throw new Error('Use the disposable PostgreSQL harness');
    pool=new Pool({connectionString:url.toString(),max:12,options:`-c search_path=${schema},public`});
    await pool.query(`CREATE SCHEMA ${schema};CREATE SCHEMA IF NOT EXISTS app;CREATE ROLE ${role} NOLOGIN;
      CREATE TABLE tenant_payment_channels(id uuid PRIMARY KEY,tenant_id text NOT NULL,UNIQUE(tenant_id,id));
      CREATE TABLE students(id uuid PRIMARY KEY,tenant_id text,admission_number text,status text);
      CREATE TABLE invoices(id uuid PRIMARY KEY,tenant_id text,invoice_number text,status text,total_amount_minor bigint,amount_paid_minor bigint,metadata jsonb);
      CREATE TABLE tenant_financial_accounts(tenant_id text,mpesa_clearing_account_code text,fee_control_account_code text);
      CREATE TABLE student_guardians(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE student_portal_access(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE test_postings(id uuid PRIMARY KEY,tenant_id text,student_id text,amount_minor bigint);
      CREATE TABLE mpesa_transactions(tenant_id text,mpesa_receipt_number text,ledger_transaction_id uuid);
      CREATE TABLE manual_fee_payments(tenant_id text,external_reference text,payment_method text,status text);
      ${PAYMENT_CHANNEL_WORKFLOW_SCHEMA} ${COLLECTION_PAYMENTS_SCHEMA} ${PAYMENT_INGRESS_SCHEMA}
      GRANT USAGE ON SCHEMA ${schema},app TO ${role};GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    const originalUrl=process.env.DATABASE_URL;
    // Exercise both schema options preservation and a non-UTC connection default.
    url.searchParams.set('options',`-c search_path=${schema},public -c timezone=Africa/Nairobi`);
    try {
      process.env.DATABASE_URL=url.toString();
      db=new PrismaService(context,{getRuntimeRoleName:()=>role} as never);
    } finally {process.env.DATABASE_URL=originalUrl;}
    await db.onModuleInit();
    await pool.query(`INSERT INTO students VALUES($1,$2,'ADM-1','active'),($3,$4,'ADM-1','active')`,[learner,school,randomUUID(),other]);
    await pool.query(`INSERT INTO tenant_financial_accounts VALUES('school-a','1110-MPESA-CLEARING','1100-AR-FEES')`);
    await pool.query(`INSERT INTO invoices VALUES($1,$2,'INV-1','open',100000,0,$3::jsonb)`,[invoice,school,JSON.stringify({student_id:learner})]);
    prod=await revision(school,'production');sandboxA=await revision(school,'sandbox');sandboxB=await revision(other,'sandbox');
    const audit={record:async()=>{}},events={publish:async()=>{}},notifications={upsertFromSchoolOperation:async()=>{}};
    matcher=new CollectionReferenceMatcher(db as never);
    const collections=new CollectionPaymentsService(db as never,context,{createManualFeePayment:async(input:any)=>{
      const id=randomUUID();await db.query(`INSERT INTO test_postings VALUES($1,$2,$3,$4)`,[id,context.requireStore().tenant_id,input.student_id,input.amount_minor]);
      return {id,ledger_transaction_id:randomUUID(),receipt_number:`R-${id}`};
    }} as never,{} as never,events as never,audit as never,notifications as never,{recognize:async()=>randomUUID(),release:async()=>null} as never,matcher);
    const adapter=new SafaricomCollectionAdapter(new MpesaSignatureService({get:()=> 'gateway-test-secret'} as never));
    adapter.requestVerification=async(_channel,payment,urls)=>{const conversation=randomUUID();requests.set(payment.provider_transaction_id,{...urls,conversation});return {conversation_id:conversation};};
    ingress=new PaymentIngressService(db as never,context,{decrypt:(value:string)=>value.slice(7)} as never,new PaymentIngressConfigService({get:()=> 'https://payments.myshule.online/payments/ingress'} as never),new CollectionAdapterRegistry(adapter),collections,matcher,audit as never,events as never,notifications as never);
    const module=await Test.createTestingModule({controllers:[PaymentIngressController],providers:[{provide:PaymentIngressService,useValue:ingress}]}).compile();
    app=module.createNestApplication({logger:false,rawBody:true});
    app.use((_req:unknown,_res:unknown,next:()=>void)=>context.run({tenant_id:null,role:'anonymous',is_authenticated:false} as never,next));
    await app.init();
  });
  afterAll(async()=>{await app?.close();await db?.onModuleDestroy();if(pool){try{await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE;REVOKE USAGE ON SCHEMA app FROM ${role};DROP ROLE IF EXISTS ${role}`);}finally{await pool.end();}}});
  it('serves neutral and legacy callback routes without weakening school/revision/token checks',async()=>{
    const hex=Buffer.from(school).toString('hex');
    const path=`/payments/ingress/c2b/production/${hex}/${prod.revision}/${token}`;
    const body=callback('NEUTRAL-ROUTE');
    await request(app.getHttpServer()).post(`${path}/validation`).send(body).expect(200);
    expect((await pool.query("SELECT id FROM payment_ingress WHERE provider_transaction_id='NEUTRAL-ROUTE'")).rows).toHaveLength(0);
    await request(app.getHttpServer()).post(`${path}/confirmation`).send(body).expect(200);
    await request(app.getHttpServer()).post(`/payments/ingress/safaricom/production/${school}/${prod.revision}/${token}/confirmation`).send(body).expect(200);
    expect((await pool.query("SELECT id FROM payment_ingress WHERE provider_transaction_id='NEUTRAL-ROUTE'")).rows).toHaveLength(1);
    for(const wrong of [path.replace(hex,Buffer.from(other).toString('hex')),path.replace(token,'b'.repeat(64)),path.replace('/production/','/sandbox/'),path.replace(hex,'school-a'),path.replace(hex,'ff'.repeat(4))]) {
      const denied=await request(app.getHttpServer()).post(`${wrong}/confirmation`).send(body);
      expect([400,401,403,404]).toContain(denied.status);
    }
    expect((await pool.query('SELECT * FROM test_postings')).rows).toHaveLength(0);
  });
  it('rejects wrong capability, environment and school; callbacks need no MyShule header',async()=>{
    const body=callback('AUTH');
    for(const route of [{...prod,token:'b'.repeat(64)},{...prod,environment:'sandbox'},{...prod,tenant:other}])
      await expect(as(()=>ingress.receive(route,body,JSON.stringify(body),{}))).rejects.toThrow();
    const id=await receive(prod,body);expect((await state(id)).state).toBe('received');
    expect((await pool.query('SELECT * FROM test_postings')).rows).toHaveLength(0);
    expect((await as(()=>db.query('SELECT * FROM payment_ingress'),other)).rows).toHaveLength(0);
  });
  it('requires asynchronous settlement evidence and posts concurrent replays exactly once',async()=>{
    const body=callback('VERIFIED','INV-1');
    const ids=await Promise.all(Array.from({length:6},()=>receive(prod,body)));expect(new Set(ids).size).toBe(1);
    const id=ids[0];await as(()=>ingress.process(id));expect((await state(id)).state).toBe('verifying');
    expect((await pool.query('SELECT * FROM test_postings')).rows).toHaveLength(0);
    await deliver('VERIFIED');
    const stored=(await as(()=>db.query('SELECT occurred_at FROM payment_ingress WHERE tenant_id=$1 AND id=$2::uuid',[school,id]))).rows[0];
    expect(stored.occurred_at.toISOString()).toBe(new SafaricomCollectionAdapter({} as never).parse(body).occurred_at);
    await Promise.all(Array.from({length:6},()=>as(()=>ingress.process(id))));
    expect((await state(id)).state).toBe('posted');
    const rows=(await pool.query('SELECT * FROM collection_payments')).rows;expect(rows).toHaveLength(1);expect(rows[0].student_id).toBe(learner);expect(rows[0].invoice_id).toBe(invoice);expect(rows[0].receipt_number).toMatch(/^R-/);
    expect((await pool.query('SELECT * FROM test_postings')).rows).toHaveLength(1);
    await receive(prod,body);await deliver('VERIFIED');await as(()=>ingress.process(id));expect((await pool.query('SELECT * FROM test_postings')).rows).toHaveLength(1);
    const parts=new URL(requests.get('VERIFIED')!.result).pathname.split('/');
    await request(app.getHttpServer()).post(`/payments/ingress/verification/${school}/${parts.at(-3)}/${parts.at(-2)}/result`).send(evidence('VERIFIED')).expect(200);
    await request(app.getHttpServer()).post(`/payments/ingress/check/${Buffer.from(other).toString('hex')}/${parts.at(-3)}/${parts.at(-2)}/result`).send(evidence('VERIFIED')).expect(401);
  });
  it.each([{Amount:'99.00'},{CreditPartyName:'600001 - Other'},{ReceiptNo:'OTHER'},{TransactionStatus:'Cancelled'}])('quarantines mismatched verification %j',async changes=>{
    const receipt=`BAD${randomUUID().slice(0,8)}`.toUpperCase(),id=await receive(prod,callback(receipt));await as(()=>ingress.process(id));await deliver(receipt,evidence(receipt,changes));await as(()=>ingress.process(id));expect((await state(id)).state).toBe('review');expect((await state(id)).collection_id).toBeNull();
  });
  it('refuses callback/result token replay and conflicting callback identity',async()=>{
    const receipt='CONFLICT',id=await receive(prod,callback(receipt));await as(()=>ingress.process(id));
    const parts=new URL(requests.get(receipt)!.result).pathname.split('/');
    await expect(as(()=>ingress.result(school,parts.at(-3)!,'bad-token',evidence(receipt),'',{}))).rejects.toThrow();
    await receive(prod,callback(receipt,'ADM-1','200.00'));await deliver(receipt);await as(()=>ingress.process(id));expect((await state(id)).state).toBe('review');expect((await state(id)).collection_id).toBeNull();
    await expect(as(()=>ingress.retry(id))).rejects.toThrow('non-conflicting');
  });
  it('isolates shared sandbox shortcodes and never credits live fees',async()=>{
    await pool.query(`INSERT INTO payment_sandbox_tests VALUES($1,$2,'TEST-SCHOOL-A','ADM-1',now())`,[school,sandboxA.revision]);
    const id=await receive(sandboxA,callback('SANDBOX','TEST-SCHOOL-A'));
    await as(()=>ingress.process(id));await deliver('SANDBOX');await as(()=>ingress.process(id));
    expect((await state(id)).state).toBe('sandbox_verified');expect((await state(id)).student_id).toBe(learner);expect((await state(id)).collection_id).toBeNull();
    await receive(sandboxA,callback('SANDBOX','TEST-SCHOOL-A','200.00'));
    expect((await state(id)).state).toBe('sandbox_verified');
    expect((await state(id)).conflict_hash).toBeTruthy();
    expect((await state(id)).amount_minor).toBe('10000');
    const crossed=await receive(sandboxB,callback('SANDBOX','TEST-SCHOOL-A'));await as(()=>ingress.process(crossed),other);await deliver('SANDBOX');await as(()=>ingress.process(crossed),other);
    expect((await state(crossed)).state).toBe('review');expect((await state(crossed)).student_id).toBeNull();expect((await pool.query('SELECT * FROM test_postings')).rows).toHaveLength(1);
  });
  it('uses unique invoice first, then unique active admission; ambiguity stays unmatched',async()=>{
    await pool.query(`INSERT INTO students VALUES($1,$2,'INV-1','active'),($3,$2,'DUP','active'),($4,$2,'DUP','active'),($5,$2,'INACTIVE','inactive')`,[randomUUID(),school,randomUUID(),randomUUID(),randomUUID()]);
    expect((await as(()=>matcher.match(school,'INV-1'))).student_id).toBe(learner);
    expect((await as(()=>matcher.match(school,'DUP'))).reason).toBe('ambiguous_admission_number');
    expect((await as(()=>matcher.match(school,'INACTIVE'))).student_id).toBeNull();
    await pool.query(`INSERT INTO invoices VALUES($1,$2,'OTHER','open',10000,0,$3::jsonb)`,[randomUUID(),school,JSON.stringify({student_id:learner,external_reference:'INV-1'})]);
    expect((await as(()=>matcher.match(school,'INV-1'))).reason).toBe('ambiguous_invoice_reference');
    expect((await as(()=>matcher.match(other,'INV-1'),other)).student_id).toBeNull();
  });
});
