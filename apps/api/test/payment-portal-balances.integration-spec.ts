import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { RequestContextService } from "../src/common/request-context/request-context.service";
import { ParentCommandService } from "../src/modules/admin-command/parent-command.service";
import { StudentCommandService } from "../src/modules/admin-command/student-command.service";
import { FEE_CREDIT_READ_SQL } from "../src/modules/billing/fee-credit-read-sql";
import { FEE_CREDIT_APPLICATION_SCHEMA_SQL } from "../src/modules/billing/fee-credit-application-schema";
import { STUDENT_FEE_PAYMENT_REVERSAL_SCHEMA } from '../src/modules/billing/student-fee-payment-reversal.schema';
import { MpesaService } from "../src/modules/payments/services/mpesa.service";
import { InvoicesRepository } from "../src/modules/billing/repositories/invoices.repository";
import { ManualFeePaymentsRepository } from "../src/modules/billing/repositories/manual-fee-payments.repository";
import { BillingService } from "../src/modules/billing/billing.service";

describe("School payment balances shared with linked Parent and Student portals", () => {
  const schema = `portal_payments_${randomUUID().replaceAll("-", "")}`;
  const user = randomUUID(),
    learner = randomUUID(),
    otherLearner = randomUUID();
  const invoice = randomUUID(),
    payment = randomUUID();
  const context = new RequestContextService();
  let pool: Pool;
  const db = {
    withRequestTransaction: (fn: () => Promise<unknown>) => fn(),
    query: async (sql: string, values: unknown[] = []) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT set_config('app.tenant_id',$1,true)", [
          context.requireStore().tenant_id,
        ]);
        const result = await client.query(sql, values);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  const parent = new ParentCommandService(context, db as never);
  const student = new StudentCommandService(context, db as never);
  function as<T>(
    work: () => Promise<T>,
    tenant = "school-a",
    actor: string = user,
    role = "parent",
  ) {
    return context.run(
      { tenant_id: tenant, user_id: actor, role } as never,
      work,
    );
  }
  beforeAll(async () => {
    const url = new URL(
      process.env.DATABASE_URL ?? "postgresql://invalid/invalid",
    );
    if (
      process.env.MYSHULE_DISPOSABLE_POSTGRES !== "1" ||
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/my_shule_disposable_")
    )
      throw new Error("Use disposable PostgreSQL harness");
    pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema},public`,
    });
    await pool.query(`CREATE SCHEMA ${schema}; CREATE SCHEMA IF NOT EXISTS app;
      CREATE TABLE students(id uuid PRIMARY KEY,tenant_id text,admission_number text,first_name text,middle_name text,last_name text,current_class_id uuid,deleted_at timestamptz);
      CREATE TABLE class_sections(id uuid,tenant_id text,name text);
      CREATE TABLE student_guardians(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE student_portal_access(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE invoices(id uuid PRIMARY KEY,tenant_id text,invoice_number text,status text,total_amount_minor bigint,amount_paid_minor bigint,metadata jsonb,currency_code text DEFAULT 'KES',issued_at timestamptz DEFAULT now(),created_at timestamptz DEFAULT now());
      CREATE TABLE student_invoices(id text,tenant_id text,student_id uuid,invoice_number text,term text,academic_year text,amount_minor bigint,balance_minor bigint,created_at timestamptz DEFAULT now());
      CREATE TABLE manual_fee_payments(id uuid PRIMARY KEY,tenant_id text,student_id uuid,invoice_id uuid,receipt_number text,payment_method text,amount_minor bigint,status text,received_at timestamptz DEFAULT now());
      CREATE TABLE manual_fee_payment_allocations(tenant_id text,student_id uuid,manual_payment_id uuid,allocation_type text,amount_minor bigint);
      CREATE TABLE student_fee_credits(tenant_id text,student_id uuid,remaining_amount_minor bigint);
      ALTER TABLE manual_fee_payments ADD idempotency_key text,
        ADD currency_code text DEFAULT 'KES',ADD payer_name text,ADD deposited_at timestamptz,
        ADD cleared_at timestamptz,ADD bounced_at timestamptz,ADD reversed_at timestamptz,
        ADD cheque_number text,ADD drawer_bank text,ADD deposit_reference text,ADD external_reference text,
        ADD asset_account_code text,ADD fee_control_account_code text,ADD ledger_transaction_id uuid,
        ADD reversal_ledger_transaction_id uuid,ADD notes text,ADD metadata jsonb DEFAULT '{}',
        ADD created_by_user_id text,ADD created_at timestamptz DEFAULT now(),ADD updated_at timestamptz DEFAULT now();
      ALTER TABLE student_fee_credits ADD id uuid DEFAULT gen_random_uuid(),ADD payment_intent_id uuid;
      CREATE TABLE payment_intents(id uuid,tenant_id text,student_id uuid,user_id uuid,amount_minor bigint,currency_code text,
        payment_owner text,status text,ledger_transaction_id uuid,completed_at timestamptz DEFAULT now(),
        created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
      CREATE TABLE mpesa_transactions(tenant_id text,payment_intent_id uuid,mpesa_receipt_number text,ledger_transaction_id uuid,created_at timestamptz);
      CREATE TABLE student_fee_payment_allocations(tenant_id text,payment_intent_id uuid,invoice_id uuid,amount_minor bigint);
    `);
    await pool.query(FEE_CREDIT_APPLICATION_SCHEMA_SQL);
    await pool.query(STUDENT_FEE_PAYMENT_REVERSAL_SCHEMA);
    await pool.query(
      `INSERT INTO students(id,tenant_id,admission_number,first_name,last_name) VALUES($1,'school-a','ADM-1','Linked','Student'),($2,'school-a','ADM-2','Unlinked','Student');
    `,
      [learner, otherLearner],
    );
    await pool.query(
      `INSERT INTO student_guardians VALUES('school-a',$1,$2,'active')`,
      [learner, user],
    );
    await pool.query(
      `INSERT INTO student_portal_access VALUES('school-a',$1,$2,'active')`,
      [learner, user],
    );
    await pool.query(
      `INSERT INTO invoices(id,tenant_id,invoice_number,status,total_amount_minor,amount_paid_minor,metadata)
      VALUES($1,'school-a','INV-1','paid',10000,10000,$2::jsonb),($3,'school-a','PRIVATE','open',99999,0,$4::jsonb)`,
      [
        invoice,
        JSON.stringify({ student_id: learner }),
        randomUUID(),
        JSON.stringify({ student_id: otherLearner }),
      ],
    );
    // The old stale balance must not mask or duplicate the canonical invoice.
    await pool.query(
      `INSERT INTO student_invoices(id,tenant_id,student_id,invoice_number,amount_minor,balance_minor) VALUES($1,'school-a',$2,'INV-1',10000,10000)`,
      [invoice, learner],
    );
    await pool.query(
      `INSERT INTO manual_fee_payments(id,tenant_id,student_id,receipt_number,payment_method,amount_minor,status) VALUES($1,'school-a',$2,'RCT-1','bank_deposit',12500,'cleared')`,
      [payment, learner],
    );
    await pool.query(
      `INSERT INTO manual_fee_payment_allocations VALUES('school-a',$1,$2,'invoice',10000),('school-a',$1,$2,'credit',2500)`,
      [learner, payment],
    );
  });
  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await pool.end();
    }
  });

  it("shows the same net credit and receipt without double counting allocated money", async () => {
    const [p, s] = await as(() =>
      Promise.all([parent.getFees(), student.getFees()]),
    );
    expect(p.metrics.balance_minor).toBe(-2500);
    expect(s.metrics.balance_minor).toBe(-2500);
    expect(p.invoices).toHaveLength(1);
    expect(s.invoices).toHaveLength(1);
    expect(p.transactions[0].receipt_number).toBe("RCT-1");
    expect(s.transactions[0].receipt_number).toBe("RCT-1");
    const credits = await as(() =>
      db.query(
        `SELECT sum(amount_minor)::text AS amount FROM (${FEE_CREDIT_READ_SQL}) c`,
      ),
    );
    expect(credits.rows[0].amount).toBe("2500");
  });
  it("does not show another school or an unlinked user any financial data", async () => {
    for (const [tenant, actor] of [
      ["school-b", user],
      ["school-a", randomUUID()],
    ]) {
      const [p, s] = await as(
        () => Promise.all([parent.getFees(), student.getFees()]),
        tenant,
        actor,
      );
      expect(p.accounts).toEqual([]);
      expect(s.account).toBeNull();
      expect(p.invoices).toEqual([]);
      expect(s.invoices).toEqual([]);
      expect(p.transactions).toEqual([]);
      expect(s.transactions).toEqual([]);
    }
  });
  it("removes reversed credits and shows the restored outstanding invoice in both portals", async () => {
    await pool.query(
      `UPDATE manual_fee_payments SET status='reversed' WHERE id=$1`,
      [payment],
    );
    await pool.query(
      `UPDATE invoices SET amount_paid_minor=0,status='open' WHERE id=$1`,
      [invoice],
    );
    const [p, s] = await as(() =>
      Promise.all([parent.getFees(), student.getFees()]),
    );
    expect(p.metrics.balance_minor).toBe(10000);
    expect(s.metrics.balance_minor).toBe(10000);
    expect(p.transactions[0].status).toBe("reversed");
  });

  it("paginates invoice and credit balances over the same set of students", async () => {
    await pool.query(
      `UPDATE manual_fee_payments SET status='cleared' WHERE id=$1`,
      [payment],
    );
    await pool.query(
      `UPDATE invoices SET amount_paid_minor=10000,status='paid' WHERE id=$1`,
      [invoice],
    );
    const creditOnly = randomUUID();
    await pool.query(
      `INSERT INTO student_fee_credits(tenant_id,student_id,remaining_amount_minor) VALUES('school-a',$1,7000)`,
      [creditOnly],
    );
    const invoices = new InvoicesRepository(db as never, {} as never);
    const receipts = new ManualFeePaymentsRepository(db as never);
    const billing = new BillingService(
      context,
      db as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      invoices,
      undefined,
      receipts,
    );
    const first = await as(() =>
      billing.listStudentBalances({ limit: 2, offset: 0 }),
    );
    const second = await as(() =>
      billing.listStudentBalances({ limit: 2, offset: 2 }),
    );
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(1);
    const rows = [...first, ...second];
    expect(new Set(rows.map((row) => row.student_id)).size).toBe(3);
    expect(rows.find((row) => row.student_id === learner)).toMatchObject({
      balance_amount_minor: "0",
      credit_amount_minor: "2500",
    });
    expect(
      rows.find((row) => row.student_id === otherLearner)?.balance_amount_minor,
    ).toBe("99999");
    expect(rows.find((row) => row.student_id === creditOnly)).toMatchObject({
      balance_amount_minor: "0",
      credit_amount_minor: "7000",
    });
  });

  it("rejects another student or school before obtaining provider credentials or initiating a debit", async () => {
    let configured = 0;
    const mpesa = new MpesaService(
      {} as never,
      context,
      db as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      undefined,
      {
        resolveMpesaConfigForTenant: async () => {
          configured++;
          throw new Error("Authorized target; stop before provider request");
        },
      } as never,
    );
    const input = {
      idempotency_key: "portal-scope-test",
      amount_minor: "5000",
      phone_number: "0712345678",
      account_reference: "ADM-1",
      transaction_desc: "School fees",
    };
    for (const role of ["parent", "student"]) {
      await expect(
        as(
          () =>
            mpesa.createPaymentIntent({ ...input, student_id: otherLearner }),
          "school-a",
          user,
          role,
        ),
      ).rejects.toThrow("authorized to pay");
      await expect(
        as(
          () => mpesa.createPaymentIntent({ ...input, student_id: learner }),
          "school-b",
          user,
          role,
        ),
      ).rejects.toThrow("authorized to pay");
    }
    expect(configured).toBe(0);
    await expect(as(() => mpesa.createPaymentIntent(input))).rejects.toThrow(
      "Authorized target; stop before provider request",
    );
    expect(configured).toBe(1);
  });

  it.each(['manual','online'])('shows %s partial refund history and remaining credit only to linked portals',async kind=>{
    const tenant=`refund-${kind}`,owner=randomUUID(),portalUser=randomUUID(),receipt=randomUUID(),source=randomUUID(),refund=randomUUID();
    await pool.query('INSERT INTO students(id,tenant_id,first_name,last_name) VALUES($1,$2,\'Refund\',\'Learner\')',[owner,tenant]);
    await pool.query("INSERT INTO student_guardians VALUES($1,$2,$3,'active')",[tenant,owner,portalUser]);
    await pool.query("INSERT INTO student_portal_access VALUES($1,$2,$3,'active')",[tenant,owner,portalUser]);
    if(kind==='manual') await pool.query(`INSERT INTO manual_fee_payments(id,tenant_id,student_id,receipt_number,payment_method,amount_minor,status)
      VALUES($1,$2,$3,'RC-REFUND','bank_deposit',5000,'cleared')`,[receipt,tenant,owner]);
    else {
      await pool.query(`INSERT INTO payment_intents(id,tenant_id,student_id,user_id,amount_minor,currency_code,payment_owner,status,ledger_transaction_id)
        VALUES($1,$2,$3,$4,5000,'KES','tenant','completed',$5)`,[receipt,tenant,owner,portalUser,randomUUID()]);
      await pool.query('INSERT INTO student_fee_credits(tenant_id,student_id,remaining_amount_minor,payment_intent_id) VALUES($1,$2,3800,$3)',[tenant,owner,receipt]);
    }
    await pool.query(`INSERT INTO fee_credit_refunds(id,tenant_id,idempotency_key,source_kind,source_id,receipt_id,student_id,original_ledger_transaction_id,
      amount_minor,currency_code,reason,requested_by,status,reviewed_by,reviewed_at,decision_reason,external_reference,evidence_reference,paid_at,
      completed_by,completed_at,ledger_transaction_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,1200,'KES','Unused fees',$9,'completed',$10,now(),
      'Independent review','REF-PAID','School bank advice',now(),$9,now(),$11)`,[refund,tenant,randomUUID(),kind,kind==='manual'?receipt:source,
      receipt,owner,randomUUID(),randomUUID(),randomUUID(),randomUUID()]);
    for(const portal of await as(()=>Promise.all([parent.getFees(),student.getFees()]),tenant,portalUser)) {
      expect(portal.metrics.balance_minor).toBe(-3800);
      expect(portal.transactions).toEqual([expect.objectContaining({id:receipt,amount_minor:5000,status:'cleared',
        credit_refunds:[expect.objectContaining({id:refund,amount_minor:'1200',reference:'REF-PAID'})]})]);
    }
    for(const portal of await as(()=>Promise.all([parent.getFees(),student.getFees()]),tenant,user)) expect(portal.transactions).toEqual([]);
  });

  it('shows an older STK receipt and its correction consistently in linked Parent and Student payment histories',async()=>{
    const owner=randomUUID(),portalUser=randomUUID(),intent=randomUUID(),ledger=randomUUID(),target=randomUUID();
    await pool.query("INSERT INTO students(id,tenant_id,admission_number,first_name,last_name) VALUES($1,'school-stk','STK-1','Linked','STK')",[owner]);
    await pool.query("INSERT INTO student_guardians VALUES('school-stk',$1,$2,'active')",[owner,portalUser]);
    await pool.query("INSERT INTO student_portal_access VALUES('school-stk',$1,$2,'active')",[owner,portalUser]);
    await pool.query(`INSERT INTO invoices(id,tenant_id,invoice_number,status,total_amount_minor,amount_paid_minor,metadata)
      VALUES($1,'school-stk','STK-INV','paid',2000,2000,$2)`,[target,{student_id:owner}]);
    await pool.query(`INSERT INTO payment_intents(id,tenant_id,student_id,user_id,amount_minor,currency_code,payment_owner,status,ledger_transaction_id)
      VALUES($1,'school-stk',$2,$3,5000,'KES','tenant','completed',$4)`,[intent,owner,portalUser,ledger]);
    await pool.query("INSERT INTO student_fee_credits(tenant_id,student_id,remaining_amount_minor,payment_intent_id) VALUES('school-stk',$1,3000,$2)",[owner,intent]);
    const read=()=>as(()=>Promise.all([parent.getFees(),student.getFees()]),'school-stk',portalUser);
    for(const portal of await read()) expect(portal.transactions).toEqual([expect.objectContaining({id:intent,status:'cleared',amount_minor:5000})]);
    await pool.query(`INSERT INTO student_fee_payment_reversals(tenant_id,payment_intent_id,student_id,approval_id,original_ledger_transaction_id,
      reversal_ledger_transaction_id,amount_minor,currency_code,reason,created_by)
      VALUES('school-stk',$1,$2,$3,$4,$5,5000,'KES','Approved correction',$6)`,[intent,owner,randomUUID(),ledger,randomUUID(),portalUser]);
    await pool.query("UPDATE invoices SET amount_paid_minor=0,status='open' WHERE id=$1",[target]);
    await pool.query('UPDATE student_fee_credits SET remaining_amount_minor=0 WHERE payment_intent_id=$1',[intent]);
    for(const portal of await read()) {
      expect(portal.transactions).toEqual([expect.objectContaining({id:intent,status:'reversed',amount_minor:5000})]);
      expect(portal.metrics.balance_minor).toBe(2000);
    }
    for(const portal of await as(()=>Promise.all([parent.getFees(),student.getFees()]),'school-stk',user)) expect(portal.transactions).toEqual([]);
  });
});
