import { FEE_WAIVER_INVOICE_SCHEMA_SQL } from '../src/modules/billing/fee-waiver-schema';
import { FEE_INVOICE_READ_SQL } from '../src/modules/billing/fee-invoice-read-sql';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool, PoolClient } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { ApprovalService } from '../src/modules/workflow/services/approval.service';
import { requestSchoolFeeWaiver } from '../src/modules/finance/fee-waiver-workflow';
import { FeeStructuresRepository } from '../src/modules/billing/repositories/fee-structures.repository';
import { FinanceController } from '../src/modules/finance/finance.controller';
import { SchoolOperationalEventsService } from '../src/modules/events/school-operational-events.service';
import { SchoolOperationNotificationsRepository } from '../src/modules/events/repositories/school-operation-notifications.repository';
import { BillingSchemaService } from '../src/modules/billing/billing-schema.service';

// Real SQL, transactions and RLS against an explicitly disposable local database.
describe('School fee waivers and multi-grade rosters', () => {
  const schema = `waivers_${randomUUID().replaceAll('-', '')}`, role = `${schema}_role`;
  const context = new RequestContextService(), scope = new AsyncLocalStorage<PoolClient>();
  const student = randomUUID(), other = randomUUID(), requester = randomUUID(), principal = randomUUID();
  let pool: Pool, failEvent = false;
  const txFor = (client: PoolClient) => ({
    $queryRawUnsafe: async <T>(sql: string, ...args: unknown[]) => (await client.query(sql, args)).rows as T,
    $executeRawUnsafe: async (sql: string, ...args: unknown[]) => (await client.query(sql, args)).rowCount ?? 0,
  });
  async function transaction<T>(tenant: string, work: (tx: ReturnType<typeof txFor>) => Promise<T>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query(`SET LOCAL ROLE ${role}`);
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
      const result = await scope.run(client, () => work(txFor(client)));
      await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  const db = { executeWithTenant: (tenant: string, _actor: string, work: any) => transaction(tenant, work),
    query: (sql: string, args: unknown[]) => scope.getStore()!.query(sql, args) };
  const approvals = new ApprovalService(db as never, context, { publish: async (event: any, tx: ReturnType<typeof txFor>) => {
    if (failEvent) throw Error('Outbox unavailable');
    await tx.$executeRawUnsafe('INSERT INTO evidence(tenant_id,event) VALUES($1,$2::jsonb)', event.tenant_id, JSON.stringify(event));
  } } as never);
  const roster = new FeeStructuresRepository(db as never);
  const request = (amount = '8000', key = 'same', tenant = 'school-a', learner = student) => transaction(tenant, tx => requestSchoolFeeWaiver(tx, {
    schoolId: tenant, userId: requester, studentId: learner, amountMinor: amount, reason: 'Approved scholarship application', key,
  }));
  const decide = (id: string, decision: 'APPROVED' | 'REJECTED' = 'APPROVED', tenant = 'school-a', actor = principal, actorRole = 'principal', permissions = ['finance:write']) => context.run({tenant_id: tenant, user_id: actor, role: actorRole, permissions} as never,
    () => approvals.decideRequest({tenantId: tenant, approvalId: id, actorUserId: actor, actorRole, decision, requestId: randomUUID(), note: 'Reviewed current fee account'}));
  it('expands legacy invoices without a total constraint and rejects negative totals', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE TEMP TABLE invoices(total_amount_minor bigint NOT NULL) ON COMMIT DROP');
      await client.query(FEE_WAIVER_INVOICE_SCHEMA_SQL);
      await client.query(FEE_WAIVER_INVOICE_SCHEMA_SQL);
      await client.query('INSERT INTO invoices VALUES(0),(100)');
      expect((await client.query('SELECT total_amount_minor FROM invoices ORDER BY total_amount_minor')).rows).toEqual([{total_amount_minor: '0'}, {total_amount_minor: '100'}]);
      await expect(client.query('INSERT INTO invoices VALUES(-1)')).rejects.toMatchObject({code: '23514'});
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.startsWith('/my_shule_disposable_')) throw Error('Requires disposable PostgreSQL');
    pool = new Pool({connectionString: url.toString(), options: `-c search_path=${schema},public`});
    await pool.query(`CREATE SCHEMA ${schema}; CREATE ROLE ${role}; GRANT USAGE ON SCHEMA ${schema} TO ${role}; CREATE TABLE users(id uuid PRIMARY KEY);`);
    const events = readFileSync(join(__dirname, '../src/modules/events/events-schema.service.ts'), 'utf8');
    const table = (source: string, name: string) => source.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\n      \\);`))![0];
    let billing = ''; await new BillingSchemaService({runSchemaBootstrap: async (sql: string) => {billing = sql;}} as never).onModuleInit();
    for (const name of ['invoices']) await pool.query(table(billing, name));
    await pool.query(FEE_WAIVER_INVOICE_SCHEMA_SQL);
    await pool.query(FEE_WAIVER_INVOICE_SCHEMA_SQL); // Safe to run again on restart.
    for (const name of ['dashboard_approval_requests', 'audit_logs', 'notifications']) await pool.query(table(events, name));
    await pool.query(`CREATE UNIQUE INDEX ON dashboard_approval_requests(tenant_id,approval_key); CREATE UNIQUE INDEX ON notifications(tenant_id,notification_key);
      CREATE TABLE students(id uuid PRIMARY KEY, tenant_id text, first_name text, last_name text, admission_number text, primary_guardian_phone text, status text, deleted_at timestamptz);
      CREATE TABLE student_allocations(tenant_id text,student_id uuid,class_name text,stream_name text,is_current boolean);
      CREATE TABLE student_invoices(id uuid,tenant_id text,student_id uuid,invoice_number text,term text,academic_year text,amount_minor bigint,balance_minor bigint,created_at timestamptz);
      CREATE TABLE evidence(tenant_id text,event jsonb);
      CREATE TABLE tenant_pending_waivers(id uuid,tenant_id uuid,waiver_number text,student_id uuid,student_name text,class_name text,amount_minor bigint,reason text,status text,created_at timestamptz DEFAULT now());
      CREATE TABLE approval_requests(id uuid,school_id text,module text,action text,target_entity_id text,new_value jsonb,reason text,status text,created_at timestamptz DEFAULT now()); GRANT ALL ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    for (const name of ['invoices','dashboard_approval_requests','notifications','audit_logs','students','student_allocations','evidence']) await pool.query(`ALTER TABLE ${name} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${name} FORCE ROW LEVEL SECURITY; CREATE POLICY tenant_only ON ${name} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
    await pool.query('INSERT INTO users VALUES($1),($2)', [requester, principal]);
  });
  beforeEach(async () => {
    failEvent = false;
    await pool.query(`TRUNCATE invoices,dashboard_approval_requests,notifications,audit_logs,evidence,students,student_allocations,tenant_pending_waivers,approval_requests;
      INSERT INTO students VALUES('${student}','school-a','Amina','Test','001',NULL,'active'),('${other}','school-b','Private','Learner','002',NULL,'active');
      INSERT INTO student_allocations VALUES('school-a','${student}','Grade 7','East',true),('school-b','${other}','Grade 7','East',true);
      INSERT INTO invoices(tenant_id,subscription_id,invoice_number,description,subtotal_amount_minor,total_amount_minor,amount_paid_minor,due_at,metadata,issued_at)
      VALUES('school-a','${randomUUID()}','INV-1','Term fees',10000,10000,3000,now(),'{{"student_id":"${student}"}}'::jsonb,now()-interval '1 day'),
        ('school-a','${randomUUID()}','INV-2','Second fees',5000,5000,0,now(),'{{"student_id":"${student}"}}'::jsonb,now()),
        ('school-b','${randomUUID()}','PRIVATE','Private fees',100000,100000,0,now(),'{{"student_id":"${other}"}}'::jsonb,now());`.replaceAll('{{','{').replaceAll('}}','}'));
  });
  afterAll(async () => {if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE; DROP ROLE ${role}`);await pool.end();}});
  it('the Accountant request endpoint persists its approval and Principal notification in one transaction', async () => {
    const publisher={publish:async(event:any,tx:ReturnType<typeof txFor>)=>{
      if(failEvent)throw Error('Outbox unavailable');
      await tx.$executeRawUnsafe('INSERT INTO evidence(tenant_id,event) VALUES($1,$2::jsonb)', 'school-a',JSON.stringify(event));
      return {id:randomUUID(),event_key:event.event_key};
    }};
    const events=new SchoolOperationalEventsService(context,publisher as never,new SchoolOperationNotificationsRepository(db as never));
    const controller=new FinanceController(db as never,db as never,context,{} as never,publisher as never,events,{} as never);
    const save=()=>context.run({tenant_id:'school-a',user_id:requester,role:'accountant'} as never,()=>controller.requestWaiver({student_id:student,student_name:'Untrusted name',amount_minor:'1000',reason:'Scholarship request',idempotency_key:'endpoint'}));
    failEvent=true;await expect(save()).rejects.toThrow('Outbox');
    expect((await pool.query('SELECT * FROM dashboard_approval_requests')).rows).toHaveLength(0);
    expect((await pool.query('SELECT * FROM audit_logs')).rows).toHaveLength(0);
    failEvent=false;const saved=await save();expect(saved.status).toBe('PENDING');await save();
    expect((await pool.query('SELECT * FROM notifications')).rows).toHaveLength(1);
    expect((await pool.query('SELECT * FROM evidence')).rows).toHaveLength(1);
    expect((await pool.query('SELECT * FROM audit_logs')).rows).toHaveLength(1);
    const rows=await context.run({tenant_id:'school-a'} as never,()=>transaction('school-a',()=>controller.listWaivers()));
    expect(rows).toHaveLength(1);expect(rows[0].student_name).toBe('Amina Test');expect(rows[0].requires_administrator_review).toBe(false);
    await decide(saved.request_id);
    expect((await save()).status).toBe('APPROVED');
  });
  it('saves one pending request on concurrent retry and does not reduce the balance before approval', async () => {
    const [a,b] = await Promise.all([request(),request()]); expect(a.id).toBe(b.id);
    expect((await pool.query("SELECT total_amount_minor::text FROM invoices WHERE invoice_number='INV-1'")).rows[0].total_amount_minor).toBe('10000');
    await expect(request('1000')).rejects.toThrow('different waiver');
    await expect(request('13000','too-large')).rejects.toThrow('exceeds');
  });
  it('applies once across oldest invoices, preserves cash and writes audit, notification and event atomically', async () => {
    const saved = await request(); await Promise.all([decide(saved.id),decide(saved.id)]);
    const invoices = (await pool.query("SELECT invoice_number,total_amount_minor::text,amount_paid_minor::text,status,jsonb_array_length(metadata->'fee_waivers') AS adjustments FROM invoices WHERE tenant_id='school-a' ORDER BY invoice_number")).rows;
    expect(invoices).toEqual([
      {invoice_number:'INV-1',total_amount_minor:'3000',amount_paid_minor:'3000',status:'paid',adjustments:1},
      {invoice_number:'INV-2',total_amount_minor:'4000',amount_paid_minor:'0',status:'open',adjustments:1},
    ]);
    const portalInvoices = await transaction('school-a', tx => tx.$queryRawUnsafe<Array<{balance_minor: string}>>(FEE_INVOICE_READ_SQL));
    expect(portalInvoices).toHaveLength(2);
    expect(portalInvoices.reduce((sum, row) => sum + BigInt(row.balance_minor), 0n)).toBe(4000n);
    for (const name of ['audit_logs','notifications','evidence']) expect((await pool.query(`SELECT * FROM ${name}`)).rows).toHaveLength(1);
    expect((await pool.query("SELECT total_amount_minor::text FROM invoices WHERE tenant_id='school-b'")).rows[0].total_amount_minor).toBe('100000');
  });
  it('supports a full waiver including an unpaid invoice reduced to zero', async () => {
    const saved = await request('12000'); await decide(saved.id);
    expect((await pool.query("SELECT total_amount_minor::text,status FROM invoices WHERE invoice_number='INV-2'")).rows[0]).toEqual({total_amount_minor:'0',status:'paid'});
  });
  it('rejects foreign-school, self, wrong-role and missing-capability decisions', async () => {
    const saved = await request();
    await expect(decide(saved.id,'APPROVED','school-b')).rejects.toThrow('not found');
    await expect(decide(saved.id,'APPROVED','school-a',requester)).rejects.toThrow('not found');
    await expect(decide(saved.id,'APPROVED','school-a',principal,'accountant')).rejects.toThrow('not found');
    await expect(decide(saved.id,'APPROVED','school-a',principal,'principal',[])).rejects.toThrow('permission');
    await expect(request('100','foreign','school-a',other)).rejects.toThrow('not found');
    expect(await transaction('school-b', tx => tx.$queryRawUnsafe('SELECT * FROM dashboard_approval_requests WHERE id=$1',saved.id))).toEqual([]);
  });
  it('rejecting leaves money unchanged; failed outbox rolls back all decision work', async () => {
    const saved = await request(); failEvent = true;
    await expect(decide(saved.id)).rejects.toThrow('Outbox');
    expect((await pool.query('SELECT status FROM dashboard_approval_requests')).rows[0].status).toBe('PENDING');
    expect((await pool.query('SELECT * FROM audit_logs')).rows).toHaveLength(0);
    expect((await pool.query("SELECT total_amount_minor::text FROM invoices WHERE invoice_number='INV-1'")).rows[0].total_amount_minor).toBe('10000');
    failEvent = false; await decide(saved.id,'REJECTED');
    expect((await pool.query("SELECT SUM(total_amount_minor-amount_paid_minor)::text AS balance FROM invoices WHERE tenant_id='school-a'")).rows[0].balance).toBe('12000');
  });
  it('rechecks funds when payments change the balance before approval', async () => {
    const saved = await request(); await pool.query("UPDATE invoices SET amount_paid_minor=9000 WHERE invoice_number='INV-1'");
    await expect(decide(saved.id)).rejects.toThrow('balance changed');
    expect((await pool.query('SELECT status FROM dashboard_approval_requests')).rows[0].status).toBe('PENDING');
  });
  it('loads current multi-grade rosters without foreign, historical or inactive learners', async () => {
    const second=randomUUID(), inactive=randomUUID();
    await pool.query(`INSERT INTO students VALUES('${second}','school-a','Baraka','Test','003',NULL,'active'),('${inactive}','school-a','Old','Test','004',NULL,'inactive');
      INSERT INTO student_allocations VALUES('school-a','${second}','Grade 8','East',true),('school-a','${inactive}','Grade 7','East',true),('school-a','${student}','Grade 6','West',false);`);
    await transaction('school-a', async () => {
      expect(await roster.listRosterOptions('school-a')).toEqual([{grade_level:'Grade 7',class_name:'East',student_count:1},{grade_level:'Grade 8',class_name:'East',student_count:1}]);
      const students=await roster.listBillableStudentsForFeeStructure('school-a',{grade_level:'Grade 7',grade_levels:['Grade 7','Grade 8'],class_name:'East'});
      expect(students.map(row=>row.student_id).sort()).toEqual([student,second].sort());
    });
    await pool.query('UPDATE students SET deleted_at=now() WHERE id=$1', [second]);
    await transaction('school-a', async () => {
      expect(await roster.listRosterOptions('school-a')).toHaveLength(1);
      expect((await roster.listBillableStudentsForFeeStructure('school-a',{grade_level:'Grade 8',class_name:null}))).toEqual([]);
    });
  });
});
