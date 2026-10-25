import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { ExamsManagerCommandService } from '../src/modules/admin-command/exams-manager-command.service';
import { ExamsManagerCommandController } from '../src/modules/admin-command/exams-manager-command.controller';
import { PERMISSIONS_KEY } from '../src/auth/auth.constants';

describe('Exams manager teacher mark progress', () => {
  let pool: Pool;
  let service: ExamsManagerCommandService;
  const ids = Object.fromEntries(['exam', 'paper', 'paper2', 'subject', 'class', 'term', 'window', 'teacher', 'teacher2', 's1', 's2', 's3', 'extra'].map(key => [key, randomUUID()]));
  const context = { tenant_id: 'progress-school-a', user_id: ids.teacher, role: 'exams_manager' };

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) throw new Error('Use the disposable PostgreSQL runner.');
    pool = new Pool({ connectionString: url.toString(), max: 1, options: '-c search_path=mark_progress,public' });
    await pool.query('CREATE SCHEMA mark_progress');
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const table of ['exam_series', 'exam_assessments', 'exam_mark_entry_windows', 'exam_marks']) {
      const sql = bootstrap.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\n      \\);`))?.[0];
      if (!sql) throw new Error(`Missing schema for ${table}`);
      await pool.query(sql);
    }
    await pool.query(`
      ALTER TABLE exam_assessments ADD COLUMN IF NOT EXISTS class_section_id uuid;
      CREATE TABLE subjects (id text, tenant_id text, name text);
      CREATE TABLE class_sections (id text, tenant_id text, name text);
      CREATE TABLE class_streams (id text, tenant_id text, class_section_id text, name text);
      CREATE TABLE students (id uuid, tenant_id text, status text DEFAULT 'active');
      CREATE TABLE student_class_assignments (tenant_id text, student_id text, class_section_id text, stream_id text, status text DEFAULT 'active');
      CREATE TABLE student_subject_enrollments (tenant_id text, student_id text, class_section_id text, subject_id text, status text DEFAULT 'active');
      CREATE TABLE teacher_subject_assignments (tenant_id text, teacher_user_id text, class_section_id text, subject_id text,
        stream_id text, academic_term_id text, status text DEFAULT 'active', mark_entry_allowed boolean DEFAULT TRUE,
        effective_from date DEFAULT CURRENT_DATE, effective_to date);
      CREATE TABLE staff_profiles (tenant_id text, user_id text, display_name text, staff_number text);
    `);
    service = new ExamsManagerCommandService({ getStore: () => context } as never, {} as never,
      { readSql: (sql: string, params: unknown[]) => pool.query(sql, params) } as never);
  });

  beforeEach(async () => {
    context.tenant_id = 'progress-school-a';
    await pool.query('BEGIN');
    await pool.query(`INSERT INTO exam_series(id,tenant_id,academic_term_id,name,starts_on,ends_on,status)
      VALUES ($1,$2,$3,'End term',CURRENT_DATE,CURRENT_DATE+7,'submitted')`, [ids.exam, context.tenant_id, ids.term]);
    await pool.query(`INSERT INTO exam_assessments(id,tenant_id,exam_series_id,subject_id,name) VALUES ($1,$2,$3,$4,'Paper 1')`, [ids.paper, context.tenant_id, ids.exam, ids.subject]);
    await pool.query(`INSERT INTO exam_mark_entry_windows(id,tenant_id,exam_series_id,subject_id,class_section_id,opens_at,closes_at)
      VALUES ($1,$2,$3,$4,$5,NOW()-INTERVAL '1 day',NOW()+INTERVAL '7 days')`, [ids.window, context.tenant_id, ids.exam, ids.subject, ids.class]);
    await pool.query(`INSERT INTO subjects VALUES ($1,$2,'Mathematics'),($1,'other-school','Private subject');
    `, [ids.subject, context.tenant_id]);
    await pool.query(`INSERT INTO class_sections VALUES ($1,$2,'Form 1'),($1,'other-school','Private class')`, [ids.class, context.tenant_id]);
    await pool.query(`INSERT INTO class_streams VALUES ('blue',$1,$2,'Blue'),('red',$1,$2,'Red')`, [context.tenant_id, ids.class]);
    await pool.query(`INSERT INTO staff_profiles VALUES ($1,$2,'Amina Otieno','T01'),($1,$3,'Brian Kamau','T02'),('other-school',$2,'Private teacher','SECRET')`, [context.tenant_id, ids.teacher, ids.teacher2]);
    for (const [teacher, stream] of [[ids.teacher, 'blue'], [ids.teacher2, 'red']]) {
      await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,teacher_user_id,class_section_id,subject_id,stream_id)
        VALUES ($1,$2,$3,$4,$5)`, [context.tenant_id, teacher, ids.class, ids.subject, stream]);
    }
    for (const [student, stream] of [[ids.s1, 'blue'], [ids.s2, 'blue'], [ids.s3, 'red']]) await enroll(student, stream);
  });
  afterEach(async () => { await pool.query('ROLLBACK'); });
  afterAll(async () => { if (pool) { await pool.query('DROP SCHEMA IF EXISTS mark_progress CASCADE'); await pool.end(); } });

  async function enroll(student: string, stream: string) {
    await pool.query(`INSERT INTO students(id,tenant_id) VALUES ($1,$2)`, [student, context.tenant_id]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id) VALUES ($1,$2,$3,$4)`, [context.tenant_id, student, ids.class, stream]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ($1,$2,$3,$4)`, [context.tenant_id, student, ids.class, ids.subject]);
  }
  async function mark(student: string, status = 'draft', scoreStatus = 'entered', score: number | null = 60) {
    await pool.query(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,academic_term_id,class_section_id,subject_id,student_id,score,score_status,status,entered_by_user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [context.tenant_id, ids.exam, ids.paper, ids.term, ids.class, ids.subject, student, score, scoreStatus, status, ids.teacher]);
  }
  const entries = async () => (await service.getTeacherMarkProgress()).entries;

  it('names teachers with zero marks, scopes their rosters to streams, and never joins another school', async () => {
    const rows = await entries();
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.teacher_id === ids.teacher)).toMatchObject({ teacher: 'Amina Otieno', stream: 'Blue', total_students: 2, recorded: 0, missing: 2, status: 'Not started' });
    expect(rows.find(row => row.teacher_id === ids.teacher2)).toMatchObject({ teacher: 'Brian Kamau', stream: 'Red', total_students: 1, missing: 1 });
    expect(JSON.stringify(rows)).not.toContain('Private');
    context.tenant_id = 'other-school';
    expect(await entries()).toEqual([]);
  });

  it('supports text student IDs in upgraded schools without losing recorded marks', async () => {
    await pool.query('ALTER TABLE students ALTER COLUMN id TYPE text USING id::text');
    await enroll('legacy-student-number', 'blue');
    await mark(ids.s1, 'submitted', 'entered', 0);
    const row = (await entries()).find(item => item.teacher_id === ids.teacher);
    expect(row).toMatchObject({ total_students: 3, recorded: 1, submitted: 1, missing: 2, status: 'Submitted' });
  });

  it('keeps saved drafts outstanding and checks every paper separately', async () => {
    await mark(ids.s1); await mark(ids.s2);
    await pool.query(`INSERT INTO exam_assessments(id,tenant_id,exam_series_id,subject_id,name) VALUES ($1,$2,$3,$4,'Paper 2')`, [ids.paper2, context.tenant_id, ids.exam, ids.subject]);
    const rows = (await entries()).filter(row => row.teacher_id === ids.teacher);
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.paper === 'Paper 1')).toMatchObject({ status: 'Awaiting submission', missing: 0, submitted: 0, recorded: 2 });
    expect(rows.find(row => row.paper === 'Paper 2')).toMatchObject({ status: 'Not started', missing: 2 });
  });

  it('recognizes zero scores and recorded absence; completed sheets stay completed after the deadline', async () => {
    await mark(ids.s1, 'submitted', 'entered', 0);
    await mark(ids.s2, 'submitted', 'absent', null);
    await pool.query(`UPDATE exam_mark_entry_windows SET opens_at=NOW()-INTERVAL '3 days',closes_at=NOW()-INTERVAL '1 day'`);
    const rows = await entries();
    expect(rows.find(row => row.teacher_id === ids.teacher)).toMatchObject({ entered: 1, recorded: 2, submitted: 2, status: 'Submitted', overdue: false });
    expect(rows.find(row => row.teacher_id === ids.teacher2)).toMatchObject({ status: 'Not started', overdue: true });
  });

  it('ignores marks outside the enrolled roster and counts explicit incomplete reasons as recorded outcomes', async () => {
    await mark(ids.s1); await mark(ids.s2, 'draft', 'incomplete', null); await mark(ids.extra, 'submitted');
    expect((await entries()).find(row => row.teacher_id === ids.teacher)).toMatchObject({ total_students: 2, entered: 1, recorded: 2, missing: 0, status: 'Awaiting submission' });
  });

  it('exposes unassigned students and excludes expired, wrong-term and disabled teaching assignments', async () => {
    await pool.query(`UPDATE teacher_subject_assignments SET mark_entry_allowed=FALSE WHERE teacher_user_id=$1`, [ids.teacher2]);
    await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,teacher_user_id,class_section_id,subject_id,stream_id,effective_to)
      VALUES ($1,$2,$3,$4,'red',CURRENT_DATE-1)`, [context.tenant_id, ids.teacher2, ids.class, ids.subject]);
    await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,teacher_user_id,class_section_id,subject_id,stream_id,academic_term_id)
      VALUES ($1,$2,$3,$4,'red',$5)`, [context.tenant_id, ids.teacher2, ids.class, ids.subject, randomUUID()]);
    expect((await entries()).find(row => row.stream === 'Red')).toMatchObject({ teacher_id: null, teacher: 'Unassigned', total_students: 1, status: 'Unassigned' });
  });

  it('does not inflate counts for duplicate assignments or treat locked unfinished work as completed', async () => {
    await pool.query(`INSERT INTO teacher_subject_assignments SELECT * FROM teacher_subject_assignments`);
    await mark(ids.s1);
    await pool.query(`UPDATE exam_mark_entry_windows SET status='closed'`);
    const rows = await entries();
    expect(rows).toHaveLength(2);
    expect(rows.find(row => row.teacher_id === ids.teacher)).toMatchObject({ total_students: 2, recorded: 1, missing: 1, window_closed: true, status: 'In progress' });
  });

  it('preserves a historical marked learner after a later class transfer rewrites their subject selection', async () => {
    await mark(ids.s1, 'submitted');
    await mark(ids.s2, 'submitted');
    await pool.query(`UPDATE student_subject_enrollments SET class_section_id=$1 WHERE student_id=$2`, [randomUUID(), ids.s2]);
    expect((await entries()).find(row => row.teacher_id === ids.teacher)).toMatchObject({
      total_students: 2, recorded: 2, missing: 0, status: 'Submitted',
    });
  });

  it('separates draft and explicitly scheduled exams from outstanding work', async () => {
    await pool.query(`UPDATE exam_series SET status='draft'`);
    expect((await entries()).every(row => row.status === 'Draft' && !row.overdue)).toBe(true);
    await pool.query(`UPDATE exam_series SET status='submitted'`);
    await pool.query(`UPDATE exam_mark_entry_windows SET opens_at=NOW()+INTERVAL '1 day', last_action='scheduled'`);
    expect((await entries()).every(row => row.status === 'Scheduled')).toBe(true);
  });

  it('retains an eligible learner and their genuine blank after transfer during an ongoing exam', async () => {
    await pool.query(`UPDATE exam_series SET starts_on=CURRENT_DATE-7,ends_on=CURRENT_DATE+7;
      ALTER TABLE student_class_assignments ADD COLUMN updated_at timestamptz DEFAULT NOW();
      ALTER TABLE student_subject_enrollments ADD COLUMN effective_to date;`);
    await pool.query(`UPDATE students SET status='transferred' WHERE id=$1`, [ids.s2]);
    await pool.query(`UPDATE student_class_assignments SET status='transferred' WHERE student_id=$1`, [ids.s2]);
    await pool.query(`UPDATE student_subject_enrollments SET status='transferred',effective_to=CURRENT_DATE WHERE student_id=$1`, [ids.s2]);
    await mark(ids.s1, 'submitted');
    expect((await entries()).find(row => row.teacher_id === ids.teacher)).toMatchObject({
      total_students: 2, recorded: 1, missing: 1, status: 'Submitted',
    });
  });

  it.each([[10, 2], [2, 3]])('keeps %i historical candidates separate from %i later enrolments', async (original, later) => {
    await pool.query(`ALTER TABLE student_subject_enrollments ADD COLUMN effective_from date, ADD COLUMN effective_to date;
      UPDATE exam_series SET starts_on='2026-09-01',ends_on='2026-09-30';
      DELETE FROM student_subject_enrollments; DELETE FROM student_class_assignments; DELETE FROM students;`);
    for (let i=0;i<original+later;i++) {
      const student=randomUUID(); await enroll(student,'blue');
      await pool.query(`UPDATE student_subject_enrollments SET effective_from=$2 WHERE student_id=$1`,[student,i<original?'2026-09-01':'2026-10-04']);
      if(i<original) await mark(student,'submitted');
    }
    expect((await entries()).find(row=>row.teacher_id===ids.teacher)).toMatchObject({total_students:original,recorded:original,missing:0,status:'Submitted'});
  });

  it('keeps submitted status with genuine eligible blanks and records X and Y outcomes', async()=>{
    await mark(ids.s1,'submitted','entered',0);
    expect((await entries()).find(row=>row.teacher_id===ids.teacher)).toMatchObject({total_students:2,recorded:1,missing:1,status:'Submitted',overdue:false});
    await pool.query(`ALTER TABLE exam_marks DROP CONSTRAINT IF EXISTS exam_marks_score_status_check`);
    await mark(ids.s2,'submitted','Y',null);
    expect((await entries()).find(row=>row.teacher_id===ids.teacher)).toMatchObject({recorded:2,missing:0,status:'Submitted'});
    await pool.query(`UPDATE exam_marks SET score_status='X' WHERE student_id=$1`,[ids.s2]);
    expect((await entries()).find(row=>row.teacher_id===ids.teacher)).toMatchObject({recorded:2,missing:0});
  });

  it('requires verified tenant context and the exam-management capability', async () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, ExamsManagerCommandController.prototype.getTeacherMarkProgress)).toEqual(['exams:write']);
    context.tenant_id = '';
    await expect(entries()).rejects.toThrow('Tenant context is required');
  });
});
