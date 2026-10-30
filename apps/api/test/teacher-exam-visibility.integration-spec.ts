import { FLEXIBLE_EXAM_PAPERS_SCHEMA } from '../src/modules/exams/flexible-exam-papers-schema';
import { EXAM_RESULT_REFRESH_SCHEMA, examResultCtes } from '../src/modules/exams/exam-result-query';
import { REPORT_SOURCE_TRIGGERS } from '../src/modules/exams/services/report-infrastructure-schema';
import { ExamPaperConfigurationService } from '../src/modules/exams/exam-paper-configuration.service';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { RbacGuard } from '../src/guards/rbac.guard';
import { ExamsManagerMarksController } from '../src/modules/class-teacher/exams-manager-marks.controller';
import { ExamsManagerCommandService } from '../src/modules/admin-command/exams-manager-command.service';
import { ClassTeacherService } from '../src/modules/class-teacher/class-teacher.service';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { ExamsService } from '../src/modules/exams/exams.service';
import { ExamsController } from '../src/modules/exams/exams.controller';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { SchoolOperationalEventsService } from '../src/modules/events/school-operational-events.service';

describe('Created exams reach assigned subject teachers', () => {
  let pool: Pool;
  let manager: ExamsManagerCommandService;
  let teacher: ClassTeacherService;
  let exams: ExamsService;
  let paperConfiguration: ExamPaperConfigurationService;
  let repository: ExamsRepository;
  const ids = Object.fromEntries(['term', 'class', 'secondClass', 'subject', 'teacher', 'otherTeacher', 'manager', 'student', 'secondStudent'].map(key => [key, randomUUID()]));
  const operations: any[] = [];
  const events: any[] = [];
  const publishedOperations: any[] = [];
  let rejectSchoolEvent = false;
  const submissions: any[] = [];
  const teacherContext = { tenant_id: 'school-a', user_id: ids.teacher, role: 'teacher', is_authenticated: true, permissions: ['exams:enter-marks'] };
  const managerContext = { tenant_id: 'school-a', user_id: ids.manager, role: 'exams_manager', permissions: ['exams:write', 'exams:enter-marks'], is_authenticated: true };
  let activeContext = teacherContext;
  let serial = 0;
  const futureDate = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1'
      || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) {
      throw new Error('Use the disposable local PostgreSQL integration runner.');
    }
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=teacher_visibility,public' });
    await pool.query('CREATE SCHEMA teacher_visibility');
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const table of ['exam_series', 'exam_assessments', 'exam_mark_entry_windows', 'exam_grade_boundaries', 'exam_marks', 'exam_mark_audit_logs', 'exam_timetable_slots', 'exam_assessment_components', 'student_report_cards', 'student_report_card_audit_logs', 'exam_result_snapshots', 'report_card_generation_batches', 'exam_mark_import_batches', 'exam_mark_import_batch_items', 'exam_grading_policies', 'exam_grading_policy_boundaries', 'exam_subject_weightings']) {
      const sql = bootstrap.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\n      \\);`))?.[0];
      if (!sql) throw new Error(`Missing production schema for ${table}`);
      await pool.query(sql);
    }
    await pool.query(`
      ALTER TABLE exam_series ADD COLUMN exam_type text DEFAULT 'Exam cycle';
      ALTER TABLE exam_series ADD COLUMN configuration_version integer NOT NULL DEFAULT 1;
      ALTER TABLE exam_series ADD COLUMN class_subjects jsonb;
      ALTER TABLE exam_mark_entry_windows ADD COLUMN stream_scope jsonb NOT NULL DEFAULT '{}';
      CREATE TABLE academic_terms (id uuid PRIMARY KEY, tenant_id text);
      CREATE TABLE workflow_events (id uuid DEFAULT gen_random_uuid(), tenant_id text, source_user_id uuid, source_role text, target_roles jsonb, event_type text, entity_type text, entity_id text, title text, message text, priority text, payload jsonb);
      CREATE TABLE audit_logs (tenant_id text, actor_user_id uuid, request_id text, action text, resource_type text, resource_id uuid, metadata jsonb);
      CREATE TABLE class_sections (id text PRIMARY KEY, tenant_id text, name text, status text DEFAULT 'active', curriculum_model text DEFAULT 'CBC');
      CREATE TABLE academics_grading_systems (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text,
        curriculum_model text, rules jsonb, is_active boolean DEFAULT TRUE, archived_at timestamptz,
        effective_from date, effective_to date, updated_at timestamptz DEFAULT NOW(), version integer DEFAULT 1);
      CREATE TABLE academics_report_card_settings (tenant_id text,grading_system_id uuid,is_active boolean,
        updated_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW());
      INSERT INTO academics_grading_systems(tenant_id,curriculum_model,rules) VALUES
        ('school-a','CBC','[{"label":"EE","min":0,"max":100,"points":4}]');
      CREATE TABLE subjects (id text PRIMARY KEY, tenant_id text, name text);
      CREATE TABLE class_streams (id text, tenant_id text, class_section_id text, name text);
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
      CREATE TABLE class_subject_assignments (tenant_id text, class_section_id text, subject_id text,
        academic_term_id text, status text DEFAULT 'active', is_examinable boolean DEFAULT TRUE,
        effective_from date, effective_to date, stream_id text);
    `);
    await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Form 1'),($2,'school-a','Form 2')`, [ids.class, ids.secondClass]);
    await pool.query(`INSERT INTO subjects VALUES ($1,'school-a','Mathematics')`, [ids.subject]);
    await pool.query(`INSERT INTO academic_terms VALUES ($1,'school-a')`, [ids.term]);
    for (const [classId, studentId] of [[ids.class, ids.student], [ids.secondClass, ids.secondStudent]]) {
      await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id)
        VALUES ('school-a',$1,$2,$3)`, [classId, ids.subject, ids.teacher]);
      await pool.query(`INSERT INTO students(id,tenant_id,first_name,admission_number) VALUES ($1,'school-a','Learner',$2)`, [studentId, studentId]);
      await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ('school-a',$1,$2)`, [studentId, classId]);
      await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`, [studentId, classId, ids.subject]);
    }
    await pool.query(`CREATE TABLE staff_profiles (tenant_id text, user_id uuid, display_name text, staff_number text)`);
    await pool.query(`INSERT INTO staff_profiles VALUES ('school-a',$1,'Subject Teacher','T001'),('school-a',$2,'Exams Manager','E001')`, [ids.teacher, ids.manager]);
    const query = async (sql: string, params: unknown[] = []) => pool.query(sql, params);
    const prisma = {
      query,
      executeWithTenant: async (_tenant: string, _actor: string | null, callback: (tx: any) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const result = await callback({
            $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await client.query(sql, params)).rows,
            $executeRawUnsafe: async (sql: string, ...params: unknown[]) => (await client.query(sql, params)).rowCount,
          });
          await client.query('COMMIT');
          return result;
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        } finally { client.release(); }
      },
    };
    paperConfiguration = new ExamPaperConfigurationService(prisma as never, {getStore:()=>activeContext} as never, {recordSchoolOperation:async(input:any)=>{if(rejectSchoolEvent)throw new Error('Outbox unavailable');events.push(input);}} as never);
    const realSchoolEvents = new SchoolOperationalEventsService(
      { requireStore: () => managerContext } as never,
      { publish: async (input: any) => { publishedOperations.push(input); return { id: randomUUID(), event_key: input.event_key }; } } as never,
      { upsertFromSchoolOperation: async () => undefined } as never,
    );
    const schoolEvents = { recordSchoolOperation: async (input: any, tx: any) => {
      if (rejectSchoolEvent) throw new Error('Outbox unavailable');
      if (input.event?.type === 'exam.mark_entry_opened') await realSchoolEvents.recordSchoolOperation(input, tx);
      events.push(input);
    } };
    repository = new ExamsRepository(prisma as never);
    exams = new ExamsService({ getStore: () => activeContext } as never, repository, undefined, undefined, schoolEvents as never);
    teacher = new ClassTeacherService(prisma as never, { publishExamSubmitted: async (event: any) => { submissions.push(event); } } as never, exams, { getStore: () => activeContext } as never);
    manager = new ExamsManagerCommandService(
      { getStore: () => managerContext } as never,
      prisma as never,
      { readSql: query, writeSql: query, requiredText: (value: string) => value,
        recordWorkflowAction: async (input: any) => { operations.push(input); } } as never,
      exams, schoolEvents as never,
    );
  });

  afterAll(async () => {
    if (pool) {
      await pool.query('DROP SCHEMA IF EXISTS teacher_visibility CASCADE');
      await pool.end();
    }
  });

  async function createExam(status = 'submitted', classes = [ids.class]) {
    await offer(classes, [ids.subject]);
    return manager.createExamSetup({ name: `Future exam ${++serial}`, academic_term_id: ids.term,
      starts_on: futureDate(7), ends_on: futureDate(14), status,
      class_subjects: classes.map(class_section_id => ({ class_section_id, subject_ids: [ids.subject] })), max_marks: 80 });
  }

  async function offer(classes: string[], subjects: string[]) {
    for (const classId of classes) for (const subjectId of subjects) {
      await pool.query(`INSERT INTO class_subject_assignments(tenant_id,class_section_id,subject_id)
        SELECT 'school-a',$1,$2 WHERE NOT EXISTS (SELECT 1 FROM class_subject_assignments
          WHERE tenant_id='school-a' AND class_section_id=$1 AND subject_id=$2)`, [classId,subjectId]);
    }
  }

  async function windowFor(examId: string, classId = ids.class) {
    return (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.find(window => window.examSeriesId === examId && window.classSectionId === classId)!;
  }

  it('lets an authorized manager enter an examined subject with no assigned teacher and records the actual editor', async () => {
    const classId = randomUUID(), learner = randomUUID();
    await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Unassigned Grade 10')`, [classId]);
    await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Eligible learner')`, [learner]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ('school-a',$1,$2)`, [learner,classId]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`, [learner,classId,ids.subject]);
    const created = await createExam('submitted', [classId]);
    activeContext = managerContext;
    try {
      const assignments = await teacher.getAssistedMarkAssignments();
      expect(assignments.assignments).toEqual(expect.arrayContaining([expect.objectContaining({ exam_id: created.exam.id, teacher_user_id: null })]));
      const sheet = (await teacher.getAssistedMarkbooks()).windows.find(w => w.examSeriesId === created.exam.id)!;
      expect(sheet).toMatchObject({ totalStudents: 1, canEnter: true });
      await teacher.saveAssistedMarks(undefined, { examId: sheet.id, classSectionId: classId, assessmentId: sheet.assessmentId,
        action: 'submit', marks: { [learner]: { score: 64, score_status: 'entered' } } });
      expect((await pool.query('SELECT status,entered_by_user_id,assigned_teacher_user_id FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows)
        .toEqual([{ status: 'submitted', entered_by_user_id: ids.manager, assigned_teacher_user_id: null }]);
      expect((await teacher.getAssistedMarkbooks()).windows.find(w => w.examSeriesId === created.exam.id)?.status).toBe('Submitted');
    } finally { activeContext = teacherContext; }
    expect(() => teacher.getAssistedMarkbooks(undefined)).toThrow(/permission|role|manager/i);
  });

  async function save(window: any, action: 'draft' | 'submit' = 'draft', studentId = ids.student, score = 74) {
    return teacher.saveMarks('school-a', ids.teacher, { examId: window.id, classSectionId: window.classSectionId,
      assessmentId: window.assessmentId, action, marks: { [studentId]: { score, score_status: 'entered' } } });
  }

  async function protectedExam(status: 'locked' | 'published', otherStreamOwner = ids.teacher) {
    const fixture = { class: randomUUID(), secondClass: randomUUID(), subject: randomUUID(), student: randomUUID(),
      sharedStudent: randomUUID(), otherStreamStudent: randomUUID(), secondStudent: randomUUID() };
    await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Correction class'),($2,'school-a','Protected class')`, [fixture.class, fixture.secondClass]);
    await pool.query(`INSERT INTO subjects VALUES ($1,'school-a','Correction subject')`, [fixture.subject]);
    for (const [classId, teacherId, stream] of [
      [fixture.class, ids.teacher, 'blue'],
      [fixture.class, ids.otherTeacher, 'red'],
      [fixture.secondClass, ids.otherTeacher, null],
    ]) {
      await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id,stream_id)
        VALUES ('school-a',$1,$2,$3,$4)`, [classId, fixture.subject, teacherId, stream]);
    }
    const students = [
      { id: fixture.student, classId: fixture.class, stream: 'blue', enteredBy: ids.teacher },
      { id: fixture.sharedStudent, classId: fixture.class, stream: 'blue', enteredBy: ids.otherTeacher },
      { id: fixture.otherStreamStudent, classId: fixture.class, stream: 'red', enteredBy: otherStreamOwner },
      { id: fixture.secondStudent, classId: fixture.secondClass, stream: null, enteredBy: ids.otherTeacher },
    ];
    for (const student of students) {
      await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Correction learner')`, [student.id]);
      await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id)
        VALUES ('school-a',$1,$2,$3)`, [student.id, student.classId, student.stream]);
      await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id)
        VALUES ('school-a',$1,$2,$3)`, [student.id, student.classId, fixture.subject]);
    }
    await offer([fixture.class, fixture.secondClass], [fixture.subject]);
    const created = await manager.createExamSetup({ name: `Protected correction ${++serial}`, academic_term_id: ids.term,
      starts_on: futureDate(7), ends_on: futureDate(14), status: 'submitted', subject_ids: [fixture.subject],
      class_subjects: [fixture.class, fixture.secondClass].map(class_section_id => ({ class_section_id, subject_ids: [fixture.subject] })), max_marks: 80 });
    const examId = created.exam.id;
    const assessments = (await pool.query('SELECT id,class_section_id FROM exam_assessments WHERE exam_series_id=$1', [examId])).rows;
    const assessmentId = assessments.find(row => row.class_section_id === fixture.class).id;
    const windows = (await pool.query('SELECT id, class_section_id FROM exam_mark_entry_windows WHERE exam_series_id=$1', [examId])).rows;
    for (const student of students) {
      await pool.query(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,academic_term_id,class_section_id,subject_id,
        student_id,score,status,entered_by_user_id,submitted_at,reviewed_at,locked_at,published_at)
        VALUES ('school-a',$1,$2,$3,$4,$5,$6,50,$7,$8,NOW(),NOW(),NOW(),CASE WHEN $7='published' THEN NOW() END)`,
      [examId, assessments.find(row => row.class_section_id === student.classId).id, ids.term, student.classId, fixture.subject, student.id, status, student.enteredBy]);
      await pool.query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id,status,
        revision_number,published_at,published_by_user_id)
        VALUES ('school-a',$1,$2::uuid,$2::text,$3,2,CASE WHEN $3='published' THEN NOW() END,$4)`,
      [examId, student.id, status === 'published' ? 'published' : 'approved', ids.manager]);
    }
    // Historical snapshots and a foreign school's same-ID references must remain untouched.
    await pool.query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id,status,is_current)
      VALUES ('school-a',$1,$2,'historical','published',FALSE),('school-b',$1,$2,'foreign','published',TRUE)`, [examId, fixture.student]);
    await pool.query(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,academic_term_id,class_section_id,subject_id,
      student_id,score,status,entered_by_user_id) VALUES ('school-b',$1,$2,$3,$4,$5,$6,42,'published',$7)`,
    [examId, assessmentId, ids.term, fixture.class, fixture.subject, fixture.student, ids.teacher]);
    await pool.query(`UPDATE exam_series SET status=$2,locked_at=NOW(),published_at=CASE WHEN $2='published' THEN NOW() END WHERE id=$1`, [examId, status]);
    // Stale open windows and teacher extensions must not activate when the series lock is lifted.
    await pool.query(`UPDATE exam_mark_entry_windows SET status='open',opens_at=NOW()-INTERVAL '1 day',
      closes_at=NOW()+INTERVAL '7 days',teacher_entry_deadlines=jsonb_build_object($2::text,$3::text) WHERE exam_series_id=$1`,
    [examId, ids.otherTeacher, new Date(Date.now() + 7 * 86400000).toISOString()]);
    return { ...fixture, examId, assessmentId, assessments, students, windows };
  }

  async function saveCorrection(fixture: Awaited<ReturnType<typeof protectedExam>>, studentId: string, userId = ids.teacher) {
    const student = fixture.students.find(row => row.id === studentId)!;
    const window = fixture.windows.find(row => row.class_section_id === student.classId)!;
    const previousUser = teacherContext.user_id;
    teacherContext.user_id = userId;
    try {
      return await teacher.saveMarks('school-a', userId, { examId: window.id, classSectionId: student.classId,
        assessmentId: fixture.assessments.find(row => row.class_section_id === student.classId).id, action: 'draft', marks: { [studentId]: { score: 65, score_status: 'entered' } } });
    } finally { teacherContext.user_id = previousUser; }
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
    expect(await windowFor(created.exam.id)).toMatchObject({ status: 'Awaiting submission', enteredCount: 1, canEnter: true });
    await save(window, 'submit');
    expect(await windowFor(created.exam.id)).toBeUndefined();
    expect((await teacher.getPendingMarks('school-a', ids.teacher)).windows.some(row => row.id === window.id)).toBe(false);
    expect((await exams.getMarks({ exam_series_id: created.exam.id })).data).toHaveLength(0);
    await expect(save(window)).rejects.toThrow();
    expect((await pool.query(`SELECT status FROM exam_marks WHERE exam_series_id=$1`, [created.exam.id])).rows[0].status).toBe('submitted');
    expect((await pool.query(`SELECT action FROM exam_mark_audit_logs WHERE exam_series_id=$1`, [created.exam.id])).rows.map(row => row.action)).toEqual(expect.arrayContaining(['grade.created', 'grade.submitted']));
    expect((await pool.query('SELECT event_type FROM workflow_events WHERE entity_id=$1', [created.exam.id])).rows).toEqual(expect.arrayContaining([expect.objectContaining({ event_type: 'exams.exam-setup.created' })]));
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ event: expect.objectContaining({ type: 'exam.marks_submitted' }) })]));
    expect(submissions).toEqual(expect.arrayContaining([expect.objectContaining({ exam_id: created.exam.id, tenant_id: 'school-a' })]));
  });

  it('saves, edits and submits each paper independently, with submitted history remaining read-only', async () => {
    const created = await createExam();
    const first = await windowFor(created.exam.id);
    const secondPaper = randomUUID();
    await pool.query(`INSERT INTO exam_assessments(id,tenant_id,exam_series_id,subject_id,name,max_score,weight,class_section_id)
      VALUES ($1,'school-a',$2,$3,'Paper 2',60,100,$4)`, [secondPaper, created.exam.id, ids.subject, ids.class]);
    const sheets = (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.filter(sheet => sheet.examSeriesId === created.exam.id);
    expect(sheets).toHaveLength(2);
    expect(new Set(sheets.map(sheet => sheet.sheetId)).size).toBe(2);
    await expect(teacher.saveMarks('school-a', ids.teacher, { examId: first.id, classSectionId: ids.class,
      marks: { [ids.student]: { score: 40, score_status: 'entered' } } })).rejects.toThrow(/assessment paper/);
    await save(first, 'draft', ids.student, 40);
    await save(first, 'draft', ids.student, 55);
    expect((await exams.getMarks({ exam_series_id: created.exam.id, assessment_id: first.assessmentId })).data[0].score).toBe(55);
    await save(first, 'submit', ids.student, 55);
    const remaining = (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.filter(sheet => sheet.examSeriesId === created.exam.id);
    expect(remaining.map(sheet => sheet.assessmentId)).toEqual([secondPaper]);
    expect(remaining[0]).toMatchObject({ savedCount: 0, status: 'Not started', outOf: 60 });
    const history = (await teacher.getPendingMarks('school-a', ids.teacher, true, true)).windows.filter(sheet => sheet.examSeriesId === created.exam.id);
    expect(history.find(sheet => sheet.assessmentId === first.assessmentId)).toMatchObject({ status: 'Submitted', canEnter: false, savedCount: 1 });
    await expect(save(first)).rejects.toThrow();
    await pool.query(`UPDATE exam_mark_entry_windows SET status='closed' WHERE id=$1`, [first.id]);
    expect((await exams.getMarks({ exam_series_id: created.exam.id, view: 'submitted' })).data).toEqual([
      expect.objectContaining({ assessment_id: first.assessmentId, score: 55, status: 'submitted' }),
    ]);
    expect(await repository.getMarks('school-b', { exam_series_id: created.exam.id, view: 'submitted', teacher_user_id: ids.teacher })).toEqual([]);
    expect(await repository.getMarks('school-a', { exam_series_id: created.exam.id, view: 'submitted', teacher_user_id: ids.otherTeacher })).toEqual([]);
    await pool.query(`UPDATE exam_mark_entry_windows SET status='open' WHERE id=$1`, [first.id]);
    await save(remaining[0], 'submit', ids.student, 42);
    expect((await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.filter(sheet => sheet.examSeriesId === created.exam.id)).toHaveLength(0);
  });

  it('keeps a second subject available when the same teacher submits the first subject', async () => {
    const subject = randomUUID();
    await pool.query(`INSERT INTO subjects VALUES ($1,'school-a','Biology')`, [subject]);
    await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id)
      VALUES ('school-a',$1,$2,$3)`, [ids.class, subject, ids.teacher]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id)
      VALUES ('school-a',$1,$2,$3)`, [ids.student, ids.class, subject]);
    await offer([ids.class], [ids.subject, subject]);
    const created = await manager.createExamSetup({ name: 'Two subjects', academic_term_id: ids.term,
      starts_on: futureDate(7), ends_on: futureDate(14), status: 'submitted',
      class_subjects: [{ class_section_id: ids.class, subject_ids: [ids.subject, subject] }], max_marks: 80 });
    const sheets = (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.filter(sheet => sheet.examSeriesId === created.exam.id);
    expect(sheets).toHaveLength(2);
    await save(sheets.find(sheet => sheet.subjectId === ids.subject), 'submit');
    const remaining = (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.filter(sheet => sheet.examSeriesId === created.exam.id);
    expect(remaining).toEqual([expect.objectContaining({ subjectId: subject, savedCount: 0, status: 'Not started' })]);
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
      status: 'submitted', configuration_version: 1, class_subjects: [{ class_section_id: ids.class, subject_ids: [ids.subject] }] });
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

  it('opens one teacher after the class deadline while other assigned teachers remain closed', async () => {
    const created = await createExam();
    const window = await windowFor(created.exam.id);
    await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id)
      VALUES ('school-a',$1,$2,$3)`, [ids.class,ids.subject,ids.otherTeacher]);
    try {
      await manager.lockMarksEntry(window.id);
      await pool.query(`UPDATE exam_mark_entry_windows SET opens_at=NOW()-INTERVAL '3 days', closes_at=NOW()-INTERVAL '1 day' WHERE id=$1`,[window.id]);
      const deadline = new Date(Date.now()+86400000).toISOString();
      const opened = await manager.openMarksEntry({exam_series_id:created.exam.id,scope:'teacher',teacher_user_id:ids.teacher,closes_at:deadline});
      expect(opened.window_count).toBe(1);
      expect(await windowFor(created.exam.id)).toMatchObject({canEnter:true});
      expect((await teacher.getPendingMarks('school-a',ids.otherTeacher,true)).windows.find(row=>row.examSeriesId===created.exam.id)).toMatchObject({canEnter:false});
      expect(await repository.getMarks('school-a',{exam_series_id:created.exam.id,teacher_user_id:ids.otherTeacher})).toHaveLength(0);
      await expect(teacher.saveMarks('school-a',ids.otherTeacher,{examId:window.id,classSectionId:ids.class,assessmentId:window.assessmentId,action:'draft',marks:{[ids.student]:{score:50,score_status:'entered'}}})).rejects.toThrow();
      await save(window,'draft');
      expect((await pool.query('SELECT status FROM exam_mark_entry_windows WHERE id=$1',[window.id])).rows[0].status).toBe('closed');
      expect((await pool.query(`SELECT action FROM exam_mark_audit_logs WHERE exam_series_id=$1 AND action='mark_entry.opened'`,[created.exam.id])).rowCount).toBe(1);
      expect(events).toEqual(expect.arrayContaining([expect.objectContaining({event:expect.objectContaining({type:'exam.mark_entry_opened'}),notifications:expect.arrayContaining([expect.objectContaining({targetUserId:ids.teacher})])})]));
      expect(publishedOperations.at(-1).payload).toMatchObject({ target_user_ids: [ids.teacher], target_roles: [] });
      await manager.lockMarksEntry(window.id);
      expect(await windowFor(created.exam.id)).toMatchObject({canEnter:false});
      expect((await pool.query('SELECT status FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows[0].status).toBe('draft');
    } finally {await pool.query('DELETE FROM teacher_subject_assignments WHERE teacher_user_id=$1',[ids.otherTeacher]);}
  });

  it('opens just the chosen class, then all classes for that exam, returning finalized marks for correction while preserving other exams', async () => {
    const created=await createExam('submitted',[ids.class,ids.secondClass]);
    const other=await createExam();
    const windows=(await pool.query('SELECT id FROM exam_mark_entry_windows WHERE exam_series_id=ANY($1::uuid[])',[[created.exam.id,other.exam.id]])).rows;
    for(const window of windows)await manager.lockMarksEntry(window.id);
    const deadline=new Date(Date.now()+86400000).toISOString();
    expect((await manager.openMarksEntry({exam_series_id:created.exam.id,scope:'class',class_section_id:ids.class,closes_at:deadline})).window_count).toBe(1);
    expect(await windowFor(created.exam.id)).toMatchObject({canEnter:true});
    expect(await windowFor(created.exam.id,ids.secondClass)).toMatchObject({canEnter:false});
    const first=await windowFor(created.exam.id);await save(first,'submit');
    await pool.query(`UPDATE exam_marks SET status='locked' WHERE exam_series_id=$1`,[created.exam.id]);
    expect((await manager.openMarksEntry({exam_series_id:created.exam.id,scope:'everyone',closes_at:deadline})).window_count).toBe(2);
    expect(await windowFor(created.exam.id,ids.secondClass)).toMatchObject({canEnter:true});
    expect(await windowFor(other.exam.id)).toMatchObject({canEnter:false});
    expect((await pool.query('SELECT status FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows[0].status).toBe('draft');
    await save(first, 'draft', ids.student, 65);
    expect((await pool.query('SELECT score::float FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows[0].score).toBe(65);
  });

  it('rejects invalid deadlines, foreign assignments, archived exams and unauthorized open requests without changes', async () => {
    const created=await createExam();const window=await windowFor(created.exam.id);await manager.lockMarksEntry(window.id);
    const base={exam_series_id:created.exam.id,scope:'everyone' as const,closes_at:new Date(Date.now()+86400000).toISOString()};
    await expect(manager.openMarksEntry({...base,closes_at:'2020-01-01T00:00:00Z'})).rejects.toThrow('future');
    await expect(manager.openMarksEntry({...base,scope:'class',class_section_id:randomUUID()})).rejects.toThrow('No configured');
    await expect(manager.openMarksEntry({...base,scope:'teacher',teacher_user_id:randomUUID()})).rejects.toThrow('No configured');
    managerContext.role='teacher';
    try {await expect(manager.openMarksEntry(base)).rejects.toThrow('permission');} finally {managerContext.role='exams_manager';}
    managerContext.tenant_id='school-b';
    try {await expect(manager.openMarksEntry(base)).rejects.toThrow('school');} finally {managerContext.tenant_id='school-a';}
    await pool.query(`UPDATE exam_series SET status='archived',locked_at=NOW() WHERE id=$1`,[created.exam.id]);
    await expect(manager.openMarksEntry(base)).rejects.toThrow(/archived/i);
    expect((await pool.query('SELECT status FROM exam_mark_entry_windows WHERE id=$1',[window.id])).rows[0].status).toBe('closed');
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM exam_mark_audit_logs WHERE exam_series_id=$1 AND action='mark_entry.opened'`,[created.exam.id])).rows[0].n).toBe(0);
  });

  it.each(['locked', 'published'] as const)('reopens a %s exam only for the selected teacher, preserving other ownership and streams', async status => {
    const fixture = await protectedExam(status);
    const opened = await manager.openMarksEntry({ exam_series_id: fixture.examId, scope: 'teacher', teacher_user_id: ids.teacher,
      closes_at: new Date(Date.now() + 86400000).toISOString() });
    expect(opened).toMatchObject({ success: true, window_count: 1 });
    expect((await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.find(row => row.examSeriesId === fixture.examId))
      .toMatchObject({ canEnter: true, classSectionId: fixture.class });
    const marks = (await pool.query(`SELECT student_id,status,locked_at,published_at FROM exam_marks WHERE tenant_id='school-a' AND exam_series_id=$1`, [fixture.examId])).rows;
    expect(marks.find(row => row.student_id === fixture.student)).toMatchObject({ status: 'draft', locked_at: null, published_at: null });
    expect(marks.filter(row => row.student_id !== fixture.student).map(row => row.status)).toEqual([status, status, status]);
    const roster = await repository.getMarks('school-a', { exam_series_id: fixture.examId, teacher_user_id: ids.teacher });
    expect(roster.map(row => row.student_id)).toContain(fixture.student);
    expect(roster.map(row => row.student_id)).not.toContain(fixture.otherStreamStudent);
    expect(roster.map(row => row.student_id)).not.toContain(fixture.secondStudent);
    await saveCorrection(fixture, fixture.student);
    await expect(saveCorrection(fixture, fixture.sharedStudent)).rejects.toThrow();
    await expect(saveCorrection(fixture, fixture.otherStreamStudent)).rejects.toThrow();
    await expect(saveCorrection(fixture, fixture.secondStudent, ids.otherTeacher)).rejects.toThrow();
    expect(await repository.getMarks('school-a', { exam_series_id: fixture.examId, teacher_user_id: ids.otherTeacher })).toHaveLength(0);
    const remainingWindows = (await pool.query(`SELECT status,teacher_entry_deadlines FROM exam_mark_entry_windows WHERE exam_series_id=$1`, [fixture.examId])).rows;
    expect(remainingWindows.every(row => row.status === 'closed')).toBe(true);
    expect(remainingWindows.every(row => !(ids.otherTeacher in row.teacher_entry_deadlines))).toBe(true);
    expect((await pool.query(`SELECT actor_user_id,metadata FROM exam_mark_audit_logs
      WHERE tenant_id='school-a' AND exam_series_id=$1 AND action='mark_entry.reopened'`, [fixture.examId])).rows)
      .toEqual([expect.objectContaining({ actor_user_id: ids.manager, metadata: expect.objectContaining({ previous_status: status, scope: 'teacher' }) })]);
    const cards = (await pool.query(`SELECT tenant_id,student_id,status,is_current FROM student_report_cards WHERE exam_series_id=$1`, [fixture.examId])).rows;
    expect(cards.filter(row => row.tenant_id === 'school-a' && row.is_current && [fixture.student, fixture.sharedStudent].includes(row.student_id))
      .map(row => row.status)).toEqual(['regeneration_required', 'regeneration_required']);
    expect(cards.filter(row => row.tenant_id === 'school-a' && row.is_current && [fixture.otherStreamStudent, fixture.secondStudent].includes(row.student_id))
      .map(row => row.status)).toEqual([status === 'published' ? 'published' : 'approved', status === 'published' ? 'published' : 'approved']);
    expect(cards.filter(row => row.tenant_id === 'school-b' || !row.is_current).map(row => row.status)).toEqual(['published', 'published']);
    expect((await pool.query(`SELECT actor_user_id FROM student_report_card_audit_logs WHERE exam_series_id=$1
      AND tenant_id='school-a' AND action='report_card.regeneration_required'`, [fixture.examId])).rows)
      .toEqual([expect.objectContaining({ actor_user_id: ids.manager }), expect.objectContaining({ actor_user_id: ids.manager })]);
    expect((await pool.query(`SELECT status,score::float FROM exam_marks WHERE tenant_id='school-b' AND exam_series_id=$1`, [fixture.examId])).rows)
      .toEqual([{ status: 'published', score: 42 }]);
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ event: expect.objectContaining({
      type: 'exam.mark_entry_opened', entityId: fixture.examId,
    }), notifications: expect.arrayContaining([expect.objectContaining({ targetUserId: ids.teacher })]) })]));
  });

  it.each(['class', 'everyone'] as const)('opens %s scope on a published exam for real corrections and invalidates only affected current cards', async scope => {
    const fixture = await protectedExam('published', ids.otherTeacher);
    await manager.openMarksEntry({ exam_series_id: fixture.examId, scope,
      ...(scope === 'class' ? { class_section_id: fixture.class } : {}),
      closes_at: new Date(Date.now() + 86400000).toISOString() });
    const selectedStudents = fixture.students.filter(row => scope === 'everyone' || row.classId === fixture.class);
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM exam_marks WHERE tenant_id='school-a' AND exam_series_id=$1 AND status='draft'`, [fixture.examId])).rows[0].n)
      .toBe(selectedStudents.length);
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM student_report_cards WHERE tenant_id='school-a' AND exam_series_id=$1 AND is_current AND status='regeneration_required'`, [fixture.examId])).rows[0].n)
      .toBe(selectedStudents.length);
    await saveCorrection(fixture, fixture.student);
    await saveCorrection(fixture, fixture.otherStreamStudent, ids.otherTeacher);
    await expect(saveCorrection(fixture, fixture.sharedStudent)).rejects.toThrow();
    if (scope === 'class') {
      await expect(saveCorrection(fixture, fixture.secondStudent, ids.otherTeacher)).rejects.toThrow();
      expect((await pool.query(`SELECT status FROM exam_marks WHERE tenant_id='school-a' AND exam_series_id=$1 AND student_id=$2`, [fixture.examId, fixture.secondStudent])).rows[0].status).toBe('published');
    } else {
      await saveCorrection(fixture, fixture.secondStudent, ids.otherTeacher);
    }
  });

  it('rolls back protected marks, current cards and series access when reopening cannot emit its event', async () => {
    const fixture = await protectedExam('published');
    rejectSchoolEvent = true;
    try {
      await expect(manager.openMarksEntry({ exam_series_id: fixture.examId, scope: 'everyone',
        closes_at: new Date(Date.now() + 86400000).toISOString() })).rejects.toThrow('Outbox unavailable');
    } finally { rejectSchoolEvent = false; }
    expect((await pool.query('SELECT status,locked_at,published_at FROM exam_series WHERE id=$1', [fixture.examId])).rows[0])
      .toMatchObject({ status: 'published', locked_at: expect.any(Date), published_at: expect.any(Date) });
    expect((await pool.query(`SELECT status FROM exam_marks WHERE tenant_id='school-a' AND exam_series_id=$1`, [fixture.examId])).rows.every(row => row.status === 'published')).toBe(true);
    expect((await pool.query(`SELECT status FROM student_report_cards WHERE tenant_id='school-a' AND exam_series_id=$1`, [fixture.examId])).rows.every(row => row.status === 'published')).toBe(true);
    expect((await pool.query('SELECT id FROM exam_mark_audit_logs WHERE exam_series_id=$1', [fixture.examId])).rows).toHaveLength(0);
    expect((await pool.query('SELECT id FROM student_report_card_audit_logs WHERE exam_series_id=$1', [fixture.examId])).rows).toHaveLength(0);
  });

  it('rolls back access and audit changes when the school event cannot be recorded', async () => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    await manager.lockMarksEntry(window.id);
    rejectSchoolEvent = true;
    try {
      await expect(manager.openMarksEntry({ exam_series_id: created.exam.id, scope: 'everyone', closes_at: new Date(Date.now()+86400000).toISOString() })).rejects.toThrow('Outbox unavailable');
    } finally { rejectSchoolEvent = false; }
    expect((await pool.query('SELECT status FROM exam_mark_entry_windows WHERE id=$1', [window.id])).rows[0].status).toBe('closed');
    expect((await pool.query(`SELECT COUNT(*)::int AS n FROM exam_mark_audit_logs WHERE exam_series_id=$1 AND action='mark_entry.opened'`, [created.exam.id])).rows[0].n).toBe(0);
  });
  async function assist(window: any, studentId = ids.student, score = 61, teacherId = ids.teacher, action: 'draft' | 'submit' = 'draft') {
    activeContext = managerContext;
    try {
      return await teacher.saveAssistedMarks(teacherId, { examId: window.id, classSectionId: window.classSectionId,
        assessmentId: window.assessmentId, action, marks: { [studentId]: { score, score_status: 'entered' } } });
    } finally { activeContext = teacherContext; }
  }

  it('allows unassigned manager markbooks and later teacher assignment without changing original attribution', async()=>{
    const created=await createExam(); const window=await windowFor(created.exam.id);
    await pool.query(`UPDATE teacher_subject_assignments SET status='inactive' WHERE teacher_user_id=$1 AND class_section_id=$2`,[ids.teacher,ids.class]);
    activeContext=managerContext;
    try {
      expect((await teacher.getAssistedMarkAssignments()).assignments.some(row=>row.exam_id===created.exam.id)).toBe(true);
      expect((await teacher.getAssistedMarkbooks(undefined as any)).windows.some(row=>row.examSeriesId===created.exam.id)).toBe(true);
      await teacher.saveAssistedMarks(undefined as any,{examId:window.id,classSectionId:window.classSectionId,assessmentId:window.assessmentId,action:'draft',marks:{[ids.student]:{score:0,score_status:'entered'}}});
      expect((await pool.query('SELECT entered_by_user_id,assigned_teacher_user_id FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows[0]).toEqual({entered_by_user_id:ids.manager,assigned_teacher_user_id:null});
    }finally{activeContext=teacherContext;await pool.query(`UPDATE teacher_subject_assignments SET status='active' WHERE teacher_user_id=$1 AND class_section_id=$2`,[ids.teacher,ids.class]);}
    await save(window,'submit',ids.student,72);
    expect((await pool.query('SELECT count(*)::int AS count,min(entered_by_user_id::text) AS original FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows[0]).toEqual({count:1,original:ids.manager});
  });

  it('discovers an unassigned stream beside an assigned stream and preserves its exact roster identity', async () => {
    const classId=randomUUID(), subjectId=randomUUID(), white=randomUUID(), blue=randomUUID();
    await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Mixed allocation class')`,[classId]);
    await pool.query(`INSERT INTO subjects VALUES ($1,'school-a','Unallocated subject')`,[subjectId]);
    await pool.query(`INSERT INTO class_streams VALUES ('white','school-a',$1,'White'),('blue','school-a',$1,'Blue')`,[classId]);
    for(const [studentId,stream] of [[white,'white'],[blue,'blue']]) {
      await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Stream learner')`,[studentId]);
      await pool.query(`INSERT INTO student_class_assignments VALUES ('school-a',$1,$2,$3,'active')`,[studentId,classId,stream]);
      await pool.query(`INSERT INTO student_subject_enrollments VALUES ('school-a',$1,$2,$3,'active')`,[studentId,classId,subjectId]);
    }
    await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id,stream_id) VALUES ('school-a',$1,$2,$3,'blue')`,[classId,subjectId,ids.teacher]);
    await offer([classId],[subjectId]);
    const created=await manager.createExamSetup({name:`Unassigned stream ${++serial}`,academic_term_id:ids.term,
      starts_on:futureDate(0),ends_on:futureDate(7),status:'submitted',class_subjects:[{class_section_id:classId,subject_ids:[subjectId]}],max_marks:80});
    activeContext=managerContext;
    try {
      const choices=(await teacher.getAssistedMarkAssignments()).assignments.filter(row=>row.exam_id===created.exam.id);
      expect(choices).toEqual(expect.arrayContaining([
        expect.objectContaining({teacher_user_id:null,stream_id:'white'}),
        expect.objectContaining({teacher_user_id:ids.teacher,stream_id:'blue'}),
      ]));
      const progress=(await manager.getTeacherMarkProgress()).entries.filter(row=>row.exam_id===created.exam.id);
      expect(progress).toEqual(expect.arrayContaining([expect.objectContaining({teacher_id:null,subject_id:subjectId,stream_id:'white',total_students:1})]));
      const rows=await repository.getMarks('school-a',{exam_series_id:created.exam.id,view:'all'});
      expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({student_id:white,stream_id:'white'}),expect.objectContaining({student_id:blue,stream_id:'blue'})]));
      const book=(await teacher.getAssistedMarkbooks(undefined,['white'])).windows.find(row=>row.examSeriesId===created.exam.id)!;
      expect(book).toMatchObject({totalStudents:1,enteredCount:0,paperCount:1,canEnter:true});
      await expect(teacher.saveAssistedMarks(undefined,{examId:book.id,classSectionId:classId,assessmentId:book.assessmentId,
        action:'submit',marks:{[blue]:{score:50,score_status:'entered'}}},['white'])).rejects.toThrow();
      expect((await pool.query('SELECT count(*)::int AS n FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows[0].n).toBe(0);
      await teacher.saveAssistedMarks(undefined,{examId:book.id,classSectionId:classId,assessmentId:book.assessmentId,
        action:'submit',marks:{[white]:{score:0,score_status:'entered'}}},['white']);
      expect((await teacher.getAssistedMarkbooks(undefined,['white'])).windows.find(row=>row.examSeriesId===created.exam.id))
        .toMatchObject({totalStudents:1,enteredCount:1,status:'Submitted',canEnter:false});
      expect((await teacher.getAssistedMarkbooks(ids.teacher,['blue'])).windows.find(row=>row.examSeriesId===created.exam.id))
        .toMatchObject({totalStudents:1,enteredCount:0,status:'Not started',canEnter:true});
    } finally {activeContext=teacherContext;}
  });

  it.each(['open','draft','closed','submitted-sheet','locked','published'] as const)('saves and submits a never-assigned subject after authorized opening from %s', async state => {
    const classId=randomUUID(),subjectId=randomUUID(),studentId=randomUUID();
    await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Never assigned class')`,[classId]);
    await pool.query(`INSERT INTO subjects VALUES ($1,'school-a','Never assigned subject')`,[subjectId]);
    await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Unassigned learner')`,[studentId]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ('school-a',$1,$2)`,[studentId,classId]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`,[studentId,classId,subjectId]);
    await offer([classId],[subjectId]);
    const created=await manager.createExamSetup({name:`Never assigned ${state} ${++serial}`,academic_term_id:ids.term,
      starts_on:futureDate(0),ends_on:futureDate(7),status:state==='draft'?'draft':'submitted',class_subjects:[{class_section_id:classId,subject_ids:[subjectId]}],max_marks:80});
    activeContext=managerContext;
    try {
      let book=(await teacher.getAssistedMarkbooks()).windows.find(row=>row.examSeriesId===created.exam.id)!;
      const payload={examId:book.id,classSectionId:classId,assessmentId:book.assessmentId,action:'draft' as 'draft'|'submit',marks:{[studentId]:{score:0,score_status:'entered' as const}}};
      if(state==='submitted-sheet') await teacher.saveAssistedMarks(undefined,{...payload,action:'submit'});
      if(state==='closed') await pool.query(`UPDATE exam_mark_entry_windows SET status='closed' WHERE id=$1`,[book.id]);
      if(state==='locked'||state==='published') await pool.query(`UPDATE exam_series SET status=$2,locked_at=NOW(),published_at=CASE WHEN $2='published' THEN NOW() END WHERE id=$1`,[created.exam.id,state]);
      if(state!=='open') {
        await expect(teacher.saveAssistedMarks(undefined,payload)).rejects.toThrow();
        if(state==='draft') await manager.configureExamSetup(created.exam.id,{name:`Opened draft ${serial}`,status:'submitted',
          starts_on:futureDate(0),ends_on:futureDate(7),configuration_version:1,class_subjects:[{class_section_id:classId,subject_ids:[subjectId]}],max_marks:80});
        await manager.openMarksEntry({exam_series_id:created.exam.id,scope:'class',class_section_id:classId,closes_at:new Date(Date.now()+86400000).toISOString()});
      }
      await teacher.saveAssistedMarks(undefined,payload);
      await teacher.saveAssistedMarks(undefined,{...payload,marks:{[studentId]:{score:64,score_status:'entered'}}});
      await teacher.saveAssistedMarks(undefined,{...payload,action:'submit',marks:{[studentId]:{score:64,score_status:'entered'}}});
      book=(await teacher.getAssistedMarkbooks()).windows.find(row=>row.examSeriesId===created.exam.id)!;
      expect(book).toMatchObject({status:'Submitted',enteredCount:1,totalStudents:1,canEnter:false});
      expect((await repository.getMarks('school-a',{exam_series_id:created.exam.id,view:'all'}))).toEqual([
        expect.objectContaining({score:64,status:'submitted',entered_by_user_id:ids.manager,updated_by_user_id:ids.manager,assigned_teacher_user_id:null}),
      ]);
      expect((await pool.query(`SELECT COUNT(*)::int AS n FROM teacher_subject_assignments WHERE tenant_id='school-a' AND class_section_id=$1`,[classId])).rows[0].n).toBe(0);
      expect((await manager.getTeacherMarkProgress()).entries.find(row=>row.exam_id===created.exam.id)).toMatchObject({recorded:1,missing:0,is_submitted:true,status:'Submitted'});
      await expect(teacher.saveAssistedMarks(undefined,payload)).rejects.toThrow();
    } finally {activeContext=teacherContext;}
  });

  it('serves unassigned markbooks and persists manager drafts through the guarded HTTP API', async () => {
    const created = await createExam('submitted',[ids.secondClass]);
    const window = await windowFor(created.exam.id,ids.secondClass);
    await pool.query(`UPDATE teacher_subject_assignments SET status='inactive' WHERE class_section_id=$1`,[ids.secondClass]);
    const module = await Test.createTestingModule({controllers:[ExamsManagerMarksController],
      providers:[{provide:ClassTeacherService,useValue:teacher}]}).compile();
    const app = module.createNestApplication();
    app.useGlobalGuards(new RbacGuard(new Reflector(),{requireStore:()=>activeContext} as never));
    app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));
    await app.init();
    try {
      activeContext=managerContext;
      const selection=await request(app.getHttpServer()).get('/exams/assisted-marks-entry/assignments').expect(200);
      expect(selection.body.assignments).toEqual(expect.arrayContaining([expect.objectContaining({exam_id:created.exam.id,teacher_user_id:null})]));
      const body={examId:window.id,classSectionId:ids.secondClass,assessmentId:window.assessmentId,
        action:'draft',marks:{[ids.secondStudent]:{score:0,score_status:'entered',expected_updated_at:null}}};
      await request(app.getHttpServer()).post('/exams/assisted-marks-entry').send({...body,tenant_id:'school-b'}).expect(400);
      await request(app.getHttpServer()).post('/exams/assisted-marks-entry').send(body).expect(201);
      const refreshed=await request(app.getHttpServer()).get('/exams/assisted-marks-entry/markbooks').expect(200);
      expect(refreshed.body.windows).toEqual(expect.arrayContaining([expect.objectContaining({examSeriesId:created.exam.id,enteredCount:1,totalStudents:1})]));
      await request(app.getHttpServer()).post('/exams/assisted-marks-entry').send(body).expect(409);
      activeContext={...managerContext,tenant_id:'school-b'};
      const foreign=await request(app.getHttpServer()).get('/exams/assisted-marks-entry/markbooks').expect(200);
      expect(foreign.body.windows).toEqual([]);
      await request(app.getHttpServer()).post('/exams/assisted-marks-entry').send(body).expect(400);
      activeContext=teacherContext;
      await request(app.getHttpServer()).get('/exams/assisted-marks-entry/markbooks').expect(403);
    } finally {
      activeContext=teacherContext;await app.close();
      await pool.query(`UPDATE teacher_subject_assignments SET status='active' WHERE class_section_id=$1`,[ids.secondClass]);
    }
  });

  it('shows genuinely blank learners on submitted sheets instead of shrinking the roster',async()=>{
    const created=await createExam(); const window=await windowFor(created.exam.id);
    await save(window,'submit');
    const student=randomUUID();
    await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Blank learner')`,[student]);
    await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id) SELECT 'school-a',$1,$2,stream_id FROM student_class_assignments WHERE tenant_id='school-a' AND student_id=$3 LIMIT 1`,[student,ids.class,ids.student]);
    await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`,[student,ids.class,ids.subject]);
    try{
      const rows=await repository.getMarks('school-a',{exam_series_id:created.exam.id,assessment_id:window.assessmentId,teacher_user_id:ids.teacher,view:'submitted'});
      expect(rows).toHaveLength(2);expect(rows.find(row=>row.student_id===student)).toMatchObject({id:null,score:null});
    }finally{
      await pool.query('DELETE FROM student_subject_enrollments WHERE student_id=$1',[student]);await pool.query('DELETE FROM student_class_assignments WHERE student_id=$1',[student]);await pool.query('DELETE FROM students WHERE id=$1',[student]);
    }
  });

  it('allows manager entry in an unassigned stream while protecting a submitted stream and its unresolved blanks', async () => {
    const created = await createExam('submitted', [ids.secondClass]); const window = await windowFor(created.exam.id, ids.secondClass);
    const red = randomUUID(); const blankBlue = randomUUID();
    await pool.query(`UPDATE student_class_assignments SET stream_id='blue' WHERE student_id=$1`, [ids.secondStudent]);
    await pool.query(`UPDATE teacher_subject_assignments SET stream_id='blue' WHERE teacher_user_id=$1 AND class_section_id=$2`, [ids.teacher,ids.secondClass]);
    await save(window, 'submit', ids.secondStudent);
    for (const [student, stream] of [[red,'red'],[blankBlue,'blue']]) {
      await pool.query(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,'school-a','Stream learner')`, [student]);
      await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id) VALUES ('school-a',$1,$2,$3)`, [student,ids.secondClass,stream]);
      await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ('school-a',$1,$2,$3)`, [student,ids.secondClass,ids.subject]);
    }
    activeContext = managerContext;
    const command = (student: string, action: 'draft' | 'submit') => teacher.saveAssistedMarks(undefined, {
      examId:window.id,classSectionId:ids.secondClass,assessmentId:window.assessmentId,action,
      marks:{[student]:{score:50,score_status:'entered'}},
    });
    try {
      await command(red,'draft');
      const rows = await repository.getMarks('school-a',{exam_series_id:created.exam.id,view:'all'});
      expect(rows.find(row=>row.student_id===blankBlue)).toMatchObject({id:null,can_edit:false});
      expect(rows.find(row=>row.student_id===red)).toMatchObject({can_edit:true});
      await expect(command(blankBlue,'draft')).rejects.toThrow();
      await command(red,'submit');
      expect((await pool.query(`SELECT status FROM exam_marks WHERE exam_series_id=$1 AND student_id=$2`,[created.exam.id,red])).rows[0].status).toBe('submitted');
      expect((await pool.query(`SELECT id FROM exam_marks WHERE exam_series_id=$1 AND student_id=$2`,[created.exam.id,blankBlue])).rowCount).toBe(0);
    } finally {
      activeContext=teacherContext;
      for (const student of [red,blankBlue]) {
        await pool.query('DELETE FROM student_subject_enrollments WHERE student_id=$1',[student]);
        await pool.query('DELETE FROM student_class_assignments WHERE student_id=$1',[student]);
        await pool.query('DELETE FROM students WHERE id=$1',[student]);
      }
    }
  });

  it('lets a manager create and edit a teacher draft, preserving editor attribution and normal teacher submission', async () => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    await assist(window);
    let mark = (await pool.query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows[0];
    expect(mark).toMatchObject({ entered_by_user_id: ids.manager, updated_by_user_id: ids.manager, assigned_teacher_user_id: ids.teacher, status: 'draft' });
    await save(window, 'draft', ids.student, 65);
    await assist(window, ids.student, 67);
    await save(window, 'submit', ids.student, 70);
    mark = (await pool.query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows[0];
    expect(mark).toMatchObject({ entered_by_user_id: ids.manager, updated_by_user_id: ids.teacher, assigned_teacher_user_id: ids.teacher, status: 'submitted' });
    const audits = (await pool.query('SELECT * FROM exam_mark_audit_logs WHERE mark_id=$1 ORDER BY created_at', [mark.id])).rows;
    expect(audits[0]).toMatchObject({ actor_user_id: ids.manager, metadata: expect.objectContaining({ assigned_teacher_user_id: ids.teacher, source: 'exams_manager_mark_sheet' }) });
    expect(audits[2]).toMatchObject({ actor_user_id: ids.manager, previous_score: '65.00', new_score: '67.00' });
    expect(submissions.at(-1).submitted_by_user_id).toBe(ids.teacher);
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ event: expect.objectContaining({
      actorRole: 'exams_manager', payload: expect.objectContaining({ assigned_teacher_user_id: ids.teacher }),
    }), notifications: expect.arrayContaining([expect.objectContaining({ targetUserId: ids.teacher })]) })]));
    await expect(assist(window)).rejects.toThrow();
  });

  it('keeps a teacher as original editor when a manager edits and submits their draft', async () => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    await save(window, 'draft', ids.student, 55);
    await assist(window, ids.student, 60, ids.teacher, 'submit');
    expect((await pool.query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows[0])
      .toMatchObject({ entered_by_user_id: ids.teacher, updated_by_user_id: ids.manager, assigned_teacher_user_id: ids.teacher, status: 'submitted' });
    expect(submissions.at(-1).submitted_by_user_id).toBe(ids.manager);
    expect((await teacher.getPendingMarks('school-a', ids.teacher, true, true)).windows.find(row => row.examSeriesId === created.exam.id)?.status).toBe('Submitted');
    await manager.openMarksEntry({ exam_series_id: created.exam.id, scope: 'teacher', teacher_user_id: ids.teacher,
      closes_at: new Date(Date.now() + 86400000).toISOString() });
    await save(window, 'draft', ids.student, 62);
  });

  it('allows the assigned teacher to reopen a manager-created mark through the existing authorized workflow', async () => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    await assist(window, ids.student, 60, ids.teacher, 'submit');
    await manager.openMarksEntry({ exam_series_id: created.exam.id, scope: 'teacher', teacher_user_id: ids.teacher,
      closes_at: new Date(Date.now() + 86400000).toISOString() });
    await save(window, 'draft', ids.student, 62);
    expect((await pool.query('SELECT score::float,status FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows[0])
      .toEqual({ score: 62, status: 'draft' });
  });

  it.each(['locked', 'published', 'archived'] as const)('denies assisted writes to %s exams', async status => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    await pool.query('UPDATE exam_series SET status=$2 WHERE id=$1', [created.exam.id, status]);
    await expect(assist(window)).rejects.toThrow();
    expect((await pool.query('SELECT id FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows).toHaveLength(0);
  });

  it('respects closed windows, teacher-specific extensions, score bounds and stream assignments', async () => {
    const fixture = await protectedExam('locked');
    await manager.openMarksEntry({ exam_series_id: fixture.examId, scope: 'teacher', teacher_user_id: ids.teacher,
      closes_at: new Date(Date.now() + 86400000).toISOString() });
    const window = (await teacher.getPendingMarks('school-a', ids.teacher, true)).windows.find(row => row.examSeriesId === fixture.examId)!;
    await expect(assist(window, fixture.student, 81)).rejects.toThrow();
    await expect(assist(window, fixture.otherStreamStudent)).rejects.toThrow();
    await expect(assist(window, fixture.otherStreamStudent, 61, ids.otherTeacher)).rejects.toThrow();
    await assist(window, fixture.student, 61);
    await manager.lockMarksEntry(window.id);
    await expect(assist(window, fixture.student)).rejects.toThrow();
  });

  it('isolates assisted discovery and mutations to the authenticated school and assigned teacher', async () => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    activeContext = managerContext;
    try {
      const options = await teacher.getAssistedMarkAssignments();
      expect(options.assignments).toEqual(expect.arrayContaining([expect.objectContaining({ exam_id: created.exam.id, teacher_user_id: ids.teacher })]));
      expect((await teacher.getAssistedMarkbooks(ids.otherTeacher)).windows.some(row => row.examSeriesId === created.exam.id)).toBe(false);
      managerContext.tenant_id = 'school-b';
      expect((await teacher.getAssistedMarkAssignments()).assignments).toHaveLength(0);
      expect((await teacher.getAssistedMarkbooks(ids.teacher)).windows).toHaveLength(0);
      await expect(teacher.saveAssistedMarks(ids.teacher, { examId: window.id, classSectionId: window.classSectionId,
        assessmentId: window.assessmentId, marks: { [ids.student]: { score: 60 } } })).rejects.toThrow();
    } finally { managerContext.tenant_id = 'school-a'; activeContext = teacherContext; }
    await expect(assist(window, ids.student, 60, ids.otherTeacher)).rejects.toThrow();
    expect((await pool.query('SELECT id FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows).toHaveLength(0);
  });

  it('rejects teacher impersonation and managers missing entry permission', async () => {
    await expect(teacher.getAssistedMarkAssignments()).rejects.toThrow('permission');
    activeContext = managerContext;
    const permissions = managerContext.permissions;
    try {
      managerContext.permissions = ['exams:write'];
      await expect(teacher.getAssistedMarkAssignments()).rejects.toThrow('permission');
    } finally { managerContext.permissions = permissions; activeContext = teacherContext; }
  });

  it('rolls back assisted marks and audits if event recording fails', async () => {
    const created = await createExam(); const window = await windowFor(created.exam.id);
    rejectSchoolEvent = true;
    try { await expect(assist(window)).rejects.toThrow('Outbox unavailable'); }
    finally { rejectSchoolEvent = false; }
    expect((await pool.query('SELECT id FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rows).toHaveLength(0);
    expect((await pool.query('SELECT id FROM exam_mark_audit_logs WHERE exam_series_id=$1', [created.exam.id])).rows).toHaveLength(0);
  });

  describe('class-scoped flexible papers', () => {
    beforeAll(async () => { await pool.query(FLEXIBLE_EXAM_PAPERS_SCHEMA); await pool.query(EXAM_RESULT_REFRESH_SCHEMA); });

    it('imports and rolls back categories atomically and rejects concurrent stale imports', async () => {
      const created = await createExam();
      const window = await windowFor(created.exam.id);
      const before = await paperConfiguration.read(window.id);
      const configured = await paperConfiguration.save(window.id, { version: before.version, papers: [
        { id: before.papers[0].id, name: 'Oral', max_score: 40,
          categories: [{ name: 'Speech', max_score: 20 }, { name: 'Listening', max_score: 20 }] },
      ] });
      const paper = configured.papers[0];
      const categories = Object.fromEntries(paper.categories.map((category: { id: string }) => [category.id, 10]));
      await teacher.saveMarks('school-a', ids.teacher, { examId: window.id, classSectionId: ids.class,
        assessmentId: paper.id, action: 'draft', marks: { [ids.student]: { score: 20, category_scores: categories } } });
      const mark = (await pool.query('SELECT *, updated_at::text AS exact_updated_at FROM exam_marks WHERE assessment_id=$1', [paper.id])).rows[0];
      const imported = { ...categories, [paper.categories[0].id]: 'Y' };
      const command = { tenant_id: 'school-a', actor_user_id: ids.teacher, file_name: 'oral.csv', preview_token: 'checked', rows: [{
        row_number: 2, exam_series_id: created.exam.id, assessment_id: paper.id, academic_term_id: ids.term,
        class_section_id: ids.class, subject_id: ids.subject, student_id: ids.student, score: null, score_status: 'Y',
        category_scores: imported, has_expected_version: true, expected_updated_at: mark.exact_updated_at,
        paper_config_version: configured.version,
      }] };
      const writes = await Promise.allSettled([repository.commitBulkMarkImport(command), repository.commitBulkMarkImport(command)]);
      expect(writes.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(writes.filter(result => result.status === 'rejected')).toHaveLength(1);
      const saved = (writes.find(result => result.status === 'fulfilled') as PromiseFulfilledResult<any>).value;
      expect((await pool.query('SELECT score,score_status,category_scores FROM exam_marks WHERE id=$1', [mark.id])).rows[0])
        .toMatchObject({ score: null, score_status: 'Y', category_scores: imported });
      const rollback = await repository.rollbackMarkImportBatch({ tenant_id: 'school-a', actor_user_id: ids.manager,
        batch_id: saved.batch_id, reason: 'Restore category evidence' });
      expect(rollback).toMatchObject({ restored_rows: 1, conflict_count: 0 });
      expect((await pool.query('SELECT score,score_status,category_scores FROM exam_marks WHERE id=$1', [mark.id])).rows[0])
        .toMatchObject({ score: '20.00', score_status: 'entered', category_scores: categories });
      const batchCount = (await pool.query('SELECT COUNT(*) FROM exam_mark_import_batches')).rows[0].count;
      await expect(repository.commitBulkMarkImport({ ...command, rows: command.rows.map(row => ({ ...row, has_expected_version: false })) },
        async () => { throw new Error('Outbox unavailable'); })).rejects.toThrow('Outbox unavailable');
      expect((await pool.query('SELECT COUNT(*) FROM exam_mark_import_batches')).rows[0].count).toBe(batchCount);
      expect((await pool.query('SELECT category_scores FROM exam_marks WHERE id=$1', [mark.id])).rows[0].category_scores).toEqual(categories);
      await paperConfiguration.save(window.id, { ...configured, papers: configured.papers.map((value: any) => ({ ...value, name: 'Oral assessment' })) });
      await expect(repository.commitBulkMarkImport({ ...command, rows: command.rows.map(row => ({ ...row, has_expected_version: false })) }))
        .rejects.toThrow('Marks changed after the import preview');
      const csvRow = { exam_series_id: created.exam.id, assessment_id: paper.id, academic_term_id: ids.term,
        class_section_id: ids.class, subject_id: ids.subject, student_id: ids.student,
        score: 20, score_status: 'entered' as const, category_scores: categories };
      const preview = await exams.bulkUploadMarks({ mode: 'preview', rows: [csvRow] });
      expect(preview.valid_rows).toBe(1);
      const newer = { ...categories, [paper.categories[0].id]: 12 };
      await teacher.saveMarks('school-a', ids.teacher, { examId: window.id, classSectionId: ids.class,
        assessmentId: paper.id, action: 'draft', marks: { [ids.student]: { score: 22, category_scores: newer } } });
      await expect(exams.bulkUploadMarks({ mode: 'commit', rows: [csvRow], preview_token: preview.preview_token }))
        .rejects.toThrow('must be previewed');
      expect((await pool.query('SELECT score FROM exam_marks WHERE id=$1', [mark.id])).rows[0].score).toBe('22.00');
    });

    it('keeps another class unchanged and calculates category totals without double counting', async () => {
      const created = await createExam('submitted', [ids.class, ids.secondClass]);
      const window = await windowFor(created.exam.id);
      const before = await paperConfiguration.read(window.id);
      const saved = await paperConfiguration.save(window.id, { version: before.version, papers: [
        { id: before.papers[0].id, name: 'Paper 1', max_score: 20, categories: [{ name: 'Reading', max_score: 12 }, { name: 'Writing', max_score: 8 }] },
        { name: 'Practical', max_score: 80 },
      ] });
      expect(saved.papers.map((paper: any) => [paper.name,paper.max_score])).toEqual([['Paper 1',20],['Practical',80]]);
      expect(await windowFor(created.exam.id,ids.secondClass)).toMatchObject({outOf:80});
      const windows = (await teacher.getPendingMarks('school-a',ids.teacher,true)).windows.filter(w=>w.examSeriesId===created.exam.id);
      expect(windows.filter(w=>w.classSectionId===ids.class)).toHaveLength(2);
      expect(windows.filter(w=>w.classSectionId===ids.secondClass)).toHaveLength(1);
      const paper = saved.papers[0];
      const values = Object.fromEntries(paper.categories.map((c: any,i: number)=>[c.id,i===0?9:6]));
      await teacher.saveMarks('school-a',ids.teacher,{examId:window.id,classSectionId:ids.class,assessmentId:paper.id,paperConfigVersion:saved.version,
        action:'draft',marks:{[ids.student]:{score:15,score_status:'entered',category_scores:values,expected_updated_at:null}}});
      const mark=(await pool.query('SELECT * FROM exam_marks WHERE assessment_id=$1',[paper.id])).rows[0];
      expect(Number(mark.score)).toBe(15); expect(mark.category_scores).toEqual(values);
      await expect(teacher.saveMarks('school-a',ids.teacher,{examId:window.id,classSectionId:ids.class,assessmentId:paper.id,paperConfigVersion:saved.version,
        action:'draft',marks:{[ids.student]:{score:1,score_status:'entered',expected_updated_at:null}}})).rejects.toThrow(/changed|closed/);
      expect(Number((await pool.query('SELECT score FROM exam_marks WHERE id=$1',[mark.id])).rows[0].score)).toBe(15);
      await expect(paperConfiguration.save(window.id,{version:before.version,papers:[{name:'Stale',max_score:100}]})).rejects.toThrow(/Another teacher/);
      await expect(paperConfiguration.save(window.id,{version:saved.version,papers:[{name:'Delete existing',max_score:100}]})).rejects.toThrow(/saved marks/);
    });

    it('preserves X/Y and valid category marks and restores a numeric paper when resolved', async () => {
      const created=await createExam(); const window=await windowFor(created.exam.id);
      const before=await paperConfiguration.read(window.id);
      const configured=await paperConfiguration.save(window.id,{version:before.version,papers:[{id:before.papers[0].id,name:'Oral',max_score:40,categories:[{name:'Speech',max_score:20},{name:'Listening',max_score:20}]}]});
      const paper=configured.papers[0]; const [speech,listening]=paper.categories;
      const saveCategories=async (value: number|'X'|'Y') => teacher.saveMarks('school-a',ids.teacher,{examId:window.id,classSectionId:ids.class,assessmentId:paper.id,
        action:'draft',marks:{[ids.student]:{score:value==='X'||value==='Y'?null:10+value,score_status:typeof value==='number'?'entered':value,
          category_scores:{[speech.id]:10,[listening.id]:value}}}});
      await saveCategories('Y');
      expect((await pool.query('SELECT score,score_status,category_scores FROM exam_marks WHERE assessment_id=$1',[paper.id])).rows[0])
        .toMatchObject({score:null,score_status:'Y',category_scores:{[speech.id]:10,[listening.id]:'Y'}});
      await saveCategories('X');
      await saveCategories(20);
      expect((await pool.query('SELECT score,score_status FROM exam_marks WHERE assessment_id=$1',[paper.id])).rows[0]).toMatchObject({score:'30.00',score_status:'entered'});
      await expect(saveCategories(21)).rejects.toThrow(/invalid/);
      await pool.query(`UPDATE exam_marks SET status='submitted' WHERE assessment_id=$1`,[paper.id]);
      await expect(paperConfiguration.save(window.id,{...configured,papers:configured.papers})).rejects.toThrow(/Return submitted/);
    });

    it('denies foreign-school and unassigned configuration and rolls back on event failure', async () => {
      const created=await createExam(); const window=await windowFor(created.exam.id); const before=await paperConfiguration.read(window.id);
      const originalUser=teacherContext.user_id; const originalTenant=teacherContext.tenant_id;
      try {
        teacherContext.user_id=ids.otherTeacher;
        await expect(paperConfiguration.read(window.id)).rejects.toThrow(/assigned/);
        teacherContext.user_id=originalUser;teacherContext.tenant_id='school-b';
        await expect(paperConfiguration.save(window.id,{version:1,papers:[{name:'Other school',max_score:10}]})).rejects.toThrow(/not found/);
      } finally {teacherContext.user_id=originalUser;teacherContext.tenant_id=originalTenant;}
      rejectSchoolEvent=true;
      try {await expect(paperConfiguration.save(window.id,{version:before.version,papers:[{name:'Must roll back',max_score:60}]})).rejects.toThrow(/Outbox unavailable/);}
      finally {rejectSchoolEvent=false;}
      expect(await paperConfiguration.read(window.id)).toEqual(before);
    });

    it('processes unequal papers and suppresses overall scores and ranks for X and Y', async () => {
      const created=await createExam(); const window=await windowFor(created.exam.id); const before=await paperConfiguration.read(window.id);
      const configured=await paperConfiguration.save(window.id,{version:before.version,papers:[{id:before.papers[0].id,name:'Paper 1',max_score:20},{name:'Paper 2',max_score:80}]});
      for (const [index,paper] of configured.papers.entries()) {
        await teacher.saveMarks('school-a',ids.teacher,{examId:window.id,classSectionId:ids.class,assessmentId:paper.id,action:'submit',marks:{[ids.student]:{score:index===0?10:60,score_status:'entered'}}});
      }
      await pool.query(`UPDATE exam_marks SET status='locked' WHERE exam_series_id=$1`,[created.exam.id]);
      const batch=(await pool.query(`INSERT INTO report_card_generation_batches(tenant_id,exam_series_id,class_section_id,status,requested_by_user_id) VALUES ('school-a',$1,$2,'draft_generated',$3) RETURNING id`,[created.exam.id,ids.class,ids.manager])).rows[0];
      const process=async()=>{
        await repository.processResultBatch({tenant_id:'school-a',actor_user_id:ids.manager,batch_id:batch.id,mode:'rankings'});
        return (await pool.query('SELECT * FROM exam_result_snapshots WHERE batch_id=$1 AND student_id=$2',[batch.id,ids.student])).rows[0];
      };
      expect(await process()).toMatchObject({average_percentage:'70.00',class_rank:1});
      const refreshed=async()=>(await pool.query('SELECT * FROM exam_result_snapshots WHERE batch_id=$1 AND student_id=$2',[batch.id,ids.student])).rows[0];
      await pool.query(`UPDATE exam_marks SET score=NULL,score_status='X' WHERE assessment_id=$1`,[configured.papers[0].id]);
      expect(await refreshed()).toMatchObject({average_percentage:null,raw_total:null,grade_label:'X',class_rank:null});
      await pool.query(`UPDATE exam_marks SET score=NULL,score_status='Y' WHERE assessment_id=$1`,[configured.papers[1].id]);
      const evidence=(await pool.query(`WITH ${examResultCtes('$1','$2',"'rankings'")} SELECT * FROM ranked`,['school-a',batch.id])).rows;
      expect(evidence).toEqual(expect.arrayContaining([expect.objectContaining({grade_label:'Y'})]));
      expect(await refreshed()).toMatchObject({average_percentage:null,grade_label:'Y',class_rank:null});
      await pool.query(`UPDATE exam_marks SET score=CASE WHEN assessment_id=$1 THEN 10 ELSE 60 END,score_status='entered' WHERE exam_series_id=$2`,[configured.papers[0].id,created.exam.id]);
      expect(await refreshed()).toMatchObject({average_percentage:'70.00',class_rank:1});
      const beforePublish=await refreshed();
      await pool.query(`UPDATE exam_marks SET status='published',published_at=NOW() WHERE exam_series_id=$1`,[created.exam.id]);
      expect((await refreshed()).processed_at).toEqual(beforePublish.processed_at);
    });

    it('serializes concurrent first entries and configuration edits without losing a score',async()=>{
      const created=await createExam();const window=await windowFor(created.exam.id);const before=await paperConfiguration.read(window.id);
      const writes=await Promise.allSettled([40,50].map(score=>teacher.saveMarks('school-a',ids.teacher,{
        examId:window.id,classSectionId:ids.class,assessmentId:window.assessmentId,action:'draft',paperConfigVersion:before.version,
        marks:{[ids.student]:{score,score_status:'entered',expected_updated_at:null}}
      })));
      expect(writes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
      expect(writes.filter(result=>result.status==='rejected')).toHaveLength(1);
      const configs=await Promise.allSettled(['Written','Oral'].map(name=>paperConfiguration.save(window.id,{
        version:before.version,papers:[{id:before.papers[0].id,name,max_score:80}]
      })));
      expect(configs.filter(result=>result.status==='fulfilled')).toHaveLength(1);
      expect(configs.filter(result=>result.status==='rejected')).toHaveLength(1);
      const marks=(await pool.query('SELECT score FROM exam_marks WHERE exam_series_id=$1',[created.exam.id])).rows;
      expect(marks).toHaveLength(1);expect([40,50]).toContain(Number(marks[0].score));
      await pool.query(FLEXIBLE_EXAM_PAPERS_SCHEMA);await pool.query(EXAM_RESULT_REFRESH_SCHEMA);
      expect((await paperConfiguration.read(window.id)).version).toBe(before.version+1);
    });
  });

  describe('individual missing-mark reason corrections', () => {
    beforeAll(async () => {
      await pool.query(FLEXIBLE_EXAM_PAPERS_SCHEMA);
      await pool.query(EXAM_RESULT_REFRESH_SCHEMA);
      await pool.query(`CREATE TABLE IF NOT EXISTS report_source_versions (
        tenant_id text NOT NULL,scope_key text NOT NULL,version bigint NOT NULL DEFAULT 1,
        PRIMARY KEY(tenant_id,scope_key))`);
      await pool.query(REPORT_SOURCE_TRIGGERS);
    });

    async function missingReasonFixture(submit = true) {
      const classId = randomUUID(), learner = randomUUID(), peer = randomUUID();
      await pool.query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Reason corrections')`, [classId]);
      await pool.query(`INSERT INTO teacher_subject_assignments(tenant_id,class_section_id,subject_id,teacher_user_id)
        VALUES ('school-a',$1,$2,$3)`, [classId,ids.subject,ids.teacher]);
      for (const student of [learner,peer]) {
        await pool.query(`INSERT INTO students(id,tenant_id,first_name,admission_number) VALUES ($1::uuid,'school-a','Reason learner',$1::text)`, [student]);
        await pool.query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ('school-a',$1,$2)`, [student,classId]);
        await pool.query(`INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id)
          VALUES ('school-a',$1,$2,$3)`, [student,classId,ids.subject]);
      }
      const created = await createExam('submitted',[classId]);
      const window = await windowFor(created.exam.id,classId);
      const paper = await paperConfiguration.read(window.id);
      if (submit) await teacher.saveMarks('school-a',ids.teacher,{
        examId:window.id,classSectionId:classId,assessmentId:window.assessmentId,action:'submit',
        marks:{[learner]:{score:null,score_status:'X'},[peer]:{score:67,score_status:'entered'}},
      });
      const marks = () => pool.query(`SELECT *,updated_at::text AS exact_updated_at FROM exam_marks
        WHERE tenant_id='school-a' AND exam_series_id=$1 ORDER BY student_id`,[created.exam.id]).then(result=>result.rows);
      const command = async (score_status = 'Y') => ({
        mark_entry_window_id:window.id,assessment_id:window.assessmentId,student_id:learner,score_status,
        expected_updated_at:(await marks()).find(row=>row.student_id===learner)?.exact_updated_at ?? null,
        paper_config_version:paper.version,
      });
      return {classId,learner,peer,window,examId:created.exam.id,marks,command};
    }

    // The public service is intentionally exercised rather than bypassing its permission guard.
    const correctReason = (dto: Record<string,unknown>) => (exams as any).correctMissingMarkReason(dto);

    it('persists an individual submitted correction through the guarded HTTP contract and rejects forged or stale requests', async () => {
      const fixture = await missingReasonFixture();
      const dto = await fixture.command('absent');
      const module = await Test.createTestingModule({controllers:[ExamsController],
        providers:[{provide:ExamsService,useValue:exams}]}).compile();
      const app = module.createNestApplication();
      app.useGlobalGuards(new RbacGuard(new Reflector(),{requireStore:()=>activeContext} as never));
      app.useGlobalPipes(new ValidationPipe({transform:true,whitelist:true,forbidNonWhitelisted:true}));
      await app.init();
      try {
        const patch = (body: object) => request(app.getHttpServer()).patch('/exams/marks/missing-reason').send(body);
        await patch({...dto,tenant_id:'school-b'}).expect(400);
        activeContext={...teacherContext,permissions:[]};
        await patch(dto).expect(403);
        activeContext={...teacherContext,tenant_id:'school-b'};
        await patch(dto).expect(403);
        activeContext=teacherContext;
        const response=await patch(dto).expect(200);
        expect(response.body.data).toMatchObject({student_id:fixture.learner,score_status:'absent',status:'submitted',score:null});
        await patch(dto).expect(409);
        expect((await fixture.marks()).find(row=>row.student_id===fixture.learner).score_status).toBe('absent');
      } finally {activeContext=teacherContext;await app.close();}
    });

    it('saves and replaces a blank student reason before submission without creating other marks', async () => {
      const fixture = await missingReasonFixture(false);
      await correctReason(await fixture.command('medical_exception'));
      expect(await fixture.marks()).toEqual([expect.objectContaining({
        student_id:fixture.learner,score:null,score_status:'medical_exception',status:'draft',
        entered_by_user_id:ids.teacher,updated_by_user_id:ids.teacher,
      })]);
      await correctReason(await fixture.command('absent'));
      expect(await fixture.marks()).toEqual([expect.objectContaining({score_status:'absent',status:'draft'})]);
    });

    it.each(['teacher','manager'])('corrects a submitted reason as %s without resubmission or changing other marks', async role => {
      const fixture = await missingReasonFixture();
      const before = await fixture.marks();
      const submissionsBefore = submissions.length;
      const windowBefore = (await pool.query('SELECT * FROM exam_mark_entry_windows WHERE id=$1',[fixture.window.id])).rows[0];
      activeContext = role === 'manager' ? managerContext : teacherContext;
      try {
        await correctReason({...await fixture.command(),...(role==='manager'?{teacher_user_id:ids.teacher}:{})});
      } finally { activeContext = teacherContext; }
      const after = await fixture.marks();
      expect(after).toHaveLength(2);
      expect(after.find(row=>row.student_id===fixture.peer)).toEqual(before.find(row=>row.student_id===fixture.peer));
      const original = before.find(row=>row.student_id===fixture.learner);
      expect(after.find(row=>row.student_id===fixture.learner)).toMatchObject({
        id:original.id,score:null,score_status:'Y',status:'submitted',submitted_at:original.submitted_at,
        entered_by_user_id:ids.teacher,updated_by_user_id:role==='manager'?ids.manager:ids.teacher,
      });
      expect(submissions).toHaveLength(submissionsBefore);
      expect((await pool.query('SELECT * FROM exam_mark_entry_windows WHERE id=$1',[fixture.window.id])).rows[0]).toEqual(windowBefore);
      const audit = (await pool.query(`SELECT * FROM exam_mark_audit_logs WHERE mark_id=$1 ORDER BY created_at DESC`,[original.id])).rows[0];
      expect(audit).toMatchObject({student_id:fixture.learner,exam_series_id:fixture.examId,
        actor_user_id:role==='manager'?ids.manager:ids.teacher,metadata:expect.objectContaining({previous_score_status:'X',new_score_status:'Y'})});
      expect(audit.created_at).toBeInstanceOf(Date);
    });

    it('retains manager provenance when an unassigned missing reason is later handed to the assigned teacher', async () => {
      const fixture = await missingReasonFixture(false);
      await pool.query(`UPDATE teacher_subject_assignments SET status='inactive' WHERE class_section_id=$1`,[fixture.classId]);
      activeContext=managerContext;
      try {await correctReason(await fixture.command('absent'));}
      finally {activeContext=teacherContext;}
      const original=(await fixture.marks())[0];
      expect(original).toMatchObject({assigned_teacher_user_id:null,entered_by_user_id:ids.manager});
      await pool.query(`UPDATE teacher_subject_assignments SET status='active' WHERE class_section_id=$1`,[fixture.classId]);
      await correctReason(await fixture.command('medical_exception'));
      const updated=(await fixture.marks())[0];
      expect(updated).toMatchObject({id:original.id,entered_by_user_id:ids.manager,updated_by_user_id:ids.teacher,score_status:'medical_exception'});
      await teacher.saveMarks('school-a',ids.teacher,{examId:fixture.window.id,classSectionId:fixture.classId,
        assessmentId:fixture.window.assessmentId,action:'draft',marks:{[fixture.learner]:{
          score:67,score_status:'entered',expected_updated_at:updated.exact_updated_at}}});
      expect((await fixture.marks())[0]).toMatchObject({score:'67.00',entered_by_user_id:ids.manager,updated_by_user_id:ids.teacher});
    });

    it('rejects another school, unassigned teacher, missing capability and forged manager assistance', async () => {
      const fixture = await missingReasonFixture(); const dto = await fixture.command(); const before = await fixture.marks();
      for (const context of [
        {...teacherContext,tenant_id:'school-b'}, {...teacherContext,user_id:ids.otherTeacher},
        {...teacherContext,permissions:[]}, {...managerContext,permissions:['exams:enter-marks']},
      ]) {
        activeContext = context;
        try { await expect(correctReason(dto)).rejects.toThrow(); } finally { activeContext = teacherContext; }
      }
      await expect(correctReason({...dto,teacher_user_id:ids.otherTeacher})).rejects.toThrow();
      expect(await fixture.marks()).toEqual(before);
    });

    it('rejects a different paper, class learner, numeric mark and unsupported reason', async () => {
      const fixture = await missingReasonFixture(); const dto = await fixture.command(); const before = await fixture.marks();
      const other = await missingReasonFixture();
      for (const patch of [
        {assessment_id:other.window.assessmentId}, {student_id:other.learner},
        {student_id:fixture.peer,expected_updated_at:before.find(row=>row.student_id===fixture.peer).exact_updated_at},
        {score_status:'entered'}, {score_status:'invented_reason'},
      ]) await expect(correctReason({...dto,...patch})).rejects.toThrow();
      expect(await fixture.marks()).toEqual(before);
    });

    it.each(['reviewed','locked','published'])('requires controlled correction for %s marks', async status => {
      const fixture = await missingReasonFixture();
      await pool.query('UPDATE exam_marks SET status=$2 WHERE exam_series_id=$1',[fixture.examId,status]);
      const before = await fixture.marks(); activeContext = managerContext;
      try { await expect(correctReason(await fixture.command())).rejects.toThrow(); }
      finally { activeContext = teacherContext; }
      expect(await fixture.marks()).toEqual(before);
    });

    it.each(['locked','published','archived'])('rejects reason edits when the examination is %s', async status => {
      const fixture = await missingReasonFixture();
      await pool.query('UPDATE exam_series SET status=$2 WHERE id=$1',[fixture.examId,status]);
      const before = await fixture.marks(); activeContext = managerContext;
      try { await expect(correctReason(await fixture.command())).rejects.toThrow(); }
      finally { activeContext = teacherContext; }
      expect(await fixture.marks()).toEqual(before);
    });

    it('rejects closed entry and stale paper configuration without changing the reason', async () => {
      const fixture = await missingReasonFixture(); const dto = await fixture.command(); const before = await fixture.marks();
      await expect(correctReason({...dto,paper_config_version:dto.paper_config_version+1})).rejects.toThrow();
      await pool.query(`UPDATE exam_mark_entry_windows SET status='closed' WHERE id=$1`,[fixture.window.id]);
      await expect(correctReason(dto)).rejects.toThrow();
      expect(await fixture.marks()).toEqual(before);
    });

    it('uses optimistic concurrency for simultaneous reason corrections and does not duplicate marks', async () => {
      const fixture = await missingReasonFixture(); const dto = await fixture.command();
      const writes = await Promise.allSettled(['Y','absent'].map(score_status=>correctReason({...dto,score_status})));
      expect(writes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
      const failed = writes.filter(result=>result.status==='rejected') as PromiseRejectedResult[];
      expect(failed).toHaveLength(1);
      expect(failed[0].reason.getStatus()).toBe(409);
      const marks = await fixture.marks(); expect(marks).toHaveLength(2);
      expect(['Y','absent']).toContain(marks.find(row=>row.student_id===fixture.learner).score_status);
      await expect(correctReason({...dto,expected_updated_at:null})).rejects.toThrow();
    });

    it('rolls back the correction and its audit when event recording fails, then allows a retry', async () => {
      const fixture = await missingReasonFixture(); const dto = await fixture.command(); const before = await fixture.marks();
      const auditsBefore = (await pool.query('SELECT * FROM exam_mark_audit_logs WHERE exam_series_id=$1 ORDER BY id',[fixture.examId])).rows;
      rejectSchoolEvent = true;
      try { await expect(correctReason(dto)).rejects.toThrow('Outbox unavailable'); }
      finally { rejectSchoolEvent = false; }
      expect(await fixture.marks()).toEqual(before);
      expect((await pool.query('SELECT * FROM exam_mark_audit_logs WHERE exam_series_id=$1 ORDER BY id',[fixture.examId])).rows).toEqual(auditsBefore);
      await correctReason(dto);
      expect((await fixture.marks()).find(row=>row.student_id===fixture.learner).score_status).toBe('Y');
    });

    it('preserves numeric category marks when correcting irregularity to an absence reason', async () => {
      const fixture = await missingReasonFixture(false);
      const configured = await paperConfiguration.save(fixture.window.id, {version:(await fixture.command()).paper_config_version,papers:[{
        id:fixture.window.assessmentId,name:'Main Paper',max_score:80,weight:null,
        categories:[{name:'Theory',max_score:50},{name:'Practical',max_score:30}],
      }]});
      const paper = (await paperConfiguration.read(fixture.window.id)).papers[0];
      const categories = {[paper.categories[0].id]:30,[paper.categories[1].id]:'Y' as const};
      await teacher.saveMarks('school-a',ids.teacher,{examId:fixture.window.id,classSectionId:fixture.classId,
        assessmentId:fixture.window.assessmentId,paperConfigVersion:configured.version,action:'draft',
        marks:{[fixture.learner]:{score:null,score_status:'Y',category_scores:categories}}});
      await correctReason({...await fixture.command('absent'),paper_config_version:configured.version});
      const saved = (await fixture.marks())[0];
      expect(saved).toMatchObject({score:null,score_status:'absent',category_scores:{[paper.categories[0].id]:30,[paper.categories[1].id]:null}});
      await teacher.saveMarks('school-a',ids.teacher,{examId:fixture.window.id,classSectionId:fixture.classId,
        assessmentId:fixture.window.assessmentId,paperConfigVersion:configured.version,action:'draft',
        marks:{[fixture.learner]:{score:null,score_status:'absent',category_scores:saved.category_scores,expected_updated_at:saved.exact_updated_at}}});
      expect((await fixture.marks())[0].score_status).toBe('absent');
    });

    it('blocks a released report even when its mark and series were left submitted', async () => {
      const fixture = await missingReasonFixture();
      await pool.query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id,status)
        VALUES ('school-a',$1,$2,'published-reason-guard','published')`,[fixture.examId,fixture.learner]);
      const before = await fixture.marks();
      await expect(correctReason(await fixture.command())).rejects.toThrow(/controlled correction/);
      expect(await fixture.marks()).toEqual(before);
    });

    it('refreshes X/Y results and invalidates report sources immediately after a reason correction', async () => {
      const fixture = await missingReasonFixture();
      const batch = (await pool.query(`INSERT INTO report_card_generation_batches(tenant_id,exam_series_id,class_section_id,status,requested_by_user_id)
        VALUES ('school-a',$1,$2,'draft_generated',$3) RETURNING id`,[fixture.examId,fixture.classId,ids.manager])).rows[0];
      await repository.processResultBatch({tenant_id:'school-a',actor_user_id:ids.manager,batch_id:batch.id,mode:'rankings'});
      const snapshot = () => pool.query('SELECT * FROM exam_result_snapshots WHERE batch_id=$1 AND student_id=$2',[batch.id,fixture.learner]).then(result=>result.rows[0]);
      const revision = () => pool.query(`SELECT version FROM report_source_versions WHERE tenant_id='school-a' AND scope_key=$1`,[`student:${fixture.learner}`]).then(result=>Number(result.rows[0]?.version ?? 0));
      const before = await revision();
      expect(await snapshot()).toMatchObject({grade_label:'X',average_percentage:null,class_rank:null});
      await correctReason(await fixture.command('Y'));
      expect(await snapshot()).toMatchObject({grade_label:'Y',average_percentage:null,raw_total:null,class_rank:null});
      expect(await revision()).toBeGreaterThan(before);
      await correctReason(await fixture.command('X'));
      expect(await snapshot()).toMatchObject({grade_label:'X',average_percentage:null,class_rank:null});
    });
  });
});
