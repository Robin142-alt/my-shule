import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ExamsManagerCommandService } from '../src/modules/admin-command/exams-manager-command.service';
import { ClassTeacherService } from '../src/modules/class-teacher/class-teacher.service';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { ExamsService } from '../src/modules/exams/exams.service';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';

describe('Created exams reach assigned subject teachers', () => {
  let pool: Pool;
  let manager: ExamsManagerCommandService;
  let teacher: ClassTeacherService;
  let exams: ExamsService;
  let repository: ExamsRepository;
  const ids = Object.fromEntries(['term', 'class', 'secondClass', 'subject', 'teacher', 'otherTeacher', 'manager', 'student', 'secondStudent'].map(key => [key, randomUUID()]));
  const operations: any[] = [];
  const events: any[] = [];
  const submissions: any[] = [];
  const teacherContext = { tenant_id: 'school-a', user_id: ids.teacher, role: 'teacher' };
  let serial = 0;
  const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1'
      || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) {
      throw new Error('Use the disposable local PostgreSQL integration runner.');
    }
    pool = new Pool({ connectionString: url.toString() });
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const table of ['exam_series', 'exam_assessments', 'exam_mark_entry_windows', 'exam_grade_boundaries', 'exam_marks', 'exam_mark_audit_logs']) {
      const sql = bootstrap.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\n      \\);`))?.[0];
      if (!sql) throw new Error(`Missing production schema for ${table}`);
      await pool.query(sql);
    }
    await pool.query(`
      CREATE TABLE class_sections (id text PRIMARY KEY, tenant_id text, name text, status text DEFAULT 'active');
      CREATE TABLE subjects (id text PRIMARY KEY, tenant_id text, name text);
      CREATE TABLE teacher_subject_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text, academic_term_id text,
        class_section_id text, subject_id text, teacher_user_id text, stream_id text,
        status text DEFAULT 'active', mark_entry_allowed boolean DEFAULT TRUE,
        effective_from date DEFAULT CURRENT_DATE, effective_to date
      );
      CREATE TABLE students (id uuid PRIMARY KEY, tenant_id text, status text DEFAULT 'active',
        admission_number text, first_name text, middle_name text, last_name text, created_at timestamptz DEFAULT NOW());
      CREATE TABLE student_class_assignments (tenant_id text, student_id text, class_section_id text, stream_id text, status text DEFAULT 'active');
      CREATE TABLE student_subject_enrollments (tenant_id text, student_id text, class_section_id text, subject_id text, status text DEFAULT 'active');
    `);
    await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Form 1'),($2,'school-a','Form 2')`, [ids.class, ids.secondClass]);
    await pool.query(`INSERT INTO subjects VALUES ($1,'school-a','Mathematics')`, [ids.subject]);
    for (const [classId, studentId] of [[ids.class, ids.student], [ids.secondClass, ids.secondStudent]]) {
      await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id)
        VALUES ('school-a',$1,$2,$3)`, [classId, ids.subject, ids.teacher]);
      await pool.query(`INSERT INTO students(id,tenant_id,first_name,admission_number) VALUES ($1,'school-a','Learner',$2)`, [studentId, studentId]);
      await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ('school-a',$1,$2)`, [studentId, classId]);
      await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`, [studentId, classId, ids.subject]);
    }
    const query = async (sql: string, params: unknown[] = []) => pool.query(sql, params);
    const prisma = {
      query,
      executeWithTenant: async (_tenant: string, _actor: string | null, callback: (tx: any) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback({ $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await client.query(sql, params)).rows });
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
      },
    };
    const schoolEvents = { recordSchoolOperation: async (input: any) => { events.push(input); } };
    repository = new ExamsRepository(prisma as never);
    exams = new ExamsService({ getStore: () => teacherContext } as never, repository, undefined, undefined, schoolEvents as never);
    teacher = new ClassTeacherService(prisma as never, { publishExamSubmitted: async (event: any) => { submissions.push(event); } } as never, exams);
    manager = new ExamsManagerCommandService(
      { getStore: () => ({ tenant_id: 'school-a', user_id: ids.manager, role: 'exams_manager' }) } as never,
      prisma as never,
      { readSql: query, writeSql: query, requiredText: (value: string) => value,
        recordWorkflowAction: async (input: any) => { operations.push(input); } } as never,
      exams, schoolEvents as never,
    );
  });

  afterAll(async () => { await pool?.end(); });

  async function createExam(status = 'submitted', classes = [ids.class]) {
    return manager.createExamSetup({ name: `Future exam ${++serial}`, academic_term_id: ids.term,
      starts_on: futureDate(7), ends_on: futureDate(14), status,
      subject_ids: [ids.subject], class_section_ids: classes, max_marks: 80 });
  }

  async function windowFor(examId: string, classId = ids.class) {
    return (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.find(window => window.examSeriesId === examId && window.classSectionId === classId)!;
  }

  async function save(window: any, action: 'draft' | 'submit' = 'draft', studentId = ids.student, score = 74) {
    return teacher.saveMarks('school-a', ids.teacher, { examId: window.id, classSectionId: window.classSectionId,
      action, marks: { [studentId]: { score, score_status: 'entered' } } });
  }

  it('opens future-dated exams immediately and persists teacher marks through submission with audit and events', async () => {
    const created = await createExam();
    const window = await windowFor(created.exam.id);
    expect(window).toMatchObject({ canEnter: true, enteredCount: 0, totalStudents: 1 });
    expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toEqual([
      expect.objectContaining({ student_id: ids.student, id: null, score: null }),
    ]);
    const persistedWindow = (await pool.query(`SELECT * FROM exam_mark_entry_windows WHERE id = $1`, [window.id])).rows[0];
    expect(persistedWindow.last_action).toBe('opened');
    expect(persistedWindow.last_action_by_user_id).toBe(ids.manager);
    expect(persistedWindow.opens_at.getTime()).toBeLessThanOrEqual(Date.now());
    await save(window);
    expect((await exams.getMarks({ exam_series_id: created.exam.id })).data[0].score).toBe(74);
    expect(await windowFor(created.exam.id)).toMatchObject({ status: 'Draft', enteredCount: 1, canEnter: true });
    await save(window, 'submit');
    expect(await windowFor(created.exam.id)).toBeUndefined();
    expect((await teacher.getPendingMarks('school-a', ids.teacher)).windows.some(row => row.id === window.id)).toBe(false);
    expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toHaveLength(0);
    await expect(save(window)).rejects.toThrow();
    expect((await pool.query(`SELECT status FROM exam_marks WHERE exam_series_id=$1`, [created.exam.id])).rows[0].status).toBe('submitted');
    expect((await pool.query(`SELECT action FROM exam_mark_audit_logs WHERE exam_series_id=$1`, [created.exam.id])).rows.map(row => row.action)).toEqual(expect.arrayContaining(['grade.created', 'grade.submitted']));
    expect(operations).toEqual(expect.arrayContaining([expect.objectContaining({ eventType: 'exams.exam-setup.created' })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ event: expect.objectContaining({ type: 'exam.marks_submitted' }) })]));
    expect(submissions).toEqual(expect.arrayContaining([expect.objectContaining({ exam_id: created.exam.id, tenant_id: 'school-a' })]));
  });

  it('honors existing Open for marks exams that retained a future opening date', async () => {
    const created = await createExam();
    await pool.query(`UPDATE exam_mark_entry_windows SET opens_at=NOW()+INTERVAL '7 days', last_action=NULL WHERE exam_series_id=$1`, [created.exam.id]);
    const window = await windowFor(created.exam.id);
    expect(window.canEnter).toBe(true);
    expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toHaveLength(1);
    await save(window, 'submit');
    expect((await pool.query(`SELECT status FROM exam_marks WHERE exam_series_id=$1`, [created.exam.id])).rows[0].status).toBe('submitted');
  });

  it('keeps drafts visible, then makes a configured exam editable after Open for marks', async () => {
    const created = await createExam('draft');
    let window = await windowFor(created.exam.id);
    expect(window).toMatchObject({ canEnter: false, entryState: 'Draft' });
    expect((await teacher.getPendingMarks('school-a', ids.teacher)).windows.some(row => row.id === window.id)).toBe(false);
    await expect(save(window)).rejects.toThrow(/closed/);
    await manager.configureExamSetup(created.exam.id, { name: created.exam.name, starts_on: futureDate(7), ends_on: futureDate(14),
      status: 'submitted', subject_ids: [ids.subject], class_section_ids: [ids.class] });
    window = await windowFor(created.exam.id);
    expect(window.canEnter).toBe(true);
    await save(window);
  });

  it('does not open closed, expired, explicitly scheduled or locked exams', async () => {
    for (const [state, update] of [
      ['Closed', `status='closed'`],
      ['Deadline passed', `opens_at=NOW()-INTERVAL '2 days', closes_at=NOW()-INTERVAL '1 day'`],
      ['Scheduled', `opens_at=NOW()+INTERVAL '7 days', last_action='scheduled'`],
    ]) {
      const created = await createExam();
      await pool.query(`UPDATE exam_mark_entry_windows SET ${update} WHERE exam_series_id=$1`, [created.exam.id]);
      const window = await windowFor(created.exam.id);
      expect(window).toMatchObject({ canEnter: false, entryState: state });
      await expect(save(window)).rejects.toThrow(/closed/);
      expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toHaveLength(0);
    }
    const created = await createExam();
    await pool.query(`UPDATE exam_series SET status='reviewed' WHERE id=$1`, [created.exam.id]);
    await pool.query(`UPDATE exam_mark_entry_windows SET opens_at=NOW()+INTERVAL '7 days',last_action=NULL WHERE exam_series_id=$1`, [created.exam.id]);
    expect(await windowFor(created.exam.id)).toMatchObject({ canEnter: false, entryState: 'Scheduled' });
    await pool.query(`UPDATE exam_series SET status='locked',locked_at=NOW() WHERE id=$1`, [created.exam.id]);
    const window = await windowFor(created.exam.id);
    expect(window).toMatchObject({ canEnter: false, entryState: 'Locked' });
    await expect(save(window)).rejects.toThrow();
  });

  it('enforces teacher assignment, school scope, capability and effective dates', async () => {
    expect((await teacher.getPendingMarks('school-b', ids.teacher, true)).windows).toHaveLength(0);
    expect((await teacher.getPendingMarks('school-a', ids.otherTeacher, true)).windows).toHaveLength(0);
    const created = await createExam();
    const window = await windowFor(created.exam.id);
    await expect(teacher.saveMarks('school-b', ids.teacher, { examId: window.id, classSectionId: ids.class, action: 'draft', scores: { [ids.student]: 60 } })).rejects.toThrow();
    for (const patch of ['mark_entry_allowed=FALSE', "effective_to=CURRENT_DATE-1", "effective_from=CURRENT_DATE+1", "status='ended'"]) {
      await pool.query(`UPDATE teacher_subject_assignments SET ${patch} WHERE teacher_user_id=$1`, [ids.teacher]);
      expect((await teacher.getPendingMarks('school-a', ids.teacher, true)).windows).toHaveLength(0);
      await expect(save(window)).rejects.toThrow();
      await pool.query(`UPDATE teacher_subject_assignments SET mark_entry_allowed=TRUE,effective_from=CURRENT_DATE,effective_to=NULL,status='active' WHERE teacher_user_id=$1`, [ids.teacher]);
    }
    await expect(save(window, 'draft', ids.student, 81)).rejects.toThrow();
    expect((await pool.query(`SELECT * FROM exam_marks WHERE exam_series_id=$1`, [created.exam.id])).rows).toHaveLength(0);
  });

  it('allows each selected class to use the shared subject assessment', async () => {
    const created = await createExam('submitted', [ids.class, ids.secondClass]);
    for (const [classId, studentId] of [[ids.class, ids.student], [ids.secondClass, ids.secondStudent]]) {
      await save(await windowFor(created.exam.id, classId), 'submit', studentId);
    }
    expect((await pool.query(`SELECT * FROM exam_marks WHERE exam_series_id=$1`, [created.exam.id])).rows).toHaveLength(2);
  });

  it('removes submitted sheets with missing-score reasons and reopens returned drafts', async () => {
    for (const reason of ['absent', 'exempt', 'not_assessed', 'incomplete', 'withheld', 'medical_exception', 'transfer_student'] as const) {
      const created = await createExam();
      const window = await windowFor(created.exam.id);
      await teacher.saveMarks('school-a', ids.teacher, { examId: window.id, classSectionId: ids.class,
        action: 'submit', marks: { [ids.student]: { score: null, score_status: reason } } });
      expect(await windowFor(created.exam.id)).toBeUndefined();
      expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toHaveLength(0);
      await expect(save(window)).rejects.toThrow();
      const mark = (await pool.query(`SELECT * FROM exam_marks WHERE exam_series_id=$1`, [created.exam.id])).rows[0];
      expect(mark).toMatchObject({ score: null, score_status: reason, status: 'submitted', tenant_id: 'school-a' });
      // Simulate moderation returning the sheet to draft; completion is not sticky.
      await pool.query(`UPDATE exam_marks SET status='draft' WHERE exam_series_id=$1`, [created.exam.id]);
      expect(await windowFor(created.exam.id)).toMatchObject({ canEnter: true });
      expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toHaveLength(1);
      await save(window);
    }
  });

  it('keeps another assigned stream available after one teacher submits', async () => {
    const otherStudent = randomUUID();
    await pool.query(`UPDATE teacher_subject_assignments SET stream_id='blue' WHERE class_section_id=$1 AND teacher_user_id=$2`, [ids.class, ids.teacher]);
    await pool.query(`UPDATE student_class_assignments SET stream_id='blue' WHERE student_id=$1`, [ids.student]);
    await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id,stream_id) VALUES ('school-a',$1,$2,$3,'red')`, [ids.class, ids.subject, ids.otherTeacher]);
    await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Red learner')`, [otherStudent]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id) VALUES ('school-a',$1,$2,'red')`, [otherStudent, ids.class]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`, [otherStudent, ids.class, ids.subject]);
    try {
      const created = await createExam();
      await save(await windowFor(created.exam.id), 'submit');
      expect(await windowFor(created.exam.id)).toBeUndefined();
      const otherWindows = await teacher.getPendingMarks('school-a', ids.otherTeacher, true);
      expect(otherWindows.windows.find(row => row.examSeriesId === created.exam.id)).toMatchObject({ canEnter: true, totalStudents: 1 });
      const otherRoster = await repository.getMarks('school-a', { exam_series_id: created.exam.id, teacher_user_id: ids.otherTeacher });
      expect(otherRoster.map(row => row.student_id)).toEqual([otherStudent]);
      // Exam officers retain the shared data used for moderation.
      expect(await repository.getMarks('school-a', { exam_series_id: created.exam.id })).toHaveLength(2);
    } finally {
      await pool.query(`DELETE FROM teacher_subject_assignments WHERE teacher_user_id=$1`, [ids.otherTeacher]);
      await pool.query(`DELETE FROM student_subject_enrollments WHERE student_id=$1`, [otherStudent]);
      await pool.query(`DELETE FROM student_class_assignments WHERE student_id=$1`, [otherStudent]);
      await pool.query(`DELETE FROM students WHERE id=$1`, [otherStudent]);
      await pool.query(`UPDATE teacher_subject_assignments SET stream_id=NULL WHERE class_section_id=$1`, [ids.class]);
    }
  });

  it('restricts the roster, progress and submission to the teachers assigned stream', async () => {
    const unassignedStudent = randomUUID();
    await pool.query(`UPDATE teacher_subject_assignments SET stream_id='blue' WHERE class_section_id=$1`, [ids.class]);
    await pool.query(`UPDATE student_class_assignments SET stream_id='blue' WHERE student_id=$1`, [ids.student]);
    await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Other stream')`, [unassignedStudent]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id) VALUES ('school-a',$1,$2,'red')`, [unassignedStudent, ids.class]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`, [unassignedStudent, ids.class, ids.subject]);
    const created = await createExam();
    const window = await windowFor(created.exam.id);
    expect(window.totalStudents).toBe(1);
    expect((await exams.getMarks({ exam_series_id: created.exam.id })).data.map(row => row.student_id)).toEqual([ids.student]);
    await expect(save(window, 'draft', unassignedStudent)).rejects.toThrow();
    await save(window, 'submit');
    expect(await windowFor(created.exam.id)).toBeUndefined();
  });
});
