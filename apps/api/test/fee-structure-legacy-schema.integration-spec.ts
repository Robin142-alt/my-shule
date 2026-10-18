import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { BillingSchemaService } from '../src/modules/billing/billing-schema.service';
import { BillingService } from '../src/modules/billing/billing.service';
import { FeeStructuresRepository } from '../src/modules/billing/repositories/fee-structures.repository';
import { InvoicesRepository } from '../src/modules/billing/repositories/invoices.repository';
import { SubscriptionsRepository } from '../src/modules/billing/repositories/subscriptions.repository';
import { INVOICE_WRITE_SCHEMA_SQL } from '../src/modules/billing/invoice-write-schema';

describe.each(['uuid', 'text', 'legacy'] as const)('Fee billing with %s record identifiers', variant => {
  const identifierType = variant === 'uuid' ? 'uuid' : 'text';
  const schema = `fee_schema_${randomUUID().replaceAll('-', '')}`, role = `${schema}_role`;
  const school = 'school-with-slug', otherSchool = 'other-school';
  const learner = randomUUID(), foreignLearner = randomUUID(), actor = randomUUID();
  const context = new RequestContextService(), scope = new AsyncLocalStorage<PoolClient>();
  let pool: Pool, billing: BillingService, invoices: InvoicesRepository, planId: string, foreignPlanId: string;
  let failEvent = false;
  const txFor = (client: PoolClient) => ({
    $queryRawUnsafe: async (sql: string, ...args: unknown[]) => (await client.query(sql, args)).rows,
  });
  async function transaction<T>(work: (tx: ReturnType<typeof txFor>) => Promise<T>): Promise<T> {
    const existing = scope.getStore();
    if (existing) return work(txFor(existing));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [context.requireStore().tenant_id]);
      const value = await scope.run(client, () => work(txFor(client)));
      await client.query('COMMIT');
      return value;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  const db = {
    withRequestTransaction: transaction,
    query: (sql: string, args: unknown[]) => transaction(() => scope.getStore()!.query(sql, args)),
  };
  const asSchool = <T>(work: () => Promise<T>, tenant = school) => context.run({
    tenant_id: tenant, user_id: actor, role: 'accountant', is_authenticated: true,
  } as never, work);
  const issue = (key: string, studentId = learner, feeStructureId = planId) => asSchool(() => billing.bulkGenerateFeeInvoices({
    fee_structure_id: feeStructureId, idempotency_key: key,
    target_students: [{ student_id: studentId, student_name: 'Untrusted submitted name' }],
  }));

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1'].includes(url.hostname)
      || !url.pathname.startsWith('/my_shule_disposable_')) throw Error('Requires disposable PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: `-c search_path=${schema},public` });
    await pool.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role}; GRANT USAGE ON SCHEMA ${schema} TO ${role};`);
    let ddl = '';
    await new BillingSchemaService({ runSchemaBootstrap: async (sql: string) => { ddl = sql; } } as never).onModuleInit();
    for (const name of ['subscriptions', 'invoices', 'fee_structures']) {
      const table = ddl.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\n      \\);`))![0];
      await pool.query(table);
      if (identifierType === 'text' && name !== 'subscriptions') {
        await pool.query(`ALTER TABLE ${name} ALTER COLUMN id TYPE text USING id::text`);
      }
    }
    await pool.query(`
      CREATE TABLE students(id ${identifierType} PRIMARY KEY,tenant_id text,first_name text,last_name text,
        admission_number text,primary_guardian_phone text,status text,deleted_at timestamptz);
      CREATE TABLE student_allocations(tenant_id text,student_id ${identifierType},class_name text,stream_name text,is_current boolean);
      CREATE TABLE academic_years(id text PRIMARY KEY,school_id text,name text);
      CREATE TABLE terms(id text PRIMARY KEY,school_id text,name text);
      CREATE TABLE evidence(tenant_id text,event jsonb);
      GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA ${schema} TO ${role};
    `);
    if (variant === 'legacy') {
      await pool.query(`
        ALTER TABLE subscriptions DROP COLUMN last_invoice_at;
        ALTER TABLE invoices ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE invoices ALTER COLUMN updated_at DROP DEFAULT;
        ALTER TABLE invoices ADD COLUMN school_id text NOT NULL;
        ALTER TABLE invoices ADD COLUMN student_id text NOT NULL REFERENCES students(id);
        ALTER TABLE invoices ADD COLUMN academic_year_id text NOT NULL REFERENCES academic_years(id);
        ALTER TABLE invoices ADD COLUMN term_id text NOT NULL REFERENCES terms(id);
        ALTER TABLE invoices ADD COLUMN amount_due double precision NOT NULL;
        ALTER TABLE invoices ADD COLUMN amount_paid double precision NOT NULL DEFAULT 0;
        ALTER TABLE invoices ADD COLUMN balance double precision NOT NULL;
        ALTER TABLE invoices ADD COLUMN due_date date NOT NULL;
        ALTER TABLE invoices ADD COLUMN deleted_at timestamptz;
      `);
    }
    if (INVOICE_WRITE_SCHEMA_SQL) {
      await pool.query(INVOICE_WRITE_SCHEMA_SQL);
      await pool.query(INVOICE_WRITE_SCHEMA_SQL);
    }
    for (const name of ['subscriptions', 'invoices', 'fee_structures', 'students', 'student_allocations', 'evidence']) {
      await pool.query(`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${name} FORCE ROW LEVEL SECURITY;
        CREATE POLICY school_only ON ${name} USING(tenant_id=current_setting('app.tenant_id',true))
          WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
    }
    const encryption = { encryptNullable: (value: string | null) => value, decryptNullable: (value: string | null) => value };
    const subscriptions = new SubscriptionsRepository(db as never, encryption as never);
    invoices = new InvoicesRepository(db as never, encryption as never);
    billing = new BillingService(context, db as never, { invalidateTenant: async () => {} } as never,
      {} as never, {} as never, subscriptions, invoices,
      undefined, undefined, new FeeStructuresRepository(db as never), {
        recordSchoolOperation: async (event: unknown) => {
          if (failEvent) throw Error('Injected event failure');
          await db.query('INSERT INTO evidence VALUES($1,$2::jsonb)', [context.requireStore().tenant_id, JSON.stringify(event)]);
        },
      } as never);
    await pool.query(`INSERT INTO subscriptions(tenant_id,plan_code,status,current_period_start,current_period_end)
      VALUES($1,'school','active',now(),now()+interval '1 year')`, [school]);
    await pool.query(`INSERT INTO students VALUES($1,$2,'Amina','Learner','ADM-1',NULL,'active',NULL),
      ($3,$4,'Private','Learner','ADM-1',NULL,'active',NULL)`, [learner, school, foreignLearner, otherSchool]);
    await pool.query(`INSERT INTO student_allocations VALUES($1,$2,'Grade 7','East',true),($3,$4,'Grade 7','East',true)`,
      [school, learner, otherSchool, foreignLearner]);
    const create = () => billing.createFeeStructure({ name: 'Term fees', academic_year: '2026', term: 'Term 3', grade_level: 'Grade 7',
      line_items: [{ code: 'tuition', label: 'Tuition', amount_minor: '140000' }] });
    planId = (await asSchool(create)).id;
    foreignPlanId = (await asSchool(create, otherSchool)).id;
  });
  afterAll(async () => {
    if (pool) { try { await pool.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`); } finally { await pool.end(); } }
  });
  beforeEach(async () => { failEvent = false; await pool.query('TRUNCATE invoices,evidence'); });

  it('loads the selected plan roster through the billing service without exposing another school', async () => {
    const rows = await asSchool(() => billing.listBillableStudentsForFeeStructure(planId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ student_id: learner, student_name: 'Amina Learner', admission_number: 'ADM-1' });
    expect(await asSchool(() => billing.listBillableStudentsForFeeStructure(planId.toUpperCase()))).toEqual(rows);
    await expect(asSchool(() => billing.listBillableStudentsForFeeStructure(foreignPlanId))).rejects.toThrow('not found');
    await expect(asSchool(() => billing.listBillableStudentsForFeeStructure(planId), otherSchool)).rejects.toThrow('not found');
  });
  it('issues the selected learner invoice once and rejects a foreign learner or fee plan', async () => {
    const first = await issue('first');
    expect(first.generated_count).toBe(1);
    expect(first.invoices[0]).toMatchObject({ total_amount_minor: '140000', metadata: { student_id: learner, student_name: 'Amina Learner' } });
    const replay = await issue('retry');
    expect(replay.generated_count).toBe(0);
    expect(replay.skipped_count).toBe(1);
    await expect(issue('foreign-learner', foreignLearner)).rejects.toThrow('Every selected learner');
    await expect(issue('foreign-plan', learner, foreignPlanId)).rejects.toThrow('not found');
    expect((await pool.query('SELECT tenant_id,total_amount_minor::text FROM invoices')).rows).toEqual([{ tenant_id: school, total_amount_minor: '140000' }]);
    expect((await pool.query('SELECT * FROM evidence')).rows).toHaveLength(1);
    if (variant === 'legacy') {
      expect((await pool.query('SELECT school_id,student_id,amount_due,amount_paid,balance,academic_year_id,term_id FROM invoices')).rows)
        .toEqual([{ school_id: school, student_id: learner, amount_due: 1400, amount_paid: 0, balance: 1400, academic_year_id: null, term_id: null }]);
    }
  });
  it('rolls back invoice creation if its event cannot be persisted', async () => {
    failEvent = true;
    await expect(issue('event-failure')).rejects.toThrow('Injected event failure');
    expect((await pool.query('SELECT * FROM invoices')).rows).toHaveLength(0);
    failEvent = false;
    expect((await issue('event-failure')).generated_count).toBe(1);
  });
  it('reads, allocates and reverses the issued invoice without losing its learner balance', async () => {
    const invoice = (await issue('payment')).invoices[0];
    expect((await asSchool(() => billing.getInvoice(invoice.id))).total_amount_minor).toBe('140000');
    expect(await asSchool(() => invoices.findById(otherSchool, invoice.id))).toBeNull();
    expect(await asSchool(() => invoices.findStudentFeeInvoicesForAllocation({tenantId: school, studentId: learner, explicitInvoiceId: invoice.id}))).toHaveLength(1);
    expect((await asSchool(() => invoices.findManualFeeInvoiceTargetByReference(school, invoice.id)))?.id).toBe(invoice.id);
    await asSchool(() => invoices.applyManualFeeInvoicePayment({tenantId: school, invoiceId: invoice.id, amountMinor: '1000', nextAmountPaidMinor: '1000', nextStatus: 'pending_payment'}));
    expect((await asSchool(() => invoices.listStudentInvoices(school, learner)))[0].amount_paid_minor).toBe('1000');
    if (variant === 'legacy') {
      expect((await pool.query('SELECT amount_paid,balance FROM invoices')).rows).toEqual([{amount_paid: 10, balance: 1390}]);
    }
    await asSchool(() => invoices.reverseManualFeeInvoicePayment({tenantId: school, invoiceId: invoice.id, amountMinor: '1000', nextStatus: 'open'}));
    expect((await asSchool(() => invoices.findById(school, invoice.id)))?.amount_paid_minor).toBe('0');
    if (variant === 'legacy') {
      expect((await pool.query('SELECT amount_paid,balance FROM invoices')).rows).toEqual([{amount_paid: 0, balance: 1400}]);
      const prisma = new PrismaClient({adapter: new PrismaPg({connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public`}, {schema})});
      try {
        const rows = await prisma.invoice.findMany({where: {schoolId: school, studentId: learner}});
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({status: 'open', academicYearId: null, termId: null, balance: 1400});
      } finally { await prisma.$disconnect(); }
    }
  });
  if (variant === 'legacy') {
    it('rejects conflicting school and learner columns, and preserves atomic schema rollback', async () => {
      await issue('boundaries');
      await expect(asSchool(() => db.query('UPDATE invoices SET school_id=$1 WHERE tenant_id=$2', [otherSchool, school]))).rejects.toThrow('school does not match');
      await expect(asSchool(() => db.query('UPDATE invoices SET student_id=$1 WHERE tenant_id=$2', [foreignLearner, school]))).rejects.toThrow('learner references disagree');
      await expect(asSchool(() => db.query("UPDATE invoices SET student_id=$1,metadata=jsonb_set(metadata,'{student_id}',to_jsonb($1::text)) WHERE tenant_id=$2", [foreignLearner, school]))).rejects.toThrow('must belong');
      const client = await pool.connect();
      try {
        await client.query('BEGIN; ALTER TABLE subscriptions DROP COLUMN last_invoice_at;');
        await client.query(INVOICE_WRITE_SCHEMA_SQL);
        await client.query('ROLLBACK');
      } finally { client.release(); }
      expect((await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='subscriptions' AND column_name='last_invoice_at'", [schema])).rows).toHaveLength(1);
    });
    it('keeps legacy major-unit updates consistent with canonical invoice statements', async () => {
      await issue('legacy-update');
      await asSchool(() => db.query('UPDATE invoices SET amount_paid=15 WHERE tenant_id=$1', [school]));
      expect((await asSchool(() => invoices.listStudentInvoices(school, learner)))[0].amount_paid_minor).toBe('1500');
      expect((await pool.query('SELECT balance FROM invoices')).rows).toEqual([{balance: 1385}]);
      await asSchool(() => db.query('UPDATE invoices SET total_amount_minor=139000 WHERE tenant_id=$1', [school]));
      expect((await pool.query('SELECT amount_due,balance FROM invoices')).rows).toEqual([{amount_due: 1390, balance: 1375}]);
    });
  }
  it('archives only the school-owned plan and prevents further billing', async () => {
    await expect(asSchool(() => billing.archiveFeeStructure(foreignPlanId))).rejects.toThrow('not found');
    expect((await asSchool(() => billing.archiveFeeStructure(planId.toUpperCase()))).status).toBe('archived');
    await expect(asSchool(() => billing.listBillableStudentsForFeeStructure(planId))).rejects.toThrow('archived');
    await expect(issue('archived')).rejects.toThrow('archived');
    expect((await asSchool(() => billing.listFeeStructures(), otherSchool))[0].status).toBe('active');
  });
});
