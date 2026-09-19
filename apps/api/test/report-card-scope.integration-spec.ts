import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { ReportCardTemplateService } from '../src/modules/exams/services/report-card-template.service';

// Real PostgreSQL predicates, row locks, transactions and forced RLS, without touching a deployed school.
describe('Report-card scopes and batch transitions', () => {
  let pool: Pool;
  let repository: ExamsRepository;
  const exam = randomUUID(), actor = randomUUID();
  const students = Array.from({ length: 7 }, () => randomUUID());
  const cards = Array.from({ length: 7 }, () => randomUUID());
  const base = { tenant_id: 'scope-school', exam_series_id: exam };
  const command = { ...base, actor_user_id: actor, actor_role: 'exams_manager', action: 'submit' };
  const payload = new ReportCardTemplateService().buildPayload({ school: { name: 'Scope School' },
    student: { full_name: 'Scope Learner' }, subjects: [{ subject_id: 'math', subject_name: 'Math',
      score: 78, score_status: 'entered', max_score: 100 }] }, '2026-09-19T09:00:00Z');
  const query = (sql: string, params: unknown[] = []) => pool.query(sql, params);

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.includes('disposable')) throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=report_scopes,public', max: 8 });
    await query('CREATE SCHEMA report_scopes');
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const name of ['student_report_cards', 'student_report_card_audit_logs']) {
      await query(bootstrap.match(new RegExp(`CREATE TABLE IF NOT EXISTS ${name} \\([\\s\\S]*?\\n      \\);`))![0]);
    }
    await query(`CREATE TABLE students(tenant_id text,id text,first_name text,middle_name text,last_name text,admission_number text);
      CREATE TABLE class_sections(tenant_id text,id text,name text);
      CREATE TABLE class_streams(tenant_id text,id text,name text);
      CREATE TABLE student_class_assignments(tenant_id text,student_id text,class_section_id text,stream_id text,status text,
        updated_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW());
      CREATE TABLE exam_marks(tenant_id text,exam_series_id uuid,student_id uuid,status text);
      CREATE TABLE exam_series(tenant_id text,id uuid,name text,academic_term_id text);
      CREATE TABLE academic_terms(tenant_id text,id text,name text,academic_year_id text);
      CREATE TABLE academic_years(tenant_id text,id text,name text);
      CREATE TABLE test_outbox(tenant_id text,card_id uuid,version integer);
      CREATE ROLE report_scopes_runtime NOLOGIN;
      GRANT USAGE ON SCHEMA report_scopes TO report_scopes_runtime;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA report_scopes TO report_scopes_runtime;`);
    for (const table of ['student_report_cards', 'student_report_card_audit_logs', 'students', 'test_outbox']) {
      await query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY tenant_scope ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
    }
    repository = new ExamsRepository({ executeWithTenant: async (tenant: string, user: string, run: (tx: any) => Promise<any>) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN'); await client.query('SET LOCAL ROLE report_scopes_runtime');
        await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
        const result = await run({ $queryRawUnsafe: async (sql: string, ...params: unknown[]) => (await client.query(sql, params)).rows });
        await client.query('COMMIT'); return result;
      } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    } } as never);
    await query(`INSERT INTO class_sections VALUES ('scope-school','grade8','Grade 8'),('scope-school','grade9','Grade 9');
      INSERT INTO class_streams VALUES ('scope-school','north','North'),('scope-school','south','South');`);
  });

  beforeEach(async () => {
    await query('TRUNCATE student_report_cards,student_report_card_audit_logs,students,student_class_assignments,exam_marks,test_outbox');
    for (let i=0;i<7;i++) {
      const tenant = i===6 ? 'other-school' : base.tenant_id;
      await query('INSERT INTO students VALUES ($1,$2,$3,NULL,$4,$5)', [tenant, students[i], 'Learner', String(i), `ADM-${i}`]);
      await query("INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id,status) VALUES($1,$2,$3,$4,'active')",
        [tenant,students[i],i<4?'grade8':'grade9',i<3?'north':i===3?'south':null]);
      const snapshot = structuredClone(payload);
      if (i===2) snapshot.template_fields.class_teacher_comment = null;
      await query(`INSERT INTO student_report_cards(id,tenant_id,exam_series_id,student_id,report_snapshot_id,status,verification_code,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[cards[i],tenant,exam,students[i],`snapshot-${i}`,
        i===1?'under_review':i===5?'regeneration_required':'draft_generated',`VERIFY-${i}`,JSON.stringify({report_card:snapshot})]);
      await query("INSERT INTO exam_marks VALUES($1,$2,$3,'locked')",[tenant,exam,students[i]]);
    }
  });
  afterAll(async () => { if (pool) { await query('DROP SCHEMA report_scopes CASCADE; DROP ROLE report_scopes_runtime'); await pool.end(); } });

  it('resolves school, class, stream, students and streamless classes with parent intersections', async () => {
    expect((await repository.getReportCardScopeSummary(base)).total_cards).toBe(6);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade8'})).total_cards).toBe(4);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade8',stream_id:'north'})).eligible_cards).toBe(1);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade9'})).total_cards).toBe(2);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade8',student_ids:[students[4]]})).total_cards).toBe(0);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade8',report_card_ids:[cards[4],cards[6]]})).total_cards).toBe(0);
    expect((await repository.getReportCardScopeSummary({...base,student_ids:[students[0]]})).total_cards).toBe(1);
    const hierarchy=await repository.getReportCardScopeHierarchy(base);
    expect(hierarchy[0].streams.map(s=>s.stream_name)).toEqual(['North','South']);
    expect(hierarchy[1].streams).toEqual([]);
  });

  it('counts each card once even with duplicate class assignments and paginates only the table', async () => {
    await query('INSERT INTO student_class_assignments SELECT * FROM student_class_assignments WHERE student_id=$1',[students[0]]);
    const page=await repository.listScopedReportCards({...base,limit:1,offset:1});
    expect(page).toHaveLength(1); expect(page[0].filtered_total).toBe(6);
    const summary=await repository.getReportCardScopeSummary(base);
    expect(summary.total_cards).toBe(6); expect(summary.eligible_cards).toBe(3);
    const result=await repository.bulkTransitionReportCards({...command,preview_token:summary.preview_token});
    expect(result.updated_count).toBe(3); expect(result.skipped_count).toBe(3);
    expect(result.skipped_cards.map(c=>c.reason).join(' ')).toMatch(/comments/);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(3);
    expect((await query('SELECT status FROM student_report_cards WHERE id=$1',[cards[6]])).rows[0].status).toBe('draft_generated');
  });

  it('individual and bulk submission share comments, lock, revision and status eligibility', async () => {
    const single={...command,report_card_id:cards[2]};
    expect(await repository.transitionReportCard(single)).toBeNull();
    await query("UPDATE exam_marks SET status='submitted' WHERE student_id=$1",[students[0]]);
    expect(await repository.transitionReportCard({...single,report_card_id:cards[0]})).toBeNull();
    expect(await repository.transitionReportCard({...single,report_card_id:cards[5]})).toBeNull();
    await query('UPDATE student_report_cards SET is_current=false WHERE id=$1',[cards[3]]);
    expect(await repository.transitionReportCard({...single,report_card_id:cards[3]})).toBeNull();
    expect((await repository.getReportCardScopeSummary(base)).eligible_cards).toBe(1);
  });

  it('isolates failed rows and rolls back their transition, audit and event together', async () => {
    const result=await repository.bulkTransitionReportCards(command,async(card,tx)=>{
      await tx.$queryRawUnsafe('INSERT INTO test_outbox VALUES ($1,$2::uuid,$3::integer) RETURNING card_id',base.tenant_id,card.id,card.workflow_version);
      if(card.id===cards[3]) throw new Error('Injected delivery persistence failure');
    });
    expect(result.updated_count).toBe(2);expect(result.failed_count).toBe(1);expect(result.skipped_count).toBe(3);
    expect(result.failed_cards[0].student_name).toBe('Learner 3');
    expect((await query('SELECT * FROM test_outbox')).rows).toHaveLength(2);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(2);
    expect((await query('SELECT status FROM student_report_cards WHERE id=$1',[cards[3]])).rows[0].status).toBe('draft_generated');
  });

  it('prevents duplicate submission under concurrent requests and supports safe retries', async () => {
    const results=await Promise.all([repository.bulkTransitionReportCards(command),repository.bulkTransitionReportCards(command)]);
    expect(results.reduce((n,r)=>n+r.updated_count,0)).toBe(3);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(3);
    expect((await repository.bulkTransitionReportCards(command)).updated_count).toBe(0);
    expect((await query('SELECT MAX(workflow_version) AS version FROM student_report_cards')).rows[0].version).toBe(2);
  });

  it('rejects a stale confirmation before changing records', async()=>{
    const summary=await repository.getReportCardScopeSummary(base);
    await query("UPDATE student_report_cards SET updated_at=NOW(),status='under_review' WHERE id=$1",[cards[0]]);
    await expect(repository.bulkTransitionReportCards({...command,preview_token:summary.preview_token})).rejects.toThrow(/changed since confirmation/);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(0);
  });

  it('exports ordered server batches beyond 500 without truncation or cross-school records', async()=>{
    await query(`INSERT INTO students SELECT $1, gen_random_uuid()::text, 'Extra', NULL, lpad(n::text,4,'0'), n::text FROM generate_series(1,501) n`,[base.tenant_id]);
    await query(`INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,status)
      SELECT tenant_id,id,'grade9','active' FROM students WHERE tenant_id=$1 AND first_name='Extra'`,[base.tenant_id]);
    await query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id,status,verification_code,metadata)
      SELECT $1,$2::uuid,id::uuid,'extra-'||id,'draft_generated',id,$3::jsonb FROM students WHERE tenant_id=$1 AND first_name='Extra'`,[base.tenant_id,exam,JSON.stringify({report_card:payload})]);
    const resolved=await repository.resolveReportCardScope({...base,target_action:'export'});
    expect(resolved.cards).toHaveLength(507);
    const seen:string[]=[];
    for(let i=0;i<resolved.cards.length;i+=50){
      const rows=await repository.listReportCardIdsForBulkDownload({...base,report_card_ids:resolved.cards.slice(i,i+50).map(c=>c.id),limit:50});
      seen.push(...rows.map(c=>c.id));
    }
    expect(seen).toEqual(resolved.cards.map(c=>c.id));expect(new Set(seen).size).toBe(507);
  });
});
