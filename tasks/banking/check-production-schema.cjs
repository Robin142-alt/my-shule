const {spawnSync}=require('node:child_process');
const {Client}=require('pg');
const {randomUUID}=require('node:crypto');
const {FinanceSchemaService}=require('../../apps/api/src/modules/finance/finance-schema.service');
const {BillingSchemaService}=require('../../apps/api/src/modules/billing/billing-schema.service');
const {TenantFinanceSchemaService}=require('../../apps/api/src/modules/tenant-finance/tenant-finance-schema.service');
const {PaymentChannelWorkflowSchemaService}=require('../../apps/api/src/modules/tenant-finance/payment-channel-workflow-schema.service');
const {PaymentsSchemaService}=require('../../apps/api/src/modules/payments/payments-schema.service');
const {CollectionPaymentsSchemaService}=require('../../apps/api/src/modules/payments/collection-payments-schema.service');
async function main(){
  const url=new URL(process.env.DATABASE_URL);
  if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))
    throw new Error('A disposable local database is required');
  const client=new Client({connectionString:url.toString()});await client.connect();
  try{
    await client.query('CREATE ROLE shule_hub_runtime NOLOGIN');
    const restored=spawnSync('C:/Program Files/PostgreSQL/18/bin/pg_restore.exe',['--no-owner','--no-privileges','--exit-on-error','--dbname',url.toString(),
      'output/banking-release/production-schema.dump'],{encoding:'utf8',windowsHide:true});
    if(restored.status!==0)throw new Error(restored.stderr||'Schema restore failed');
    const db={runSchemaBootstrap:async sql=>{await client.query(sql);}},auth={onModuleInit:async()=>{}};
    const finance=new FinanceSchemaService(db,auth),billing=new BillingSchemaService(db),tenant=new TenantFinanceSchemaService(db,auth);
    const channels=new PaymentChannelWorkflowSchemaService(db,tenant),payments=new PaymentsSchemaService(db,auth,finance,tenant),collections=new CollectionPaymentsSchemaService(db,channels);
    for(let pass=1;pass<=2;pass++){
      await client.query('BEGIN');
      try {for(const service of [finance,billing,payments,channels,collections])await service.onModuleInit();await client.query('COMMIT');}
      catch(error){await client.query('ROLLBACK');throw error;}
      console.log(`Banking migration on production schema pass ${pass}: passed`);
    }
    const required=['fee_payment_corrections','fee_credit_refunds','fee_credit_applications','fee_credit_application_reversals','receipt_refund_evidence','collection_payments'];
    const rows=(await client.query('SELECT relname FROM pg_class WHERE relname=ANY($1::text[]) AND relrowsecurity AND relforcerowsecurity',[required])).rows;
    if(rows.length!==required.length)throw new Error('All new financial history tables must enforce tenant RLS');
    console.log('Forced tenant RLS verified; only schema was copied from production.');
    // Exercise the actual ORM repositories and deferred ledger constraints on
    // legacy text identifiers/amounts. These fixtures exist only on localhost.
    await client.query("INSERT INTO tenants(tenant_id,name,subdomain) VALUES('banking-release-fixture','Local release fixture','banking-release-fixture')");
    const accounts=(await client.query(`INSERT INTO accounts(tenant_id,code,name,category,normal_balance,currency_code)
      VALUES('banking-release-fixture','1120-BANK-CLEARING','Local bank','asset','debit','KES'),
        ('banking-release-fixture','1100-AR-FEES','Local fees','asset','debit','KES') RETURNING id,code`)).rows;
    await client.query('GRANT USAGE ON SCHEMA public,app TO shule_hub_runtime; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO shule_hub_runtime');
    const {RequestContextService}=require('../../apps/api/src/common/request-context/request-context.service');
    const {PrismaService}=require('../../apps/api/src/database/prisma.service');
    const {LedgerService}=require('../../apps/api/src/modules/finance/ledger.service');
    const {AccountsRepository}=require('../../apps/api/src/modules/finance/repositories/accounts.repository');
    const {TransactionsRepository}=require('../../apps/api/src/modules/finance/repositories/transactions.repository');
    const {LedgerEntriesRepository}=require('../../apps/api/src/modules/finance/repositories/ledger-entries.repository');
    const {IdempotencyKeysRepository}=require('../../apps/api/src/modules/finance/repositories/idempotency-keys.repository');
    const context=new RequestContextService(),runtime=new PrismaService(context,{getRuntimeRoleName:()=> 'shule_hub_runtime'});
    await runtime.onModuleInit();
    try{
      const ledger=new LedgerService(runtime,{get:()=>undefined},context,runtime,new AccountsRepository(runtime),new TransactionsRepository(runtime),
        new LedgerEntriesRepository(runtime),new IdempotencyKeysRepository(runtime),{recordFinanceTransactionPosted:async()=>{}},{recordServerOperation:async()=>{}});
      const input={idempotency_key:'schema-release-fixture',reference:'LOCAL-SCHEMA-RELEASE',description:'Local-only production schema verification',entries:accounts.map(a=>({
        account_id:a.id,direction:a.code==='1120-BANK-CLEARING'?'debit':'credit',amount_minor:'12345',currency_code:'KES'}))};
      const as=work=>context.run({tenant_id:'banking-release-fixture',user_id:null,role:'system',is_authenticated:true,permissions:['*:*'],request_id:'local-release'},work);
      const first=await as(()=>ledger.postTransaction(input)),retry=await as(()=>ledger.postTransaction(input));
      if(first.transaction_id!==retry.transaction_id)throw new Error('Ledger retry created a duplicate');
      const count=(await client.query("SELECT count(*)::int AS count FROM transactions WHERE tenant_id='banking-release-fixture'")).rows[0].count;
      if(count!==1)throw new Error('Local production-schema posting did not conserve transaction identity');
      await client.query('BEGIN');
      const legacyKey=(await client.query(`INSERT INTO idempotency_keys(tenant_id,scope,idempotency_key,request_method,request_path,request_hash,expires_at)
        VALUES('banking-release-fixture','local','legacy-exact','POST','/local','local',now()+interval '1 day') RETURNING id`)).rows[0].id;
      const legacy=(await client.query(`INSERT INTO transactions(tenant_id,idempotency_key_id,reference,description,currency_code,total_amount_minor,entry_count,effective_at,posted_at)
        VALUES('banking-release-fixture',$1,'LOCAL-LEGACY','Local integral decimal history','KES','100.00',2,now(),now()) RETURNING id`,[legacyKey])).rows[0].id;
      for(let index=0;index<accounts.length;index++)await client.query(`INSERT INTO ledger_entries(tenant_id,transaction_id,account_id,line_number,direction,amount_minor,currency_code)
        VALUES('banking-release-fixture',$1,$2,$3,$4,$5,'KES')`,[legacy,accounts[index].id,index+1,accounts[index].code==='1120-BANK-CLEARING'?'debit':'credit',index?'1e2':'100.00']);
      await client.query('COMMIT');
      const history=await as(()=>new TransactionsRepository(runtime).findByReference('banking-release-fixture','LOCAL-LEGACY'));
      if(history.total_amount_minor!=='100')throw new Error('Legacy integral money was not normalized exactly');
      await as(()=>ledger.postTransaction({...input,idempotency_key:'after-legacy',reference:'LOCAL-AFTER-LEGACY'}));
      console.log('Real Prisma ledger posting and idempotent replay passed on the production schema copy.');
      const tenant='banking-release-fixture',actor=randomUUID(),student=randomUUID();
      await client.query(`INSERT INTO users(id,full_name,email,password_hash,display_name,tenant_id)
        VALUES($1,'Local release actor',$2,'LOCAL-NON-LOGIN','Local actor',$3)`,[actor,`${actor}@example.invalid`,tenant]);
      await client.query(`INSERT INTO students(id,school_id,tenant_id,admission_number,first_name,last_name,gender,nationality,
        student_status,admission_date,boarding_status) VALUES($1,$2,$2,'LOCAL-ONLY','Local','Fixture','FEMALE','Kenyan','ACTIVE',current_date,'DAY_SCHOLAR')`,[student,tenant]);
      const subscription=(await client.query(`INSERT INTO subscriptions(tenant_id,plan_code,status,currency_code,current_period_start,current_period_end,features,limits,seats_allocated)
        VALUES($1,'school','active','KES',now(),now()+interval '1 year','[]','{}','1') RETURNING id`,[tenant])).rows[0].id;
      const invoice=(await client.query(`INSERT INTO invoices(tenant_id,subscription_id,invoice_number,description,status,subtotal_amount_minor,total_amount_minor,due_at,metadata)
        VALUES($1,$2,'LOCAL-INVOICE','Local fees','open',10000,10000,now(),$3::jsonb) RETURNING id`,[tenant,subscription,JSON.stringify({student_id:student})])).rows[0].id;
      const {ManualFeePaymentService}=require('../../apps/api/src/modules/billing/manual-fee-payment.service');
      const {ManualFeePaymentsRepository}=require('../../apps/api/src/modules/billing/repositories/manual-fee-payments.repository');
      const {InvoicesRepository}=require('../../apps/api/src/modules/billing/repositories/invoices.repository');
      const {TransactionService}=require('../../apps/api/src/modules/finance/transaction.service');
      const {FeeCreditApplicationService}=require('../../apps/api/src/modules/billing/fee-credit-application.service');
      const {MpesaReconciliationService}=require('../../apps/api/src/modules/payments/services/mpesa-reconciliation.service');
      const events={recordSchoolOperation:async()=>{}},invoices=new InvoicesRepository(runtime,{encryptNullable:v=>v,decryptNullable:v=>v});
      const manual=new ManualFeePaymentService(context,runtime,new ManualFeePaymentsRepository(runtime),invoices,new AccountsRepository(runtime),
        new TransactionService(ledger),events,new FeeCreditApplicationService(context,runtime,events));
      const staff=work=>context.run({tenant_id:tenant,user_id:actor,role:'accountant',is_authenticated:true,permissions:['*:*'],request_id:'local-receipt'},work);
      const payment={idempotency_key:'local-receipt',student_id:student,payment_method:'bank_deposit',amount_minor:'12500',external_reference:'LOCAL-BANK',received_at:new Date().toISOString()};
      const receipt=await staff(()=>manual.createManualFeePayment(payment));
      const duplicate=await staff(()=>manual.createManualFeePayment(payment));
      if(receipt.id!==duplicate.id)throw new Error('Receipt retry duplicated cash');
      const paid=(await client.query('SELECT amount_paid_minor::text AS paid FROM invoices WHERE id=$1',[invoice])).rows[0].paid;
      if(paid!=='10000')throw new Error('Invoice allocation did not reflect the receipt');
      const {MpesaC2bPaymentsRepository}=require('../../apps/api/src/modules/payments/repositories/mpesa-c2b-payments.repository');
      const c2b=new MpesaC2bPaymentsRepository(runtime),notification={tenant_id:tenant,mpesa_config_id:null,payment_channel_id:null,
        trans_id:'LOCALC2BONLY',transaction_type:'Pay Bill',business_short_code:'600000',bill_ref_number:'LOCAL-ONLY',invoice_number:null,
        amount_minor:'1000',currency_code:'KES',phone_number:null,payer_name:null,org_account_balance:null,third_party_trans_id:null,
        received_at:new Date().toISOString(),raw_payload:{},metadata:{local_test:true}};
      const incoming=await staff(()=>c2b.createReceived(notification)),replay=await staff(()=>c2b.createReceived(notification));
      if(!incoming.inserted||replay.inserted||incoming.payment.id!==replay.payment.id)throw new Error('C2B callback identity failed');
      const report=await staff(()=>new MpesaReconciliationService({get:()=>undefined},context,runtime).generateDailyReport({report_date:new Date().toISOString().slice(0,10)}));
      if(!report.summary)throw new Error('Reconciliation report did not load');
      console.log('Real receipt, excess credit, invoice allocation, duplicate delivery and reconciliation passed on the production schema copy.');
    }finally{await runtime.onModuleDestroy();}
  }finally{await client.end();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
