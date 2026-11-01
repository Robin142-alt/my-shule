import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { openMarkEntry } from '../src/modules/admin-command/mark-entry-access';

describe('Marks access and submission integrity', () => {
  let pool: Pool;
  let repository: ExamsRepository;
  const tenant = 'submission-school';
  const ids = Object.fromEntries(['exam','term','class','student','teacher','manager'].map(key => [key, randomUUID()]));
  const sheets = Array.from({ length: 33 }, () => ({ subject: randomUUID(), paper: randomUUID(), window: randomUUID() }));
  const query = (sql: string, params: unknown[] = []) => pool.query(sql, params);

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost','127.0.0.1','[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) throw new Error('Use disposable local PostgreSQL.');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=marks_submission_integrity,public' });
    await query('CREATE SCHEMA marks_submission_integrity');
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const sql of bootstrap.matchAll(/CREATE TABLE IF NOT EXISTS \w+ \([\s\S]*?\n      \);/g)) await query(sql[0]);
    await query(`ALTER TABLE exam_assessments ADD COLUMN IF NOT EXISTS class_section_id uuid;
      ALTER TABLE exam_mark_entry_windows ADD COLUMN IF NOT EXISTS stream_scope jsonb NOT NULL DEFAULT '{}'::jsonb;
      CREATE TABLE academic_terms(id text,tenant_id text,academic_year_id text);
      CREATE TABLE students(id uuid,tenant_id text,status text DEFAULT 'active');
      CREATE TABLE student_class_assignments(tenant_id text,student_id text,class_section_id text,stream_id text,status text DEFAULT 'active');
      CREATE TABLE student_subject_enrollments(tenant_id text,student_id text,class_section_id text,subject_id text,status text DEFAULT 'active');
      CREATE TABLE teacher_subject_assignments(tenant_id text,teacher_user_id text,class_section_id text,subject_id text,
        stream_id text,academic_term_id text,status text DEFAULT 'active',mark_entry_allowed boolean DEFAULT true,
        effective_from date DEFAULT CURRENT_DATE,effective_to date);`);
    repository = new ExamsRepository({ executeWithTenant: async (school: string, _actor: string, action: (tx: any) => Promise<any>) => {
      expect(school).toBe(tenant);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await action({ $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql,values)).rows,
          $executeRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql,values)).rowCount });
        await client.query('COMMIT'); return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    } } as never);
  });
  beforeEach(async () => {
    await query(`TRUNCATE exam_series,exam_assessments,exam_mark_entry_windows,exam_marks,exam_mark_audit_logs,
      student_report_cards,student_report_card_audit_logs,exam_mark_versions,students,student_class_assignments,
      student_subject_enrollments,teacher_subject_assignments CASCADE`);
    await query(`INSERT INTO exam_series(id,tenant_id,academic_term_id,name,starts_on,ends_on,status)
      VALUES ($1,$2,$3,'End term',CURRENT_DATE-1,CURRENT_DATE+7,'submitted')`,[ids.exam,tenant,ids.term]);
    await query('INSERT INTO students VALUES ($1,$2)',[ids.student,tenant]);
    await query('INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ($1,$2,$3)',[tenant,ids.student,ids.class]);
    for (const sheet of sheets) {
      await query(`INSERT INTO exam_assessments(id,tenant_id,exam_series_id,subject_id,class_section_id,name)
        VALUES ($1,$2,$3,$4,$5,'Paper')`,[sheet.paper,tenant,ids.exam,sheet.subject,ids.class]);
      await query(`INSERT INTO exam_mark_entry_windows(id,tenant_id,exam_series_id,subject_id,class_section_id,opens_at,closes_at,status)
        VALUES ($1,$2,$3,$4,$5,NOW()-INTERVAL '2 days',NOW()+INTERVAL '2 days','closed')`,[sheet.window,tenant,ids.exam,sheet.subject,ids.class]);
      await query('INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ($1,$2,$3,$4)',[tenant,ids.student,ids.class,sheet.subject]);
      await query('INSERT INTO teacher_subject_assignments(tenant_id,teacher_user_id,class_section_id,subject_id) VALUES ($1,$2,$3,$4)',[tenant,ids.teacher,ids.class,sheet.subject]);
      await query(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,academic_term_id,class_section_id,subject_id,student_id,
        score,score_status,status,entered_by_user_id,assigned_teacher_user_id,submitted_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,60,'entered','submitted',$8,$8,NOW()-INTERVAL '1 day')`,
      [tenant,ids.exam,sheet.paper,ids.term,ids.class,sheet.subject,ids.student,ids.teacher]);
    }
    await query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id,status,published_at,metadata)
      VALUES ($1,$2,$3,'official-snapshot','published',NOW()-INTERVAL '1 hour','{"official_score":60}')`,[tenant,ids.exam,ids.student]);
  });
  afterAll(async () => { await pool?.end(); });

  const mark = async (index=0) => (await query('SELECT *,updated_at::text AS version FROM exam_marks WHERE assessment_id=$1',[sheets[index].paper])).rows[0];
  const reports = async () => (await query('SELECT * FROM student_report_cards ORDER BY id')).rows;
  async function save(score: number, manager=true, expected?: string, index=0, extra: Record<string,any> = {}) {
    const current = await mark(index), sheet = sheets[index];
    return repository.saveTeacherMarkSheet({tenant_id:tenant,actor_user_id:manager?ids.manager:ids.teacher,
      teacher_user_id:ids.teacher,manager_entry:manager,source_window_id:sheet.window,submit:false,
      rows:[{row_number:1,exam_series_id:ids.exam,assessment_id:sheet.paper,academic_term_id:ids.term,class_section_id:ids.class,
        subject_id:sheet.subject,student_id:ids.student,score,score_status:'entered',remarks:null,category_scores:{},
        has_expected_version:true,expected_updated_at:expected ?? current.version,paper_config_version:1}],...extra});
  }

  it('reopens 33 submitted markbooks without changing marks, submission history or valid report cards',async()=>{
    const before=(await query('SELECT * FROM exam_marks ORDER BY id')).rows, cards=await reports();
    await openMarkEntry({readSql:query,writeSql:query} as never,tenant,ids.manager,
      {exam_series_id:ids.exam,scope:'everyone',closes_at:new Date(Date.now()+86400000).toISOString()});
    expect((await query('SELECT * FROM exam_marks ORDER BY id')).rows).toEqual(before);
    expect(await reports()).toEqual(cards);
    expect((await query("SELECT COUNT(*)::int AS count FROM exam_marks WHERE status='submitted'")).rows[0].count).toBe(33);
  });

  it('preserves identical submitted marks and only invalidates the changed markbook',async()=>{
    const before=await mark(), cards=await reports();
    await save(60);
    expect(await mark()).toEqual(before);
    expect(await reports()).toEqual(cards);
    await save(61);
    expect(await mark()).toMatchObject({score:'61.00',status:'draft',submitted_at:before.submitted_at,entered_by_user_id:ids.teacher,
      assigned_teacher_user_id:ids.teacher,updated_by_user_id:ids.manager});
    expect((await query("SELECT COUNT(*)::int AS count FROM exam_marks WHERE status='submitted'")).rows[0].count).toBe(32);
    expect((await reports())[0]).toMatchObject({status:'published',report_snapshot_id:'official-snapshot',metadata:{official_score:60}});
    expect((await query('SELECT previous_score,new_score,actor_user_id FROM exam_mark_audit_logs WHERE mark_id=$1',[before.id])).rows)
      .toContainEqual({previous_score:'60.00',new_score:'61.00',actor_user_id:ids.manager});
  });

  it.each(['closed','expired','locked','published'])('permits administrative correction for %s entry while restricting teachers',async state=>{
    if(state==='expired') await query("UPDATE exam_mark_entry_windows SET opens_at=NOW()-INTERVAL '3 days',closes_at=NOW()-INTERVAL '1 day',status='open'");
    if(['locked','published'].includes(state)) await query(`UPDATE exam_series SET status=$1,locked_at=NOW(),published_at=CASE WHEN $1='published' THEN NOW() END`,[state]);
    await expect(save(70,false)).rejects.toThrow();
    await save(70);
    expect(await mark()).toMatchObject({score:'70.00',status:'draft',updated_by_user_id:ids.manager});
  });

  it('rejects a stale correction and concurrent changes without losing accepted marks',async()=>{
    const version=(await mark()).version;
    const attempts=await Promise.allSettled([save(71,true,version),save(72,true,version)]);
    expect(attempts.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect(attempts.filter(result=>result.status==='rejected')).toHaveLength(1);
    expect([71,72]).toContain(Number((await mark()).score));
    await expect(save(73,true,version)).rejects.toThrow(/changed|refresh/i);
  });

  it('allows unassigned administrative entry and keeps the original editor and submission history',async()=>{
    await query('DELETE FROM teacher_subject_assignments');
    const before=await mark();
    await save(75,true,undefined,0,{teacher_user_id:undefined});
    expect(await mark()).toMatchObject({score:'75.00',entered_by_user_id:ids.teacher,submitted_at:before.submitted_at});
  });

  it('permits an explicitly reopened teacher to save identical data and later make an audited correction',async()=>{
    await openMarkEntry({readSql:query,writeSql:query} as never,tenant,ids.manager,
      {exam_series_id:ids.exam,scope:'teacher',teacher_user_id:ids.teacher,closes_at:new Date(Date.now()+86400000).toISOString()});
    const before=await mark();
    await save(60,false);
    expect(await mark()).toEqual(before);
    await save(64,false);
    expect(await mark()).toMatchObject({score:'64.00',status:'draft',submitted_at:before.submitted_at});
  });

  it('submits the accepted current revision once and rejects duplicate and stale submissions atomically',async()=>{
    await save(65);
    const scopeInput={tenant_id:tenant,mark_entry_window_id:sheets[0].window,assessment_id:sheets[0].paper,
      teacher_user_id:ids.teacher,stream_ids:['']};
    const scope=await repository.loadAdministrativeMarkbook(scopeInput);
    expect(scope.is_submitted).toBe(false);
    const submitted=await save(65,true,undefined,0,{submit:true,stream_ids:[''],expected_revision:scope.revision});
    expect(submitted).toMatchObject({submitted_count:1,status:'submitted'});
    await expect(save(65,true,undefined,0,{submit:true,stream_ids:[''],expected_revision:scope.revision})).rejects.toThrow(/changed|already submitted/);
    expect((await query("SELECT actor_user_id FROM exam_mark_audit_logs WHERE action='grade.submitted'")).rows)
      .toEqual([{actor_user_id:ids.manager}]);
    expect((await repository.loadAdministrativeMarkbook(scopeInput)).revision).not.toBe(scope.revision);
  });

  it('preserves original teacher attribution when an administrator submits a reassigned markbook', async () => {
    const originalTeacher = randomUUID();
    await query('UPDATE exam_marks SET assigned_teacher_user_id=$1 WHERE assessment_id=$2',[originalTeacher,sheets[0].paper]);
    await save(67);
    const scope = await repository.loadAdministrativeMarkbook({tenant_id:tenant, mark_entry_window_id:sheets[0].window,
      assessment_id:sheets[0].paper, teacher_user_id:ids.teacher, stream_ids:['']});
    await save(67,true,undefined,0,{submit:true,stream_ids:[''],expected_revision:scope.revision});
    expect(await mark()).toMatchObject({status:'submitted', assigned_teacher_user_id:originalTeacher, updated_by_user_id:ids.manager});
  });

  it('requires resubmission when a newly eligible assessment record is missing',async()=>{
    const scopeInput={tenant_id:tenant,mark_entry_window_id:sheets[0].window,assessment_id:sheets[0].paper,
      teacher_user_id:ids.teacher,stream_ids:['']};
    const original=await repository.loadAdministrativeMarkbook(scopeInput);
    const learner=randomUUID();
    await query('INSERT INTO students VALUES ($1,$2)',[learner,tenant]);
    await query('INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id) VALUES ($1,$2,$3)',[tenant,learner,ids.class]);
    await query('INSERT INTO student_subject_enrollments(tenant_id,student_id,class_section_id,subject_id) VALUES ($1,$2,$3,$4)',[tenant,learner,ids.class,sheets[0].subject]);
    const current=await repository.loadAdministrativeMarkbook(scopeInput);
    expect(current.is_submitted).toBe(false);
    expect(current.revision).not.toBe(original.revision);
    expect(current.marks.filter((item:any)=>!item.mark_id)).toHaveLength(1);
    await expect(save(60,true,undefined,0,{submit:true,stream_ids:[''],expected_revision:original.revision})).rejects.toThrow(/changed/);
  });

  it('rejects cross-school windows and rolls back marks when event recording fails',async()=>{
    const before=await mark();
    await expect(save(67,true,undefined,0,{source_window_id:randomUUID()})).rejects.toThrow(/changed|scope|assignment/);
    const sheet=sheets[0];
    await expect(repository.saveTeacherMarkSheet({tenant_id:tenant,actor_user_id:ids.manager,manager_entry:true,
      source_window_id:sheet.window,submit:false,rows:[{row_number:1,exam_series_id:ids.exam,assessment_id:sheet.paper,
        academic_term_id:ids.term,class_section_id:ids.class,subject_id:sheet.subject,student_id:ids.student,
        score:67,score_status:'entered',remarks:null,has_expected_version:true,expected_updated_at:before.version}]},
    async()=>{throw new Error('event unavailable');})).rejects.toThrow('event unavailable');
    expect(await mark()).toEqual(before);
  });
});
