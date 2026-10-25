import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { AcademicsSchemaService } from '../../src/modules/academics/academics-schema.service';
import { COHORT_SCHEMA_SQL } from '../../src/modules/academics/cohort-schema';
import { ensureCohortContexts, ensureCohortMigration } from '../../src/modules/academics/cohort-configuration';
import { writeCohortSubjects, writeCohortTeacher } from '../../src/modules/academics/cohort-assignment-writes';
import { PROGRESSION_SCHEMA_SQL } from '../../src/modules/student-progression/progression-schema';
import { StudentsSchemaService } from '../../src/modules/students/students-schema.service';

/** Real PostgreSQL fixture. Only the event transport is replaced with a transactional durable sink. */
export class StudentProgressionFixture {
  pool!: Pool;
  runtimeRole = `progression_fixture_${randomUUID().replace(/-/g, '')}`;
  teacher = randomUUID();
  otherTeacher = randomUUID();
  principal = randomUUID();
  user = randomUUID();
  failEvent = false;
  readonly school = 'progression-school';
  readonly foreignSchool = 'other-progression-school';
  readonly due = new Date('2027-01-02T12:00:00.000Z');

  actor(tenantId = this.school, role = 'deputy_principal') {
    return { tenantId, userId: this.user, role, permissions: ['academics:read', 'academics:manage-lifecycle'] };
  }
  q = async (sql: string, values: unknown[] = []): Promise<any[]> => (await this.pool.query(sql, values)).rows;
  txFor = (client: PoolClient) => ({
    $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rows,
    $executeRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rowCount,
  });
  async transaction<T>(tenant: string, work: (tx: any) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE "${this.runtimeRole}"`);
      await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.user_id',$2,true),set_config('app.role','school_user',true)", [tenant,this.user]);
      const value = await work(this.txFor(client));
      await client.query('COMMIT');
      return value;
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  prisma = {
    executeWithTenant: async <T>(tenant: string, _user: string | null, work: (tx: any)=>Promise<T>) => this.transaction(tenant, work),
  };
  events = { publish: async (event: any, tx: any) => {
    if (this.failEvent) throw new Error('Injected outbox persistence failure');
    if (!tx) throw new Error('Progression events must share the mutation transaction');
    return tx.$queryRawUnsafe('INSERT INTO progression_fixture_events(payload) VALUES ($1::jsonb) RETURNING payload',JSON.stringify(event));
  }};

  async start() {
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!process.env.DATABASE_URL) throw new Error('Disposable PostgreSQL is required.');
    const url=new URL(process.env.DATABASE_URL);
    if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_')) throw new Error('Refusing a non-disposable database.');
    this.pool=new Pool({connectionString:process.env.DATABASE_URL,max:12});
    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TYPE "StudentStatus" AS ENUM ('APPLICANT','ACCEPTED','ENROLLED','ACTIVE','INACTIVE','SUSPENDED','ON_LEAVE','TRANSFERRED_OUT','WITHDRAWN','GRADUATED','ALUMNI','ARCHIVED');
      CREATE TABLE schools(id text PRIMARY KEY,slug text UNIQUE,name text,status text DEFAULT 'active',school_type text,metadata jsonb DEFAULT '{}',deleted_at timestamptz);
      CREATE TABLE tenants(tenant_id text PRIMARY KEY,status text DEFAULT 'active',settings jsonb DEFAULT '{}',metadata jsonb DEFAULT '{}');
      CREATE TABLE school_settings(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,school_id text UNIQUE,timezone text DEFAULT 'Africa/Nairobi');
      CREATE TABLE users(id uuid PRIMARY KEY,email text,display_name text,full_name text,status text DEFAULT 'active');
      CREATE TABLE roles(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,code text,name text);
      CREATE TABLE tenant_memberships(tenant_id text,user_id uuid,role_id uuid,status text DEFAULT 'active');
      CREATE TABLE staff_profiles(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,user_id uuid,display_name text,status text DEFAULT 'active');
      CREATE TABLE students(id text PRIMARY KEY,tenant_id text NOT NULL,school_id text,admission_number text NOT NULL,
        first_name text NOT NULL,middle_name text,last_name text NOT NULL DEFAULT 'Learner',
        status text NOT NULL DEFAULT 'active',student_status "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
        admission_date date DEFAULT '2026-01-10',metadata jsonb NOT NULL DEFAULT '{}',current_class_id text,current_stream_id text,
        created_by_user_id uuid,updated_by_user_id uuid,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),
        CONSTRAINT uq_fixture_student_tenant UNIQUE(tenant_id,id),CONSTRAINT ck_students_status CHECK(status IN('active','inactive','suspended','on_leave','transferred','transferred_out','withdrawn','expelled','graduated','alumni','archived')));
      CREATE TABLE admission_applications(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,admitted_student_id text,class_applying text,applying_for_class_id text,status text DEFAULT 'admitted',updated_at timestamptz DEFAULT NOW());
      CREATE TABLE admission_settings(tenant_id text PRIMARY KEY,strict_capacity boolean DEFAULT true,minimum_subjects integer,maximum_subjects integer);
      CREATE TABLE student_transfer_records(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text NOT NULL,student_id text,
        application_id text,transfer_type text NOT NULL,school_name text NOT NULL,reason text NOT NULL,requested_on date NOT NULL,
        status text DEFAULT 'pending',notes text,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      CREATE TABLE student_academic_enrollments(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text NOT NULL,
        student_id text NOT NULL,application_id text NOT NULL,class_section_id text,class_name text NOT NULL,stream_name text NOT NULL,
        academic_year text NOT NULL,status text DEFAULT 'active',enrolled_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),
        CONSTRAINT uq_student_academic_enrollments_tenant_id_id UNIQUE(tenant_id,id),
        CONSTRAINT uq_student_academic_enrollments_student_year UNIQUE(tenant_id,student_id,academic_year));
      CREATE TABLE student_academic_lifecycle_events(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,student_id text,
        source_enrollment_id text,target_enrollment_id text,event_type text,from_class_name text,from_stream_name text,from_academic_year text,
        to_class_section_id text,to_class_name text,to_stream_name text,to_academic_year text,reason text,notes text,created_by_user_id uuid,created_at timestamptz DEFAULT NOW());
      CREATE TABLE student_allocations(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,student_id text,class_name text,
        stream_name text,dormitory_name text,transport_route text,effective_from date DEFAULT CURRENT_DATE,is_current boolean DEFAULT true,notes text,
        created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      CREATE TABLE student_subject_enrollments(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,student_id text,
        academic_enrollment_id text,academic_year_id text,academic_term_id text,class_section_id text,stream_id text,
        subject_id text,subject_code text,subject_name text,curriculum_model text,subject_type text DEFAULT 'academic',is_compulsory boolean,
        selected_by_user_id uuid,status text DEFAULT 'active',effective_from date DEFAULT CURRENT_DATE,effective_to date,
        created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      CREATE UNIQUE INDEX fixture_active_subject ON student_subject_enrollments(tenant_id,student_id,academic_year_id,subject_id)
        WHERE status='active' AND academic_year_id IS NOT NULL AND subject_id IS NOT NULL;
      CREATE TABLE academic_timetable_slots(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,class_section_id text,
        day_of_week text,starts_at time,ends_at time,subject_name text,room_name text,is_active boolean DEFAULT true);
      CREATE TABLE student_timetable_enrollments(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,student_id text,
        academic_enrollment_id text,timetable_slot_id text,day_of_week text,starts_at time,ends_at time,subject_name text,room_name text,status text DEFAULT 'active',
        created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),UNIQUE(tenant_id,student_id,timetable_slot_id));
      CREATE TABLE notifications(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,notification_key text,
        recipient_user_id uuid,type text,title text,body text,priority text,source_module text,source_record_id text,metadata jsonb DEFAULT '{}',
        status text DEFAULT 'unread',read_at timestamptz,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),UNIQUE(tenant_id,notification_key));
      CREATE TABLE approval_rules(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,school_id text,module text,action text,requester_roles text[],approver_roles text[],
        approval_level text DEFAULT 'SINGLE',requires_reason boolean DEFAULT true,allow_self_approval boolean DEFAULT false,is_active boolean DEFAULT true);
      CREATE TABLE dashboard_approval_requests(id text PRIMARY KEY DEFAULT gen_random_uuid()::text,tenant_id text,approval_key text,
        requested_by_user_id uuid,approver_role text,approver_user_id uuid,module text,record_id text,approval_type text,reason text,
        status text DEFAULT 'PENDING',decision_note text,decided_at timestamptz,metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),UNIQUE(tenant_id,approval_key));
      CREATE TABLE progression_fixture_events(id bigserial PRIMARY KEY,payload jsonb NOT NULL);
      CREATE TABLE progression_fixture_history(id text PRIMARY KEY,tenant_id text,student_id text,
        academic_year_id text,class_section_id text,subject_enrollment_id text REFERENCES student_subject_enrollments(id),kind text,payload jsonb);
      CREATE TABLE invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,student_id text NOT NULL,
        invoice_number text NOT NULL,total_amount_minor bigint NOT NULL,amount_paid_minor bigint NOT NULL,status text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT NOW());
      CREATE TABLE payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,student_id text NOT NULL,
        amount_minor bigint NOT NULL,receipt_number text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT NOW());
      CREATE TABLE attendance_records(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,student_id text NOT NULL,
        attendance_date date NOT NULL,status text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT NOW());
      CREATE TABLE exam_marks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,student_id text NOT NULL,
        academic_term_id text NOT NULL,class_section_id text NOT NULL,subject_id text NOT NULL,score numeric NOT NULL,status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT NOW());
      CREATE TABLE library_borrowers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,subject_id text NOT NULL,
        borrower_type text NOT NULL,restrictions jsonb NOT NULL DEFAULT '{}');
      CREATE TABLE library_circulation_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,borrower_id uuid NOT NULL,
        action text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT NOW());
      CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$ BEGIN NEW.updated_at=NOW(); RETURN NEW; END $$ LANGUAGE plpgsql;
    `);
    await new AcademicsSchemaService({runSchemaBootstrap:async(sql:string)=>this.pool.query(sql)} as never).onModuleInit();
    await this.pool.query(COHORT_SCHEMA_SQL);
    await this.pool.query(PROGRESSION_SCHEMA_SQL);
    await this.pool.query(`CREATE ROLE "${this.runtimeRole}" NOLOGIN NOSUPERUSER NOBYPASSRLS;
      GRANT USAGE ON SCHEMA public TO "${this.runtimeRole}";
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO "${this.runtimeRole}";
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO "${this.runtimeRole}";`);
    for(const table of ['students','student_transfer_records','student_academic_enrollments','student_academic_lifecycle_events','student_allocations','student_subject_enrollments','student_timetable_enrollments','school_settings','tenant_memberships']) {
      const column=table==='school_settings'?'school_id':'tenant_id';
      await this.pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY fixture_scope ON ${table} USING (${column}=current_setting('app.tenant_id',true)) WITH CHECK (${column}=current_setting('app.tenant_id',true));`);
    }
    await this.pool.query(`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY; ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
      CREATE POLICY tenants_rls_policy ON tenants USING(tenant_id=current_setting('app.tenant_id',true) OR current_setting('app.role',true)='platform_owner')
      WITH CHECK(tenant_id=current_setting('app.tenant_id',true) OR current_setting('app.role',true)='platform_owner');`);
  }
  async close() {
    if(this.pool) {
      await this.pool.query(`DROP OWNED BY "${this.runtimeRole}"; DROP ROLE IF EXISTS "${this.runtimeRole}"`).catch(()=>undefined);
      await this.pool.end();
    }
  }
  async installStudentStatusTrigger() {
    let source='';
    await new StudentsSchemaService({runSchemaBootstrap:async(sql:string)=>{source=sql;}} as never,
      {onModuleInit:async()=>undefined} as never).onModuleInit();
    const functionSql=source.match(/CREATE OR REPLACE FUNCTION sync_student_tenant_columns\(\)[\s\S]*?\$\$ LANGUAGE plpgsql;/)?.[0];
    if(!functionSql) throw new Error('Student lifecycle trigger was not found in the production schema.');
    await this.pool.query(functionSql);
    await this.pool.query(`CREATE TRIGGER progression_test_status BEFORE INSERT OR UPDATE ON students
      FOR EACH ROW EXECUTE FUNCTION sync_student_tenant_columns();`);
  }
  async reset() {
    this.failEvent=false;
    const tables=await this.q("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    await this.pool.query(`TRUNCATE ${tables.map(row=>`"${String(row.tablename).replace(/"/g,'""')}"`).join(',')} RESTART IDENTITY CASCADE`);
    await this.q('INSERT INTO users(id,email,display_name) VALUES ($1,\'deputy@example.test\',\'Deputy\'),($2,\'teacher@example.test\',\'Teacher\'),($3,\'other@example.test\',\'Destination Teacher\'),($4,\'principal@example.test\',\'Principal\')',[this.user,this.teacher,this.otherTeacher,this.principal]);
    for(const tenant of [this.school,this.foreignSchool]) {
      await this.q('INSERT INTO tenants(tenant_id) VALUES ($1)',[tenant]);
      await this.q('INSERT INTO schools(id,slug,name) VALUES ($1,$1,$1)',[tenant]);
      await this.q('INSERT INTO school_settings(school_id,timezone) VALUES ($1,\'Africa/Nairobi\')',[tenant]);
      await this.q('INSERT INTO admission_settings(tenant_id) VALUES ($1)',[tenant]);
      for(const person of [this.user,this.teacher,this.otherTeacher,this.principal]) {
        const [role]=await this.q('INSERT INTO roles(tenant_id,code,name) VALUES ($1,$2,$2) RETURNING id',[tenant,person===this.user?'deputy_principal':person===this.principal?'principal':'teacher']);
        await this.q('INSERT INTO tenant_memberships(tenant_id,user_id,role_id) VALUES($1,$2,$3)',[tenant,person,role.id]);
      }
      for(const year of [2026,2027,2028]) {
        await this.q(`INSERT INTO academic_years(id,tenant_id,name,starts_on,ends_on,status,is_current)
          VALUES($1,$2,$3,$4,$5,'active',$6)`,[`${tenant}-${year}`,tenant,String(year),`${year}-01-01`,`${year}-12-31`,year===2026]);
        await this.q(`INSERT INTO academic_terms(id,tenant_id,academic_year_id,name,starts_on,ends_on,status)
          VALUES($1,$2,$3,'Term 1',$4,$5,'active')`,[`${tenant}-${year}-term`,tenant,`${tenant}-${year}`,`${year}-01-10`,`${year}-11-20`]);
      }
      for(const [index,model] of ['CBC','8-4-4'].entries()) {
        await this.q('INSERT INTO academic_levels(id,tenant_id,name,system_type,order_index) VALUES($1,$2,$3,$3,$4)',[`${tenant}-${model}`,tenant,model,index]);
        for(const grade of model==='CBC'?[6,7,8,9,10,11,12]:[1,2,3,4]) await this.addClass(tenant,2026,grade,model);
      }
      for(const subject of ['math','english','art']) await this.q(`INSERT INTO subjects(id,tenant_id,name,code,status)
        VALUES($1,$2,$3,$3,'active')`,[`${tenant}-${subject}`,tenant,subject]);
      await this.transaction(tenant,tx=>ensureCohortMigration(tx,tenant));
    }
  }
  classId(grade:number, model='CBC', year=2026, tenant=this.school) { return `${tenant}-${year}-${model}-${grade}`; }
  streamId(grade:number, stream='East', model='CBC', year=2026,tenant=this.school) { return `${this.classId(grade,model,year,tenant)}-${stream}`; }
  async addClass(tenant:string,year:number,grade:number,model='CBC') {
    const id=this.classId(grade,model,year,tenant);
    await this.q(`INSERT INTO class_sections(id,tenant_id,academic_year_id,academic_level_id,name,grade_level,curriculum_model,status,capacity)
      VALUES($1,$2,$3,$4,$5,$6,$7,'active',100) ON CONFLICT DO NOTHING`,[id,tenant,`${tenant}-${year}`,`${tenant}-${model}`,`${model==='8-4-4'?'Form':'Grade'} ${grade}`,String(grade),model]);
    for(const stream of ['East','West']) await this.q(`INSERT INTO class_streams(id,tenant_id,class_section_id,name,capacity)
      VALUES($1,$2,$3,$4,50) ON CONFLICT DO NOTHING`,[this.streamId(grade,stream,model,year,tenant),tenant,id,stream]);
    return id;
  }
  async configureClass(grade:number,stream='East',model='CBC',year=2026,tenant=this.school,teacher=this.otherTeacher) {
    return this.transaction(tenant,async tx=>{
      const classId=this.classId(grade,model,year,tenant),streamId=this.streamId(grade,stream,model,year,tenant);
      const [context]=await ensureCohortContexts(tx,tenant,classId,streamId);
      await writeCohortSubjects(tx,tenant,{class_section_id:classId,stream_id:streamId,subject_ids:[`${tenant}-math`],is_compulsory:true,actor_user_id:this.user});
      await writeCohortSubjects(tx,tenant,{class_section_id:classId,stream_id:streamId,subject_ids:[`${tenant}-english`,`${tenant}-art`],is_compulsory:false,actor_user_id:this.user});
      await writeCohortTeacher(tx,tenant,{class_section_id:classId,stream_id:streamId,subject_id:`${tenant}-math`,teacher_user_id:teacher,created_by_user_id:this.user,effective_from:'2025-01-01'});
      return context;
    });
  }
  async seed(grade=7,stream='East',model='CBC',tenant=this.school) {
    const id=randomUUID(),classId=this.classId(grade,model,2026,tenant),streamId=this.streamId(grade,stream,model,2026,tenant);
    const context=await this.configureClass(grade,stream,model,2026,tenant,this.teacher);
    const [student]=await this.q(`INSERT INTO students(id,tenant_id,school_id,admission_number,first_name,current_class_id,current_stream_id)
      VALUES($1,$2,$2,$3,'Ada',$4,$5) RETURNING *`,[id,tenant,`ADM-${id.slice(0,8)}`,classId,streamId]);
    const [application]=await this.q('INSERT INTO admission_applications(tenant_id,admitted_student_id) VALUES($1,$2) RETURNING id',[tenant,id]);
    const [enrollment]=await this.q(`INSERT INTO student_academic_enrollments(tenant_id,student_id,application_id,class_section_id,stream_id,class_name,stream_name,academic_year,cohort_id,cohort_placement_id,academic_year_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,'2026',$8,$9,$10) RETURNING *`,[tenant,id,application.id,classId,streamId,`${model==='8-4-4'?'Form':'Grade'} ${grade}`,stream,context.cohort_id,context.id,`${tenant}-2026`]);
    await this.q(`INSERT INTO student_class_assignments(school_id,tenant_id,student_id,class_section_id,stream_id,academic_level_id,academic_year_id,cohort_id,cohort_placement_id)
      VALUES($1,$1,$2,$3,$4,$5,$6,$7,$8)`,[tenant,id,classId,streamId,`${tenant}-${model}`,`${tenant}-2026`,context.cohort_id,context.id]);
    await this.q(`INSERT INTO student_allocations(tenant_id,student_id,class_name,stream_name,dormitory_name,transport_route)
      VALUES($1,$2,$3,$4,'Dorm A','Route A')`,[tenant,id,enrollment.class_name,stream]);
    for(const subject of ['math','english']) await this.q(`INSERT INTO student_subject_enrollments(tenant_id,student_id,academic_enrollment_id,academic_year_id,class_section_id,stream_id,
      subject_id,subject_code,subject_name,is_compulsory,effective_from)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9,'2026-01-10')`,[tenant,id,enrollment.id,`${tenant}-2026`,classId,streamId,`${tenant}-${subject}`,subject,subject==='math']);
    const [subject]=await this.q('SELECT id FROM student_subject_enrollments WHERE student_id=$1 ORDER BY id LIMIT 1',[id]);
    for(const kind of ['marks','attendance','report-card','invoice','payment','library','discipline','counselling']) await this.q(`INSERT INTO progression_fixture_history
      (id,tenant_id,student_id,academic_year_id,class_section_id,subject_enrollment_id,kind,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,
    [`${id}-${kind}`,tenant,id,`${tenant}-2026`,classId,subject.id,kind,JSON.stringify({value:kind==='payment'?12500:84,approved:true})]);
    await this.q("INSERT INTO invoices(tenant_id,student_id,invoice_number,total_amount_minor,amount_paid_minor,status) VALUES($1,$2,$3,400000,125000,'open')",[tenant,id,`INV-${id}`]);
    await this.q("INSERT INTO payments(tenant_id,student_id,amount_minor,receipt_number,status) VALUES($1,$2,125000,$3,'completed')",[tenant,id,`REC-${id}`]);
    await this.q("INSERT INTO attendance_records(tenant_id,student_id,attendance_date,status,metadata) VALUES($1,$2,'2026-02-10','present',$3::jsonb)",[tenant,id,JSON.stringify({academic_year_id:`${tenant}-2026`,class_section_id:classId})]);
    await this.q("INSERT INTO exam_marks(tenant_id,student_id,academic_term_id,class_section_id,subject_id,score,status) VALUES($1,$2,$3,$4,$5,84,'published')",[tenant,id,`${tenant}-2026-term`,classId,`${tenant}-math`]);
    const [borrower]=await this.q("INSERT INTO library_borrowers(tenant_id,subject_id,borrower_type) VALUES($1,$2,'student') RETURNING id",[tenant,id]);
    await this.q("INSERT INTO library_circulation_ledger(tenant_id,borrower_id,action,metadata) VALUES($1,$2,'issued','{\"book\":\"Algebra\",\"due_on\":\"2027-01-15\"}')",[tenant,borrower.id]);
    return {...student,enrollment,context};
  }
  async relatedRecords(id:string) {
    return {
      invoices:await this.q('SELECT * FROM invoices WHERE student_id=$1 ORDER BY id',[id]),
      payments:await this.q('SELECT * FROM payments WHERE student_id=$1 ORDER BY id',[id]),
      attendance:await this.q('SELECT * FROM attendance_records WHERE student_id=$1 ORDER BY id',[id]),
      marks:await this.q('SELECT * FROM exam_marks WHERE student_id=$1 ORDER BY id',[id]),
      library:await this.q('SELECT ledger.* FROM library_circulation_ledger ledger JOIN library_borrowers borrower ON borrower.id=ledger.borrower_id AND borrower.tenant_id=ledger.tenant_id WHERE borrower.subject_id=$1 ORDER BY ledger.id',[id]),
    };
  }
}
