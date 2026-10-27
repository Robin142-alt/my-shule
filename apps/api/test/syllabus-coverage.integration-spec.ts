import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { SyllabusService } from '../src/modules/academics/syllabus.service';
import { SYLLABUS_SCHEMA_SQL } from '../src/modules/academics/syllabus-schema';

jest.setTimeout(60000);

describe('Shared syllabus and independent teaching coverage', () => {
  const schema = `syllabus_${randomUUID().replaceAll('-', '')}`;
  const reader = `${schema}_reader`;
  const users = { hos: randomUUID(), hod: randomUUID(), first: randomUUID(), second: randomUUID(), principal: randomUUID(), outsider: randomUUID() };
  let pool: Pool;
  let failEvent = false;
  const scoped = async <T>(tenant: string, work: (client: PoolClient) => Promise<T>) => {
    const client = await pool.connect();
    try {
      await client.query(`BEGIN; SET LOCAL search_path TO ${schema}; SET LOCAL ROLE ${reader}`);
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
      const result = await work(client); await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  };
  const db = (tenant: string, sql: string, values: unknown[] = []) => scoped(tenant, client => client.query(sql, values));
  const service = (user = users.hos, role = 'head_of_subject', tenant = 'school-a', authenticated = true) => {
    const evidence = async (tx: any, kind: string, payload: unknown) => {
      expect(tx).toBeDefined();
      await tx.$queryRawUnsafe('INSERT INTO evidence(tenant_id,kind,payload) VALUES ($1,$2,$3::jsonb) RETURNING id', tenant, kind, JSON.stringify(payload));
    };
    return new SyllabusService({ executeWithTenant: (school: string, _: unknown, work: (tx: any) => Promise<unknown>) => scoped(school,
      client => work({ $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rows })) } as never,
    { requireStore: () => ({ tenant_id: tenant, user_id: user, role, is_authenticated: authenticated, permissions: ['academics:read'], trace_id: randomUUID() }) } as never,
    { appendAuditLog: async (payload: unknown, tx: any) => evidence(tx, 'audit', payload) } as never,
    { publish: async (payload: unknown, tx: any) => { await evidence(tx, 'event', payload); if (failEvent) throw new Error('outbox unavailable'); } } as never,
    { createNotification: async (payload: unknown, tx: any) => evidence(tx, 'notification', payload) } as never);
  };
  const content = () => ({ subject_id: 'school-a-math', academic_year_id: 'school-a-year', academic_term_id: 'school-a-term', grade_level: 'Form 2',
    topics: [{ id: 'numbers', title: 'Numbers', expected_on: '2026-03-20', archived: false, subtopics: [
      { id: 'integers', title: 'Integers', required: true, archived: false }, { id: 'fractions', title: 'Fractions', required: true, archived: false },
    ] }], milestones: [{ id: 'checkpoint', title: 'Numbers checkpoint', due_on: '2026-03-10', subtopic_ids: ['integers'] }] });
  const tick = (assignment = 'school-a-first-east', completed = true, version = 0, note = '') => ({ assignment_id: assignment, completed, version, note, syllabus_version: 1 });

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') throw new Error('Run with the disposable PostgreSQL runner.');
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}; CREATE ROLE ${reader} NOLOGIN;
        CREATE TABLE tenant_memberships(tenant_id text,user_id uuid,status text DEFAULT 'active');
        CREATE TABLE academic_years(id text PRIMARY KEY,tenant_id text,name text,status text DEFAULT 'active',starts_on date DEFAULT '2026-01-01', UNIQUE(tenant_id,id));
        CREATE TABLE academic_terms(id text PRIMARY KEY,tenant_id text,academic_year_id text,name text,starts_on date,ends_on date,status text DEFAULT 'active',UNIQUE(tenant_id,id));
        CREATE TABLE academics_departments(id uuid PRIMARY KEY,tenant_id text,head_of_department_user_id uuid,is_active boolean DEFAULT true,status text DEFAULT 'active',archived_at timestamptz);
        CREATE TABLE subjects(id text PRIMARY KEY,tenant_id text,name text,department_id uuid,status text DEFAULT 'active',archived_at timestamptz,UNIQUE(tenant_id,id));
        CREATE TABLE class_sections(id text PRIMARY KEY,tenant_id text,name text,grade_level text,academic_year_id text,is_active boolean DEFAULT true,status text DEFAULT 'active');
        CREATE TABLE class_streams(id text PRIMARY KEY,tenant_id text,class_section_id text,name text,is_active boolean DEFAULT true,status text DEFAULT 'active');
        CREATE TABLE teacher_subject_assignments(id text PRIMARY KEY,tenant_id text,teacher_user_id text,subject_id text,class_section_id text,stream_id text,academic_term_id text,
          status text DEFAULT 'active',lesson_record_allowed boolean DEFAULT true,effective_from date DEFAULT '2020-01-01',effective_to date,UNIQUE(tenant_id,id));
        CREATE TABLE staff_profiles(tenant_id text,user_id uuid,display_name text);
        CREATE TABLE academics_role_appointments(tenant_id text,teacher_user_id uuid,role_type text,subject_id text,academic_year_id text,class_section_id text,stream_id text,
          status text DEFAULT 'active',effective_from date DEFAULT '2020-01-01',effective_to date);
        CREATE TABLE academics_department_hod_appointments(tenant_id text,department_id uuid,teacher_user_id uuid,status text DEFAULT 'active',effective_from date DEFAULT '2020-01-01',effective_to date);
        CREATE TABLE evidence(id uuid DEFAULT gen_random_uuid(),tenant_id text,kind text,payload jsonb);
        ${SYLLABUS_SCHEMA_SQL}
      `);
      for (const table of ['tenant_memberships','academic_years','academic_terms','academics_departments','subjects','class_sections','class_streams',
        'teacher_subject_assignments','staff_profiles','academics_role_appointments','academics_department_hod_appointments','evidence']) {
        await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
          CREATE POLICY school_scope ON ${table} USING (tenant_id=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id=current_setting('app.tenant_id',true));`);
      }
      await client.query(`GRANT USAGE ON SCHEMA ${schema} TO ${reader}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${reader};`);
    } finally { client.release(); }
  }, 60000);
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => {
    failEvent = false;
    const client = await pool.connect();
    try {
      await client.query(`BEGIN; SET LOCAL search_path TO ${schema}; TRUNCATE academics_syllabus_coverage,academics_syllabi,teacher_subject_assignments,subjects,academic_years,academic_terms,
        academics_role_appointments,academics_department_hod_appointments,academics_departments,class_sections,class_streams,staff_profiles,tenant_memberships,evidence CASCADE`);
      for (const school of ['school-a','school-b']) {
        const department = randomUUID();
        await client.query('INSERT INTO academics_departments(id,tenant_id) VALUES ($1,$2)', [department, school]);
        await client.query('INSERT INTO academic_years(id,tenant_id,name) VALUES ($1,$2,\'2026\')', [`${school}-year`, school]);
        await client.query("INSERT INTO academic_terms(id,tenant_id,academic_year_id,name,starts_on,ends_on) VALUES ($1,$2,$3,'Term 1','2026-01-01','2026-04-30')", [`${school}-term`, school, `${school}-year`]);
        await client.query("INSERT INTO subjects(id,tenant_id,name,department_id) VALUES ($1,$2,'Mathematics',$3),($4,$2,'Science',NULL)", [`${school}-math`, school, department, `${school}-science`]);
        await client.query("INSERT INTO class_sections(id,tenant_id,name,grade_level,academic_year_id) VALUES ($1,$2,'Form 2','Form 2',$3)", [`${school}-class`, school, `${school}-year`]);
        await client.query("INSERT INTO class_streams(id,tenant_id,class_section_id,name) VALUES ($1,$2,$3,'East'),($4,$2,$3,'West')", [`${school}-east`, school, `${school}-class`, `${school}-west`]);
        for (const [label, user] of Object.entries(users)) {
          await client.query('INSERT INTO tenant_memberships(tenant_id,user_id) VALUES ($1,$2)', [school, user]);
          await client.query('INSERT INTO staff_profiles VALUES ($1,$2,$3)', [school, user, label]);
        }
        await client.query("INSERT INTO academics_role_appointments(tenant_id,teacher_user_id,role_type,subject_id) VALUES ($1,$2,'head_of_subject',$3)", [school, users.hos, `${school}-math`]);
        await client.query('INSERT INTO academics_department_hod_appointments(tenant_id,department_id,teacher_user_id) VALUES ($1,$2,$3)', [school, department, users.hod]);
        for (const [label, user, stream] of [['first-east', users.first, 'east'], ['second-west', users.second, 'west'], ['first-west', users.first, 'west']]) {
          await client.query('INSERT INTO teacher_subject_assignments(id,tenant_id,teacher_user_id,subject_id,class_section_id,stream_id,academic_term_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [`${school}-${label}`, school, user, `${school}-math`, `${school}-class`, `${school}-${stream}`, `${school}-term`]);
        }
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });

  it('publishes one shared syllabus, notifies allocated teachers and keeps streams and teachers independent', async () => {
    const plan = await service().save(content());
    expect((await db('school-a', "SELECT * FROM evidence WHERE kind='notification'")).rows).toHaveLength(2);
    await service(users.first,'teacher').recordCoverage(plan.id,'integers',tick());
    const firstView = await service(users.first,'teacher').workspace();
    expect(firstView.syllabi).toHaveLength(1);
    expect(firstView.items).toHaveLength(2);
    expect(firstView.items.find(row => row.id === 'school-a-first-east').progress.percentage).toBe(50);
    expect(firstView.items.find(row => row.id === 'school-a-first-west').progress.percentage).toBe(0);
    const secondView = await service(users.second,'teacher').workspace();
    expect(secondView.items).toHaveLength(1);
    expect(secondView.items[0].progress.percentage).toBe(0);
    expect(secondView.items[0].records).toEqual([]);
    const leadership = await service(users.principal,'principal').workspace();
    expect(leadership.items).toHaveLength(3);
    expect(leadership.syllabi[0].can_manage).toBe(false);
  });

  it('allows notes and unticking without approval and preserves the completion timestamp on note edits', async () => {
    const plan = await service().save(content()); const teacher = service(users.first,'teacher');
    const first = await teacher.recordCoverage(plan.id,'integers',tick());
    const noted = await teacher.recordCoverage(plan.id,'integers',tick(undefined,true,1,'Used number line examples'));
    expect(noted.completed_at).toEqual(first.completed_at);
    expect(noted.note).toBe('Used number line examples');
    const undone = await teacher.recordCoverage(plan.id,'integers',tick(undefined,false,2,'Revisit this topic'));
    expect(undone.completed_at).toBeNull();
    expect((await teacher.workspace()).items[0].progress.completed).toBe(0);
    expect((await db('school-a', "SELECT * FROM evidence WHERE kind='audit' AND payload->>'entity_type'='syllabus_coverage'")).rows).toHaveLength(3);
  });

  it('restricts authoring to effective subject or department appointments and cannot target a different school', async () => {
    await expect(service(users.first,'teacher').save(content())).rejects.toThrow(/appointed/);
    await expect(service(users.principal,'principal').save(content())).rejects.toThrow(/appointed/);
    await expect(service().save({ ...content(), subject_id: 'school-a-science' })).rejects.toThrow(/appointed/);
    await expect(service().save({ ...content(), subject_id: 'school-b-math', academic_year_id: 'school-b-year' })).rejects.toThrow(/appointed/);
    const plan = await service(users.hod,'hod').save(content()); expect(plan.version).toBe(1);
    await db('school-a', "UPDATE academics_role_appointments SET effective_to=CURRENT_DATE-1");
    await expect(service().save({ ...content(),version:1 },plan.id)).rejects.toThrow(/appointed/);
    expect((await service().workspace()).items).toHaveLength(0);
    await expect(service(users.first,'student').workspace()).rejects.toThrow(/staff/);
    await expect(service(users.first,'teacher','school-a',false).workspace()).rejects.toThrow(/Sign in/);
  });

  it('denies ticks by another teacher, managers and mismatched term or school allocations', async () => {
    const plan = await service().save(content());
    for (const teacher of [service(users.second,'teacher'), service(users.hos), service(users.principal,'principal')]) {
      await expect(teacher.recordCoverage(plan.id,'integers',tick())).rejects.toThrow(/active class/);
    }
    await expect(service(users.first,'teacher','school-b').recordCoverage(plan.id,'integers',tick('school-b-first-east'))).rejects.toThrow(/not found/);
    await expect(service(users.first,'teacher').recordCoverage(plan.id,'integers',tick('school-b-first-east'))).rejects.toThrow(/active class/);
    await db('school-a', "UPDATE teacher_subject_assignments SET academic_term_id='another-term' WHERE id='school-a-first-east'");
    await expect(service(users.first,'teacher').recordCoverage(plan.id,'integers',tick())).rejects.toThrow(/active class/);
    expect((await db('school-a','SELECT * FROM academics_syllabus_coverage')).rows).toHaveLength(0);
  });

  it('retains recorded coverage through revisions and archives while rejecting deletion and stale edits', async () => {
    const plan = await service().save(content());
    await service(users.first,'teacher').recordCoverage(plan.id,'integers',tick());
    const revision = content(); revision.topics[0].subtopics[1].archived = true;
    revision.topics[0].subtopics.push({ id: 'decimals',title: 'Decimals',required: true,archived: false });
    const revised = await service().save({ ...revision,version:1 },plan.id);
    expect(revised.version).toBe(2);
    const teacher = await service(users.first,'teacher').workspace();
    expect(teacher.items[0].progress.percentage).toBe(50);
    expect(teacher.items[0].records[0].subtopic_id).toBe('integers');
    await expect(service().save({ ...revision,version:1 },plan.id)).rejects.toThrow(/changed/);
    revision.topics[0].subtopics.shift();
    revision.milestones = [];
    await expect(service().save({ ...revision,version:2 },plan.id)).rejects.toThrow(/retain/);
    await expect(service(users.first,'teacher').recordCoverage(plan.id,'fractions',{...tick(),syllabus_version:2})).rejects.toThrow(/active subtopic/);
    await expect(service(users.first,'teacher').recordCoverage(plan.id,'integers',{...tick(),version:1})).rejects.toThrow(/syllabus changed/);
  });

  it('serializes concurrent publication and concurrent checkbox changes without duplicates', async () => {
    const creates = await Promise.allSettled([service().save(content()),service().save(content())]);
    expect(creates.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    const plan = (creates.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
    const changes = await Promise.allSettled([service(users.first,'teacher').recordCoverage(plan.id,'integers',tick()),service(users.first,'teacher').recordCoverage(plan.id,'integers',tick())]);
    expect(changes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect((await db('school-a','SELECT * FROM academics_syllabus_coverage')).rows).toHaveLength(1);
  });

  it('does not inherit another teacher completion when an allocation owner changes', async () => {
    const plan = await service().save(content());
    await service(users.first,'teacher').recordCoverage(plan.id,'integers',tick());
    await db('school-a', "UPDATE teacher_subject_assignments SET teacher_user_id=$1 WHERE id='school-a-first-east'", [users.second]);
    const newOwner = await service(users.second,'teacher').workspace();
    expect(newOwner.items.find(row=>row.id==='school-a-first-east').progress.percentage).toBe(0);
    await service(users.second,'teacher').recordCoverage(plan.id,'fractions',tick());
    expect((await db('school-a','SELECT * FROM academics_syllabus_coverage')).rows).toHaveLength(2);
  });

  it('rolls back persistence, audit and notifications together when the event outbox fails', async () => {
    failEvent = true;
    await expect(service().save(content())).rejects.toThrow('outbox unavailable');
    expect((await db('school-a','SELECT * FROM academics_syllabi')).rows).toHaveLength(0);
    expect((await db('school-a','SELECT * FROM evidence')).rows).toHaveLength(0);
    failEvent = false; const plan = await service().save(content()); failEvent = true;
    await expect(service(users.first,'teacher').recordCoverage(plan.id,'integers',tick())).rejects.toThrow('outbox unavailable');
    expect((await db('school-a','SELECT * FROM academics_syllabus_coverage')).rows).toHaveLength(0);
  });

  it('enforces database RLS on reads and forged inserts and exports only authorized coverage', async () => {
    const plan = await service().save(content());
    expect((await db('school-b','SELECT * FROM academics_syllabi')).rows).toEqual([]);
    await expect(db('school-b', 'INSERT INTO academics_syllabus_coverage(tenant_id,syllabus_id,assignment_id,subtopic_id,teacher_user_id,created_by_user_id,updated_by_user_id) VALUES ($1,$2,$3,$4,$5::text,$5::text::uuid,$5::text::uuid)',
      ['school-a',plan.id,'school-a-first-east','integers',users.first])).rejects.toThrow(/row-level security/);
    await db('school-a', "UPDATE staff_profiles SET display_name='=CMD()' WHERE user_id=$1", [users.first]);
    const report = await service(users.first,'teacher').exportReport();
    expect(report.row_count).toBe(2);
    expect(report.csv).toContain("'=CMD()");
    expect(report.csv).not.toContain('school-b');
    expect(report.csv).not.toContain(',second,');
    expect((await db('school-a', "SELECT * FROM evidence WHERE kind='audit' AND payload->>'entity_type'='syllabus_report'")).rows).toHaveLength(1);
  });

  it('blocks invalid dates, false completion values, suspended members, closed terms and expired allocations', async () => {
    const invalid = content(); invalid.topics[0].expected_on='2026-02-30';
    await expect(service().save(invalid)).rejects.toThrow(/date/);
    const plan = await service().save(content()); const teacher=service(users.first,'teacher');
    await expect(teacher.recordCoverage(plan.id,'integers',{...tick(),completed:'true'})).rejects.toThrow(/checkbox/);
    await db('school-a', "UPDATE teacher_subject_assignments SET lesson_record_allowed=false");
    await expect(teacher.recordCoverage(plan.id,'integers',tick())).rejects.toThrow(/active class/);
    await db('school-a', "UPDATE teacher_subject_assignments SET lesson_record_allowed=true");
    await db('school-a', "UPDATE tenant_memberships SET status='suspended' WHERE user_id=$1", [users.first]);
    await expect(teacher.workspace()).rejects.toThrow(/membership/);
    await db('school-a', "UPDATE tenant_memberships SET status='active'; UPDATE teacher_subject_assignments SET effective_to=CURRENT_DATE-1");
    await expect(teacher.recordCoverage(plan.id,'integers',tick())).rejects.toThrow(/active class/);
    expect((await teacher.workspace()).items.every(row=>!row.can_record)).toBe(true);
    await db('school-a', "UPDATE teacher_subject_assignments SET effective_to=NULL; UPDATE academic_terms SET status='closed'");
    await expect(teacher.recordCoverage(plan.id,'integers',tick())).rejects.toThrow(/active class/);
    await expect(service().save({...content(),version:1},plan.id)).rejects.toThrow(/open term/);
  });
});
