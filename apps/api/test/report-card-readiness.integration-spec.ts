import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { ExamsService } from '../src/modules/exams/exams.service';
import { ReportCardGenerationService } from '../src/modules/exams/services/report-card-generation.service';

describe('Exam-specific report-card readiness', () => {
  let pool: Pool;
  let repository: ExamsRepository;
  const ids = { exam: randomUUID(), otherExam: randomUUID(), class: randomUUID(), otherClass: randomUUID(), subject: randomUUID(), otherSubject: randomUUID() };
  const students = Array.from({ length: 50 }, () => randomUUID());
  const scope = { tenant_id: 'school-a', exam_series_id: ids.exam, class_section_id: ids.class };
  const query = (sql: string, values: unknown[] = []) => pool.query(sql, values);

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) throw new Error('Use disposable local PostgreSQL.');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=report_readiness,public' });
    await query(`CREATE SCHEMA report_readiness;
      CREATE TABLE exam_series(tenant_id text,id uuid,name text);
      CREATE TABLE exam_mark_entry_windows(tenant_id text,exam_series_id uuid,class_section_id uuid,subject_id uuid);
      CREATE TABLE students(tenant_id text,id text,status text);
      CREATE TABLE student_class_assignments(tenant_id text,student_id text,class_section_id text,stream_id text,status text);
      CREATE TABLE student_subject_enrollments(tenant_id text,student_id text,class_section_id text,subject_id text,status text);
      CREATE TABLE class_streams(tenant_id text,id text,name text);
      CREATE TABLE class_sections(tenant_id text,id text,name text,custom_label text);
      CREATE TABLE subjects(tenant_id text,id text,name text);
      CREATE TABLE exam_marks(tenant_id text,exam_series_id uuid,class_section_id uuid,subject_id uuid,student_id uuid,status text);`);
    repository = new ExamsRepository({ executeWithTenant: async (tenant: string, actor: unknown, callback: (tx: unknown) => unknown) => {
      expect(tenant).toMatch(/^school-[ab]$/);
      return callback({ $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await query(sql, values)).rows });
    } } as never);
  });
  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await query(`TRUNCATE exam_series,exam_mark_entry_windows,students,student_class_assignments,
      student_subject_enrollments,class_streams,class_sections,subjects,exam_marks`);
    await query(`INSERT INTO exam_series VALUES ('school-a',$1,'END TERM 3'),('school-a',$2,'MID TERM 3'),('school-b',$1,'Private exam');
      `, [ids.exam, ids.otherExam]);
    await query(`INSERT INTO class_sections VALUES ('school-a',$1,'Form 4',NULL),('school-a',$2,'Form 3',NULL)`, [ids.class, ids.otherClass]);
    await query(`INSERT INTO subjects VALUES ('school-a',$1,'Mathematics'),('school-a',$2,'Biology')`, [ids.subject, ids.otherSubject]);
    await query(`INSERT INTO exam_mark_entry_windows VALUES ('school-a',$1,$2,$3)`, [ids.exam, ids.class, ids.subject]);
    await query(`INSERT INTO students SELECT 'school-a',id,'active' FROM unnest($1::text[]) id`, [students]);
    await query(`INSERT INTO student_class_assignments SELECT 'school-a',id,$2,NULL,'active' FROM unnest($1::text[]) id`, [students, ids.class]);
    await query(`INSERT INTO student_subject_enrollments SELECT 'school-a',id,$2,$3,'active' FROM unnest($1::text[]) id`, [students, ids.class, ids.subject]);
    await query(`INSERT INTO exam_marks VALUES ('school-a',$1,$2,$3,$4,'locked')`, [ids.exam, ids.class, ids.subject, students[0]]);
  });

  it('reports the screenshot case as 49 missing marks and rejects generation before any writes', async () => {
    const [listed] = await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' });
    const readiness = await repository.getReportCardBatchReadiness(scope);
    expect(listed).toMatchObject({ ready: false, expected_mark_count: 50, ready_mark_count: 1, not_ready_mark_count: 49, learner_count: 50 });
    expect(listed.blockers).toEqual([expect.objectContaining({ subject_name: 'Mathematics', missing_mark_count: 49 })]);
    expect(readiness.not_ready_mark_count).toBe(listed.not_ready_mark_count);
    const create = jest.spyOn(repository, 'createReportCardGenerationBatch');
    const generation = new ReportCardGenerationService(repository, {} as never);
    await expect(generation.generateReportCardBatch({ ...scope, actor_user_id: randomUUID() })).rejects.toThrow('49 learner-subject marks');
    expect(create).not.toHaveBeenCalled();
  });

  it('keeps a completed exam ready while another exam, class and school have incomplete marks', async () => {
    await query(`INSERT INTO exam_mark_entry_windows VALUES ('school-a',$1,$2,$3),('school-a',$1,$4,$3),('school-b',$5,$2,$3)`,
      [ids.otherExam, ids.class, ids.subject, ids.otherClass, ids.exam]);
    await query(`INSERT INTO exam_marks SELECT 'school-a',$1,$2,$3,id::uuid,'published' FROM unnest($4::text[]) id`,
      [ids.otherExam, ids.class, ids.subject, students]);
    // Subject enrollment alone does not add a subject outside the chosen exam.
    await query(`INSERT INTO student_subject_enrollments SELECT 'school-a',id,$2,$3,'active' FROM unnest($1::text[]) id`, [students, ids.class, ids.otherSubject]);
    const scopes = await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' });
    expect(scopes).toHaveLength(3);
    expect(scopes.every(row => row.exam_series_name !== 'Private exam')).toBe(true);
    expect(scopes.find(row => row.exam_series_id === ids.otherExam && row.class_section_id === ids.class))
      .toMatchObject({ ready: true, expected_mark_count: 50, ready_mark_count: 50, blockers: [] });
    expect(await repository.getReportCardBatchReadiness({ ...scope, exam_series_id: ids.otherExam }))
      .toMatchObject({ not_ready_mark_count: 0, learner_count: 50 });
    expect(await repository.getReportCardBatchReadiness(scope)).toMatchObject({ not_ready_mark_count: 49 });
  });

  it('does not let foreign-school marks satisfy missing marks, even when record IDs coincide', async () => {
    await query(`INSERT INTO exam_marks SELECT 'school-b',$1,$2,$3,id::uuid,'locked' FROM unnest($4::text[]) id`, [ids.exam, ids.class, ids.subject, students]);
    expect(await repository.getReportCardBatchReadiness(scope)).toMatchObject({ ready_mark_count: 1, not_ready_mark_count: 49 });
  });

  it('distinguishes missing, draft, submitted and reviewed marks and becomes ready only after locking', async () => {
    for (const [index, status] of ['draft', 'submitted', 'reviewed'].entries()) {
      await query(`INSERT INTO exam_marks VALUES ('school-a',$1,$2,$3,$4,$5)`, [ids.exam, ids.class, ids.subject, students[index + 1], status]);
    }
    expect((await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' }))[0].blockers[0])
      .toMatchObject({ missing_mark_count: 46, draft_mark_count: 1, submitted_mark_count: 1, reviewed_mark_count: 1 });
    await query(`INSERT INTO exam_marks SELECT 'school-a',$1,$2,$3,id::uuid,'locked' FROM unnest($4::text[]) id`, [ids.exam, ids.class, ids.subject, students.slice(4)]);
    await query(`UPDATE exam_marks SET status='locked' WHERE tenant_id='school-a'`);
    expect((await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' }))[0]).toMatchObject({ ready: true, blockers: [] });
    expect(await repository.getReportCardBatchReadiness(scope)).toMatchObject({ not_ready_mark_count: 0 });
    // One finalized paper must not conceal another entered paper awaiting review.
    await query(`INSERT INTO exam_marks VALUES ('school-a',$1,$2,$3,$4,'submitted')`, [ids.exam, ids.class, ids.subject, students[0]]);
    expect((await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' }))[0]).toMatchObject({ ready: false, not_ready_mark_count: 1 });
  });

  it('includes every configured scope beyond mark-sheet pagination and avoids duplicate enrollment counts', async () => {
    await query(`INSERT INTO student_subject_enrollments SELECT * FROM student_subject_enrollments;
      INSERT INTO student_class_assignments SELECT * FROM student_class_assignments;
      INSERT INTO exam_mark_entry_windows SELECT * FROM exam_mark_entry_windows;`);
    for (let index = 0; index < 55; index++) {
      const id = randomUUID();
      await query(`INSERT INTO exam_series VALUES ('school-a',$1,$2)`, [id, `Exam ${index}`]);
      await query(`INSERT INTO exam_mark_entry_windows VALUES ('school-a',$1,$2,$3)`, [id, ids.class, ids.subject]);
    }
    const scopes = await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' });
    expect(scopes).toHaveLength(56);
    expect(scopes.every(row => row.expected_mark_count === 50)).toBe(true);
    expect(scopes.find(row => row.exam_series_id === ids.exam)?.not_ready_mark_count).toBe(49);
  });

  it('honors stream filtering and keeps empty classes visible without claiming readiness', async () => {
    await query(`INSERT INTO class_streams VALUES ('school-a','north','North');
      INSERT INTO exam_mark_entry_windows VALUES ('school-a','${ids.exam}','${ids.otherClass}','${ids.subject}');`);
    await query(`UPDATE student_class_assignments SET stream_id='north' WHERE student_id=$1`, [students[0]]);
    expect(await repository.getReportCardBatchReadiness({ ...scope, stream_name: 'North' })).toMatchObject({ learner_count: 1, not_ready_mark_count: 0 });
    expect((await repository.listReportCardGenerationScopes({ tenant_id: 'school-a' })).find(row => row.class_section_id === ids.otherClass))
      .toMatchObject({ ready: false, expected_mark_count: 0, learner_count: 0 });
    expect(await repository.getReportCardBatchReadiness({ ...scope, exam_series_id: randomUUID() })).toMatchObject({ expected_mark_count: 0 });
  });

  it('requires an exams officer and derives school scope from the authenticated context', async () => {
    const context = { tenant_id: 'school-a', user_id: randomUUID(), role: 'exams_officer', permissions: ['exams:read', 'exams:write', 'exams:approve'] };
    const service = new ExamsService({ getStore: () => context } as never, repository, {} as never);
    expect(await service.listReportCardGenerationScopes()).toHaveLength(1);
    context.role = 'parent'; context.permissions = ['exams:read'];
    expect(() => service.listReportCardGenerationScopes()).toThrow('Exam approval permission');
    context.role = 'exams_officer'; context.permissions = ['exams:read', 'exams:write']; context.tenant_id = '';
    expect(() => service.listReportCardGenerationScopes()).toThrow();
  });
});
