import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { PrismaService } from '../src/database/prisma.service';
import { FinanceSchemaService } from '../src/modules/finance/finance-schema.service';
import { BillingSchemaService } from '../src/modules/billing/billing-schema.service';
import { LedgerService } from '../src/modules/finance/ledger.service';
import { TransactionService } from '../src/modules/finance/transaction.service';
import { AccountsRepository } from '../src/modules/finance/repositories/accounts.repository';
import { TransactionsRepository } from '../src/modules/finance/repositories/transactions.repository';
import { LedgerEntriesRepository } from '../src/modules/finance/repositories/ledger-entries.repository';
import { IdempotencyKeysRepository } from '../src/modules/finance/repositories/idempotency-keys.repository';
import { ManualFeePaymentsRepository } from '../src/modules/billing/repositories/manual-fee-payments.repository';
import { InvoicesRepository } from '../src/modules/billing/repositories/invoices.repository';
import { SubscriptionsRepository } from '../src/modules/billing/repositories/subscriptions.repository';
import { FeeCreditApplicationService } from '../src/modules/billing/fee-credit-application.service';
import { StudentFeePaymentAllocationService } from '../src/modules/billing/student-fee-payment-allocation.service';
import { FEE_RECEIPTS_READ_SQL } from '../src/modules/billing/fee-receipts-read-sql';
import { ManualFeePaymentService } from '../src/modules/billing/manual-fee-payment.service';
import { CollectionPaymentsService } from '../src/modules/payments/collection-payments.service';
import { CollectionSuspenseService } from '../src/modules/payments/collection-suspense.service';
import { CollectionReferenceMatcher } from '../src/modules/payments/collection-reference-matcher.service';
import { FinanceCorrectionService } from '../src/modules/payments/finance-correction.service';
import { PaymentIngressService } from '../src/modules/payments/ingress/payment-ingress.service';
import { PAYMENT_CHANNEL_WORKFLOW_SCHEMA } from '../src/modules/tenant-finance/payment-channel-workflow-schema.service';
import { COLLECTION_PAYMENTS_SCHEMA } from '../src/modules/payments/collection-payments-schema.service';
import { PAYMENT_INGRESS_SCHEMA } from '../src/modules/payments/ingress/payment-ingress.schema';
import type { BankTransaction } from '../src/modules/tenant-finance/providers/bank-provider';

/** Real application schema, Prisma, RLS, inbox, receipts, allocations, credits and
 * ledger. Provider evidence is a local contract fixture, not bank certification.
 * External notification/event delivery uses a transactional durable test sink. */
