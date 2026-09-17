import { Pool, PoolClient } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { AcademicsSchemaService } from '../src/modules/academics/academics-schema.service';
import { COHORT_SCHEMA_SQL } from '../src/modules/academics/cohort-schema';
import { ensureCohortContexts, ensureCohortMigration } from '../src/modules/academics/cohort-configuration';
import { writeCohortSubjects, writeCohortTeacher } from '../src/modules/academics/cohort-assignment-writes';
import { CohortPromotionService } from '../src/modules/admissions/cohort-promotion.service';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { AdmissionsRepository } from '../src/modules/admissions/repositories/admissions.repository';

jest.setTimeout(120_000);

describe('Persistent cohort teaching configuration in PostgreSQL', () => {
  let pool: Pool;
  let prismaClient: PrismaClient;
  let promotion: CohortPromotionService;
  let repository: AcademicsRepository;
  let admissions: AdmissionsRepository;
  const actor = { tenantId: 'cohort-school', userId: randomUUID(), role: 'deputy_principal' };
  const teachers = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  const txFor = (client: PoolClient) => ({
    $queryRawUnsafe: async (sql: string, ...values: any[]) => (await client.query(sql, values)).rows,
  });
  const transaction = async <T>(work: (tx: ReturnType<typeof txFor>) => Promise<T>) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id',$1,true)", [actor.tenantId]);
      const result = await work(txFor(client));
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  };
  const q = async (sql: string, values: any[] = []) => (await pool.query(sql, values)).rows;

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !process.env.DATABASE_URL) throw new Error('Disposable PostgreSQL is required.');
    const url = new URL(process.env.DATABASE_URL);
    if (!['127.0.0.1','localhost','[::1]'].includes(url.hostname) || !url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Refusing a non-disposable database.');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE schools (id text PRIMARY KEY, slug text);
      CREATE TABLE tenant_memberships (tenant_id text, user_id uuid, status text DEFAULT 'active');
      CREATE TABLE students (id text PRIMARY KEY,tenant_id text,first_name text,middle_name text,last_name text,
        status text DEFAULT 'active',metadata jsonb,current_class_id text,current_stream_id text,updated_at timestamptz DEFAULT NOW());
      CREATE TABLE student_academic_enrollments (id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text,student_id text,application_id text,class_section_id text,class_name text,stream_name text,
        academic_year text,status text DEFAULT 'active',enrolled_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),
        UNIQUE(tenant_id,student_id,academic_year));
      CREATE TABLE student_academic_lifecycle_events (id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text,student_id text,source_enrollment_id text,target_enrollment_id text,event_type text,
        from_class_name text,from_stream_name text,from_academic_year text,to_class_section_id text,to_class_name text,
        to_stream_name text,to_academic_year text,reason text,created_by_user_id uuid);
      CREATE TABLE notifications (id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,notification_key text,
        recipient_user_id uuid,type text,title text,body text,priority text,source_module text,source_record_id text,metadata jsonb,
        UNIQUE(tenant_id,notification_key));
      CREATE TABLE cohort_test_events (payload jsonb);
      CREATE TABLE student_subject_enrollments(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        tenant_id text,student_id text,academic_enrollment_id text,academic_year_id text,class_section_id text,stream_id text,
        subject_id text,subject_code text,subject_name text,is_compulsory boolean,selected_by_user_id uuid,
        status text DEFAULT 'active',created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      CREATE UNIQUE INDEX test_subject_enrollment_scope ON student_subject_enrollments(tenant_id,student_id,academic_year_id,subject_id) WHERE status='active';
      CREATE TABLE student_timetable_enrollments(id text,tenant_id text,student_id text,status text,updated_at timestamptz);
      CREATE TABLE historical_results (student_id text,class_section_id text,academic_term_id text,marks integer);
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END $$ LANGUAGE plpgsql;
    `);
    await new AcademicsSchemaService({runSchemaBootstrap: async (sql: string) => pool.query(sql)} as never).onModuleInit();
    await pool.query(COHORT_SCHEMA_SQL);
    await pool.query("ALTER TABLE student_class_assignments ALTER COLUMN school_id SET NOT NULL");
    prismaClient = new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});
    const prisma = {executeWithTenant: async (tenant: string, _user: string | null, work: any) => prismaClient.$transaction(async tx => {
      await tx.$queryRawUnsafe("SELECT set_config('app.tenant_id',$1,true)",tenant);
      return work(tx);
    },{timeout:60000,maxWait:30000})};
    const events = { publish: async (event: any, tx: any) => tx.$queryRawUnsafe(
      'INSERT INTO cohort_test_events(payload) VALUES ($1::jsonb) RETURNING payload', JSON.stringify(event)) };
    promotion = new CohortPromotionService(prisma as never, events as never);
    repository = new AcademicsRepository(prisma as never);
    admissions = new AdmissionsRepository(prisma as never);
  });
  afterAll(async () => { await prismaClient?.$disconnect(); await pool?.end(); });

  beforeEach(async () => {
    await pool.query(`TRUNCATE academic_years,class_sections,class_streams,subjects,academic_levels,
      academic_cohorts,academic_cohort_migrations,academic_cohort_migration_issues,academic_cohort_promotion_operations,
      students,student_academic_enrollments,student_academic_lifecycle_events,notifications,cohort_test_events,
      historical_results,tenant_memberships,academic_audit_logs,student_subject_enrollments,student_timetable_enrollments CASCADE`);
    for (const year of [2026,2027,2028]) await q(`INSERT INTO academic_years
      (id,tenant_id,name,starts_on,ends_on,status,is_current) VALUES ($1,$2,$1,$3::date,$4::date,'active',$5)`,
    [String(year),actor.tenantId,`${year}-01-01`,`${year}-12-31`,year===2026]);
    await q(`INSERT INTO academic_levels(id,tenant_id,name,system_type,order_index) VALUES ('level',$1,'Junior','CBC',1)`,[actor.tenantId]);
    for (const year of [2026,2027,2028]) for (const grade of [6,7,8,9]) {
      const id = `${year}-${grade}`;
      await q(`INSERT INTO class_sections(id,tenant_id,academic_year_id,academic_level_id,name,grade_level,status)
        VALUES ($1,$2,$3,'level',$4,$5,'active')`,[id,actor.tenantId,String(year),`Grade ${grade}`,String(grade)]);
      for (const color of ['blue','red']) await q(`INSERT INTO class_streams(id,tenant_id,class_section_id,name)
        VALUES ($1,$2,$3,$4)`,[`${id}-${color}`,actor.tenantId,id,year===2026?color:(color==='blue'?'East':'West')]);
    }
    for (const subject of ['math','english']) await q(`INSERT INTO subjects(id,tenant_id,name,code,status)
      VALUES ($1,$2,$1,$1,'active')`,[subject,actor.tenantId]);
    for (const teacher of teachers) await q('INSERT INTO tenant_memberships(tenant_id,user_id) VALUES ($1,$2::uuid)',[actor.tenantId,teacher]);
    await transaction(tx=>ensureCohortMigration(tx,actor.tenantId));
  });

  const seed = async (grade: number, teacher: string, color='blue', count=1) => transaction(async tx => {
    const classId=`2026-${grade}`, streamId=`${classId}-${color}`;
    const [context]=await ensureCohortContexts(tx,actor.tenantId,classId,streamId);
    await writeCohortSubjects(tx,actor.tenantId,{class_section_id:classId,stream_id:streamId,subject_ids:['math','english'],actor_user_id:actor.userId});
    for(const subject of ['math','english']) await writeCohortTeacher(tx,actor.tenantId,{class_section_id:classId,stream_id:streamId,
      subject_id:subject,teacher_user_id:teacher,created_by_user_id:actor.userId});
    for(let i=0;i<count;i++) {
      const student=`student-${grade}-${color}-${i}`;
      await tx.$queryRawUnsafe(`INSERT INTO students(id,tenant_id,first_name) VALUES ($1,$2,$1) RETURNING id`,student,actor.tenantId);
      await tx.$queryRawUnsafe(`INSERT INTO student_class_assignments(school_id,tenant_id,student_id,class_section_id,stream_id,
        academic_level_id,academic_year_id,cohort_id,cohort_placement_id) VALUES ($1,$1,$2,$3,$4,'level','2026',$5,$6) RETURNING id`,
      actor.tenantId,student,classId,streamId,context.cohort_id,context.id);
      for(const subjectId of ['math','english']) await tx.$queryRawUnsafe(`INSERT INTO student_subject_enrollments
        (tenant_id,student_id,academic_year_id,class_section_id,stream_id,subject_id,subject_code,subject_name,is_compulsory)
        VALUES ($1,$2,'2026',$3,$4,$5,$5,$5,TRUE) RETURNING id`,actor.tenantId,student,classId,streamId,subjectId);
      await tx.$queryRawUnsafe(`INSERT INTO student_academic_enrollments(tenant_id,student_id,application_id,class_section_id,
        stream_id,class_name,stream_name,academic_year,cohort_id,cohort_placement_id)
        VALUES ($1,$2,'application',$3,$4,$3,$4,'2026',$5,$6) RETURNING id`,actor.tenantId,student,classId,streamId,context.cohort_id,context.id);
    }
    return context;
  });
  const command = (contexts: any[], year=2027) => ({request_id:randomUUID(),reason:'Annual cohort promotion',
    mappings:contexts.map(context=>({source_placement_id:context.id,expected_version:Number(context.version),
      target_class_section_id:`${year}-${Number(context.class_section_id.split('-')[1])+1}`,
      target_stream_id:`${year}-${Number(context.class_section_id.split('-')[1])+1}-${context.stream_id.split('-').at(-1)}`}))});
  const currentTeachers = () => q(`SELECT placement.cohort_id,placement.class_section_id,placement.stream_id,
    assignment.subject_id,assignment.teacher_user_id FROM teacher_subject_assignments assignment
    JOIN academic_cohort_placements placement ON placement.tenant_id=assignment.tenant_id AND placement.id=assignment.cohort_placement_id
    WHERE assignment.status='active' AND placement.status='active' ORDER BY placement.class_section_id,placement.stream_id,assignment.subject_id`);

  it('moves three grades together, survives term/year changes, and carries the latest replacement next year', async () => {
    const sources=[];
    for(let i=0;i<3;i++)sources.push(await seed(6+i,teachers[i]));
    await q(`INSERT INTO historical_results VALUES ('student-6-blue-0','2026-6','term-2026',84)`);
    const result=await promotion.commit(actor,command(sources));
    expect(result.promoted_students).toBe(3);
    const events = await q('SELECT payload FROM cohort_test_events');
    for (const name of ['student.academic_enrollment.created','student.academic_lifecycle.changed','academic.cohort.promoted']) {
      expect(events.filter(row => row.payload.event_name === name)).toHaveLength(3);
    }
    expect(await q("SELECT id FROM student_subject_enrollments WHERE academic_year_id='2026' AND status='completed'")).toHaveLength(6);
    expect(await q("SELECT id FROM student_subject_enrollments WHERE academic_year_id='2027' AND status='active'")).toHaveLength(6);
    for(let i=0;i<3;i++) {
      expect((await currentTeachers()).filter(row=>row.class_section_id===`2027-${7+i}`)).toEqual(expect.arrayContaining([
        expect.objectContaining({cohort_id:sources[i].cohort_id,teacher_user_id:teachers[i],subject_id:'math'}),
        expect.objectContaining({cohort_id:sources[i].cohort_id,teacher_user_id:teachers[i],subject_id:'english'})]));
      expect(await q(`SELECT student_id FROM student_class_assignments WHERE class_section_id=$1 AND status='active'`,[`2027-${7+i}`]))
        .toEqual([{student_id:`student-${6+i}-blue-0`}]);
    }
    const before=await currentTeachers();
    await q(`UPDATE academic_years SET is_current=(id='2027')`);
    await q(`INSERT INTO academic_terms(id,tenant_id,academic_year_id,name,starts_on,ends_on,is_current)
      VALUES ('term1',$1,'2027','Term 1','2027-01-01','2027-04-01',true),('term2',$1,'2027','Term 2','2027-05-01','2027-08-01',false)`,[actor.tenantId]);
    await q(`UPDATE academic_terms SET is_current=(id='term2')`);
    expect(await currentTeachers()).toEqual(before);
    await transaction(tx=>writeCohortTeacher(tx,actor.tenantId,{class_section_id:'2027-7',stream_id:'2027-7-blue',subject_id:'math',teacher_user_id:teachers[3],created_by_user_id:actor.userId}));
    const [placement]=await q(`SELECT * FROM academic_cohort_placements WHERE cohort_id=$1 AND status='active'`,[sources[0].cohort_id]);
    await promotion.commit(actor,command([placement],2028));
    expect(await currentTeachers()).toEqual(expect.arrayContaining([expect.objectContaining({class_section_id:'2028-8',subject_id:'math',teacher_user_id:teachers[3]})]));
    expect(await q('SELECT * FROM historical_results')).toEqual([{student_id:'student-6-blue-0',class_section_id:'2026-6',academic_term_id:'term-2026',marks:84}]);
  });

  it('keeps renamed Blue and Red destination streams separate and starts new intake empty', async () => {
    const blue=await seed(6,teachers[0]); const red=await seed(6,teachers[1],'red');
    await promotion.commit(actor,command([blue,red]));
    expect((await currentTeachers()).filter(row=>row.stream_id==='2027-7-blue').every(row=>row.teacher_user_id===teachers[0])).toBe(true);
    expect((await currentTeachers()).filter(row=>row.stream_id==='2027-7-red').every(row=>row.teacher_user_id===teachers[1])).toBe(true);
    const [intake]=await transaction(tx=>ensureCohortContexts(tx,actor.tenantId,'2026-6','2026-6-blue'));
    expect(intake.cohort_id).not.toBe(blue.cohort_id);
    expect(await q('SELECT id FROM class_subject_assignments WHERE cohort_placement_id=$1',[intake.id])).toHaveLength(0);
  });

  it('is atomic when event persistence fails halfway through a multi-grade promotion', async () => {
    const sources=[await seed(6,teachers[0]),await seed(7,teachers[1])];
    const before=await currentTeachers(); let calls=0;
    const failing=new CohortPromotionService({executeWithTenant:async (_t:any,_u:any,work:any)=>transaction(work)} as never,
      {publish:async()=>{if(++calls===2)throw new Error('injected persistence failure');}} as never);
    await expect(failing.commit(actor,command(sources))).rejects.toThrow('injected persistence failure');
    expect(await currentTeachers()).toEqual(before);
    expect(await q("SELECT id FROM student_class_assignments WHERE status='completed'")).toHaveLength(0);
    expect(await q('SELECT * FROM academic_cohort_promotion_operations')).toHaveLength(0);
    expect(await q('SELECT * FROM notifications')).toHaveLength(0);
  });

  it('replays the same request and rejects a second request for an already promoted placement', async () => {
    const source=await seed(6,teachers[0]);const request=command([source]);
    const [a,b]=await Promise.all([promotion.commit(actor,request),promotion.commit(actor,request)]);
    expect([a.replayed,b.replayed].sort()).toEqual([false,true]);
    await expect(promotion.commit(actor,{...request,request_id:randomUUID()})).rejects.toThrow(/could not be committed/);
    expect(await currentTeachers()).toHaveLength(2);
  });

  it('branches partial promotion, preserves repeaters, and keeps later edits independent', async () => {
    const source=await seed(6,teachers[0],'blue',2);const request=command([source]);
    const result=await promotion.commit(actor,{...request,mappings:[{...request.mappings[0],student_ids:['student-6-blue-0']}]});
    expect(result.results[0].cohort_id).not.toBe(source.cohort_id);
    await transaction(tx=>writeCohortTeacher(tx,actor.tenantId,{class_section_id:'2027-7',stream_id:'2027-7-blue',subject_id:'math',teacher_user_id:teachers[3]}));
    expect((await currentTeachers()).find(row=>row.class_section_id==='2026-6'&&row.subject_id==='math')?.teacher_user_id).toBe(teachers[0]);
  });

  it('preserves explicit subject removal through promotion and prevents assignment until restoration', async () => {
    const source=await seed(6,teachers[0]);
    const [subject]=await q("SELECT * FROM class_subject_assignments WHERE cohort_placement_id=$1 AND subject_id='math'",[source.id]);
    await repository.applySetupLifecycle(actor.tenantId,'class-subject',subject.id,'deactivate',actor.userId);
    await promotion.commit(actor,command([source]));
    expect((await currentTeachers()).some(row=>row.subject_id==='math')).toBe(false);
    await expect(transaction(tx=>writeCohortTeacher(tx,actor.tenantId,{class_section_id:'2027-7',stream_id:'2027-7-blue',subject_id:'math',teacher_user_id:teachers[1]}))).rejects.toThrow(/Restore the subject/);
  });

  it('lets successive partial promotions rejoin their own unchanged branch without duplicating configuration', async () => {
    const source=await seed(6,teachers[0],'blue',2);const request=command([source]);
    const first=await promotion.commit(actor,{...request,mappings:[{...request.mappings[0],student_ids:['student-6-blue-0']}]});
    const [remaining]=await q('SELECT * FROM academic_cohort_placements WHERE id=$1',[source.id]);
    expect((await q('SELECT parent_cohort_id FROM academic_cohorts WHERE id=$1',[first.results[0].cohort_id]))[0].parent_cohort_id).toBe(source.cohort_id);
    expect((await q('SELECT source_placement_id FROM academic_cohort_placements WHERE id=$1',[first.results[0].target_placement_id]))[0].source_placement_id).toBe(source.id);
    for (const table of ['class_subject_assignments','teacher_subject_assignments']) {
      const fields=table==='class_subject_assignments'?'subject_id,status,is_compulsory,is_examinable,effective_from,effective_to'
        :'subject_id,teacher_user_id,assignment_type,is_primary,mark_entry_allowed,lesson_record_allowed,report_comment_allowed,effective_from,effective_to';
      expect(await q(`SELECT ${fields} FROM ${table} WHERE cohort_placement_id=$1 ORDER BY subject_id`,[first.results[0].target_placement_id]))
        .toEqual(await q(`SELECT ${fields} FROM ${table} WHERE cohort_placement_id=$1 ORDER BY subject_id`,[source.id]));
    }
    expect((await promotion.preview(actor,command([remaining]))).blockers).toEqual([]);
    const second=await promotion.commit(actor,command([remaining]));
    expect(second.results[0].cohort_id).toBe(first.results[0].cohort_id);
    expect(await currentTeachers()).toHaveLength(2);
    expect(await q("SELECT id FROM student_class_assignments WHERE class_section_id='2027-7' AND status='active'")).toHaveLength(2);
  });

  it('archives stale empty destination configuration without overwriting occupied cohorts', async () => {
    const source=await seed(6,teachers[0]);
    await transaction(tx=>writeCohortTeacher(tx,actor.tenantId,{class_section_id:'2027-7',stream_id:'2027-7-blue',subject_id:'math',teacher_user_id:teachers[1]}));
    const [stale]=await q("SELECT id FROM teacher_subject_assignments WHERE class_section_id='2027-7'");
    await promotion.commit(actor,command([source]));
    expect((await q('SELECT status FROM teacher_subject_assignments WHERE id=$1',[stale.id]))[0].status).toBe('ended');
    const other=await seed(7,teachers[2]);
    const request=command([other]);request.mappings[0].target_class_section_id='2027-7';request.mappings[0].target_stream_id='2027-7-blue';
    expect((await promotion.preview(actor,request)).can_commit).toBe(false);
    expect((await currentTeachers()).find(row=>row.class_section_id==='2027-7'&&row.subject_id==='math')?.teacher_user_id).toBe(teachers[0]);
  });

  it('rejects an empty cohort and foreign-school destinations without side effects', async () => {
    const [empty]=await transaction(tx=>ensureCohortContexts(tx,actor.tenantId,'2026-6','2026-6-blue'));
    expect((await promotion.preview(actor,command([empty]))).can_commit).toBe(false);
    const source=await seed(6,teachers[0]); const request=command([source]);
    request.mappings[0].target_class_section_id='foreign';
    await expect(promotion.commit(actor,request)).rejects.toThrow(/could not be committed/);
    expect(await currentTeachers()).toHaveLength(2);
  });

  it('prevents duplicate retries and conflicting primary teachers while retaining supporting teachers', async () => {
    const source=await seed(6,teachers[0]);
    const input={class_section_id:'2026-6',stream_id:'2026-6-blue',subject_id:'math',teacher_user_id:teachers[0]};
    await Promise.all([transaction(tx=>writeCohortTeacher(tx,actor.tenantId,input)),transaction(tx=>writeCohortTeacher(tx,actor.tenantId,input))]);
    await transaction(tx=>writeCohortTeacher(tx,actor.tenantId,{...input,teacher_user_id:teachers[1],assignment_type:'supporting',is_primary:false}));
    expect((await currentTeachers()).filter(row=>row.subject_id==='math')).toHaveLength(2);
    await expect(q(`INSERT INTO teacher_subject_assignments(tenant_id,cohort_id,cohort_placement_id,class_section_id,stream_id,subject_id,teacher_user_id)
      VALUES ($1,$2,$3,'2026-6','2026-6-blue','math',$4)`,[actor.tenantId,source.cohort_id,source.id,teachers[2]])).rejects.toMatchObject({code:'23P01'});
  });

  it('keeps a deactivated teacher ended after promotion', async () => {
    const source=await seed(6,teachers[0]);
    const [assignment]=await q("SELECT id FROM teacher_subject_assignments WHERE cohort_placement_id=$1 AND subject_id='math'",[source.id]);
    await repository.archiveTeacherAssignment(actor.tenantId,assignment.id,{actor_user_id:actor.userId});
    await promotion.commit(actor,command([source]));
    expect((await currentTeachers()).some(row=>row.subject_id==='math')).toBe(false);
    expect(await q("SELECT id FROM class_subject_assignments WHERE class_section_id='2027-7' AND subject_id='math' AND status='active'")).toHaveLength(1);
  });

  it('commits bulk subjects and governance together, and rolls both back on a failed event', async () => {
    const input={class_section_id:'2026-6',stream_id:'2026-6-blue',subject_ids:['math','english'],actor_user_id:actor.userId,
      actor_role:actor.role,correlation_id:null};
    await expect(repository.createClassSubjectAssignmentsBulk(actor.tenantId,input,async ({tx})=>{
      await tx.$queryRawUnsafe("INSERT INTO cohort_test_events(payload) VALUES ('{}'::jsonb) RETURNING payload");
      throw new Error('bulk event failed');
    })).rejects.toThrow('bulk event failed');
    expect(await q('SELECT id FROM class_subject_assignments')).toHaveLength(0);
    expect(await q('SELECT id FROM academic_audit_logs')).toHaveLength(0);
    expect(await q('SELECT * FROM cohort_test_events')).toHaveLength(0);
    const result=await repository.createClassSubjectAssignmentsBulk(actor.tenantId,input,async ({tx,assignments})=>{
      expect(assignments).toHaveLength(2);
      await tx.$queryRawUnsafe("INSERT INTO cohort_test_events(payload) VALUES ('{}'::jsonb) RETURNING payload");
    });
    expect(result).toHaveLength(2);
    expect(await q('SELECT id FROM academic_audit_logs')).toHaveLength(2);
    expect(await q('SELECT * FROM cohort_test_events')).toHaveLength(1);
  });

  it('registers a learner in the canonical cohort once and refuses to rewrite that enrollment as promotion', async () => {
    await q("INSERT INTO students(id,tenant_id,first_name) VALUES ('new-learner',$1,'New learner')",[actor.tenantId]);
    const input={school_id:actor.tenantId,student_id:'new-learner',application_id:'application',class_section_id:'2026-6',
      stream_id:'2026-6-blue',class_name:'Grade 6',stream_name:'blue',academic_year:'2026'};
    const enrollment=await admissions.createStudentAcademicEnrollment(input);
    const [membership]=await q("SELECT * FROM student_class_assignments WHERE student_id='new-learner' AND status='active'");
    expect(membership.cohort_id).toBeTruthy();
    expect((await q('SELECT cohort_placement_id FROM student_academic_enrollments WHERE id=$1',[enrollment.id]))[0].cohort_placement_id).toBe(membership.cohort_placement_id);
    expect((await admissions.createStudentAcademicEnrollment(input)).id).toBe(enrollment.id);
    await expect(admissions.createStudentAcademicEnrollment({...input,class_section_id:'2027-7',stream_id:'2027-7-blue',stream_name:'East',academic_year:'2027'})).rejects.toThrow(/already has an enrollment/);
    expect(await q("SELECT id FROM student_academic_enrollments WHERE student_id='new-learner'")).toHaveLength(1);
  });

  it('deactivates a catalogue subject across cohorts without reviving it on promotion or catalogue restore', async () => {
    const sources = [await seed(6,teachers[0]),await seed(7,teachers[1])];
    await repository.applySetupLifecycle(actor.tenantId,'subject','math','deactivate',actor.userId);
    expect((await currentTeachers()).filter(row=>row.subject_id==='math')).toHaveLength(0);
    await repository.applySetupLifecycle(actor.tenantId,'subject','math','restore',actor.userId);
    await promotion.commit(actor,command(sources));
    expect((await currentTeachers()).filter(row=>row.subject_id==='math')).toHaveLength(0);
    expect(await q("SELECT id FROM class_subject_assignments WHERE subject_id='math' AND status='active'")).toHaveLength(0);
  });

  it('keeps within-year stream membership, selected subjects and the current student position consistent', async () => {
    const source=await seed(6,teachers[0]);
    await seed(6,teachers[1],'red');
    await repository.assignStudentToClass({tenant_id:actor.tenantId,student_id:'student-6-blue-0',class_section_id:'2026-6',
      stream_id:'2026-6-red',academic_year_id:'2026',assigned_by_user_id:actor.userId});
    expect((await q("SELECT current_stream_id FROM students WHERE id='student-6-blue-0'"))[0].current_stream_id).toBe('2026-6-red');
    const memberships=await q("SELECT * FROM student_class_assignments WHERE student_id='student-6-blue-0' AND status='active'");
    expect(memberships).toHaveLength(1);
    expect(memberships[0].cohort_id).not.toBe(source.cohort_id);
    const subjects=await q("SELECT stream_id FROM student_subject_enrollments WHERE student_id='student-6-blue-0' AND status='active'");
    expect(subjects).toHaveLength(2);
    expect(subjects.every(row=>row.stream_id==='2026-6-red')).toBe(true);
  });

  it('registers unstreamed intake without borrowing a stream configuration', async () => {
    await q("INSERT INTO class_sections(id,tenant_id,academic_year_id,academic_level_id,name,grade_level,status) VALUES ('unstreamed',$1,'2026','level','Intake','entry','active')",[actor.tenantId]);
    await q("INSERT INTO students(id,tenant_id,first_name) VALUES ('unstreamed-learner',$1,'Intake learner')",[actor.tenantId]);
    const enrollment=await admissions.createStudentAcademicEnrollment({school_id:actor.tenantId,student_id:'unstreamed-learner',
      application_id:'application',class_section_id:'unstreamed',stream_id:null,class_name:'Intake',stream_name:'Unstreamed',academic_year:'2026'});
    expect(enrollment.cohort_id).toBeTruthy();
    expect(enrollment.stream_id).toBeNull();
    expect(await q('SELECT id FROM class_subject_assignments WHERE cohort_placement_id=$1',[enrollment.cohort_placement_id])).toHaveLength(0);
  });

  it('blocks incomplete annual enrollment before changing students or teaching configuration', async () => {
    const source=await seed(6,teachers[0]);
    await q("DELETE FROM student_academic_enrollments WHERE student_id='student-6-blue-0'");
    const preview=await promotion.preview(actor,command([source]));
    expect(preview.can_commit).toBe(false);
    expect(preview.blockers.join(' ')).toMatch(/active annual enrollment/);
    expect((await currentTeachers()).every(row=>row.class_section_id==='2026-6')).toBe(true);
  });

  it('migrates current-term legacy records once and records conflicting teachers for explicit resolution', async () => {
    await q('DELETE FROM academic_cohort_migrations WHERE tenant_id=$1',[actor.tenantId]);
    await q(`INSERT INTO academic_terms(id,tenant_id,academic_year_id,name,starts_on,ends_on,is_current)
      VALUES ('old',$1,'2026','Term 1','2026-01-01','2026-04-01',false),('current',$1,'2026','Term 2','2026-05-01','2026-08-01',true)`,[actor.tenantId]);
    for(const term of ['old','current'])await q(`INSERT INTO class_subject_assignments(tenant_id,academic_term_id,class_section_id,subject_id)
      VALUES ($1,$2,'2026-6','math')`,[actor.tenantId,term]);
    await q(`INSERT INTO teacher_subject_assignments(tenant_id,academic_term_id,class_section_id,stream_id,subject_id,teacher_user_id)
      VALUES ($1,'old','2026-6','2026-6-blue','math',$2),($1,'current','2026-6','2026-6-blue','math',$3),
        ($1,'current','2026-6','2026-6-red','math',$2),($1,'current','2026-6','2026-6-red','math',$3)`,[actor.tenantId,teachers[0],teachers[1]]);
    await transaction(tx=>ensureCohortMigration(tx,actor.tenantId));
    const before=await currentTeachers();
    expect(before).toEqual([expect.objectContaining({stream_id:'2026-6-blue',teacher_user_id:teachers[1]})]);
    expect(await q("SELECT id FROM academic_cohort_migration_issues WHERE status='pending'")).toHaveLength(1);
    expect(await q("SELECT id FROM teacher_subject_assignments WHERE academic_term_id IS NOT NULL")).toHaveLength(4);
    await transaction(tx=>ensureCohortMigration(tx,actor.tenantId));
    expect(await currentTeachers()).toEqual(before);
    await transaction(tx=>writeCohortTeacher(tx,actor.tenantId,{class_section_id:'2026-6',stream_id:'2026-6-red',subject_id:'math',teacher_user_id:teachers[3]}));
    expect(await q("SELECT id FROM academic_cohort_migration_issues WHERE status='pending'")).toHaveLength(0);
  });
});
