import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { continueSubjectTeachersAfterPromotion } from '../src/modules/students/subject-teacher-continuity';

jest.setTimeout(120_000);

describe('subject teachers continue with promoted learners', () => {
  let pool: Pool;
  let client: PoolClient;
  const teacher = randomUUID();
  const replacement = randomUUID();
  const actor = randomUUID();
  const tx = { $queryRawUnsafe: async (sql: string, ...values: any[]) => (await client.query(sql, values)).rows };
  const input = { tenantId: 'school-a', studentId: 'learner-1', sourceClassId: 'grade-8',
    sourceStreamId: '8-green', targetClassId: 'grade-9', targetStreamId: '9-green', actorUserId: actor };
  const publisher = { publish: async (event: any, transaction: any) => {
    expect(transaction).toBe(tx);
    await client.query('INSERT INTO continuity_test_events (payload) VALUES ($1::jsonb)', [JSON.stringify(event)]);
    return event;
  } };

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !process.env.DATABASE_URL) {
      throw new Error('This integration test requires the disposable local PostgreSQL wrapper');
    }
    const url = new URL(process.env.DATABASE_URL);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) {
      throw new Error('Refusing DDL outside the disposable local database');
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    client = await pool.connect();
    const identity = (await client.query('SELECT current_database() AS name')).rows[0];
    if (identity.name !== url.pathname.slice(1)) throw new Error('Disposable database identity mismatch');
    await client.query(`
      CREATE TABLE class_sections (id text PRIMARY KEY, tenant_id text NOT NULL,
        archived_at timestamptz, is_active boolean DEFAULT TRUE);
      CREATE TABLE class_streams (id text PRIMARY KEY, tenant_id text NOT NULL,
        class_section_id text, name text, archived_at timestamptz, is_active boolean DEFAULT TRUE);
      CREATE TABLE subjects (id text PRIMARY KEY, tenant_id text NOT NULL, status text DEFAULT 'active');
      CREATE TABLE tenant_memberships (tenant_id text NOT NULL, user_id uuid, status text DEFAULT 'active');
      CREATE TABLE class_subject_assignments (tenant_id text NOT NULL, class_section_id text,
        subject_id text, status text DEFAULT 'active');
      CREATE TABLE legacy_schools (id text PRIMARY KEY);
      CREATE TABLE teacher_subject_assignments (id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text NOT NULL, school_id text REFERENCES legacy_schools(id), academic_term_id text, class_section_id text,
        subject_id text, teacher_user_id text, created_by_user_id uuid, assignment_type text DEFAULT 'primary',
        is_primary boolean DEFAULT TRUE, mark_entry_allowed boolean DEFAULT TRUE,
        lesson_record_allowed boolean DEFAULT TRUE, report_comment_allowed boolean DEFAULT TRUE,
        effective_from date DEFAULT CURRENT_DATE, effective_to date, reason text, status text DEFAULT 'active',
        stream_id text, department_id uuid, curriculum_model text,
        continued_from_assignment_id text, ended_by_user_id uuid, version integer DEFAULT 1,
        updated_at timestamptz DEFAULT NOW());
      CREATE TABLE student_class_assignments (tenant_id text NOT NULL, student_id text,
        class_section_id text, stream_id text, status text DEFAULT 'active');
      CREATE TABLE student_academic_enrollments (tenant_id text NOT NULL, student_id text,
        class_section_id text, stream_name text, status text DEFAULT 'active');
      CREATE TABLE academic_audit_logs (id uuid DEFAULT gen_random_uuid(), school_id text, tenant_id text,
        entity_type text, entity_id text, action text, actor_user_id uuid, actor_role text,
        previous_values jsonb, new_values jsonb, reason text, metadata jsonb);
      CREATE TABLE continuity_test_events (payload jsonb);
      CREATE TABLE notifications (id uuid DEFAULT gen_random_uuid(), tenant_id text, notification_key text,
        recipient_user_id uuid, type text, title text, body text, priority text, source_module text,
        source_record_id text, metadata jsonb, UNIQUE(tenant_id, notification_key));
    `);
  });
  afterAll(async () => { client?.release(); await pool?.end(); });
  beforeEach(async () => {
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO class_sections (id, tenant_id) VALUES ('grade-8','school-a'), ('grade-9','school-a'),
        ('foreign-class','school-b');
      INSERT INTO class_streams (id, tenant_id, class_section_id, name) VALUES
        ('8-green','school-a','grade-8','Green'), ('9-green','school-a','grade-9','Green'),
        ('8-blue','school-a','grade-8','Blue'), ('9-blue','school-a','grade-9','Blue');
      INSERT INTO subjects (id, tenant_id) VALUES ('english','school-a');
      INSERT INTO class_subject_assignments (tenant_id, class_section_id, subject_id)
        VALUES ('school-a','grade-9','english');
    `);
    await client.query('INSERT INTO tenant_memberships (tenant_id, user_id) VALUES ($1,$2::uuid),($1,$3::uuid)',
      ['school-a', teacher, replacement]);
    await client.query(`INSERT INTO teacher_subject_assignments
      (id,tenant_id,class_section_id,subject_id,teacher_user_id,stream_id,mark_entry_allowed)
      VALUES ('source','school-a','grade-8','english',$1,'8-green',FALSE)`, [teacher]);
  });
  afterEach(async () => { await client.query('ROLLBACK'); });

  it('copies ongoing permissions, emits and audits once, and retains the teacher for repeaters', async () => {
    await client.query(`INSERT INTO student_class_assignments (tenant_id,student_id,class_section_id,stream_id)
      VALUES ('school-a','repeater','grade-8','8-green')`);
    const result = await continueSubjectTeachersAfterPromotion(tx, input, publisher as never);
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0]).toMatchObject({ teacher_user_id: teacher, academic_term_id: null,
      class_section_id: 'grade-9', stream_id: '9-green', mark_entry_allowed: false,
      continued_from_assignment_id: 'source' });
    expect(result.endedAssignments).toHaveLength(0);
    const replay = await continueSubjectTeachersAfterPromotion(tx, { ...input, studentId: 'learner-2' }, publisher as never);
    expect(replay.assignments).toHaveLength(0);
    expect((await client.query('SELECT * FROM academic_audit_logs')).rows).toHaveLength(1);
    expect((await client.query('SELECT * FROM continuity_test_events')).rows).toHaveLength(1);
    expect((await client.query('SELECT recipient_user_id, tenant_id FROM notifications')).rows)
      .toEqual([{ recipient_user_id: teacher, tenant_id: 'school-a' }]);
  });

  it('continues the subject teacher before next year subject offerings are configured', async () => {
    await client.query('DELETE FROM class_subject_assignments');
    expect((await continueSubjectTeachersAfterPromotion(tx, input, publisher as never)).assignments).toHaveLength(1);
  });

  it('ends the source only when both canonical rosters have no remaining students', async () => {
    await client.query(`INSERT INTO student_academic_enrollments (tenant_id,student_id,class_section_id,stream_name)
      VALUES ('school-a','repeater','grade-8','Green')`);
    expect((await continueSubjectTeachersAfterPromotion(tx, input, publisher as never)).endedAssignments).toHaveLength(0);
    await client.query("UPDATE student_academic_enrollments SET status='completed' WHERE tenant_id='school-a'");
    const completed = await continueSubjectTeachersAfterPromotion(tx, input, publisher as never);
    expect(completed.endedAssignments[0]).toMatchObject({ id: 'source', status: 'ended', version: 2 });
    expect((await client.query('SELECT * FROM academic_audit_logs')).rows).toHaveLength(2);
  });

  it('keeps explicit replacements and teachers in another stream untouched', async () => {
    await client.query(`INSERT INTO teacher_subject_assignments
      (id,tenant_id,class_section_id,subject_id,teacher_user_id,stream_id)
      VALUES ('explicit','school-a','grade-9','english',$1,'9-green'),
        ('other-stream','school-a','grade-8','english',$1,'8-blue')`, [replacement]);
    const result = await continueSubjectTeachersAfterPromotion(tx, input, publisher as never);
    expect(result.assignments).toHaveLength(0);
    expect((await client.query("SELECT status FROM teacher_subject_assignments WHERE id='other-stream'")).rows[0].status).toBe('active');
    expect((await client.query("SELECT teacher_user_id FROM teacher_subject_assignments WHERE id='explicit'")).rows[0].teacher_user_id).toBe(replacement);
  });

  it('blocks merging conflicting inherited primary teachers with a recoverable error', async () => {
    await client.query(`INSERT INTO teacher_subject_assignments
      (tenant_id,class_section_id,subject_id,teacher_user_id,stream_id,continued_from_assignment_id)
      VALUES ('school-a','grade-9','english',$1,'9-green','another-source')`, [replacement]);
    await expect(continueSubjectTeachersAfterPromotion(tx, input, publisher as never))
      .rejects.toThrow('Assign the intended subject teacher to the destination class/stream');
    expect((await client.query('SELECT * FROM academic_audit_logs')).rows).toHaveLength(0);
  });

  it.each(['academic_term_id = \'old-term\'', "status = 'ended'", "assignment_type = 'temporary'",
    "effective_to = CURRENT_DATE - 1", 'effective_from = CURRENT_DATE + 1'])
  ('does not carry historical, ended, temporary or scheduled allocations: %s', async (change) => {
    await client.query(`UPDATE teacher_subject_assignments SET ${change} WHERE id='source'`);
    expect((await continueSubjectTeachersAfterPromotion(tx, input, publisher as never)).assignments).toHaveLength(0);
  });

  it('never carries teachers across tenant or class-stream boundaries', async () => {
    expect((await continueSubjectTeachersAfterPromotion(tx, { ...input, targetClassId: 'foreign-class' }, publisher as never)).assignments).toHaveLength(0);
    expect((await continueSubjectTeachersAfterPromotion(tx, { ...input, sourceStreamId: '9-green' }, publisher as never)).assignments).toHaveLength(0);
    expect((await continueSubjectTeachersAfterPromotion(tx, { ...input, tenantId: 'school-b' }, publisher as never)).assignments).toHaveLength(0);
    expect((await client.query('SELECT * FROM academic_audit_logs')).rows).toHaveLength(0);
  });
});
