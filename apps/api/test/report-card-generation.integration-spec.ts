import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { HrSchemaService } from '../src/modules/hr/hr-schema.service';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { ReportCardGenerationService } from '../src/modules/exams/services/report-card-generation.service';
import { ReportCardTemplateService } from '../src/modules/exams/services/report-card-template.service';
import { SchoolOperationalEventsService } from '../src/modules/events/school-operational-events.service';
import { EventPublisherService } from '../src/modules/events/event-publisher.service';
import { OutboxEventsRepository } from '../src/modules/events/repositories/outbox-events.repository';
import { SchoolOperationNotificationsRepository } from '../src/modules/events/repositories/school-operation-notifications.repository';

describe('Report generation with the production staff schema', () => {
  let pool: Pool;
  let repository: ExamsRepository;
  let generation: ReportCardGenerationService;
  let failArtifact = false;
  let failOutbox = false;
  let sqlReads = 0;
  const ids = Object.fromEntries(['exam', 'term', 'year', 'class', 'subject', 'assessment', 'teacher', 'principal', 'actor', 'grading', 'role'].map(key => [key, randomUUID()]));
  const students = Array.from({ length: 11 }, () => randomUUID());
  const scope = { tenant_id: 'school-a', exam_series_id: ids.exam, class_section_id: ids.class, actor_user_id: ids.actor };
  const query = (sql: string, params: unknown[] = []) => pool.query(sql, params);
  const context = { tenant_id: 'school-a', user_id: ids.actor, role: 'exams_manager', is_authenticated: true, permissions: ['exams:write'] };

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.includes('disposable')) throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=report_generation,public', max: 8 });
    await query('CREATE SCHEMA report_generation');
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const sql of bootstrap.matchAll(/CREATE TABLE IF NOT EXISTS \w+ \([\s\S]*?\n      \);/g)) await query(sql[0]);
    let hrBootstrap = '';
    await new HrSchemaService({ runSchemaBootstrap: async (sql: string) => { hrBootstrap += sql; } } as never).onModuleInit();
    const staffTable = hrBootstrap.match(/CREATE TABLE IF NOT EXISTS staff_profiles \([\s\S]*?\n      \);/)![0];
    await query(staffTable);
    await query(`
      CREATE UNIQUE INDEX report_current ON student_report_cards(tenant_id,exam_series_id,student_id) WHERE is_current;
      CREATE UNIQUE INDEX report_verification ON report_card_artifacts(tenant_id,verification_code,artifact_type);
      CREATE TABLE tenants(tenant_id text,name text,settings jsonb DEFAULT '{}');
      CREATE TABLE academic_years(tenant_id text,id text,name text);
      CREATE TABLE academic_terms(tenant_id text,id text,name text,academic_year_id text,starts_on date,ends_on date);
      CREATE TABLE students(tenant_id text,id text,status text,first_name text,middle_name text,last_name text,admission_number text,
        upi_number text,gender text,boarding_status text,created_at timestamptz DEFAULT NOW());
      CREATE TABLE student_class_assignments(tenant_id text,student_id text,class_section_id text,stream_id text,status text,
        academic_year_id text,updated_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW());
      CREATE TABLE student_subject_enrollments(tenant_id text,student_id text,class_section_id text,subject_id text,status text);
      CREATE TABLE class_sections(tenant_id text,id text,name text,custom_label text);
      CREATE TABLE class_streams(tenant_id text,id text,name text);
      CREATE TABLE subjects(tenant_id text,id text,name text);
      CREATE TABLE academics_class_teachers(tenant_id text,teacher_user_id uuid,academic_year_id text,class_section_id text,
        is_active boolean,status text,effective_from date,effective_to date,updated_at timestamptz DEFAULT NOW());
      CREATE TABLE users(id uuid PRIMARY KEY,full_name text,display_name text,email text,status text);
      CREATE TABLE roles(tenant_id text,id uuid,code text);
      CREATE TABLE tenant_memberships(tenant_id text,user_id uuid,role_id uuid,status text);
      CREATE TABLE user_roles(tenant_id text,user_id uuid,role_id uuid,status text,deleted_at timestamptz);
      CREATE TABLE report_card_comments(tenant_id text,student_id text,class_section_id text,academic_term_id text,
        final_comment text,comment_status text,updated_at timestamptz,created_at timestamptz);
      CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
      CREATE TABLE attendance_records(tenant_id text,student_id text,status "AttendanceStatus",attendance_date date);
      CREATE TABLE academics_grading_systems(tenant_id text,id uuid,name text,version integer,is_active boolean,
        effective_from date,effective_to date,rules jsonb,updated_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW());
      CREATE TABLE academics_report_card_settings(tenant_id text,grading_system_id uuid,is_active boolean,show_rank boolean,
        show_attendance boolean,configuration jsonb,archived_at timestamptz,updated_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW());
      CREATE TABLE outbox_events(id uuid DEFAULT gen_random_uuid(),tenant_id text,school_id text,event_key text,event_name text,
        aggregate_type text,aggregate_id uuid,payload jsonb,headers jsonb,status text,attempt_count integer DEFAULT 0,
        available_at timestamptz,published_at timestamptz,last_error text,actor_user_id uuid,actor_role text,source_dashboard text,
        correlation_id uuid,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),UNIQUE(tenant_id,event_key));
    `);
    await query(`CREATE ROLE report_generation_runtime NOLOGIN;
      GRANT USAGE ON SCHEMA report_generation TO report_generation_runtime;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA report_generation TO report_generation_runtime;`);
    for (const table of ['student_report_cards', 'report_card_artifacts', 'student_report_card_audit_logs',
      'report_card_generation_batches', 'outbox_events', 'students', 'exam_marks', 'staff_profiles']) {
      await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY report_tenant ON ${table} USING (tenant_id = current_setting('app.tenant_id', true))
          WITH CHECK (tenant_id = current_setting('app.tenant_id', true));`);
    }
    const prisma = {
      executeWithTenant: async (tenant: string, actor: string, callback: (tx: any) => Promise<any>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query('SET LOCAL ROLE report_generation_runtime');
          await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
          const raw = async (sql: string, ...params: unknown[]) => {
            if (failArtifact && /INSERT INTO report_card_artifacts/.test(sql) && params[2] === 'pdf') throw new Error('Injected PDF manifest failure');
            if (failOutbox && /INSERT INTO outbox_events/.test(sql)) throw new Error('Injected outbox failure');
            sqlReads++;
            return (await client.query(sql, params)).rows;
          };
          const result = await callback({ $queryRawUnsafe: raw });
          await client.query('COMMIT');
          return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
    };
    repository = new ExamsRepository(prisma as never);
    const requestContext = { requireStore: () => context, getStore: () => context } as never;
    const events = new SchoolOperationalEventsService(requestContext,
      new EventPublisherService(requestContext, new OutboxEventsRepository(prisma as never)),
      new SchoolOperationNotificationsRepository(prisma as never));
    generation = new ReportCardGenerationService(repository, new ReportCardTemplateService(), undefined, events);
    await query(`INSERT INTO tenants VALUES ('school-a','Test School','{}'),('school-b','Other School','{}');
      INSERT INTO academic_years VALUES ('school-a','${ids.year}','2026');
      INSERT INTO academic_terms VALUES ('school-a','${ids.term}','Term 3','${ids.year}','2026-09-01','2026-12-01');
      INSERT INTO class_sections VALUES ('school-a','${ids.class}','Form 4',NULL);
      INSERT INTO subjects VALUES ('school-a','${ids.subject}','Mathematics');
      INSERT INTO users VALUES ('${ids.teacher}','Teacher Account','Teacher Account','teacher@example.test','active'),
        ('${ids.principal}','Principal Account','Principal Account','principal@example.test','active');
      INSERT INTO staff_profiles(tenant_id,user_id,display_name) VALUES ('school-a','${ids.teacher}','Assigned Teacher'),('school-a','${ids.principal}','School Principal');
      INSERT INTO roles VALUES ('school-a','${ids.role}','principal');
      INSERT INTO tenant_memberships VALUES ('school-a','${ids.principal}','${ids.role}','active');
      INSERT INTO academics_class_teachers(tenant_id,teacher_user_id,academic_year_id,class_section_id,is_active,status)
        VALUES ('school-a','${ids.teacher}','${ids.year}','${ids.class}',true,'active');
      INSERT INTO exam_report_card_signatures(tenant_id,signer_user_id,signer_role,storage_path,original_file_name,mime_type,size_bytes,checksum_sha256,uploaded_by_user_id)
        VALUES ('school-a','${ids.principal}','principal','tenant/school-a/principal.png','principal.png','image/png',12,'${'a'.repeat(64)}','${ids.principal}');
      INSERT INTO academics_grading_systems(tenant_id,id,name,version,is_active,rules) VALUES
        ('school-a','${ids.grading}','School grading',1,true,'[{"min":0,"max":100,"label":"A","points":12,"remark":"Excellent"}]');
      INSERT INTO academics_report_card_settings(tenant_id,grading_system_id,is_active,show_rank,show_attendance,configuration)
        VALUES ('school-a','${ids.grading}',true,true,true,'{}');
    `);
    await query(`INSERT INTO exam_series(id,tenant_id,academic_term_id,name,starts_on,ends_on,created_by_user_id)
      VALUES ($1,'school-a',$2,'END TERM 3','2026-10-01','2026-10-30',$3)`, [ids.exam, ids.term, ids.actor]);
    await query(`INSERT INTO exam_assessments(id,tenant_id,exam_series_id,subject_id,name,max_score,weight,created_by_user_id)
      VALUES ($1,'school-a',$2,$3,'End Term',100,100,$4)`, [ids.assessment, ids.exam, ids.subject, ids.actor]);
    await query(`INSERT INTO exam_mark_entry_windows(tenant_id,exam_series_id,class_section_id,subject_id,status,opens_at,closes_at)
      VALUES ('school-a',$1,$2,$3,'open',NOW(),NOW()+INTERVAL '1 day')`, [ids.exam, ids.class, ids.subject]);
    await addStudents(students);
    await query(`INSERT INTO attendance_records VALUES ('school-a',$1,'PRESENT','2026-10-01'),('school-a',$1,'LATE','2026-10-02'),('school-a',$1,'ABSENT','2026-10-03')`, [students[0]]);
  }, 60000);
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => {
    failArtifact = false; failOutbox = false; sqlReads = 0;
    await query('TRUNCATE student_report_cards, report_card_artifacts, student_report_card_audit_logs, report_card_generation_batches, outbox_events');
  });

  async function addStudents(learners: string[]) {
    await query(`INSERT INTO students(tenant_id,id,status,first_name,last_name,admission_number)
      SELECT 'school-a',id,'active','Test','Learner',id FROM unnest($1::text[]) id`, [learners]);
    await query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,status,academic_year_id)
      SELECT 'school-a',id,$2,'active',$3 FROM unnest($1::text[]) id`, [learners, ids.class, ids.year]);
    await query(`INSERT INTO student_subject_enrollments SELECT 'school-a',id,$2,$3,'active' FROM unnest($1::text[]) id`, [learners, ids.class, ids.subject]);
    await query(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,class_section_id,subject_id,student_id,score,score_status,status,entered_by_user_id,academic_term_id)
      SELECT 'school-a',$2,$3,$4,$5,id::uuid,84,'entered','locked',$6,$7 FROM unnest($1::text[]) id`, [learners, ids.exam, ids.assessment, ids.class, ids.subject, ids.actor, ids.term]);
  }
  const studentInput = () => ({ ...scope, student_id: students[0] });
  const count = async (table: string) => Number((await query(`SELECT COUNT(*) FROM ${table}`)).rows[0].count);

  it('generates all 11 cards using the actual HR staff table without full_name, preferred_name or email columns', async () => {
    const result = await generation.generateReportCardBatch(scope);
    expect(result).toMatchObject({ total_students: 11, completed_students: 11, failed_students: 0, queue_status: 'completed' });
    expect(await count('report_card_artifacts')).toBe(22);
    expect(await count('student_report_card_audit_logs')).toBe(12);
    expect(await count('outbox_events')).toBe(12);
    const card = (await query('SELECT metadata FROM student_report_cards LIMIT 1')).rows[0];
    expect(card.metadata.report_card.template_fields.class_teacher_name).toBe('Assigned Teacher');
    expect(card.metadata.report_card.template_fields.principal_name).toBe('School Principal');
    expect((await generation.getReportCardBatchStatus({ tenant_id: 'school-a', batch_id: result.id })).completed_students).toBe(11);
    await expect(generation.getReportCardBatchStatus({ tenant_id: 'school-b', batch_id: result.id })).rejects.toThrow('not found');
  });

  it('rolls back the snapshot, first artifact and audit when the second artifact fails', async () => {
    failArtifact = true;
    await expect(generation.generateStudentReportCard(studentInput())).rejects.toThrow('Injected PDF');
    for (const table of ['student_report_cards', 'report_card_artifacts', 'student_report_card_audit_logs', 'outbox_events']) expect(await count(table)).toBe(0);
    failArtifact = false;
    await generation.generateStudentReportCard(studentInput());
    expect(await count('student_report_cards')).toBe(1);
    expect(await count('report_card_artifacts')).toBe(2);
  });

  it('rolls back the whole report if event persistence fails', async () => {
    failOutbox = true;
    await expect(generation.generateStudentReportCard(studentInput())).rejects.toThrow('Injected outbox');
    for (const table of ['student_report_cards', 'report_card_artifacts', 'student_report_card_audit_logs', 'outbox_events']) expect(await count(table)).toBe(0);
  });

  it('serializes simultaneous duplicate generations and safely reuses cards in an interrupted batch', async () => {
    const input = { ...studentInput(), reuse_existing: true };
    const results = await Promise.all(Array.from({ length: 4 }, () => generation.generateStudentReportCard(input)));
    expect(new Set(results.map(result => result.id)).size).toBe(1);
    expect(results.filter(result => result.reused)).toHaveLength(3);
    expect(await count('report_card_artifacts')).toBe(2);
    expect(await count('outbox_events')).toBe(1);
    const batch = await generation.generateReportCardBatch(scope);
    expect(batch).toMatchObject({ completed_students: 11, reused_students: 1, failed_students: 0 });
    expect(await count('student_report_cards')).toBe(11);
  });

  it('never reads another school and does not change submitted or published cards on a repeat batch', async () => {
    await expect(generation.generateStudentReportCard({ ...studentInput(), tenant_id: 'school-b' })).rejects.toThrow('not found');
    const first = await generation.generateStudentReportCard(studentInput());
    await query("UPDATE student_report_cards SET status='published' WHERE id=$1", [first.id]);
    const repeated = await generation.generateReportCardBatch(scope);
    expect(repeated.reused_students).toBe(1);
    const persisted = (await query('SELECT * FROM student_report_cards WHERE id=$1', [first.id])).rows[0];
    expect(persisted.status).toBe('published');
    expect(persisted.verification_code).toBe(first.verification_code);
    expect(persisted.revision_number).toBe(1);
  });

  it('updates a reusable draft when school branding changes, and rejects changed marks on a published card', async () => {
    const first = await generation.generateStudentReportCard({ ...studentInput(), reuse_existing: true });
    await query("UPDATE tenants SET name='Updated Test School' WHERE tenant_id='school-a'");
    const changed = await generation.generateStudentReportCard({ ...studentInput(), reuse_existing: true });
    expect(changed.reused).toBe(false);
    expect((changed.metadata as any).report_card.template_fields.school_name).toBe('Updated Test School');
    await query("UPDATE student_report_cards SET status='published' WHERE id=$1", [first.id]);
    await query("UPDATE exam_marks SET score=85 WHERE tenant_id='school-a' AND student_id=$1", [students[0]]);
    await expect(generation.generateStudentReportCard({ ...studentInput(), reuse_existing: true })).rejects.toThrow('controlled recall');
    expect((await query('SELECT status,verification_code FROM student_report_cards WHERE id=$1', [first.id])).rows[0])
      .toMatchObject({ status: 'published', verification_code: changed.verification_code });
    await query("UPDATE exam_marks SET score=84 WHERE tenant_id='school-a' AND student_id=$1", [students[0]]);
    await query("UPDATE tenants SET name='Test School' WHERE tenant_id='school-a'");
  });

  it('shares school/series reads only inside the supplied batch and never across schools', async () => {
    const read_cache = new Map();
    await repository.loadReportCardData({ ...studentInput(), read_cache });
    const firstReadCount = sqlReads;
    await repository.loadReportCardData({ ...studentInput(), student_id: students[1], read_cache });
    expect(sqlReads - firstReadCount).toBeLessThan(firstReadCount);
    const foreign = await repository.loadReportCardData({ ...studentInput(), tenant_id: 'school-b', read_cache });
    expect(foreign.student).toBeNull();
    expect((foreign.school as any).name).toBe('Other School');
    const own = await repository.loadReportCardData(studentInput());
    expect(own.attendance).toMatchObject({ total_days: 3, days_present: 2, days_absent: 1, late_arrivals: 1 });
  });

  it('measures a complete 100-learner batch with real HTML/PDF generation and PostgreSQL persistence', async () => {
    await addStudents(Array.from({ length: 89 }, () => randomUUID()));
    for (let index = 0; index < 6; index++) {
      const subject = randomUUID(); const assessment = randomUUID();
      await query("INSERT INTO subjects VALUES ('school-a',$1,$2)", [subject, `Subject ${index + 2}`]);
      await query(`INSERT INTO exam_assessments(id,tenant_id,exam_series_id,subject_id,name,max_score,weight)
        VALUES ($1,'school-a',$2,$3,'End Term',100,100)`, [assessment, ids.exam, subject]);
      await query(`INSERT INTO exam_mark_entry_windows(tenant_id,exam_series_id,class_section_id,subject_id,opens_at,closes_at)
        VALUES ('school-a',$1,$2,$3,NOW(),NOW()+INTERVAL '1 day')`, [ids.exam, ids.class, subject]);
      await query(`INSERT INTO student_subject_enrollments SELECT 'school-a',id,$1,$2,'active' FROM students WHERE tenant_id='school-a'`, [ids.class, subject]);
      await query(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,class_section_id,subject_id,student_id,score,score_status,status,entered_by_user_id,academic_term_id)
        SELECT 'school-a',$1,$2,$3,$4,id::uuid,84,'entered','locked',$5,$6 FROM students WHERE tenant_id='school-a'`,
        [ids.exam, assessment, ids.class, subject, ids.actor, ids.term]);
    }
    const start = performance.now();
    const result = await generation.generateReportCardBatch({ ...scope, batch_size: 100 });
    const elapsed = performance.now() - start;
    expect(result).toMatchObject({ total_students: 100, completed_students: 100, failed_students: 0 });
    expect(await count('report_card_artifacts')).toBe(200);
    const measurement = { benchmark: 'local PostgreSQL + real HTML/PDF + audit/outbox, 7 subjects per card', cards: 100,
      elapsed_ms: Math.round(elapsed), cards_per_second: Number((100000 / elapsed).toFixed(2)), sql_operations: sqlReads };
    console.log(JSON.stringify(measurement));
    if (process.env.REPORT_GENERATION_BENCHMARK_OUTPUT) {
      await writeFile(process.env.REPORT_GENERATION_BENCHMARK_OUTPUT, JSON.stringify(measurement, null, 2));
    }
  }, 60000);
});
