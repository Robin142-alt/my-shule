import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
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
      const tables=await c.query('SELECT tablename FROM pg_tables WHERE schemaname=$1',[schema]);
      for(const row of tables.rows)await c.query(`ALTER TABLE ${row.tablename} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${row.tablename} FORCE ROW LEVEL SECURITY;
        CREATE POLICY tenant_isolation ON ${row.tablename} USING (tenant_id = current_setting('app.tenant_id',true));`);
      await c.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}; GRANT SELECT ON ALL TABLES IN SCHEMA ${schema} TO ${role};`);
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
  it('rejects invented, expired and foreign appointments',async()=>{
    await expect(read('subject','teacher')).rejects.toThrow(/appointment/);
    await expect(repository.getAnalytics('school-b',{level:'assignment',actor_user_id:ids.teacher,role:'teacher'},{page:1,page_size:25,scope:'assignment'},false)).rejects.toThrow(/appointment/);
    const c=await pool.connect();try{await c.query(`SET search_path TO ${schema}`);await c.query("UPDATE academics_role_appointments SET effective_to='2000-01-01' WHERE teacher_user_id=$1",[ids.hos]);}finally{c.release();}
    await expect(read('subject','hos')).rejects.toThrow(/appointment/);
  });
  it('handles missing marks and does not broaden access through filters',async()=>{
    const result=await read('assignment','teacher');expect(result.operations.missing).toBe(1);expect(result.performance.mean).toBe(80);
    const unrelated=await read('assignment','teacher',{subject_id:ids.bio});expect(unrelated.learners.total).toBe(0);
    const wrongExam=await read('assignment','teacher',{exam_series_id:randomUUID()});expect(wrongExam.performance.mean).toBeNull();
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
});
