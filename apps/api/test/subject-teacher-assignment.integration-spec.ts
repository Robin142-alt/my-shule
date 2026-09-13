import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { AcademicsSchemaService } from '../src/modules/academics/academics-schema.service';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { AcademicsService } from '../src/modules/academics/academics.service';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { WorkflowRepository } from '../src/modules/events/repositories/workflow.repository';

describe('Continuing subject teacher assignment SQL contract', () => {
  let pool: Pool;
  let repository: AcademicsRepository;
  let exams: ExamsRepository;
  let service: AcademicsService;
  let migration: string;
  const actorId = randomUUID();
  const txFor = (client: PoolClient) => ({
    $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rows,
  });

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !process.env.DATABASE_URL) {
      throw new Error('Run through run-integration-with-local-postgres.ts using a disposable database.');
    }
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)
      || !databaseUrl.pathname.slice(1).startsWith('my_shule_disposable_')) {
      throw new Error('The test database must be a disposable local PostgreSQL database.');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE TABLE streams (id text PRIMARY KEY);
      CREATE TABLE class_sections (id text PRIMARY KEY, tenant_id text, academic_year_id text, status text DEFAULT 'active', curriculum_model text DEFAULT 'CBC');
      CREATE TABLE class_streams (id text PRIMARY KEY, tenant_id text, class_section_id text, status text DEFAULT 'active');
      CREATE TABLE academic_terms (id text PRIMARY KEY, tenant_id text, academic_year_id text);
      CREATE TABLE subjects (id text PRIMARY KEY, tenant_id text, status text DEFAULT 'active', department_id uuid, curriculum_model text);
      CREATE TABLE teacher_subject_assignments (
        id text PRIMARY KEY DEFAULT gen_random_uuid()::text, tenant_id text NOT NULL,
        academic_term_id text NOT NULL, class_section_id text NOT NULL, subject_id text NOT NULL,
        teacher_user_id text NOT NULL, stream_id text REFERENCES streams(id),
        created_by_user_id uuid, assignment_type text DEFAULT 'primary', is_primary boolean DEFAULT TRUE,
        mark_entry_allowed boolean DEFAULT TRUE, lesson_record_allowed boolean DEFAULT TRUE,
        report_comment_allowed boolean DEFAULT TRUE, effective_from date DEFAULT CURRENT_DATE,
        effective_to date, reason text, status text DEFAULT 'active', department_id uuid,
        curriculum_model text, ended_by_user_id uuid, version integer DEFAULT 1,
        created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW(),
        CONSTRAINT uq_teacher_subject_assignments_scope UNIQUE
          (tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id)
      );
      CREATE TABLE academic_audit_logs (
        school_id text, tenant_id text, entity_type text, entity_id text, action text, actor_user_id uuid,
        actor_role text, previous_values jsonb, new_values jsonb, reason text, effective_at timestamptz,
        correlation_id text, metadata jsonb
      );
      CREATE TABLE notifications (
        tenant_id text, notification_key text, recipient_user_id uuid, recipient_role text,
        type text, title text, body text, priority text, source_module text, source_record_id text,
        metadata jsonb, UNIQUE (tenant_id, notification_key)
      );
      CREATE TABLE assignment_test_events (payload jsonb);
      INSERT INTO class_sections (id, tenant_id, academic_year_id) VALUES
        ('class-a', 'school-a', 'year-a'), ('class-b', 'school-b', 'year-b');
      INSERT INTO class_streams (id, tenant_id, class_section_id) VALUES
        ('yellow', 'school-a', 'class-a'), ('blue', 'school-a', 'class-a'), ('foreign', 'school-b', 'class-b');
      INSERT INTO academic_terms VALUES ('term-1', 'school-a', 'year-a'), ('term-2', 'school-a', 'year-a');
      INSERT INTO subjects (id, tenant_id) VALUES ('english', 'school-a'), ('foreign-subject', 'school-b');
    `);
    await expect(pool.query(`INSERT INTO teacher_subject_assignments
      (tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id, stream_id)
      VALUES ('school-a','term-1','class-a','english','teacher-a','yellow')`)).rejects.toMatchObject({ code: '23503' });

    let bootstrap = '';
    await new AcademicsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    const streamStart = bootstrap.indexOf('ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS stream_id');
    const streamEnd = bootstrap.indexOf('ALTER TABLE teacher_subject_assignments ADD COLUMN IF NOT EXISTS department_id', streamStart);
    const indexStart = bootstrap.indexOf('ALTER TABLE teacher_subject_assignments DROP CONSTRAINT IF EXISTS uq_teacher_subject_assignments_scope');
    const indexEnd = bootstrap.indexOf('CREATE INDEX IF NOT EXISTS ix_academic_terms_year', indexStart);
    expect(streamStart).toBeGreaterThan(0);
    expect(indexStart).toBeGreaterThan(0);
    migration = bootstrap.slice(streamStart, streamEnd) + bootstrap.slice(indexStart, indexEnd);
    await pool.query(migration);
    await pool.query(migration);
    const prisma = {
      executeWithTenant: async (_tenant: string, _user: string | null, callback: (tx: any) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback(txFor(client));
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
      },
    };
    repository = new AcademicsRepository(prisma as never);
    exams = new ExamsRepository(prisma as never);
    service = new AcademicsService(
      { getStore: () => ({ tenant_id: 'school-a', user_id: actorId, role: 'deputy_principal' }) } as never,
      repository, {} as never,
      { publish: async (event: unknown, tx: any) => tx.$queryRawUnsafe(
        'INSERT INTO assignment_test_events (payload) VALUES ($1::jsonb) RETURNING payload', JSON.stringify(event)) } as never,
      new WorkflowRepository(prisma as never),
    );
  });
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => {
    await pool.query('TRUNCATE teacher_subject_assignments, academic_audit_logs, notifications, assignment_test_events');
    jest.spyOn(repository, 'findTeacherOptionByUserId').mockImplementation(async (tenantId, userId) =>
      tenantId === 'school-a' && [actorId, 'teacher-a', 'teacher-b'].includes(userId)
        ? { id: 'staff', user_id: userId, label: 'Active teacher' } as any : null);
  });

  const input = () => ({ teacher_user_id: actorId, class_section_id: 'class-a', subject_id: 'english', stream_id: 'yellow' });
  const write = (teacher: string, stream = 'yellow', extras = {}) => repository.createTeacherAssignment({
    tenant_id: 'school-a', teacher_user_id: teacher, class_section_id: 'class-a', subject_id: 'english',
    stream_id: stream, created_by_user_id: actorId, ...extras,
  });

  it('inherits the subject department and class curriculum even when a client supplies overrides', async () => {
    const departmentId = randomUUID();
    await pool.query("UPDATE subjects SET department_id=$1, curriculum_model='8-4-4' WHERE id='english'", [departmentId]);
    try {
      const saved = await service.assignTeacher({ ...input(), department_id: randomUUID(), curriculum_model: '8-4-4' });
      expect(saved.department_id).toBe(departmentId);
      expect(saved.curriculum_model).toBe('CBC');
      const persisted = (await pool.query('SELECT department_id, curriculum_model, effective_from::text, effective_to FROM teacher_subject_assignments WHERE id=$1', [saved.id])).rows[0];
      expect(persisted).toEqual({ department_id: departmentId, curriculum_model: 'CBC', effective_from: expect.any(String), effective_to: null });
      expect((await pool.query('SELECT * FROM assignment_test_events')).rows).toHaveLength(1);
    } finally {
      await pool.query("UPDATE subjects SET department_id=NULL, curriculum_model=NULL WHERE id='english'");
    }
  });

  it('rejects another class stream within the same school', async () => {
    await pool.query("INSERT INTO class_sections(id, tenant_id, academic_year_id) VALUES ('other-class','school-a','year-a')");
    await pool.query("INSERT INTO class_streams(id, tenant_id, class_section_id) VALUES ('other-stream','school-a','other-class')");
    await expect(service.assignTeacher({ ...input(), stream_id: 'other-stream' })).rejects.toThrow(/stream in the assigned class/);
    expect((await pool.query('SELECT * FROM teacher_subject_assignments')).rows).toHaveLength(0);
  });

  it('saves without a term using the canonical stream, audit, event, and notification', async () => {
    const saved = await service.assignTeacher(input());
    expect(saved.academic_term_id).toBeNull();
    expect(saved.stream_id).toBe('yellow');
    expect((await pool.query('SELECT * FROM academic_audit_logs')).rows).toHaveLength(1);
    expect((await pool.query('SELECT * FROM assignment_test_events')).rows).toHaveLength(1);
    expect((await pool.query('SELECT * FROM notifications')).rows).toHaveLength(1);
  });

  it('rejects a stream or subject outside the school without writing', async () => {
    await expect(service.assignTeacher({ ...input(), stream_id: 'foreign' })).rejects.toThrow(/active stream/);
    await expect(service.assignTeacher({ ...input(), subject_id: 'foreign-subject' })).rejects.toThrow(/active class and subject/);
    await expect(write('teacher-a', 'foreign')).rejects.toMatchObject({ code: '23503' });
    expect((await pool.query('SELECT * FROM teacher_subject_assignments')).rows).toHaveLength(0);
  });

  it('keeps retries unique and allows the same teacher in two streams', async () => {
    await Promise.all([write('teacher-a'), write('teacher-a')]);
    await write('teacher-a', 'blue');
    expect((await pool.query("SELECT * FROM teacher_subject_assignments WHERE status='active'")).rows).toHaveLength(2);
  });

  it('keeps teacher assignments aligned when a stream moves during a class merge', async () => {
    const saved = await write('teacher-a');
    await pool.query("UPDATE class_streams SET class_section_id='merged-class' WHERE tenant_id='school-a' AND id='yellow'");
    expect((await pool.query('SELECT class_section_id FROM teacher_subject_assignments WHERE id=$1', [saved.id])).rows[0].class_section_id).toBe('merged-class');
    await pool.query("UPDATE class_streams SET class_section_id='class-a' WHERE tenant_id='school-a' AND id='yellow'");
  });

  it('replaces only the selected stream primary and preserves supporting teachers', async () => {
    await write('teacher-a');
    await write('teacher-a', 'blue');
    await write('support', 'yellow', { assignment_type: 'supporting', is_primary: false });
    await write('teacher-b');
    const active = (await pool.query("SELECT teacher_user_id, stream_id FROM teacher_subject_assignments WHERE status='active'")).rows;
    expect(active).toEqual(expect.arrayContaining([
      { teacher_user_id: 'teacher-a', stream_id: 'blue' },
      { teacher_user_id: 'teacher-b', stream_id: 'yellow' },
      { teacher_user_id: 'support', stream_id: 'yellow' },
    ]));
    expect(active).toHaveLength(3);
    await write('teacher-a');
    expect((await pool.query("SELECT * FROM teacher_subject_assignments WHERE teacher_user_id='teacher-a' AND stream_id='yellow'")).rows).toHaveLength(2);
  });

  it('rolls back the assignment and audit if event persistence fails', async () => {
    await expect(repository.createTeacherAssignment({
      tenant_id: 'school-a', ...input(), created_by_user_id: actorId,
    }, async ({ tx, assignment }) => {
      await repository.appendAuditLog({ tenant_id: 'school-a', entity_type: 'teacher_assignment', entity_id: assignment.id, action: 'assigned' }, tx);
      throw new Error('event unavailable');
    })).rejects.toThrow('event unavailable');
    expect((await pool.query('SELECT * FROM teacher_subject_assignments')).rows).toHaveLength(0);
    expect((await pool.query('SELECT * FROM academic_audit_logs')).rows).toHaveLength(0);
  });

  it('keeps the current teacher until a scheduled replacement begins', async () => {
    const dates = (await pool.query("SELECT (CURRENT_DATE + 10)::text AS future, (CURRENT_DATE + 9)::text AS incumbent_end")).rows[0];
    const incumbent = await write('teacher-a');
    await write('teacher-b', 'yellow', { effective_from: dates.future });
    const scope = { tenant_id: 'school-a', teacher_user_id: 'teacher-a', academic_term_id: 'term-2', class_section_id: 'class-a', subject_id: 'english' };
    expect((await exams.findTeacherAssignment(scope))?.id).toBe(incumbent.id);
    expect(await exams.findTeacherAssignment({ ...scope, teacher_user_id: 'teacher-b' })).toBeNull();
    const current = (await pool.query('SELECT status, effective_to::text FROM teacher_subject_assignments WHERE id=$1', [incumbent.id])).rows[0];
    expect(current).toEqual({ status: 'active', effective_to: dates.incumbent_end });
    await expect(write('teacher-a', 'yellow', { effective_from: dates.future })).rejects.toThrow(/already assigned/);
  });

  it('keeps marks access in the next term while enforcing tenant, class, dates and capability', async () => {
    const saved = await write('teacher-a');
    const scope = { tenant_id: 'school-a', teacher_user_id: 'teacher-a', academic_term_id: 'term-2', class_section_id: 'class-a', subject_id: 'english' };
    expect((await exams.findTeacherAssignment(scope))?.id).toBe(saved.id);
    expect(await exams.findTeacherAssignment({ ...scope, tenant_id: 'school-b' })).toBeNull();
    expect(await exams.findTeacherAssignment({ ...scope, class_section_id: 'class-b' })).toBeNull();
    await pool.query('UPDATE teacher_subject_assignments SET mark_entry_allowed=FALSE');
    expect(await exams.findTeacherAssignment(scope)).toBeNull();
    await pool.query("UPDATE teacher_subject_assignments SET mark_entry_allowed=TRUE, effective_to=CURRENT_DATE-1");
    expect(await exams.findTeacherAssignment(scope)).toBeNull();
    await pool.query("UPDATE teacher_subject_assignments SET effective_to=NULL, status='ended'");
    expect(await exams.findTeacherAssignment(scope)).toBeNull();
  });
});
