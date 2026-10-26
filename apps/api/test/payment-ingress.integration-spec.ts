import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
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
import type { BankTransaction } from '../src/modules/tenant-finance/providers/bank-provider';
import { BankSynchronizationService } from '../src/modules/payments/ingress/bank-synchronization.service';
import { BANK_SYNCHRONIZATION_SCHEMA } from '../src/modules/payments/ingress/bank-synchronization.schema';
import { BANK_PROVIDER_REGISTRY } from '../src/modules/tenant-finance/providers/registered-bank-providers';
import { BankProviderError, type BankRetrieval } from '../src/modules/tenant-finance/providers/bank-provider';
import { listCollectionProviders } from '../src/modules/tenant-finance/payment-provider.catalog';
import { guardBankReceipt } from '../src/modules/billing/bank-receipt-identity';
import { PaymentChannelWorkflowService } from '../src/modules/tenant-finance/payment-channel-workflow.service';
import { PaymentChannelConnectionService } from '../src/modules/tenant-finance/payment-channel-connection.service';

describe('Verified collection ingress with real PostgreSQL/RLS', () => {
  jest.setTimeout(60000);
  const schema = `ingress_${randomUUID().replaceAll('-','')}`, role = `${schema}_role`;
  const context = new RequestContextService();
  let db: PrismaService;
  const school='school-a', other='school-b', learner=randomUUID(), invoice=randomUUID();
  const token='a'.repeat(64), credentials={consumer_key:'test',consumer_secret:'test',initiator_name:'test',security_credential:'test',_callback_token:token,_callback_trust_mode:'daraja_direct'};
  let pool:Pool, ingress:PaymentIngressService, matcher:CollectionReferenceMatcher, collections:CollectionPaymentsService;
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
      CREATE TABLE manual_fee_payments(tenant_id text,external_reference text,payment_method text,status text,deposit_reference text,id uuid DEFAULT gen_random_uuid(),idempotency_key text);
      ${PAYMENT_CHANNEL_WORKFLOW_SCHEMA} ${COLLECTION_PAYMENTS_SCHEMA} ${PAYMENT_INGRESS_SCHEMA} ${BANK_SYNCHRONIZATION_SCHEMA}
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
    collections=new CollectionPaymentsService(db as never,context,{createManualFeePayment:async(input:any)=>{
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
  async function bankRevision(environment:'sandbox'|'production'='production',provider='equity',tenant=school,
    options:{status?:string;credentials?:Record<string,string>}={}) {
    const id=randomUUID(),channel=randomUUID(),account=`1234${Date.now()}${Math.floor(Math.random()*1000)}`;
    await pool.query('INSERT INTO tenant_payment_channels(id,tenant_id) VALUES($1,$2)',[channel,tenant]);
    await pool.query(`INSERT INTO tenant_payment_channel_revisions(id,tenant_id,channel_id,provider_code,channel_kind,display_name,account_name,account_number,status,connection_mode,environment,credentials_ciphertext,requested_by,reviewed_by,reviewed_at,reason,activated_at)
      VALUES($1,$2,$3,$9,'bank_account','Bank fees','School',$4,$10,'bank_api',$5,$6,$7,$8,now(),'Approved school bank account',CASE WHEN $10='active' THEN now()-interval '1 year' END)`,
      [id,tenant,environment==='production'?channel:null,account,environment,`enc:v1:${JSON.stringify(options.credentials ?? credentials)}`,randomUUID(),randomUUID(),provider,options.status ?? 'active']);
    return {id,account};
  }
  describe('KCB signed account notifications',()=>{
    const keys=generateKeyPairSync('rsa',{modulusLength:2048});
    const bankCredentials={bank_public_key:keys.publicKey.export({type:'spki',format:'pem'}).toString(),_callback_token:token};
    function notification(account:string,reference=`KCB-${randomUUID()}`) {
      return {transactionReference:reference,requestId:randomUUID(),creditAccountIdentifier:account,
        customerReference:invoice,currency:'KES',transactionAmount:'100.00',
        timestamp:new Date(Date.now()+10800000).toISOString().slice(0,19).replace(/[-:T]/g,'')};
    }
    function send(bank:{id:string},environment:string,body:ReturnType<typeof notification>,signature?:string,tenant=school) {
      const raw=JSON.stringify(body);
      return request(app.getHttpServer()).post(`/payments/ingress/kcb/${environment}/${tenant}/${bank.id}/${token}/confirmation`)
        .set('Content-Type','application/json').set('Signature',signature ?? sign('RSA-SHA256',Buffer.from(raw),keys.privateKey).toString('base64')).send(raw);
    }
    it('rejects altered signatures and receiving accounts; concurrent genuine replays post once',async()=>{
      const bank=await bankRevision('production','kcb',school,{credentials:bankCredentials});
      const body=notification(bank.account),raw=JSON.stringify(body);
      const signature=sign('RSA-SHA256',Buffer.from(raw),keys.privateKey).toString('base64');
      await send(bank,'production',{...body,transactionAmount:'200.00'},signature).expect(401);
      await send(bank,'production',{...body,creditAccountIdentifier:'another-account'}).expect(400);
      await send(bank,'production',body,signature,other).expect(401);
      const responses=await Promise.all(Array.from({length:5},()=>send(bank,'production',body)));
      responses.forEach(response=>{expect(response.status).toBe(200);expect(response.body.statusCode).toBe('0');});
      const rows=(await pool.query('SELECT * FROM payment_ingress WHERE revision_id=$1',[bank.id])).rows;
      expect(rows).toHaveLength(1);expect(rows[0].bank_evidence.method).toBe('kcb_rsa_account_credit');
      const before=(await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n;
      await Promise.all(Array.from({length:4},()=>as(()=>ingress.process(rows[0].id))));
      expect((await state(rows[0].id)).state).toBe('posted');
      expect((await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n).toBe(before+1);
      expect((await as(()=>db.query('SELECT id FROM payment_ingress WHERE id=$1',[rows[0].id]),other)).rows).toHaveLength(0);
    });
    it('requires a current signed onboarding delivery, protects its key, and keeps sandbox out of live books',async()=>{
      const bank=await bankRevision('sandbox','kcb',school,{status:'connecting',credentials:bankCredentials});
      const config=new PaymentIngressConfigService({get:()=> 'https://payments.myshule.online/payments/ingress'} as never);
      const workflow=new PaymentChannelWorkflowService(context,db as never,{decrypt:(value:string)=>value.slice(7)} as never,
        {} as never,{} as never,new PaymentChannelConnectionService({} as never,config),
        {record:async()=>{}} as never,{publish:async()=>{}} as never,{upsertFromSchoolOperation:async()=>{}} as never);
      function platform<T>(work:()=>Promise<T>){return context.run({tenant_id:school,user_id:randomUUID(),role:'platform_owner',
        audience:'superadmin',is_authenticated:true,permissions:['*:*']} as never,work);}
      expect((await platform(()=>workflow.test(school,bank.id))).last_error).toMatch(/Awaiting a recent/);
      await expect(as(()=>workflow.test(school,bank.id))).rejects.toThrow(/platform connection/);
      const urls=await platform(()=>workflow.callbacks(school,bank.id));
      expect(urls.validation_url).toBe('');expect(urls.trust_mode).toBe('bank_signature');
      const body=notification(bank.account);await send(bank,'sandbox',body).expect(200);
      const row=(await pool.query('SELECT * FROM payment_ingress WHERE revision_id=$1',[bank.id])).rows[0];
      expect(row.state).toBe('review');expect(row.collection_id).toBeNull();
      expect((await platform(()=>workflow.test(school,bank.id))).status).toBe('ready');
      // A delivery verified with an old key cannot approve a replacement key.
      await pool.query('UPDATE tenant_payment_channel_revisions SET credential_version=1 WHERE id=$1',[bank.id]);
      expect((await platform(()=>workflow.test(school,bank.id))).status).toBe('connecting');
      const oldKeyEntry=BANK_PROVIDER_REGISTRY.adapter('kcb').notifications!.parse({school_id:school,revision_id:bank.id,
        account_number:bank.account,environment:'sandbox',credentials:bankCredentials},notification(bank.account))[0];
      await expect(as(()=>ingress.acceptBankTransaction(bank.id,oldKeyEntry,0))).rejects.toThrow(/key changed/);
      await send(bank,'sandbox',notification(bank.account)).expect(200);
      expect((await platform(()=>workflow.test(school,bank.id))).last_test_status).toBe('bank_sandbox_notification_verified');
      await pool.query("UPDATE payment_ingress SET conflict_hash='conflicting-delivery' WHERE revision_id=$1",[bank.id]);
      await expect(platform(()=>workflow.activate(school,bank.id))).rejects.toThrow(/Awaiting a recent/);
      await send(bank,'sandbox',notification(bank.account)).expect(200);
      await platform(()=>workflow.test(school,bank.id));
      await platform(()=>workflow.activate(school,bank.id));
      await send(bank,'sandbox',notification(bank.account)).expect(200);
      const pending=(await pool.query("SELECT id FROM payment_ingress WHERE revision_id=$1 AND state='verified'",[bank.id])).rows[0];
      const before=(await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n;
      await as(()=>ingress.process(pending.id));
      expect((await state(pending.id)).state).toBe('sandbox_verified');
      expect((await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n).toBe(before);
      const banks=new BankSynchronizationService(db as never,context,{} as never,ingress,{} as never,{} as never,{} as never);
      await expect(as(()=>banks.requestSync(bank.id,'Retrieve missing bank credit'))).rejects.toThrow(/uses notifications/);
    });
  });
  function bankEntry(account:string,reference=`BANK-${randomUUID()}`):BankTransaction {
    return {direction:'credit',payment:{provider_code:'equity',provider_transaction_id:reference,destination_account:account,
      amount_minor:'10000',currency_code:'KES',account_reference:learner,occurred_at:new Date().toISOString()},
      evidence:{method:'jenga_account_statement',bank_reference:reference,serial:'1',retrieved_at:new Date().toISOString()}};
  }
  it('bank statement evidence uses the same durable inbox/poster and never posts a debit or a duplicate',async()=>{
    const bank=await bankRevision(); const entry=bankEntry(bank.account);
    // Match a unique invoice, independently of earlier ambiguity fixtures.
    entry.payment.account_reference=invoice;
    const before=(await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n;
    const id=await as(()=>ingress.acceptBankTransaction(bank.id,entry));
    await Promise.all([as(()=>ingress.process(id)),as(()=>ingress.process(id))]);
    await as(()=>ingress.acceptBankTransaction(bank.id,entry));await as(()=>ingress.process(id));
    expect((await state(id)).state).toBe('posted');
    expect((await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n).toBe(before+1);
    const debit=await as(()=>ingress.acceptBankTransaction(bank.id,{...bankEntry(bank.account),direction:'debit'}));
    await as(()=>ingress.process(debit));expect((await state(debit)).state).toBe('review');expect((await state(debit)).collection_id).toBeNull();
    await expect(as(()=>ingress.acceptBankTransaction(bank.id,bankEntry('OTHER')))).rejects.toThrow(/destination/);
    await expect(as(()=>ingress.acceptBankTransaction(bank.id,entry),other)).rejects.toThrow();
  });
  it('bank sandbox evidence is isolated from live fees without depending on Daraja simulation references',async()=>{
    const bank=await bankRevision('sandbox');const entry=bankEntry(bank.account);entry.payment.account_reference=invoice;
    const id=await as(()=>ingress.acceptBankTransaction(bank.id,entry));await as(()=>ingress.process(id));
    expect((await state(id)).state).toBe('sandbox_verified');expect((await state(id)).collection_id).toBeNull();
  });
  it('conflicting bank evidence remains visible and cannot change a previously posted transaction',async()=>{
    const bank=await bankRevision();const entry=bankEntry(bank.account);entry.payment.account_reference=invoice;
    const id=await as(()=>ingress.acceptBankTransaction(bank.id,entry));await as(()=>ingress.process(id));
    await as(()=>ingress.acceptBankTransaction(bank.id,{...entry,payment:{...entry.payment,amount_minor:'20000'}}));
    expect((await state(id)).conflict_hash).toBeTruthy();expect((await state(id)).amount_minor).toBe('10000');
    await expect(pool.query("UPDATE payment_ingress SET bank_evidence='{}' WHERE id=$1",[id])).rejects.toThrow(/immutable/);
  });
  it('cannot double-post the same bank reference through native retrieval and reviewed statement entry in either order',async()=>{
    const a=await bankRevision(),entry=bankEntry(a.account);entry.payment.account_reference=invoice;
    entry.evidence.bank_reference=`RAW-${randomUUID()}`;
    const before=(await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n;
    const id=await as(()=>ingress.acceptBankTransaction(a.id,entry));await as(()=>ingress.process(id));
    await expect(as(()=>collections.statement(a.id,{...entry.payment,provider_transaction_id:entry.evidence.bank_reference},'Bank statement page one'))).rejects.toThrow(/already has/);
    const b=await bankRevision(),pending=bankEntry(b.account);pending.payment.account_reference=invoice;
    pending.evidence.bank_reference=`RAW-${randomUUID()}`;
    await as(()=>collections.statement(b.id,{...pending.payment,provider_transaction_id:pending.evidence.bank_reference},'Bank statement page two'));
    const second=await as(()=>ingress.acceptBankTransaction(b.id,pending));expect((await state(second)).state).toBe('review');
    await as(()=>ingress.retry(second));await as(()=>ingress.process(second));
    expect((await state(second)).state).toBe('review');expect((await state(second)).collection_id).toBeNull();
    expect((await pool.query('SELECT count(*)::int AS n FROM test_postings')).rows[0].n).toBe(before+1);
  });
  it('preserves historical manual bank receipts during automated adoption',async()=>{
    const bank=await bankRevision(),entry=bankEntry(bank.account);entry.payment.account_reference=invoice;
    await pool.query(`INSERT INTO manual_fee_payments(tenant_id,external_reference,payment_method,status) VALUES($1,$2,'bank_deposit','cleared')`,[school,entry.evidence.bank_reference]);
    const id=await as(()=>ingress.acceptBankTransaction(bank.id,entry));await as(()=>ingress.process(id));
    expect((await state(id)).state).toBe('review');expect((await state(id)).collection_id).toBeNull();
  });
  it('serializes competing manual bank receipts, retains idempotent retry, and rejects native-reference aliases',async()=>{
    const reference=`MANUAL-${randomUUID()}`;
    const attempt=(key:string)=>as(()=>db.withRequestTransaction(async()=>{
      await guardBankReceipt(db,school,[reference],key);
      await db.query(`INSERT INTO manual_fee_payments(tenant_id,external_reference,payment_method,status,idempotency_key)
        VALUES($1,$2,'eft','cleared',$3)`,[school,reference,key]);
    }));
    const result=await Promise.allSettled([attempt('manual-a'),attempt('manual-b')]);
    expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const row=(await pool.query('SELECT idempotency_key FROM manual_fee_payments WHERE external_reference=$1',[reference])).rows[0];
    await as(()=>db.withRequestTransaction(()=>guardBankReceipt(db,school,[reference],row.idempotency_key)));
    await as(()=>db.withRequestTransaction(()=>guardBankReceipt(db,other,[reference],'other-school')),other);
    const bank=await bankRevision(),entry=bankEntry(bank.account);entry.payment.account_reference=invoice;
    entry.evidence.bank_reference=`BANK-ALIAS-${randomUUID()}`;
    const id=await as(()=>ingress.acceptBankTransaction(bank.id,entry));await as(()=>ingress.process(id));
    await expect(as(()=>db.withRequestTransaction(()=>guardBankReceipt(db,school,[entry.evidence.bank_reference],'manual-copy')))).rejects.toThrow(/already in Collections/);
  });

  describe('bank retrieval through a twelfth registered contract provider',()=>{
    const provider='contract_bank', day='2026-09-15';
    const responses=new Map<string,BankRetrieval|Error>();
    const calls:string[]=[];
    const recorded:string[]=[];
    let banks:BankSynchronizationService;
    beforeAll(()=>{
      BANK_PROVIDER_REGISTRY.register({code:provider,name:'Contract test provider',description:'Isolated test fixture',
        channel_kinds:['bank_account'],connection_modes:['statement'],credential_fields:[]},{provider,calendar_time_zone:'Africa/Nairobi',channel_kinds:['bank_account'],
        checkConnection:async c=>({account_number:c.account_number,currency_code:'KES',method:'contract_fixture'}),
        retrieveTransactions:async(c,range)=>{
          calls.push(`${c.school_id}:${c.account_number}:${range.from_date}`);
          const value=responses.get(c.account_number)!;
          if(value instanceof Error) throw value;
          return value;
        }});
      banks=new BankSynchronizationService(db,context,{decrypt:(v:string)=>v.slice(7)} as never,ingress,
        {record:async(e:any)=>{recorded.push(e.action);}} as never,{publish:async()=>{}} as never,{upsertFromSchoolOperation:async()=>{}} as never);
    });
    afterAll(()=>BANK_PROVIDER_REGISTRY.remove(provider));
    async function setup(environment:'sandbox'|'production'='production') {
      const tenant=`sync-${randomUUID()}`,student=randomUUID(),inv=randomUUID();
      const bank=await bankRevision(environment,provider,tenant);
      await pool.query(`INSERT INTO students VALUES($1,$2,'ADM-1','active');`,[student,tenant]);
      await pool.query(`INSERT INTO invoices VALUES($1,$2,'BANK-INV','open',100000,0,$3::jsonb)`,[inv,tenant,JSON.stringify({student_id:student})]);
      await pool.query(`INSERT INTO tenant_financial_accounts VALUES($1,'1110-MPESA-CLEARING','1100-AR-FEES')`,[tenant]);
      await pool.query(`INSERT INTO bank_connection_sync(tenant_id,revision_id,scan_date,earliest_at) VALUES($1,$2,$3::date,$4::timestamptz)`,
        [tenant,bank.id,day,`${day}T00:00:00+03:00`]);
      const entry=bankEntry(bank.account);entry.payment.provider_code=provider;entry.payment.occurred_at=`${day}T09:00:00.000Z`;entry.payment.account_reference=inv;
      responses.set(bank.account,{entries:[entry],complete:true});
      return {...bank,tenant,student,entry};
    }
    async function syncRow(tenant:string) {return (await pool.query('SELECT *,scan_date::text FROM bank_connection_sync WHERE tenant_id=$1',[tenant])).rows[0];}
    it('discovers a new adapter and retrieves/posts through the unchanged inbox with school leases and replay safety',async()=>{
      expect(listCollectionProviders().find(p=>p.code===provider)?.connection_modes).toContain('bank_api');
      const a=await setup(),b=await setup();const before=calls.length;
      await Promise.all([as(()=>banks.recoverSchool(a.tenant),a.tenant),as(()=>banks.recoverSchool(a.tenant),a.tenant)]);
      expect(calls.length).toBe(before+1);
      await as(()=>ingress.recoverSchool(a.tenant),a.tenant);
      expect((await pool.query('SELECT * FROM test_postings WHERE tenant_id=$1',[a.tenant])).rows).toHaveLength(1);
      expect((await pool.query('SELECT * FROM payment_ingress WHERE tenant_id=$1',[b.tenant])).rows).toHaveLength(0);
      expect((await syncRow(a.tenant)).scan_date).toBe('2026-09-16');
      await as(()=>banks.requestSync(a.id,'Recheck the bank evidence',day),a.tenant);
      await as(()=>banks.recoverSchool(a.tenant),a.tenant);await as(()=>ingress.recoverSchool(a.tenant),a.tenant);
      expect((await pool.query('SELECT * FROM test_postings WHERE tenant_id=$1',[a.tenant])).rows).toHaveLength(1);
      expect(recorded).toContain('bank_connection.credentials_accessed');
      expect(recorded).toContain('bank_connection.retrieval_completed');
      await expect(as(()=>banks.requestSync(a.id,'Wrong school request'),b.tenant)).rejects.toThrow();
      expect((await as(()=>db.query('SELECT * FROM bank_connection_sync'),b.tenant)).rows.every((r:any)=>r.tenant_id===b.tenant)).toBe(true);
    });
    it('keeps incomplete days pending, retries outages, and never posts sandbox evidence to live balances',async()=>{
      const a=await setup('sandbox');responses.set(a.account,{entries:[a.entry],complete:false});
      await as(()=>banks.recoverSchool(a.tenant),a.tenant);
      expect((await syncRow(a.tenant)).scan_date).toBe(day);
      expect((await syncRow(a.tenant)).last_error).toMatch(/incomplete/);
      expect((await pool.query('SELECT * FROM payment_ingress WHERE tenant_id=$1',[a.tenant])).rows).toHaveLength(0);
      responses.set(a.account,new BankProviderError('unavailable','Bank service is temporarily unavailable'));
      await as(()=>banks.requestSync(a.id,'Retry bank availability'),a.tenant);await as(()=>banks.recoverSchool(a.tenant),a.tenant);
      expect((await syncRow(a.tenant)).last_error).toMatch(/temporarily unavailable/);
      responses.set(a.account,{entries:[a.entry],complete:true});
      await as(()=>banks.requestSync(a.id,'Bank service has recovered'),a.tenant);await as(()=>banks.recoverSchool(a.tenant),a.tenant);
      await as(()=>ingress.recoverSchool(a.tenant),a.tenant);
      expect((await syncRow(a.tenant)).last_error).toBeNull();
      expect((await pool.query('SELECT state FROM payment_ingress WHERE tenant_id=$1',[a.tenant])).rows[0].state).toBe('sandbox_verified');
      expect((await pool.query('SELECT * FROM test_postings WHERE tenant_id=$1',[a.tenant])).rows).toHaveLength(0);
    });
    it('resumes an expired lease and refuses conflicting staff changes or unauthorized requests',async()=>{
      const a=await setup();
      await pool.query(`UPDATE bank_connection_sync SET lease_token=$2,next_attempt_at=now()+interval '2 minutes' WHERE tenant_id=$1`,[a.tenant,randomUUID()]);
      await expect(as(()=>banks.requestSync(a.id,'Concurrent manual retrieval'),a.tenant)).rejects.toThrow(/being retrieved/);
      const before=calls.length;await as(()=>banks.recoverSchool(a.tenant),a.tenant);expect(calls.length).toBe(before);
      await pool.query(`UPDATE bank_connection_sync SET next_attempt_at=now()-interval '1 second' WHERE tenant_id=$1`,[a.tenant]);
      await as(()=>banks.recoverSchool(a.tenant),a.tenant);expect(calls.length).toBe(before+1);
      await expect(context.run({tenant_id:a.tenant,role:'teacher',is_authenticated:true,permissions:['*:*']} as never,()=>banks.requestSync(a.id,'Not authorized'))).rejects.toThrow();
      await expect(as(()=>banks.requestSync(a.id,'Invalid start date','2026-02-30'),a.tenant)).rejects.toThrow(/valid start date/);
      await expect(as(()=>banks.recoverSchool(other),a.tenant)).rejects.toThrow(/context mismatch/);
    });
    it('resumes the previous account cursor after credential replacement without losing older approved receipts',async()=>{
      const a=await setup(),id=randomUUID(),channel=randomUUID();
      await pool.query(`UPDATE tenant_payment_channel_revisions SET status='superseded' WHERE id=$1`,[a.id]);
      await pool.query(`INSERT INTO tenant_payment_channels VALUES($1,$2)`,[channel,a.tenant]);
      await pool.query(`INSERT INTO tenant_payment_channel_revisions(id,tenant_id,channel_id,replaces_revision_id,provider_code,channel_kind,
        display_name,account_name,account_number,status,connection_mode,environment,credentials_ciphertext,requested_by,reviewed_by,reviewed_at,reason,activated_at)
        SELECT $2,tenant_id,$3,id,provider_code,channel_kind,display_name,account_name,account_number,'active',connection_mode,environment,
          credentials_ciphertext,requested_by,reviewed_by,reviewed_at,'Credential rotation',now()
        FROM tenant_payment_channel_revisions WHERE id=$1`,[a.id,id,channel]);
      await as(()=>banks.recoverSchool(a.tenant),a.tenant);await as(()=>ingress.recoverSchool(a.tenant),a.tenant);
      const checkpoint=(await pool.query('SELECT scan_date::text FROM bank_connection_sync WHERE revision_id=$1',[id])).rows[0];
      expect(checkpoint.scan_date).toBe('2026-09-16');
      const receipt=(await pool.query('SELECT * FROM collection_payments WHERE tenant_id=$1',[a.tenant])).rows[0];
      expect(receipt.status).toBe('posted');expect(receipt.revision_id).toBe(a.id);
      await as(()=>banks.requestSync(id,'Recheck the pending account history',day),a.tenant);
      await expect(as(()=>banks.requestSync(id,'Date before the approved window','2026-09-14'),a.tenant)).rejects.toThrow(/activation/);
    });
    it('isolates adapter removal without removing account history or breaking another provider',async()=>{
      const a=await setup();BANK_PROVIDER_REGISTRY.remove(provider);
      await as(()=>banks.recoverSchool(a.tenant),a.tenant);
      expect((await syncRow(a.tenant)).scan_date).toBe(day);
      expect((await syncRow(a.tenant)).last_error).toMatch(/failed/);
      expect(BANK_PROVIDER_REGISTRY.adapter('equity').provider).toBe('equity');
      expect((await pool.query('SELECT id FROM tenant_payment_channel_revisions WHERE id=$1',[a.id])).rows).toHaveLength(1);
    });
  });
});
