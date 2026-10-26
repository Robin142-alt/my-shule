import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { FinanceSchemaService } from '../src/modules/finance/finance-schema.service';
import { BillingSchemaService } from '../src/modules/billing/billing-schema.service';

describe.each(['uuid','text'] as const)('Receipt links with %s ledger identifiers', type => {
  jest.setTimeout(90000);
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
      ALTER TABLE transactions DROP CONSTRAINT ck_transactions_total_amount_minor;
      ALTER TABLE ledger_entries DROP CONSTRAINT ck_ledger_entries_amount_minor;
      ALTER TABLE transactions ALTER COLUMN total_amount_minor TYPE text USING total_amount_minor::text;
      ALTER TABLE ledger_entries ALTER COLUMN amount_minor TYPE text USING amount_minor::text;
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
    const onlineConstraints=await pool.query(`SELECT conname FROM pg_constraint WHERE conrelid='student_fee_payment_reversals'::regclass
      AND conname IN ('student_payment_reversal_original_ledger','student_payment_reversal_ledger')`);
    expect(onlineConstraints.rows).toHaveLength(2);
    await new BillingSchemaService({runSchemaBootstrap:(sql:string)=>pool.query(sql)} as never).onModuleInit();
    await expect(pool.query(`INSERT INTO manual_fee_payments(tenant_id,idempotency_key,receipt_number,payment_method,student_id,amount_minor,ledger_transaction_id)
      VALUES('school','test','R-1','cash',$1,100,$2)`,[randomUUID(),randomUUID()])).rejects.toMatchObject({code:'23503'});
    await expect(pool.query(`INSERT INTO student_fee_payment_reversals(tenant_id,payment_intent_id,student_id,approval_id,
      original_ledger_transaction_id,reversal_ledger_transaction_id,amount_minor,currency_code,reason,created_by)
      VALUES('school',$1,'student',$2,$3,$4,100,'KES','Reviewed correction','principal')`,
      [randomUUID(),randomUUID(),randomUUID(),randomUUID()])).rejects.toMatchObject({code:'23503'});
  });
  it('enforces exact balanced money and matching headers for legacy and canonical ledger types',async()=>{
    const accounts=(await pool.query(`INSERT INTO accounts(tenant_id,code,name,category,normal_balance,currency_code)
      VALUES('school','BANK','Bank','asset','debit','KES'),('school','FEES','Fees','asset','debit','KES') RETURNING id`)).rows;
    const post=async(total:string,credit:string)=>{
      const tx=await pool.connect(),id=randomUUID(),key=randomUUID();
      try{
        await tx.query('BEGIN');
        const request=(await tx.query(`INSERT INTO idempotency_keys(tenant_id,scope,idempotency_key,request_method,request_path,request_hash,expires_at)
          VALUES('school','test',$1,'POST','/test','local',now()+interval '1 day') RETURNING id`,[key])).rows[0];
        await tx.query(`INSERT INTO transactions(id,tenant_id,idempotency_key_id,reference,description,currency_code,total_amount_minor,entry_count)
          VALUES($1,'school',$2,$3,'Local exact money test','KES',$4,2)`,[id,request.id,key,total]);
        await tx.query(`INSERT INTO ledger_entries(tenant_id,transaction_id,account_id,line_number,direction,amount_minor,currency_code)
          VALUES('school',$1,$2,1,'debit','100','KES'),('school',$1,$3,2,'credit',$4,'KES')`,[id,accounts[0].id,accounts[1].id,credit]);
        await tx.query('COMMIT');return id;
      }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
    };
    await post(type==='text'?'100.00':'100',type==='text'?'1e2':'100');
    await expect(post('100','99')).rejects.toMatchObject({code:'23514'});
    await expect(post('101','100')).rejects.toMatchObject({code:'23514'});
    await expect(post('100','99.5')).rejects.toThrow();
    expect((await pool.query('SELECT count(*)::int AS count FROM transactions')).rows[0].count).toBe(1);
  });
});
