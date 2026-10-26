import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { FinanceSchemaService } from '../src/modules/finance/finance-schema.service';
import { BillingSchemaService } from '../src/modules/billing/billing-schema.service';

describe.each(['uuid','text'] as const)('Receipt links with %s ledger identifiers', type => {
  const database = `my_shule_disposable_receipt_${randomUUID().replaceAll('-','')}`;
  let pool: Pool, admin: Pool;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost','127.0.0.1'].includes(url.hostname)
      || !url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Disposable local PostgreSQL required');
    admin = new Pool({connectionString:url.toString()});
    await admin.query(`CREATE DATABASE ${database}`);
    url.pathname = `/${database}`;
    pool = new Pool({connectionString:url.toString()});
    await pool.query('CREATE TABLE users(id uuid PRIMARY KEY)');
    const bootstrap = {runSchemaBootstrap:(sql:string)=>pool.query(sql)};
    await new FinanceSchemaService(bootstrap as never,{onModuleInit:async()=>{}} as never).onModuleInit();
    if(type === 'text') await pool.query(`
      ALTER TABLE ledger_entries DROP CONSTRAINT fk_ledger_entries_transaction;
      ALTER TABLE transactions ALTER COLUMN id TYPE text USING id::text;
      ALTER TABLE ledger_entries ALTER COLUMN transaction_id TYPE text USING transaction_id::text;
      ALTER TABLE ledger_entries ADD CONSTRAINT fk_ledger_entries_transaction FOREIGN KEY(tenant_id,transaction_id) REFERENCES transactions(tenant_id,id);`);
    await new BillingSchemaService(bootstrap as never).onModuleInit();
  });
  afterAll(async()=>{
    await pool?.end();
    if(admin){try{await admin.query(`DROP DATABASE IF EXISTS ${database}`);}finally{await admin.end();}}
  });
  it('keeps receipt and reversal references compatible, foreign-key constrained and stable on restart', async () => {
    const identifiers = await pool.query(`SELECT column_name,data_type FROM information_schema.columns
      WHERE table_schema=$1 AND table_name='manual_fee_payments' AND column_name IN ('ledger_transaction_id','reversal_ledger_transaction_id')
      ORDER BY column_name`,['public']);
    expect(identifiers.rows).toEqual([{column_name:'ledger_transaction_id',data_type:type},{column_name:'reversal_ledger_transaction_id',data_type:type}]);
    const constraints = await pool.query(`SELECT conname FROM pg_constraint WHERE conrelid='manual_fee_payments'::regclass
      AND conname IN ('fk_manual_fee_payments_ledger_transaction','fk_manual_fee_payments_reversal_ledger_transaction')`);
    expect(constraints.rows).toHaveLength(2);
    await new BillingSchemaService({runSchemaBootstrap:(sql:string)=>pool.query(sql)} as never).onModuleInit();
    await expect(pool.query(`INSERT INTO manual_fee_payments(tenant_id,idempotency_key,receipt_number,payment_method,student_id,amount_minor,ledger_transaction_id)
      VALUES('school','test','R-1','cash',$1,100,$2)`,[randomUUID(),randomUUID()])).rejects.toMatchObject({code:'23503'});
  });
});
