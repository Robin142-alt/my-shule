import { ExamsService } from '../src/modules/exams/exams.service';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { AcademicsRepository } from '../src/modules/academics/repositories/academics.repository';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import type { ExamAnalyticsScopeLevel } from '../src/modules/exams/analytics/analytics-scope';
import { analyticsQuery } from '../src/modules/exams/analytics/analytics-query';
import { AcademicsSchemaService } from '../src/modules/academics/academics-schema.service';
import { writeFileSync, mkdirSync } from 'node:fs';

describe('Academic Intelligence SQL and tenant authorization',()=>{
  let pool:Pool,repository:ExamsRepository;
  const schema='analytics_'+randomUUID().replaceAll('-','');
  const role='analytics_reader_'+randomUUID().replaceAll('-','');
  const ids=Object.fromEntries(['exam','old','term','year','math','bio','department','class','blue','red','learner','second','missing','policy','teacher','hos','hod','class_teacher','grade','principal'].map(k=>[k,randomUUID()]));
  beforeAll(async()=>{
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!process.env.DATABASE_URL)throw new Error('Use the repository disposable PostgreSQL test runner.');
    pool=new Pool({connectionString:process.env.DATABASE_URL,max:2});
    const c=await pool.connect();
    try {
      await c.query(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}; CREATE ROLE ${role} NOLOGIN;`);
      await c.query(`
        CREATE TABLE academic_years(tenant_id text,id text,name text);
        CREATE TABLE academic_terms(tenant_id text,id text,name text,academic_year_id text);
        CREATE TABLE exam_series(tenant_id text,id uuid,academic_term_id uuid,name text,starts_on date,ends_on date,status text DEFAULT 'locked');
        CREATE TABLE exam_assessments(tenant_id text,id uuid,exam_series_id uuid,subject_id uuid,max_score numeric,weight numeric);
        CREATE TABLE exam_mark_entry_windows(tenant_id text,exam_series_id uuid,class_section_id uuid,subject_id uuid);
        CREATE TABLE exam_marks(tenant_id text,id uuid,exam_series_id uuid,assessment_id uuid,student_id uuid,class_section_id uuid,score numeric,score_status text,status text);
        CREATE TABLE subjects(tenant_id text,id text,name text,department_id uuid);
        CREATE TABLE academics_departments(tenant_id text,id uuid,name text);
        CREATE TABLE class_sections(tenant_id text,id text,name text,grade_level text);
        CREATE TABLE students(tenant_id text,id text,first_name text,middle_name text,last_name text,admission_number text);
        CREATE TABLE class_streams(tenant_id text,id text,name text);
        CREATE TABLE student_class_assignments(tenant_id text,id text,student_id text,class_section_id text,academic_year_id text,stream_id text,status text,updated_at timestamptz,cohort_id text);
        CREATE TABLE student_subject_enrollments(tenant_id text,student_id text,class_section_id text,subject_id text,academic_year_id text,academic_term_id text,status text,effective_from date,effective_to date);
        CREATE TABLE student_report_cards(tenant_id text,exam_series_id uuid,student_id uuid,is_current boolean,status text,grading_policy_id uuid,grading_policy_version int);
        CREATE TABLE academics_grading_systems(tenant_id text,id text,name text,curriculum_model text,rules jsonb,version int,is_active boolean,archived_at timestamptz,effective_from date,effective_to date,updated_at timestamptz);
        CREATE TABLE exam_grading_policies(tenant_id text,id uuid,exam_series_id uuid,reporting_mode text,version int,status text,effective_from timestamptz,effective_to timestamptz);
        CREATE TABLE exam_grading_policy_boundaries(tenant_id text,grading_policy_id uuid,label text,min_score numeric,max_score numeric,points numeric,is_pass boolean);
        CREATE TABLE teacher_subject_assignments(tenant_id text,teacher_user_id text,class_section_id text,subject_id text,academic_term_id text,stream_id text,status text,effective_from date,effective_to date);
        CREATE TABLE academics_class_teachers(tenant_id text,teacher_user_id uuid,class_section_id text,academic_year_id text,is_active boolean,status text,effective_from date,effective_to date);
        CREATE TABLE academics_department_hod_appointments(tenant_id text,teacher_user_id uuid,department_id uuid,status text,effective_from date,effective_to date);
        CREATE TABLE academics_role_appointments(tenant_id text,teacher_user_id uuid,role_type text,subject_id text,class_section_id text,stream_id text,academic_year_id text,status text,effective_from date,effective_to date);
        CREATE TABLE staff_profiles(tenant_id text,user_id uuid,display_name text);
        CREATE TABLE tenant_memberships(tenant_id text,user_id uuid,status text);
        CREATE TABLE academics_report_card_settings(tenant_id text,id text,show_rank boolean,is_active boolean,archived_at timestamptz,updated_at timestamptz);
        CREATE TABLE academic_interventions(tenant_id text,id uuid,student_id text,class_section_id text,subject_id text,status text,due_on date,starts_on date,completed_at timestamptz,baseline jsonb,target jsonb,outcome jsonb);
      `);
      for(const tenant of ['school-a','school-b']) {
        await c.query('INSERT INTO academic_years VALUES ($1,$2,$3)',[tenant,ids.year,'2026']);
        await c.query('INSERT INTO academic_terms VALUES ($1,$2,$3,$4)',[tenant,ids.term,'Term 1',ids.year]);
        await c.query('INSERT INTO academics_departments VALUES ($1,$2,$3)',[tenant,ids.department,'Science']);
        await c.query('INSERT INTO class_sections VALUES ($1,$2,$3,$4)',[tenant,ids.class,'Form 1','1']);
        for(const name of ['blue','red'])await c.query('INSERT INTO class_streams VALUES ($1,$2,$3)',[tenant,ids[name],name]);
        await c.query('INSERT INTO exam_grading_policies VALUES ($1,$2,NULL,$3,1,$4,NULL,NULL)',[tenant,ids.policy,'traditional','active']);
        await c.query("INSERT INTO exam_grading_policy_boundaries VALUES ($1,$2,'A',80,100,12,true),($1,$2,'C',50,79.99,6,true),($1,$2,'E',0,49.99,1,false)",[tenant,ids.policy]);
        for(const who of ['learner','second','missing']) {
          await c.query('INSERT INTO students VALUES ($1,$2,$3,NULL,$4,$5)',[tenant,ids[who],tenant==='school-a'?who:'FOREIGN',who,'ADM-'+who]);
          await c.query("INSERT INTO student_class_assignments VALUES ($1,$2,$3,$4,$5,$6,'active',NOW(),NULL)",[tenant,randomUUID(),ids[who],ids.class,ids.year,who==='second'?ids.red:ids.blue]);
        }
        for(const subject of ['math','bio'])await c.query('INSERT INTO subjects VALUES ($1,$2,$3,$4)',[tenant,ids[subject],subject,ids.department]);
        for(const exam of ['old','exam']) {
          await c.query('INSERT INTO exam_series(tenant_id,id,academic_term_id,name,starts_on,ends_on) VALUES ($1,$2,$3,$4,$5,$6)',[tenant,ids[exam],ids.term,exam,exam==='old'?'2026-01-01':'2026-03-01',exam==='old'?'2026-01-10':'2026-03-10']);
          for(const subject of ['math','bio']) {
            const assessment=randomUUID();
            await c.query('INSERT INTO exam_assessments VALUES ($1,$2,$3,$4,100,1)',[tenant,assessment,ids[exam],ids[subject]]);
            await c.query('INSERT INTO exam_mark_entry_windows VALUES ($1,$2,$3,$4)',[tenant,ids[exam],ids.class,ids[subject]]);
            for(const who of ['learner','second']) {
              const score=tenant==='school-b'?99:exam==='old'?50:who==='learner'?(subject==='math'?80:20):(subject==='math'?40:90);
              await c.query("INSERT INTO exam_marks VALUES ($1,$2,$3,$4,$5,$6,$7,'entered','locked')",[tenant,randomUUID(),ids[exam],assessment,ids[who],ids.class,score]);
            }
          }
          for(const who of ['learner','second'])await c.query("INSERT INTO student_report_cards VALUES ($1,$2,$3,true,'approved',$4,1)",[tenant,ids[exam],ids[who],ids.policy]);
        }
      }
      await c.query("INSERT INTO student_subject_enrollments VALUES ('school-a',$1,$2,$3,$4,$5,'active',NULL,NULL)",[ids.missing,ids.class,ids.math,ids.year,ids.term]);
      for(const who of ['teacher','hos','hod','class_teacher','grade','principal'])await c.query("INSERT INTO tenant_memberships VALUES ('school-a',$1,'active')",[ids[who]]);
      await c.query("INSERT INTO teacher_subject_assignments VALUES ('school-a',$1,$2,$3,$4,$5,'active',NULL,NULL)",[ids.teacher,ids.class,ids.math,ids.term,ids.blue]);
      await c.query("INSERT INTO staff_profiles VALUES ('school-a',$1,'Teacher One')",[ids.teacher]);
      await c.query("INSERT INTO academics_class_teachers VALUES ('school-a',$1,$2,$3,true,'active',NULL,NULL)",[ids.class_teacher,ids.class,ids.year]);
      await c.query("INSERT INTO academics_department_hod_appointments VALUES ('school-a',$1,$2,'active',NULL,NULL)",[ids.hod,ids.department]);
      await c.query("INSERT INTO academics_role_appointments VALUES ('school-a',$1,'head_of_subject',$2,NULL,NULL,NULL,'active',NULL,NULL)",[ids.hos,ids.math]);
      await c.query("INSERT INTO academics_role_appointments VALUES ('school-a',$1,'grade_master',NULL,$2,$3,$4,'active',NULL,NULL)",[ids.grade,ids.class,ids.red,ids.year]);
      await c.query("ALTER TABLE academics_role_appointments ADD COLUMN id uuid DEFAULT gen_random_uuid(), ADD COLUMN appointment_type text DEFAULT 'permanent'");
      await c.query("UPDATE exam_series SET status='published'; UPDATE exam_marks SET status='published'; UPDATE student_report_cards SET status='published'");
      await c.query(`ALTER TABLE exam_marks ADD COLUMN updated_by_user_id uuid, ADD COLUMN reviewed_at timestamptz, ADD COLUMN locked_at timestamptz, ADD COLUMN updated_at timestamptz;
        CREATE TABLE exam_mark_audit_logs(id uuid DEFAULT gen_random_uuid(), tenant_id text, mark_id uuid, exam_series_id uuid, assessment_id uuid, student_id uuid,
          action text, actor_user_id uuid, previous_score numeric, new_score numeric, reason text, metadata jsonb);`);
      const tables=await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1',[schema]);
      for(const row of tables.rows)await c.query(`ALTER TABLE ${row.tablename} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${row.tablename} FORCE ROW LEVEL SECURITY;
        CREATE POLICY tenant_isolation ON ${row.tablename} USING (tenant_id = current_setting('app.tenant_id',true));`);
      await c.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
    }finally{c.release();}
    repository=new ExamsRepository({executeWithTenant:async(tenant:string,_user:unknown,callback:(tx:unknown)=>Promise<unknown>)=>{
      const client=await pool.connect();try{await client.query('BEGIN');await client.query(`SET LOCAL search_path TO ${schema}; SET LOCAL ROLE ${role}`);
        await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);
        const result=await callback({$queryRawUnsafe:async(sql:string,...params:unknown[])=>(await client.query(sql,params)).rows});await client.query('COMMIT');return result;
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    }} as never);
  },60000);
  afterAll(async()=>{await pool?.end();});
  const read=(scope:ExamAnalyticsScopeLevel,actor:string,extra:Record<string,string>={})=>repository.getAnalytics('school-a',{level:scope,actor_user_id:ids[actor],role:actor},{page:1,page_size:25,scope,...extra},scope==='school');
  it.each([['assignment','teacher',80],['subject','hos',60],['department','hod',57.5],['class','class_teacher',57.5],['grade','grade',65],['school','principal',57.5]] as const)('%s enforces the tenant and exact appointment',async(scope,actor,average)=>{
    const data=await read(scope,actor);expect(data.performance.mean).toBe(average);
    expect(JSON.stringify(data)).not.toContain('FOREIGN');
    if(scope==='assignment'||scope==='subject')expect(data.options.subjects.map(s=>s.id)).toEqual([ids.math]);
    if(scope==='grade')expect(data.learners.items.map(l=>l.student_id)).toEqual([ids.second]);
  });
  it('withholds unpublished, approved and withdrawn analytics from HOD/HOS, including forged filters and comparisons', async () => {
    const client=await pool.connect();
    try {
      await client.query(`SET search_path TO ${schema}; UPDATE exam_series SET status='locked' WHERE tenant_id='school-a';
        UPDATE exam_marks SET status='locked' WHERE tenant_id='school-a'; UPDATE student_report_cards SET status='approved' WHERE tenant_id='school-a'`);
      for(const [scope,actor] of [['subject','hos'],['department','hod']] as const) {
        const hidden=await read(scope,actor,{exam_series_id:ids.exam,comparison_exam_id:ids.old,publication_status:'approved'});
        expect(hidden.options.exams).toEqual([]);expect(hidden.performance.mean).toBeNull();expect(hidden.learners.total).toBe(0);
      }
      expect((await read('school','principal')).performance.mean).toBe(57.5);
      await client.query("UPDATE exam_series SET status='published' WHERE tenant_id='school-a' AND id=$1",[ids.exam]);
      expect((await read('subject','hos')).performance.mean).toBeNull();
      await client.query("UPDATE exam_marks SET status='published' WHERE tenant_id='school-a' AND exam_series_id=$1",[ids.exam]);
      expect((await read('department','hod')).performance.mean).toBeNull();
      await client.query("UPDATE student_report_cards SET status='published' WHERE tenant_id='school-a' AND exam_series_id=$1",[ids.exam]);
      expect((await read('subject','hos')).performance.mean).toBe(60);
      expect((await read('department','hod')).options.exams.map(exam=>exam.id)).toEqual([ids.exam]);
      const unpublishedComparison=await read('subject','hos',{comparison_exam_id:ids.old});
      expect(unpublishedComparison.options.exams.map(exam=>exam.id)).toEqual([ids.exam]);
      await client.query("UPDATE exam_series SET status='withdrawn' WHERE tenant_id='school-a' AND id=$1",[ids.exam]);
      expect((await read('subject','hos')).options.exams).toEqual([]);
      expect((await read('department','hod')).learners.total).toBe(0);
    } finally {
      await client.query(`UPDATE ${schema}.exam_series SET status='published'; UPDATE ${schema}.exam_marks SET status='published'; UPDATE ${schema}.student_report_cards SET status='published'`);
      client.release();
    }
  });
  it('routes submitted marks through Dean review and lock with atomic audits and school isolation', async () => {
    const client=await pool.connect();const events:any[]=[];
    const dean=new ExamsService({getStore:()=>({tenant_id:'school-a',user_id:ids.principal,role:'dean_academics',permissions:['exams:review','exams:approve']})} as never,
      repository,undefined,undefined,{recordSchoolOperation:async(event:unknown)=>{events.push(event);}} as never);
    try {
      const marks=await client.query(`UPDATE ${schema}.exam_marks SET status='submitted' WHERE tenant_id='school-a' RETURNING id`);
      const markIds=marks.rows.map(mark=>mark.id);
      const foreign=await client.query(`SELECT id FROM ${schema}.exam_marks WHERE tenant_id='school-b' LIMIT 1`);
      const result=await dean.moderateMarks({mark_ids:[...markIds,foreign.rows[0].id],action:'approve'});
      expect(result.updated_count).toBe(markIds.length);
      const locks=await dean.lockMarks({mark_ids:markIds});expect(locks.locked_count).toBe(markIds.length);
      const audits=await client.query(`SELECT action,COUNT(*)::int AS count FROM ${schema}.exam_mark_audit_logs WHERE tenant_id='school-a' GROUP BY action`);
      expect(audits.rows).toEqual(expect.arrayContaining([{action:'marks.reviewed',count:markIds.length},{action:'marks.locked',count:markIds.length}]));
      expect(events.map(event=>event.event.type)).toEqual(['exam.marks_reviewed','exam.marks_locked']);
      expect(events[1].notifications[0].audienceRoles).toEqual(['exams-manager']);
      expect((await client.query(`SELECT status FROM ${schema}.exam_marks WHERE tenant_id='school-b'`)).rows.every(mark=>mark.status==='published')).toBe(true);
      await expect(dean.lockMarks({mark_ids:markIds})).rejects.toThrow(/No selected reviewed marks/);
    } finally {await client.query(`UPDATE ${schema}.exam_marks SET status='published'`);client.release();}
  });
  it('rejects invented, expired and foreign appointments',async()=>{
    await expect(read('subject','teacher')).rejects.toThrow(/appointment/);
    await expect(repository.getAnalytics('school-b',{level:'assignment',actor_user_id:ids.teacher,role:'teacher'},{page:1,page_size:25,scope:'assignment'},false)).rejects.toThrow(/appointment/);
    const c=await pool.connect();try{await c.query(`SET search_path TO ${schema}`);await c.query("UPDATE academics_role_appointments SET effective_to='2000-01-01' WHERE teacher_user_id=$1",[ids.hos]);}finally{c.release();}
    await expect(read('subject','hos')).rejects.toThrow(/appointment/);
    const reset=await pool.connect();try{await reset.query(`UPDATE ${schema}.academics_role_appointments SET effective_to=NULL WHERE teacher_user_id=$1`,[ids.hos]);}finally{reset.release();}
  });
  it('handles missing marks and does not broaden access through filters',async()=>{
    const result=await read('assignment','teacher');expect(result.operations.missing).toBe(1);expect(result.performance.mean).toBe(80);
    const unrelated=await read('assignment','teacher',{subject_id:ids.bio});expect(unrelated.learners.total).toBe(0);
    const wrongExam=await read('assignment','teacher',{exam_series_id:randomUUID()});expect(wrongExam.performance.mean).toBeNull();
  });
  it('lists only the authenticated staff subject appointments under RLS',async()=>{
    const academicRepository = new AcademicsRepository({executeWithTenant:async(tenant:string,_user:unknown,callback:(tx:unknown)=>Promise<unknown>)=>{
      const client=await pool.connect();try{await client.query('BEGIN');await client.query(`SET LOCAL search_path TO ${schema}; SET LOCAL ROLE ${role}`);
        await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);
        const result=await callback({$queryRawUnsafe:async(sql:string,...params:unknown[])=>(await client.query(sql,params)).rows});await client.query('COMMIT');return result;
      }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
    }} as never);
    const rows=await academicRepository.getSubjectAppointmentsForUser('school-a',ids.hos);
    expect(rows).toHaveLength(1);expect(rows[0].subject_name).toBe('math');expect(rows[0].status).toBe('active');
    expect(await academicRepository.getSubjectAppointmentsForUser('school-a',ids.teacher)).toEqual([]);
    expect(await academicRepository.getSubjectAppointmentsForUser('school-b',ids.hos)).toEqual([]);
    const c=await pool.connect();try {
      await c.query(`UPDATE ${schema}.academics_role_appointments SET effective_from=CURRENT_DATE+10 WHERE teacher_user_id=$1`,[ids.hos]);
      expect((await academicRepository.getSubjectAppointmentsForUser('school-a',ids.hos))[0].status).toBe('scheduled');
      await expect(read('subject','hos')).rejects.toThrow(/appointment/);
    } finally {await c.query(`UPDATE ${schema}.academics_role_appointments SET effective_from=NULL WHERE teacher_user_id=$1`,[ids.hos]);c.release();}
  });
  it('keeps the HOS appointment migration idempotent and permits different subject heads',async()=>{
    let bootstrap='';
    await new AcademicsSchemaService({runSchemaBootstrap:async(sql:string)=>{bootstrap+=sql;}} as never).onModuleInit();
    const start=bootstrap.indexOf('CREATE TABLE IF NOT EXISTS academics_role_appointments');
    const end=bootstrap.indexOf('CREATE TABLE IF NOT EXISTS academics_curriculum_configurations',start);
    expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
    const migration=bootstrap.slice(start,end);
    const c=await pool.connect();
    try {
      await c.query(`CREATE SCHEMA ${schema}_appointments; SET search_path TO ${schema}_appointments`);
      await c.query(migration);await c.query(migration);
      for(const subject of [ids.math,ids.bio])await c.query("INSERT INTO academics_role_appointments(tenant_id,school_id,role_type,teacher_user_id,subject_id) VALUES ('school-a','school-a','head_of_subject',$1,$2)",[ids.hos,subject]);
      await expect(c.query("INSERT INTO academics_role_appointments(tenant_id,school_id,role_type,teacher_user_id,subject_id) VALUES ('school-a','school-a','head_of_subject',$1,$2)",[ids.teacher,ids.math])).rejects.toMatchObject({code:'23505'});
    }finally{c.release();}
  });
  it('executes and records the plan for the bounded shared analytics query under RLS',async()=>{
    const result=await repository.executeSql(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${analyticsQuery('assignment')}`,
      ['school-a',ids.teacher,JSON.stringify({page:1,page_size:25})]);
    const plan=result.rows[0]['QUERY PLAN'];
    expect(plan[0]['Execution Time']).toBeGreaterThanOrEqual(0);
    mkdirSync('output',{recursive:true});writeFileSync('output/academic-intelligence-query-plan.json',JSON.stringify(plan,null,2));
  });
  it('supports the deployed placement schema before optional cohort metadata exists',async()=>{
    const c=await pool.connect();
    try {await c.query(`SET search_path TO ${schema}; ALTER TABLE student_class_assignments DROP COLUMN cohort_id`);}
    finally {c.release();}
    const data=await read('assignment','teacher');
    expect(data.performance.mean).toBe(80);
    expect(data.cohorts).toEqual([]);
  });
  it('grades shared subjects by class curriculum under RLS and retains report grading snapshots', async () => {
    const c = await pool.connect();
    const secondaryClass = randomUUID();
    const cbcRules = [{ label: 'ME1', min: 58, max: 100, points: 6, is_pass: true }, { label: 'BE2', min: 0, max: 57, points: 1, is_pass: false }];
    const secondaryRules = [{ label: 'B', min: 65, max: 100, points: 9, is_pass: true }, { label: 'E', min: 0, max: 64, points: 1, is_pass: false }];
    try {
      await c.query(`SET search_path TO ${schema};
        ALTER TABLE class_sections ADD COLUMN curriculum_model text;
        ALTER TABLE student_report_cards ADD COLUMN metadata jsonb;`);
      await c.query("UPDATE class_sections SET curriculum_model='CBC' WHERE tenant_id='school-a'");
      await c.query("INSERT INTO class_sections VALUES ('school-a',$1,'Form 2','2','8-4-4')", [secondaryClass]);
      await c.query("UPDATE exam_marks SET class_section_id=$1 WHERE tenant_id='school-a' AND student_id=$2", [secondaryClass, ids.second]);
      await c.query("UPDATE student_class_assignments SET class_section_id=$1 WHERE tenant_id='school-a' AND student_id=$2", [secondaryClass, ids.second]);
      await c.query("UPDATE student_report_cards SET grading_policy_id=NULL WHERE tenant_id='school-a'");
      for (const [tenant, curriculum, bands] of [
        ['school-a', 'CBC', cbcRules], ['school-a', '8-4-4', secondaryRules], ['school-b', 'CBC', [{ label: 'FOREIGN', min: 0, max: 100 }]],
      ] as const) {
        await c.query(`INSERT INTO academics_grading_systems
          (tenant_id,id,name,curriculum_model,rules,version,is_active,updated_at)
          VALUES ($1,$2,$3,$3,$4,1,true,NOW())`, [tenant, randomUUID(), curriculum, JSON.stringify(bands)]);
      }
    } finally { c.release(); }
    const batch = randomUUID();
    const markInput = { tenant_id: 'school-a', exam_series_id: ids.exam, score: 32.5, max_score: 50 };
    expect((await repository.findGradeBoundaryForScore({ ...markInput, class_section_id: ids.class })).boundary).toMatchObject({ label: 'ME1', points: 6 });
    expect((await repository.findGradeBoundaryForScore({ ...markInput, class_section_id: secondaryClass })).boundary).toMatchObject({ label: 'B', points: 9 });
    const setup = await pool.connect();
    try {
      await setup.query(`SET search_path TO ${schema};
        CREATE TABLE report_card_generation_batches(tenant_id text,id uuid,exam_series_id uuid,class_section_id uuid,metadata jsonb DEFAULT '{}',updated_at timestamptz);
        CREATE TABLE exam_result_snapshots(id uuid DEFAULT gen_random_uuid(),tenant_id text,batch_id uuid,exam_series_id uuid,class_section_id uuid,student_id uuid,raw_total numeric,assessment_count int,average_percentage numeric,grade_label text,class_rank int,processed_by_user_id uuid);
        CREATE TABLE exam_grade_boundaries(tenant_id text,exam_series_id uuid,label text,min_score numeric,max_score numeric);`);
      for (const table of ['report_card_generation_batches', 'exam_result_snapshots', 'exam_grade_boundaries']) {
        await setup.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
          CREATE POLICY tenant_isolation ON ${table} USING (tenant_id = current_setting('app.tenant_id',true));
          GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO ${role};`);
      }
      for (const tenant of ['school-a', 'school-b']) await setup.query(
        'INSERT INTO report_card_generation_batches(tenant_id,id,exam_series_id) VALUES ($1,$2,$3)', [tenant, batch, ids.exam]);
      await setup.query("INSERT INTO exam_result_snapshots(tenant_id,batch_id,grade_label) VALUES ('school-b',$1,'FOREIGN')", [batch]);
    } finally { setup.release(); }
    const processed = await repository.processResultBatch({ tenant_id: 'school-a', actor_user_id: ids.principal, batch_id: batch, mode: 'rankings' });
    expect(processed?.aggregate_count).toBe(2);
    const results = await repository.executeSql('SELECT * FROM exam_result_snapshots WHERE tenant_id=$1 AND batch_id=$2', ['school-a', batch]);
    expect(results.rows.find((row: any) => row.student_id === ids.learner)).toMatchObject({ grade_label: 'BE2', class_rank: 1, class_section_id: ids.class });
    expect(results.rows.find((row: any) => row.student_id === ids.second)).toMatchObject({ grade_label: 'B', class_rank: 1, class_section_id: secondaryClass });
    const foreign = await repository.executeSql('SELECT * FROM exam_result_snapshots WHERE tenant_id=$1 AND batch_id=$2', ['school-b', batch]);
    expect(foreign.rows).toHaveLength(1);
    expect(foreign.rows[0].grade_label).toBe('FOREIGN');
    const query = () => repository.executeSql(analyticsQuery('school'), [
      'school-a', ids.principal, JSON.stringify({ page: 1, page_size: 25, exam_series_id: ids.exam }),
    ]);
    const result = await query();
    const math = result.rows.filter((row: any) => row.subject_id === ids.math);
    expect(math.find((row: any) => row.student_id === ids.learner)?.boundaries).toEqual(cbcRules);
    expect(math.find((row: any) => row.student_id === ids.second)?.boundaries).toEqual(secondaryRules);
    expect(JSON.stringify(result.rows)).not.toContain('FOREIGN');
    const snapshot = await pool.connect();
    try {
      await snapshot.query(`UPDATE ${schema}.student_report_cards SET metadata=$1
        WHERE tenant_id='school-a' AND student_id=$2`, [JSON.stringify({
          grading_policy: { source: 'academic_setup', source_id: 'saved-policy', reporting_mode: 'competency', rules: cbcRules },
        }), ids.learner]);
      await snapshot.query(`UPDATE ${schema}.academics_grading_systems SET rules='[{"label":"NEW","min":0,"max":100}]'
        WHERE tenant_id='school-a' AND curriculum_model='CBC'`);
    } finally { snapshot.release(); }
    const historical = await query();
    expect(historical.rows.find((row: any) => row.student_id === ids.learner && row.subject_id === ids.math)?.boundaries).toEqual(cbcRules);
  });
});
