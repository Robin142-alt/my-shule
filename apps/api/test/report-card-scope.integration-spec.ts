import { REPORT_INFRASTRUCTURE_SCHEMA } from '../src/modules/exams/services/report-infrastructure-schema';
import { REPORT_RENDERER_VERSION } from '../src/modules/exams/services/report-artifact-identity';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { ExamsRepository } from '../src/modules/exams/repositories/exams.repository';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { ReportCardTemplateService } from '../src/modules/exams/services/report-card-template.service';
import { ExamsService } from '../src/modules/exams/exams.service';
import { ForbiddenException } from '@nestjs/common';

// Real PostgreSQL predicates, row locks, transactions and forced RLS, without touching a deployed school.
describe('Report-card scopes and batch transitions', () => {
  let pool: Pool;
  let repository: ExamsRepository;
  const exam = randomUUID(), actor = randomUUID();
  const students = Array.from({ length: 7 }, () => randomUUID());
  const cards = Array.from({ length: 7 }, () => randomUUID());
  const base = { tenant_id: 'scope-school', exam_series_id: exam, target_action: 'publish' };
  const command = { ...base, actor_user_id: actor, actor_role: 'principal', action: 'publish' };
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
    await query(REPORT_INFRASTRUCTURE_SCHEMA);
    await query(`CREATE TABLE students(tenant_id text,id text,first_name text,middle_name text,last_name text,admission_number text);
      CREATE TABLE class_sections(tenant_id text,id text,name text);
      CREATE TABLE class_streams(tenant_id text,id text,name text);
      CREATE TABLE student_class_assignments(tenant_id text,student_id text,class_section_id text,stream_id text,status text,
        updated_at timestamptz DEFAULT NOW(),created_at timestamptz DEFAULT NOW());
      CREATE TABLE exam_marks(tenant_id text,exam_series_id uuid,student_id uuid,status text,
        id uuid DEFAULT gen_random_uuid(),updated_by_user_id uuid,published_at timestamptz,updated_at timestamptz DEFAULT now());
      CREATE TABLE exam_series(tenant_id text,id uuid,name text,academic_term_id text,status text,
        published_at timestamptz,updated_at timestamptz DEFAULT now());
      CREATE TABLE academic_terms(tenant_id text,id text,name text,academic_year_id text);
      CREATE TABLE academic_years(tenant_id text,id text,name text);
      CREATE TABLE test_outbox(tenant_id text,card_id uuid,version integer);
      CREATE ROLE report_scopes_runtime NOLOGIN;
      GRANT USAGE ON SCHEMA report_scopes TO report_scopes_runtime;
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA report_scopes TO report_scopes_runtime;`);
    for (const table of ['student_report_cards', 'student_report_card_audit_logs', 'students', 'exam_marks', 'exam_series', 'test_outbox']) {
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
    await query('TRUNCATE student_report_cards,student_report_card_audit_logs,students,student_class_assignments,exam_marks,exam_series,test_outbox');
    await query("INSERT INTO exam_series(tenant_id,id,name,status) VALUES($1,$2,'Term 3','reviewed'),('other-school',$2,'Other school exam','reviewed')", [base.tenant_id, exam]);
    for (let i=0;i<7;i++) {
      const tenant = i===6 ? 'other-school' : base.tenant_id;
      await query('INSERT INTO students VALUES ($1,$2,$3,NULL,$4,$5)', [tenant, students[i], 'Learner', String(i), `ADM-${i}`]);
      await query("INSERT INTO student_class_assignments(tenant_id,student_id,class_section_id,stream_id,status) VALUES($1,$2,$3,$4,'active')",
        [tenant,students[i],i<4?'grade8':'grade9',i<3?'north':i===3?'south':null]);
      const snapshot = structuredClone(payload);
      if (i===2) snapshot.template_fields.class_teacher_comment = null;
      await query(`INSERT INTO student_report_cards(id,tenant_id,exam_series_id,student_id,report_snapshot_id,status,verification_code,metadata)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[cards[i],tenant,exam,students[i],`snapshot-${i}`,
        i===1?'under_review':i===5?'regeneration_required':'draft_generated',`VERIFY-${i}`,JSON.stringify({report_card:snapshot,source_revision:"[]",renderer_version:REPORT_RENDERER_VERSION})]);
      await query("INSERT INTO exam_marks(tenant_id,exam_series_id,student_id,status) VALUES($1,$2,$3,'locked')",[tenant,exam,students[i]]);
    }
  });
  afterAll(async () => { if (pool) { await query('DROP SCHEMA report_scopes CASCADE; DROP ROLE report_scopes_runtime'); await pool.end(); } });

  it('resolves school, class, stream, students and streamless classes with parent intersections', async () => {
    expect((await repository.getReportCardScopeSummary(base)).total_cards).toBe(6);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade8'})).total_cards).toBe(4);
    expect((await repository.getReportCardScopeSummary({...base,class_section_id:'grade8',stream_id:'north'})).eligible_cards).toBe(2);
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
    expect(summary.total_cards).toBe(6); expect(summary.eligible_cards).toBe(4);
    const result=await repository.bulkTransitionReportCards({...command,preview_token:summary.preview_token});
    expect(result.updated_count).toBe(4); expect(result.skipped_count).toBe(2);
    expect(result.skipped_cards.map(c=>c.reason).join(' ')).toMatch(/comments/);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(4);
    expect((await query('SELECT status FROM student_report_cards WHERE id=$1',[cards[6]])).rows[0].status).toBe('draft_generated');
  });

  it('individual and bulk Principal release share comments, lock, revision and status eligibility', async () => {
    const single={...command,report_card_id:cards[2]};
    expect(await repository.transitionReportCard(single)).toBeNull();
    await query("UPDATE exam_marks SET status='submitted' WHERE student_id=$1",[students[0]]);
    expect(await repository.transitionReportCard({...single,report_card_id:cards[0]})).toBeNull();
    expect(await repository.transitionReportCard({...single,report_card_id:cards[5]})).toBeNull();
    await query('UPDATE student_report_cards SET is_current=false WHERE id=$1',[cards[3]]);
    expect(await repository.transitionReportCard({...single,report_card_id:cards[3]})).toBeNull();
    expect((await repository.getReportCardScopeSummary(base)).eligible_cards).toBe(2);
  });

  it.each(['draft_generated', 'draft', 'under_review', 'approved'])('releases a valid %s card directly with a Principal audit and no Dean approval', async (status) => {
    await query('UPDATE student_report_cards SET status=$2 WHERE id=$1', [cards[0], status]);
    const released = await repository.transitionReportCard({ ...command, report_card_id: cards[0] });
    expect(released).toMatchObject({ id: cards[0], tenant_id: base.tenant_id, status: 'published', workflow_version: 2 });
    const persisted = (await query('SELECT * FROM student_report_cards WHERE id=$1', [cards[0]])).rows[0];
    expect(persisted.published_by_user_id).toBe(actor);
    expect(persisted.approved_by_user_id).toBeNull();
    expect(persisted.submitted_by_user_id).toBeNull();
    expect(persisted.metadata.report_card).toEqual(payload);
    expect((await query('SELECT tenant_id,action,actor_user_id FROM student_report_card_audit_logs')).rows).toEqual([
      { tenant_id: base.tenant_id, action: 'report_card.published', actor_user_id: actor },
    ]);
  });

  it.each([
    ['missing snapshot', "UPDATE student_report_cards SET metadata=metadata - 'report_card' WHERE id=$1", /snapshot/],
    ['missing subjects', "UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{report_card,subjects}','[]') WHERE id=$1", /subject/],
    ['missing Principal comment', "UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{report_card,template_fields,principal_comment}','null') WHERE id=$1", /comments/],
    ['outdated renderer', "UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{renderer_version}','\"obsolete\"') WHERE id=$1", /regenerate/],
    ['stale source revision', "UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{source_revision}','\"[[\\\"school\\\",\\\"old\\\"]]\"') WHERE id=$1", /regenerate/],
    ['expired source validity', "UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{source_valid_until}','\"2000-01-01T00:00:00Z\"') WHERE id=$1", /regenerate/],
  ])('blocks direct, bulk and whole-series release with %s, including legacy approved cards', async (_label, sql, reason) => {
    await query("UPDATE student_report_cards SET status='approved',metadata=$2::jsonb WHERE tenant_id=$1", [base.tenant_id,
      JSON.stringify({ report_card: payload, source_revision: '[]', renderer_version: REPORT_RENDERER_VERSION })]);
    await query(sql as string, [cards[0]]);
    const selection = { ...base, report_card_ids: [cards[0]] };
    const summary = await repository.getReportCardScopeSummary(selection);
    expect(summary.eligible_cards).toBe(0);
    expect(summary.skipped_cards[0].reason).toMatch(reason as RegExp);
    expect(await repository.transitionReportCard({ ...command, report_card_id: cards[0] })).toBeNull();
    expect((await repository.bulkTransitionReportCards({ ...command, report_card_ids: [cards[0]] })).updated_count).toBe(0);
    const series = await repository.publishExamSeries(command);
    expect(series).toMatchObject({ series_published: false, blocked_count: 1, published_cards: [], audit_count: 0 });
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(0);
  });

  it('blocks release when a legacy approved snapshot has marks reopened for entry', async () => {
    await query("UPDATE student_report_cards SET status='approved' WHERE id=$1", [cards[0]]);
    await query("UPDATE exam_marks SET status='submitted' WHERE tenant_id=$1 AND student_id=$2", [base.tenant_id, students[0]]);
    const summary = await repository.getReportCardScopeSummary({ ...base, report_card_ids: [cards[0]] });
    expect(summary.eligible_cards).toBe(0);
    expect(summary.skipped_cards[0].reason).toMatch(/locked/);
    expect(await repository.transitionReportCard({ ...command, report_card_id: cards[0] })).toBeNull();
    expect((await repository.publishExamSeries(command))?.series_published).toBe(false);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(0);
  });

  it('releases an entire generated series with legacy stages atomically, preserving other schools', async () => {
    await query(`UPDATE student_report_cards SET status=CASE id WHEN $2::uuid THEN 'under_review' WHEN $3::uuid THEN 'draft'
      WHEN $4::uuid THEN 'approved' WHEN $5::uuid THEN 'published' ELSE 'draft_generated' END,metadata=$6::jsonb
      WHERE tenant_id=$1`, [base.tenant_id, cards[1], cards[2], cards[3], cards[4],
      JSON.stringify({ report_card: payload, source_revision: '[]', renderer_version: REPORT_RENDERER_VERSION })]);

    const result = await repository.publishExamSeries(command);
    expect(result).toMatchObject({ total_count: 6, already_published_count: 1, blocked_count: 0,
      published_marks_count: 6, audit_count: 5, series_published: true });
    expect(result?.published_cards).toHaveLength(5);
    const audits = (await query('SELECT * FROM student_report_card_audit_logs')).rows;
    expect(audits).toHaveLength(5);
    expect(audits.every(audit => audit.tenant_id === base.tenant_id && audit.action === 'report_card.published'
      && audit.actor_user_id === actor && audit.metadata.actor_role === 'principal')).toBe(true);
    expect((await query('SELECT DISTINCT status FROM student_report_cards WHERE tenant_id=$1', [base.tenant_id])).rows).toEqual([{ status: 'published' }]);
    expect((await query('SELECT status FROM student_report_cards WHERE id=$1', [cards[6]])).rows[0].status).toBe('draft_generated');
    expect((await query("SELECT status FROM exam_series WHERE tenant_id='other-school'")).rows[0].status).toBe('reviewed');
    expect((await query("SELECT status FROM exam_marks WHERE tenant_id='other-school'")).rows[0].status).toBe('locked');
    expect((await repository.publishExamSeries(command))?.audit_count).toBe(0);
  });

  it.each(['exams_manager', 'dean_academics'])('rejects %s publication across single, bulk and whole-series service entrypoints', async (role) => {
    const service = new ExamsService({ getStore: () => ({ tenant_id: base.tenant_id, user_id: actor, role,
      permissions: ['exams:read', 'exams:write', 'exams:review', 'exams:approve', 'exams:publish'] }) } as never, repository);
    await expect(service.transitionReportCard(cards[0], 'publish')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.bulkTransitionReportCards({ exam_series_id: exam, action: 'publish' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.publishExamSeries(exam)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(0);
  });

  it('rejects obsolete Dean report-card approval without changing cards', async () => {
    const service = new ExamsService({ getStore: () => ({ tenant_id: base.tenant_id, user_id: actor, role: 'dean_academics',
      permissions: ['exams:read', 'exams:review', 'exams:approve'] }) } as never, repository);
    await expect(service.transitionReportCard(cards[1], 'approve')).rejects.toThrow(/approval is no longer required/i);
    await expect(service.bulkTransitionReportCards({ exam_series_id: exam, action: 'approve' })).rejects.toThrow(/approval is no longer required/i);
    expect((await query('SELECT status FROM student_report_cards WHERE id=$1', [cards[1]])).rows[0].status).toBe('under_review');
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(0);
  });

  it('previews every current report for regeneration while excluding other schools', async () => {
    await query("UPDATE student_report_cards SET status=CASE id WHEN $1::uuid THEN 'approved' WHEN $2::uuid THEN 'published' ELSE status END,metadata='{}'::jsonb",[cards[3],cards[4]]);
    const summary=await repository.getReportCardScopeSummary({...base,target_action:'regenerate'});
    expect(summary.total_cards).toBe(6);
    expect(summary.eligible_cards).toBe(6);
    expect(summary.skipped_cards).toEqual([]);
    const scoped=await repository.resolveReportCardScope({...base,class_section_id:'grade9',target_action:'regenerate'});
    expect(scoped.cards.filter(card=>!card.ineligible_reason).map(card=>card.id).sort()).toEqual([cards[4],cards[5]].sort());
    await query("UPDATE student_report_cards SET status='under_review',updated_at=now() WHERE id=$1",[cards[0]]);
    expect((await repository.getReportCardScopeSummary({...base,target_action:'regenerate'})).preview_token).not.toBe(summary.preview_token);
  });

  it('keeps compatible signature-layout snapshots eligible while rejecting older renderers and changed inputs', async () => {
    await query(`UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{renderer_version}','"pdfkit-report-card-4"') WHERE id=$1`, [cards[0]]);
    expect((await repository.getReportCardScopeSummary({ ...base, report_card_ids: [cards[0]] })).eligible_cards).toBe(1);
    await query(`UPDATE student_report_cards SET metadata=jsonb_set(metadata,'{renderer_version}','"pdfkit-report-card-3"') WHERE id=$1`, [cards[0]]);
    expect((await repository.getReportCardScopeSummary({ ...base, report_card_ids: [cards[0]] })).eligible_cards).toBe(0);
    await query(`UPDATE student_report_cards SET metadata=metadata || $2::jsonb WHERE id=$1`, [cards[0], JSON.stringify({ renderer_version: 'pdfkit-report-card-4', source_revision: '[["school","old"]]' })]);
    expect((await repository.getReportCardScopeSummary({ ...base, report_card_ids: [cards[0]] })).eligible_cards).toBe(0);
  });

  it('isolates failed rows and rolls back their transition, audit and event together', async () => {
    const result=await repository.bulkTransitionReportCards(command,async(card,tx)=>{
      await tx.$queryRawUnsafe('INSERT INTO test_outbox VALUES ($1,$2::uuid,$3::integer) RETURNING card_id',base.tenant_id,card.id,card.workflow_version);
      if(card.id===cards[3]) throw new Error('Injected delivery persistence failure');
    });
    expect(result.updated_count).toBe(3);expect(result.failed_count).toBe(1);expect(result.skipped_count).toBe(2);
    expect(result.failed_cards[0].student_name).toBe('Learner 3');
    const events = (await query('SELECT * FROM test_outbox')).rows;
    expect(events).toHaveLength(3);
    expect(events.every(event => event.tenant_id === base.tenant_id && event.version === 2)).toBe(true);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(3);
    expect((await query('SELECT status FROM student_report_cards WHERE id=$1',[cards[3]])).rows[0].status).toBe('draft_generated');
  });

  it('prevents duplicate release under concurrent requests and supports safe retries', async () => {
    const results=await Promise.all([repository.bulkTransitionReportCards(command),repository.bulkTransitionReportCards(command)]);
    expect(results.reduce((n,r)=>n+r.updated_count,0)).toBe(4);
    expect((await query('SELECT * FROM student_report_card_audit_logs')).rows).toHaveLength(4);
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