describe('Bank collection accounting through the real financial engine', () => {
  jest.setTimeout(90000);
  const context = new RequestContextService();
  const role = `bank_chain_${randomUUID().replaceAll('-', '')}`;
  const database = `my_shule_disposable_${role}`;
  const school = `chain-${randomUUID()}`, other = `other-${randomUUID()}`;
  const accountant = randomUUID(), principal = randomUUID(), student = randomUUID();
  let pool: Pool, admin: Pool, db: PrismaService, collections: CollectionPaymentsService;
  let credits: FeeCreditApplicationService, ingress: PaymentIngressService;
  let transactions: TransactionService, schoolEvents: {recordSchoolOperation:(input:unknown)=>Promise<void>};
  let subscription: string, revision: string;
  let failAudit = false;
  const account = '0123456789012';
  function as<T>(work: () => Promise<T>, tenant = school, actor = 'accountant') {
    return context.run({tenant_id:tenant, user_id:actor === 'principal' ? principal : accountant,
      role:actor, request_id:randomUUID(), permissions:['*:*'], is_authenticated:true} as never, work);
  }
  async function effect(kind: string, payload: unknown) {
    if (failAudit && kind === 'ledger_audit') throw new Error('Injected ledger audit failure');
    await db.query('INSERT INTO banking_chain_effects(tenant_id,kind,payload) VALUES($1,$2,$3::jsonb)',
      [context.requireStore().tenant_id, kind, JSON.stringify(payload)]);
  }
  async function invoice(amount: string, owner = student) {
    const id = randomUUID();
    await pool.query(`INSERT INTO invoices(id,tenant_id,subscription_id,invoice_number,description,
      subtotal_amount_minor,total_amount_minor,due_at,metadata)
      VALUES($1,$2,$3,$4,'School fees',$5,$5,now(),$6::jsonb)`,
      [id,school,subscription,`INV-${id}`,amount,JSON.stringify({student_id:owner})]);
    return id;
  }
  function transaction(amount: string, reference = 'ADM-CHAIN'): BankTransaction {
    const bankReference = randomUUID();
    return {payment:{provider_code:'equity', provider_transaction_id:randomUUID().toUpperCase(), bank_reference:bankReference,
      destination_account:account, amount_minor:amount, currency_code:'KES', account_reference:reference,
      occurred_at:new Date().toISOString()}, direction:'credit',
      evidence:{method:'authenticated_statement', bank_reference:bankReference, retrieved_at:new Date().toISOString()}};
  }
  async function post(entry: BankTransaction) {
    const id = await as(() => ingress.acceptBankTransaction(revision,entry));
    await as(() => ingress.process(id));
    return (await pool.query('SELECT * FROM collection_payments WHERE provider_transaction_id=$1',[entry.payment.provider_transaction_id])).rows[0];
  }
  async function assertBalanced() {
    const imbalance = await pool.query(`SELECT transaction_id FROM ledger_entries WHERE tenant_id=$1
      GROUP BY transaction_id HAVING sum(CASE WHEN direction='debit' THEN amount_minor ELSE -amount_minor END)<>0`,[school]);
    expect(imbalance.rows).toEqual([]);
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost','127.0.0.1'].includes(url.hostname)
      || !url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Disposable local PostgreSQL required');
    admin = new Pool({connectionString:url.toString()});
    await admin.query(`CREATE DATABASE ${database}`);
    url.pathname = `/${database}`;
    pool = new Pool({connectionString:url.toString(),max:12});
    // Prisma models use public. This suite runs only in the disposable database,
    // with a restricted runtime role; it never bootstraps a configured school DB.
    await pool.query(`CREATE ROLE ${role} NOLOGIN;
      CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS students(id uuid PRIMARY KEY,tenant_id text,admission_number text,status text,deleted_at timestamptz);
      CREATE TABLE IF NOT EXISTS tenant_payment_channels(id uuid PRIMARY KEY,tenant_id text NOT NULL,UNIQUE(tenant_id,id));
      CREATE TABLE IF NOT EXISTS tenant_financial_accounts(tenant_id text,mpesa_clearing_account_code text,fee_control_account_code text);
      CREATE TABLE IF NOT EXISTS student_guardians(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE IF NOT EXISTS student_portal_access(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE payment_intents(id uuid PRIMARY KEY,tenant_id text,student_id uuid,user_id uuid,payment_owner text,status text,
        amount_minor bigint,currency_code text,ledger_transaction_id uuid,completed_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),UNIQUE(tenant_id,id));
      CREATE TABLE IF NOT EXISTS mpesa_transactions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,mpesa_receipt_number text,
        ledger_transaction_id uuid,payment_intent_id uuid,status text,checkout_request_id text,created_at timestamptz DEFAULT now());
      CREATE TABLE IF NOT EXISTS mpesa_c2b_payments(id uuid PRIMARY KEY,tenant_id text,trans_id text,status text,manual_fee_payment_id uuid,updated_at timestamptz);
      CREATE TABLE finance_approval_requests(id uuid PRIMARY KEY,tenant_id text,action text,status text,subject_type text,subject_id uuid,
        reconciliation_discrepancy_id uuid,amount_minor bigint,currency_code text,reason text,requested_by_user_id uuid,
        first_approver_user_id uuid,second_approver_user_id uuid);
      CREATE TABLE mpesa_reconciliation_discrepancies(id uuid PRIMARY KEY,tenant_id text,provider_transaction_id text,ledger_transaction_id uuid,payment_intent_id uuid);
      CREATE TABLE banking_chain_effects(tenant_id text,kind text,payload jsonb);`);
    const bootstrap = {runSchemaBootstrap: (sql: string) => pool.query(sql)};
    await new FinanceSchemaService(bootstrap as never,{onModuleInit:async()=>{}} as never).onModuleInit();
    await new BillingSchemaService(bootstrap as never).onModuleInit();
    await pool.query(`${PAYMENT_CHANNEL_WORKFLOW_SCHEMA} ${COLLECTION_PAYMENTS_SCHEMA} ${PAYMENT_INGRESS_SCHEMA}
      GRANT USAGE ON SCHEMA public,app TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${role};`);
    const previousUrl=process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL=url.toString();
      db = new PrismaService(context,{getRuntimeRoleName:()=>role} as never);
    } finally {process.env.DATABASE_URL=previousUrl;}
    await db.onModuleInit();
    await pool.query('INSERT INTO users(id) VALUES($1),($2)',[accountant,principal]);
    await pool.query("INSERT INTO students(id,tenant_id,admission_number,status) VALUES($1,$2,'ADM-CHAIN','active'),($3,$4,'ADM-CHAIN','active')",
      [student,school,randomUUID(),other]);
    for(const tenant of [school,other]) {
      for(const code of ['1120-BANK-CLEARING','1110-MPESA-CLEARING','1100-AR-FEES']) {
        await pool.query(`INSERT INTO accounts(tenant_id,code,name,category,normal_balance,currency_code)
          VALUES($1,$2,$2,'asset','debit','KES')`,[tenant,code]);
      }
    }
    subscription = (await pool.query("INSERT INTO subscriptions(tenant_id,plan_code,status) VALUES($1,'school','active') RETURNING id",[school])).rows[0].id;
    revision = randomUUID(); const channel = randomUUID();
    await pool.query('INSERT INTO tenant_payment_channels VALUES($1,$2)',[channel,school]);
    await pool.query(`INSERT INTO tenant_payment_channel_revisions(id,tenant_id,channel_id,provider_code,channel_kind,display_name,account_name,account_number,
      status,connection_mode,environment,credentials_ciphertext,requested_by,reviewed_by,reviewed_at,reason,activated_at)
      VALUES($1,$2,$3,'equity','bank_account','School bank','School',$4,'active','bank_api','production','enc:v1:local-fixture',$5,$6,now(),'Approved fixture',now()-interval '1 day')`,
      [revision,school,channel,account,accountant,principal]);
    const audit = {record:(input:unknown)=>effect('audit',input),recordFinanceTransactionPosted:(input:unknown)=>effect('ledger_audit',input)};
    const events = {publish:(input:unknown)=>effect('event',input)};
    schoolEvents = {recordSchoolOperation:(input:unknown)=>effect('school_event',input)};
    const notifications = {upsertFromSchoolOperation:(input:unknown)=>effect('notification',input),resolveRequiredAction:async()=>{}};
    const accounts = new AccountsRepository(db);
    transactions = new TransactionService(new LedgerService(db,{get:()=>undefined} as never,context,db,accounts,
      new TransactionsRepository(db),new LedgerEntriesRepository(db),new IdempotencyKeysRepository(db),audit as never,
      {recordServerOperation:(...input:unknown[])=>effect('sync',input)} as never));
    credits = new FeeCreditApplicationService(context,db,schoolEvents as never);
    const invoices = new InvoicesRepository(db,{encryptNullable:(value:unknown)=>value,decryptNullable:(value:unknown)=>value} as never);
    const manual = new ManualFeePaymentService(context,db,new ManualFeePaymentsRepository(db),invoices,accounts,transactions,schoolEvents as never,credits);
    const matcher = new CollectionReferenceMatcher(db);
    collections = new CollectionPaymentsService(db,context,manual,invoices,events as never,audit as never,notifications as never,
      new CollectionSuspenseService(db,context,accounts,transactions),matcher);
    ingress = new PaymentIngressService(db,context,{decrypt:()=> '{}'} as never,{} as never,{} as never,collections,matcher,
      audit as never,events as never,notifications as never);
  });
  afterAll(async () => {
    await db?.onModuleDestroy();
    if(pool) { await pool.query(`DROP OWNED BY ${role}; DROP ROLE ${role}`); await pool.end(); }
    if(admin) {try{await admin.query(`DROP DATABASE IF EXISTS ${database}`);}finally{await admin.end();}}
  });

  it('posts duplicate deliveries once, applies excess credit and reverses cash and all allocations without erasing history', async () => {
    const first = await invoice('10000');
    const entry = transaction('12500');
    const ids = await Promise.all(Array.from({length:4},()=>as(()=>ingress.acceptBankTransaction(revision,entry))));
    expect(new Set(ids).size).toBe(1);
    await Promise.all(ids.map(id=>as(()=>ingress.process(id))));
    const payment = (await pool.query('SELECT * FROM collection_payments WHERE provider_transaction_id=$1',[entry.payment.provider_transaction_id])).rows[0];
    expect(payment.status).toBe('posted');
    expect((await pool.query('SELECT amount_paid_minor,status FROM invoices WHERE id=$1',[first])).rows[0]).toEqual({amount_paid_minor:'10000',status:'paid'});
    expect((await pool.query('SELECT * FROM manual_fee_payments WHERE tenant_id=$1',[school])).rows).toHaveLength(1);
    expect((await pool.query('SELECT * FROM transactions WHERE tenant_id=$1',[school])).rows).toHaveLength(1);
    const second = await invoice('4000');
    const applied = await as(()=>credits.applyAvailable(student,'Apply received overpayment to the next term'));
    expect(applied.applied_amount_minor).toBe('2500');
    const reversal = await as(()=>collections.requestReversal(payment.id,'Confirmed duplicate paid outside this system'));
    await as(()=>collections.decideReversal(String(reversal.id),'approve','Reviewed bank evidence confirms correction'),school,'principal');
    expect((await pool.query('SELECT amount_paid_minor,status FROM invoices WHERE id=ANY($1::uuid[]) ORDER BY id',[[first,second]])).rows)
      .toEqual([{amount_paid_minor:'0',status:'open'},{amount_paid_minor:'0',status:'open'}]);
    expect((await pool.query('SELECT status,reversal_ledger_transaction_id FROM manual_fee_payments WHERE id=$1',[payment.manual_fee_payment_id])).rows[0])
      .toMatchObject({status:'reversed',reversal_ledger_transaction_id:expect.any(String)});
    expect((await pool.query('SELECT * FROM manual_fee_payment_allocations WHERE manual_payment_id=$1',[payment.manual_fee_payment_id])).rows).toHaveLength(2);
    expect((await pool.query('SELECT * FROM fee_credit_application_reversals WHERE tenant_id=$1',[school])).rows).toHaveLength(1);
    expect((await as(()=>credits.applyAvailable(student,'No credit from reversed receipt'))).applied_amount_minor).toBe('0');
    await as(()=>ingress.process(ids[0]));
    expect((await pool.query('SELECT * FROM transactions WHERE tenant_id=$1',[school])).rows).toHaveLength(2);
    const cash = await pool.query(`SELECT sum(CASE WHEN e.direction='debit' THEN e.amount_minor ELSE -e.amount_minor END)::text AS balance
      FROM ledger_entries e JOIN accounts a ON a.id=e.account_id AND a.tenant_id=e.tenant_id WHERE e.tenant_id=$1 AND a.code='1120-BANK-CLEARING'`,[school]);
    expect(cash.rows[0].balance).toBe('0');
    await assertBalanced();
  });

  it('rolls back receipts, ledger and invoice changes when mandatory audit fails, then retries safely', async () => {
    const entry = transaction('1000');
    const id = await as(()=>ingress.acceptBankTransaction(revision,entry));
    failAudit = true;
    try { await expect(as(()=>ingress.process(id))).rejects.toThrow(/audit failure/); }
    finally { failAudit = false; }
    expect((await pool.query('SELECT * FROM collection_payments WHERE provider_transaction_id=$1',[entry.payment.provider_transaction_id])).rows).toHaveLength(0);
    expect((await pool.query('SELECT * FROM manual_fee_payments WHERE external_reference=$1',[entry.payment.provider_transaction_id])).rows).toHaveLength(0);
    await as(()=>ingress.process(id));
    expect((await pool.query('SELECT state FROM payment_ingress WHERE id=$1',[id])).rows[0].state).toBe('posted');
    await assertBalanced();
  });

  it('keeps unmatched funds in suspense, releases them exactly once on reviewed matching and isolates another school', async () => {
    const payment = await post(transaction('2700','UNKNOWN-LEARNER'));
    expect(payment.status).toBe('unmatched');
    expect(payment.suspense_transaction_id).toBeTruthy();
    await expect(as(()=>collections.match(payment.id,student,'Verified payer admission number'),other)).rejects.toThrow();
    expect((await as(()=>db.query('SELECT * FROM collection_payments'),other)).rows).toHaveLength(0);
    await as(()=>collections.match(payment.id,student,'Verified payer admission number'));
    const posted = (await pool.query('SELECT * FROM collection_payments WHERE id=$1',[payment.id])).rows[0];
    expect(posted.status).toBe('posted');
    expect(posted.suspense_release_transaction_id).toBeTruthy();
    await expect(as(()=>collections.match(payment.id,student,'Attempt duplicate match'))).rejects.toThrow(/Only confirmed/);
    const suspense = await pool.query(`SELECT sum(CASE WHEN e.direction='credit' THEN e.amount_minor ELSE -e.amount_minor END)::text AS balance
      FROM ledger_entries e JOIN accounts a ON a.id=e.account_id AND a.tenant_id=e.tenant_id WHERE e.tenant_id=$1 AND a.code='2110-UNALLOCATED-COLLECTIONS'`,[school]);
    expect(suspense.rows[0].balance).toBe('0');
    await assertBalanced();
  });

  it('refuses a reversal against inconsistent invoice totals and preserves a void invoice after correction', async () => {
    const owner = randomUUID();
    await pool.query("INSERT INTO students(id,tenant_id,admission_number,status) VALUES($1,$2,'ADM-CORRECTION','active')",[owner,school]);
    const target = await invoice('10000',owner);
    const payment = await post(transaction('5000','ADM-CORRECTION'));
    const request = await as(()=>collections.requestReversal(payment.id,'Confirmed refund requires receipt correction'));
    await pool.query('UPDATE invoices SET amount_paid_minor=1000 WHERE id=$1',[target]);
    await expect(as(()=>collections.decideReversal(String(request.id),'approve','Reviewed correction'),school,'principal'))
      .rejects.toThrow(/balance|allocation|reconcil/i);
    expect((await pool.query('SELECT status FROM collection_payments WHERE id=$1',[payment.id])).rows[0].status).toBe('posted');
    expect((await pool.query('SELECT status FROM collection_reversal_requests WHERE id=$1',[request.id])).rows[0].status).toBe('pending');
    await pool.query("UPDATE invoices SET amount_paid_minor=5000,status='void' WHERE id=$1",[target]);
    await as(()=>collections.decideReversal(String(request.id),'approve','Reviewed correction'),school,'principal');
    expect((await pool.query('SELECT status,amount_paid_minor FROM invoices WHERE id=$1',[target])).rows[0])
      .toEqual({status:'void',amount_paid_minor:'0'});
    await assertBalanced();
  });

  it.each(['billing','online-allocation'])('holds the %s transaction lock until the financial transaction ends', async operation => {
    const allocationKey = `allocation-${randomUUID()}`;
    const lockKey = operation === 'billing' ? school : `${school}:${allocationKey}`;
    const contender = await pool.connect();
    try {
      await as(()=>db.withRequestTransaction(async()=>{
        if(operation === 'billing') await new SubscriptionsRepository(db,{} as never).acquireTenantMutationLock(school);
        else await new InvoicesRepository(db,{} as never).findStudentFeePaymentAllocationByIdempotencyKey(school,allocationKey);
        await contender.query('BEGIN');
        const attempt = await contender.query('SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS acquired',[lockKey]);
        await contender.query('ROLLBACK');
        expect(attempt.rows[0].acquired).toBe(false);
      }));
    } finally { await contender.query('ROLLBACK'); contender.release(); }
  });

  it('executes the persisted M-Pesa correction against the actual receipt and ledger exactly once', async () => {
    const owner=randomUUID(),channel=randomUUID(),mpesaRevision=randomUUID(),discrepancy=randomUUID(),approval=randomUUID();
    const reference=`MPESA-${randomUUID()}`.toUpperCase();
    await pool.query("INSERT INTO students(id,tenant_id,admission_number,status) VALUES($1,$2,'ADM-MPESA','active')",[owner,school]);
    const target=await invoice('10000',owner);
    await pool.query('INSERT INTO tenant_payment_channels VALUES($1,$2)',[channel,school]);
    await pool.query(`INSERT INTO tenant_payment_channel_revisions(id,tenant_id,channel_id,provider_code,channel_kind,display_name,account_name,account_number,
      status,connection_mode,environment,credentials_ciphertext,requested_by,reviewed_by,reviewed_at,reason,activated_at)
      VALUES($1,$2,$3,'safaricom','mpesa_paybill','School M-Pesa','School','600111','active','daraja','production','enc:v1:local-fixture',$4,$5,now(),'Approved fixture',now()-interval '1 day')`,
      [mpesaRevision,school,channel,accountant,principal]);
    const payment=await as(()=>collections.recognizeVerified(school,{provider_code:'safaricom',provider_transaction_id:reference,
      destination_account:'600111',amount_minor:'5000',currency_code:'KES',account_reference:'ADM-MPESA',occurred_at:new Date().toISOString()},channel));
    expect(payment.status).toBe('posted');
    await pool.query("INSERT INTO mpesa_c2b_payments VALUES($1,$2,$3,'matched',$4,now())",[randomUUID(),school,reference,payment.manual_fee_payment_id]);
    await pool.query('INSERT INTO mpesa_reconciliation_discrepancies(id,tenant_id,provider_transaction_id,ledger_transaction_id) VALUES($1,$2,$3,$4)',[discrepancy,school,reference,payment.ledger_transaction_id]);
    await pool.query(`INSERT INTO finance_approval_requests VALUES($1,$2,'reversal','approved','mpesa_reconciliation_discrepancy',$3,$3,5000,'KES',
      'Reviewed receipt correction',$4,$5,$6)`,[approval,school,discrepancy,accountant,randomUUID(),principal]);
    const corrections=new FinanceCorrectionService(db,context,collections);
    const results=await Promise.all(Array.from({length:3},()=>as(()=>corrections.execute(approval),school,'principal')));
    expect(new Set(results.map(result=>result.reversal_ledger_transaction_id)).size).toBe(1);
    expect((await pool.query('SELECT amount_paid_minor FROM invoices WHERE id=$1',[target])).rows[0].amount_paid_minor).toBe('0');
    expect((await pool.query('SELECT status FROM mpesa_c2b_payments WHERE trans_id=$1',[reference])).rows[0].status).toBe('reversed');
    const ledger=(await pool.query('SELECT metadata,total_amount_minor FROM transactions WHERE id=$1',[results[0].reversal_ledger_transaction_id])).rows[0];
    expect(ledger).toMatchObject({total_amount_minor:'5000',metadata:{source:'manual_fee_payment_reversal',original_ledger_transaction_id:payment.ledger_transaction_id}});
    await assertBalanced();
  });

  async function historicalStk(firstInvoiceAmount='10000') {
    const owner=randomUUID(),intent=randomUUID(),approval=randomUUID(),discrepancy=randomUUID(),reference=`STK-${randomUUID()}`;
    await pool.query("INSERT INTO students VALUES($1,$2,$3,'active',NULL)",[owner,school,owner]);
    const first=await invoice(firstInvoiceAmount,owner);
    const accounts=(await pool.query("SELECT id,code FROM accounts WHERE tenant_id=$1 AND code IN ('1110-MPESA-CLEARING','1100-AR-FEES')",[school])).rows;
    const posted=await as(()=>transactions.postTransaction({idempotency_key:intent,reference,description:'Verified historical STK receipt',
      metadata:{source:'mpesa',payment_intent_id:intent},entries:accounts.map(a=>({account_id:a.id,
        direction:a.code==='1110-MPESA-CLEARING'?'debit':'credit',amount_minor:'15000',currency_code:'KES'}))}));
    await pool.query(`INSERT INTO payment_intents(id,tenant_id,student_id,user_id,payment_owner,status,amount_minor,currency_code,ledger_transaction_id)
      VALUES($1,$2,$3,$4,'tenant','completed',15000,'KES',$5)`,[intent,school,owner,accountant,posted.transaction_id]);
    await pool.query(`INSERT INTO mpesa_transactions(tenant_id,mpesa_receipt_number,ledger_transaction_id,payment_intent_id,status,checkout_request_id)
      VALUES($1,$2,$3,$4,'succeeded',$2)`,[school,reference,posted.transaction_id,intent]);
    const allocator=new StudentFeePaymentAllocationService(new InvoicesRepository(db,{decryptNullable:(value:unknown)=>value} as never));
    const allocation=()=>as(()=>db.withRequestTransaction(()=>allocator.allocateConfirmedPayment({tenantId:school,
      paymentIntent:{id:intent,tenant_id:school,student_id:owner,user_id:accountant},amountPaidMinor:'15000',ledgerTransactionId:posted.transaction_id})));
    await allocation();
    const second=await invoice('3000',owner);
    await as(()=>credits.applyAvailable(owner,'Apply credit to the next term'));
    await pool.query('INSERT INTO mpesa_reconciliation_discrepancies VALUES($1,$2,$3,$4,$5)',[discrepancy,school,reference,posted.transaction_id,intent]);
    await pool.query(`INSERT INTO finance_approval_requests VALUES($1,$2,'reversal','approved','mpesa_reconciliation_discrepancy',$3,$3,15000,'KES',
      'Verified historical STK correction',$4,$5,$6)`,[approval,school,discrepancy,accountant,randomUUID(),principal]);
    const service=new (FinanceCorrectionService as any)(db,context,collections,transactions,schoolEvents);
    return {owner,intent,approval,first,second,posted,allocation,
      execute:()=>as<{reversal_ledger_transaction_id:string}>(()=>service.execute(approval),school,'principal')};
  }

  it('reverses a historical STK receipt, applied and remaining credit once while preserving history and receipt visibility',async()=>{
    const item=await historicalStk();
    const results=await Promise.all([item.execute(),item.execute(),item.execute()]);
    expect(new Set(results.map(result=>result.reversal_ledger_transaction_id)).size).toBe(1);
    expect((await pool.query('SELECT amount_paid_minor FROM invoices WHERE id=ANY($1::uuid[])',[[item.first,item.second]])).rows)
      .toEqual([{amount_paid_minor:'0'},{amount_paid_minor:'0'}]);
    expect((await pool.query('SELECT amount_minor,remaining_amount_minor FROM student_fee_credits WHERE payment_intent_id=$1',[item.intent])).rows)
      .toEqual([{amount_minor:'5000',remaining_amount_minor:'0'}]);
    expect((await pool.query('SELECT * FROM student_fee_payment_allocations WHERE payment_intent_id=$1',[item.intent])).rows).toHaveLength(1);
    expect((await item.allocation()).duplicate).toBe(true);
    expect((await as(()=>credits.applyAvailable(item.owner,'No credit from reversed STK'))).applied_amount_minor).toBe('0');
    const receipt=(await as(()=>db.query(`SELECT * FROM (${FEE_RECEIPTS_READ_SQL}) receipts WHERE id=$2`,[school,item.intent]))).rows[0];
    expect(receipt).toMatchObject({status:'reversed',reversal_ledger_transaction_id:results[0].reversal_ledger_transaction_id});
    expect((await as(()=>db.query('SELECT * FROM student_fee_payment_reversals'),other)).rows).toHaveLength(0);
    await expect(as(()=>db.query('UPDATE student_fee_payment_reversals SET reason=$2 WHERE payment_intent_id=$1',[item.intent,'Erase history'])))
      .rejects.toThrow(/immutable/);
    await assertBalanced();
  });

  it('rolls back all historical STK corrections on audit failure and leaves invalid ownership or amounts unchanged',async()=>{
    const item=await historicalStk();
    failAudit=true;
    try{await expect(item.execute()).rejects.toThrow(/audit failure/);}finally{failAudit=false;}
    expect((await pool.query('SELECT amount_paid_minor FROM invoices WHERE id=$1',[item.first])).rows[0].amount_paid_minor).toBe('10000');
    expect((await pool.query('SELECT * FROM student_fee_payment_reversals WHERE payment_intent_id=$1',[item.intent])).rows).toHaveLength(0);
    await pool.query('UPDATE finance_approval_requests SET amount_minor=1 WHERE id=$1',[item.approval]);
    await expect(item.execute()).rejects.toThrow(/amount|match/i);
    await pool.query('UPDATE finance_approval_requests SET amount_minor=15000 WHERE id=$1',[item.approval]);
    await pool.query('UPDATE payment_intents SET student_id=$2 WHERE id=$1',[item.intent,student]);
    await expect(item.execute()).rejects.toThrow(/payment|receipt|allocation/i);
    await pool.query('UPDATE payment_intents SET student_id=$2 WHERE id=$1',[item.intent,item.owner]);
    await pool.query('UPDATE student_fee_credits SET remaining_amount_minor=1 WHERE payment_intent_id=$1',[item.intent]);
    await expect(item.execute()).rejects.toThrow(/credit history/);
    await pool.query('UPDATE student_fee_credits SET remaining_amount_minor=2000 WHERE payment_intent_id=$1',[item.intent]);
    await item.execute();
    await assertBalanced();
  });

  it.each(['10000','0'])('serializes a %s invoice STK reversal with concurrent credit application, including credit-only receipts',async amount=>{
    const item=await historicalStk(amount);
    const future=await invoice('20000',item.owner);
    await Promise.all([item.execute(),as(()=>credits.applyAvailable(item.owner,'Apply outstanding credit during review'))]);
    expect((await pool.query('SELECT amount_paid_minor FROM invoices WHERE id=ANY($1::uuid[])',[[item.first,item.second,future]])).rows)
      .toEqual([{amount_paid_minor:'0'},{amount_paid_minor:'0'},{amount_paid_minor:'0'}]);
    expect((await item.allocation()).duplicate).toBe(true);
    expect((await pool.query('SELECT remaining_amount_minor FROM student_fee_credits WHERE payment_intent_id=$1',[item.intent])).rows[0].remaining_amount_minor).toBe('0');
    await assertBalanced();
  });
});
