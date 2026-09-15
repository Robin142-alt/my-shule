import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { Reflector } from '@nestjs/core';
import { ExamsSchemaService } from '../src/modules/exams/exams-schema.service';
import { EXAM_SETUP_INTEGRITY_SCHEMA } from '../src/modules/exams/exam-setup-integrity-schema';
import { ExamsManagerCommandService } from '../src/modules/admin-command/exams-manager-command.service';
import { ExamsManagerCommandController } from '../src/modules/admin-command/exams-manager-command.controller';
import { AdminCommandOperationsService } from '../src/modules/admin-command/admin-command-operations.service';
import { RbacGuard } from '../src/guards/rbac.guard';
import { SchoolOperationalEventsService } from '../src/modules/events/school-operational-events.service';
import { EventPublisherService } from '../src/modules/events/event-publisher.service';
import { OutboxEventsRepository } from '../src/modules/events/repositories/outbox-events.repository';
import { SchoolOperationNotificationsRepository } from '../src/modules/events/repositories/school-operation-notifications.repository';

describe('Exam configuration and confirmed full deletion', () => {
  let pool: Pool;
  let service: ExamsManagerCommandService;
  const ids = Object.fromEntries(['actor', 'term', 'term2', 'subject', 'subject2', 'class', 'class2', 'grading', 'foreign'].map(key => [key, randomUUID()]));
  const context = { tenant_id: 'school-a', user_id: ids.actor, role: 'exams_manager', permissions: ['exams:read', 'exams:write'], is_authenticated: true };
  const events: any[] = [];
  let counter = 0;
  let failAudit = false;
  let failNotification = false;
  const schema = 'exam_setup_integrity';
  const query = (sql: string, params: any[] = []) => pool.query(sql, params);
  const txQuery = (client: PoolClient) => ({
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      if (failAudit && /INSERT INTO audit_logs/.test(sql)) throw new Error('audit unavailable');
      return (await client.query(sql, params)).rows;
    },
    $executeRawUnsafe: async (sql: string, ...params: any[]) => {
      if (failAudit && /INSERT INTO audit_logs/.test(sql)) throw new Error('audit unavailable');
      if (failNotification && /INSERT INTO notifications/.test(sql)) throw new Error('notifications unavailable');
      return (await client.query(sql, params)).rowCount;
    },
  });
  const prisma = {
    query,
    executeWithTenant: async (tenant: string, actor: string, callback: (tx: any) => Promise<any>) => {
      expect(tenant).toBe(context.tenant_id);
      expect(actor).toBe(ids.actor);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback(txQuery(client));
        await client.query('COMMIT');
        return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    },
  };
  const payload = (extra: Record<string, unknown> = {}) => ({
    name: 'Setup exam ' + (++counter), academic_term_id: ids.term, exam_type: 'End Term',
    starts_on: '2026-09-01', ends_on: '2099-09-30', status: 'draft', max_marks: 100,
    grading_system_id: ids.grading, subject_ids: [ids.subject, ids.subject2],
    class_section_ids: [ids.class, ids.class2], ...extra,
  });
  const create = async (extra: Record<string, unknown> = {}) => service.createExamSetup(payload(extra));
  const saved = async (id: string) => (await service.getExamSetup()).exams.find(exam => exam.id === id)!;
  const remove = (exam: { id: string; name: string }) => service.deleteExamSetup(exam.id, { confirmation_name: exam.name });
  async function mark(id: string, client?: PoolClient, score: number | null = 0) {
    const run = client ? client.query.bind(client) : query;
    const assessment = (await run('SELECT id FROM exam_assessments WHERE tenant_id=$1 AND exam_series_id=$2 AND subject_id=$3', ['school-a', id, ids.subject])).rows[0];
    return run(`INSERT INTO exam_marks(tenant_id,exam_series_id,assessment_id,academic_term_id,class_section_id,subject_id,student_id,score,score_status,entered_by_user_id)
      VALUES ('school-a',$1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id, assessment?.id || randomUUID(), ids.term, ids.class, ids.subject, randomUUID(), score, score === null ? 'absent' : 'entered', ids.actor]);
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) throw new Error('Use disposable local PostgreSQL.');
    const admin = new Pool({ connectionString: url.toString() });
    await admin.query('CREATE SCHEMA ' + schema);
    await admin.end();
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=' + schema + ',public' });
    let bootstrap = '';
    await new ExamsSchemaService({ runSchemaBootstrap: async (sql: string) => { bootstrap += sql; } } as never).onModuleInit();
    for (const sql of bootstrap.matchAll(/CREATE TABLE IF NOT EXISTS \w+ \([\s\S]*?\n      \);/g)) await query(sql[0]);
    await query(`CREATE TABLE academic_terms(id uuid PRIMARY KEY,tenant_id text,name text,status text,starts_on date,ends_on date);
      CREATE TABLE subjects(id text PRIMARY KEY,tenant_id text,name text);
      CREATE TABLE class_sections(id text PRIMARY KEY,tenant_id text,name text,status text DEFAULT 'active');
      CREATE TABLE academics_grading_systems(id uuid PRIMARY KEY,tenant_id text,name text,is_active boolean DEFAULT true,updated_at timestamptz DEFAULT NOW());
      CREATE TABLE academics_report_card_settings(tenant_id text,grading_system_id uuid,is_active boolean,updated_at timestamptz,created_at timestamptz);
      CREATE TABLE workflow_events(id uuid DEFAULT gen_random_uuid(),tenant_id text,source_user_id uuid,source_role text,target_roles jsonb,event_type text,entity_type text,entity_id text,title text,message text,priority text,payload jsonb);
      CREATE TABLE audit_logs(id uuid DEFAULT gen_random_uuid(),tenant_id text,actor_user_id uuid,request_id text,action text,resource_type text,resource_id uuid,metadata jsonb);
      CREATE TABLE outbox_events(id uuid DEFAULT gen_random_uuid(),tenant_id text,school_id text,event_key text,event_name text,
        aggregate_type text,aggregate_id uuid,payload jsonb,headers jsonb,status text,attempt_count integer DEFAULT 0,
        available_at timestamptz,published_at timestamptz,last_error text,actor_user_id uuid,actor_role text,source_dashboard text,
        correlation_id uuid,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),UNIQUE(tenant_id,event_key));
      CREATE TABLE notifications(id uuid DEFAULT gen_random_uuid(),tenant_id text,notification_key text,recipient_user_id uuid,
        recipient_guardian_id uuid,type text,title text,body text,status text,metadata jsonb,updated_at timestamptz DEFAULT NOW(),
        UNIQUE(tenant_id,notification_key));`);
    await query(EXAM_SETUP_INTEGRITY_SCHEMA);
    await query(EXAM_SETUP_INTEGRITY_SCHEMA); // repeatable upgrade
    await query(`INSERT INTO academic_terms VALUES ($1,'school-a','Term 2','active','2026-05-01','2026-08-31'),($2,'school-a','Term 3','active','2026-09-01','2099-09-30'),($3,'school-b','Foreign term','active','2026-09-01','2099-09-30')`, [ids.term, ids.term2, ids.foreign]);
    await query(`INSERT INTO subjects VALUES ($1,'school-a','Maths'),($2,'school-a','English'),($3,'school-b','Other school')`, [ids.subject, ids.subject2, ids.foreign]);
    await query(`INSERT INTO class_sections(id,tenant_id,name) VALUES ($1,'school-a','Form 4'),($2,'school-a','Grade 10'),($3,'school-b','Other school')`, [ids.class, ids.class2, ids.foreign]);
    await query(`INSERT INTO academics_grading_systems(id,tenant_id,name) VALUES ($1,'school-a','School grading')`, [ids.grading]);
    const requestContext = { getStore: () => context, requireStore: () => context } as never;
    const schoolEvents = new SchoolOperationalEventsService(requestContext,
      new EventPublisherService(requestContext, new OutboxEventsRepository(prisma as never)),
      new SchoolOperationNotificationsRepository(prisma as never));
    service = new ExamsManagerCommandService(requestContext, prisma as never,
      new AdminCommandOperationsService(prisma as never), undefined,
      { recordSchoolOperation: async (input: any, tx: any) => {
        events.push(input);
        return schoolEvents.recordSchoolOperation(input, tx);
      } } as never);
  });
  afterAll(async () => { await pool?.end(); });
  afterEach(() => { context.tenant_id = 'school-a'; context.role = 'exams_manager'; context.permissions = ['exams:read', 'exams:write']; context.is_authenticated = true; failAudit = false; failNotification = false; });

  it('persists all creation fields, exact selections, closed draft windows and operational evidence', async () => {
    const created = await create();
    expect(await saved(created.exam.id)).toMatchObject({ academic_term_id: ids.term, type: 'End Term', subjects_count: 2, classes_count: 2, can_delete: true, marks_count: 0 });
    expect((await query('SELECT status FROM exam_mark_entry_windows WHERE exam_series_id=$1', [created.exam.id])).rows).toEqual(Array(4).fill({ status: 'closed' }));
    expect((await query('SELECT action FROM audit_logs WHERE resource_id=$1', [created.exam.id])).rows[0].action).toBe('exams.exam-setup.created');
    expect(events.at(-1).notifications[0].audienceRoles).toContain('teacher');
  });
  it('saves term/type, removes unchecked subjects and classes and reopens the exact saved selection', async () => {
    const created = await create();
    await service.configureExamSetup(created.exam.id, payload({ academic_term_id: ids.term2, exam_type: 'Mock', subject_ids: [ids.subject], class_section_ids: [ids.class], max_marks: 80, status: 'submitted' }));
    expect(await saved(created.exam.id)).toMatchObject({ academic_term_id: ids.term2, type: 'Mock', subject_ids: [ids.subject], class_section_ids: [ids.class], subjects_count: 1, classes_count: 1, max_marks: 80 });
    expect((await query('SELECT status FROM exam_mark_entry_windows WHERE exam_series_id=$1', [created.exam.id])).rows).toEqual([{ status: 'open' }]);
    expect(events.at(-1).event.type).toBe('exam.series_configured');
  });
  it('rejects foreign term, subject or class and rolls back every write', async () => {
    for (const invalid of [{ academic_term_id: ids.foreign }, { subject_ids: [ids.foreign] }, { class_section_ids: [ids.foreign] }, { max_marks: -1 }, { subject_ids: [] }]) {
      const before = (await query('SELECT COUNT(*) FROM exam_series')).rows[0].count;
      await expect(create(invalid)).rejects.toThrow();
      expect((await query('SELECT COUNT(*) FROM exam_series')).rows[0].count).toBe(before);
    }
    const created = await create();
    await expect(service.configureExamSetup(created.exam.id, payload({ name: 'Must not persist', subject_ids: [ids.foreign] }))).rejects.toThrow();
    expect((await saved(created.exam.id)).name).toBe(created.exam.name);
  });
  it('deletes an empty open exam, cleans configuration and timetable, and preserves its audit/event', async () => {
    const created = await create({ status: 'submitted' });
    const slot = (await query(`INSERT INTO exam_timetable_slots(tenant_id,exam_series_id,date,start_time,end_time) VALUES ('school-a',$1,'2026-09-20','09:00','11:00') RETURNING id`, [created.exam.id])).rows[0].id;
    await query(`INSERT INTO exam_invigilators(tenant_id,timetable_slot_id,staff_user_id) VALUES ('school-a',$1,$2)`, [slot, ids.actor]);
    await remove(created.exam);
    expect(await saved(created.exam.id)).toBeUndefined();
    for (const table of ['exam_assessments', 'exam_mark_entry_windows', 'exam_timetable_slots']) expect((await query('SELECT * FROM ' + table + ' WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(0);
    expect((await query('SELECT * FROM exam_invigilators WHERE timetable_slot_id=$1', [slot])).rowCount).toBe(0);
    expect((await query('SELECT action FROM audit_logs WHERE resource_id=$1', [created.exam.id])).rows.map(row => row.action)).toContain('exams.exam-setup.deleted');
    expect(events.at(-1).event.type).toBe('exam.series_deleted');
    expect((await query("SELECT payload FROM outbox_events WHERE payload->>'entity_id'=$1", [created.exam.id])).rows.map(row => row.payload.operation_type)).toContain('exam.series_deleted');
    expect((await query("SELECT metadata FROM notifications WHERE metadata->>'relatedRecordId'=$1", [created.exam.id])).rows).toHaveLength(2);
  });
  it.each([0, 55, null])('deletes saved marks, including zero and absence, after name confirmation (%s)', async score => {
    const created = await create();
    await mark(created.exam.id, undefined, score);
    expect((await saved(created.exam.id)).can_delete).toBe(true);
    await remove(created.exam);
    expect((await query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(0);
    expect(await saved(created.exam.id)).toBeUndefined();
    expect((await query("SELECT payload FROM workflow_events WHERE entity_id=$1 AND event_type='exams.exam-setup.deleted'", [created.exam.id])).rows[0].payload).toMatchObject({ marks_count: 1, confirmation_name: created.exam.name });
  });
  it('protects entered results against configuration changes but permits harmless edits', async () => {
    const created = await create();
    await mark(created.exam.id);
    for (const invalid of [{ subject_ids: [ids.subject2] }, { class_section_ids: [ids.class2] }, { max_marks: 80 }, { academic_term_id: ids.term2 }]) {
      await expect(service.configureExamSetup(created.exam.id, payload(invalid))).rejects.toThrow(/Entered results/);
      expect((await saved(created.exam.id)).subjects_count).toBe(2);
    }
    await service.configureExamSetup(created.exam.id, payload({ name: 'Corrected name' }));
    expect((await saved(created.exam.id)).name).toBe('Corrected name');
  });
  it('requires the exact current name and exam-management role before any deletion', async () => {
    const created = await create();
    await mark(created.exam.id);
    await expect(service.deleteExamSetup(created.exam.id)).rejects.toThrow(/exact exam name/);
    for (const name of ['', 'wrong', created.exam.name.toLowerCase(), created.exam.name + ' ']) {
      await expect(service.deleteExamSetup(created.exam.id, { confirmation_name: name })).rejects.toThrow(/exact exam name/);
    }
    context.role = 'teacher';
    expect((await saved(created.exam.id)).can_delete).toBe(false);
    await expect(remove(created.exam)).rejects.toThrow(/permission/);
    context.role = 'exams_manager'; context.permissions = ['exams:read'];
    await expect(remove(created.exam)).rejects.toThrow(/permission/);
    context.permissions = ['exams:write'];
    await query('UPDATE exam_series SET name=$2 WHERE id=$1', [created.exam.id, 'Renamed exam']);
    await expect(remove(created.exam)).rejects.toThrow(/exact exam name/);
    expect((await query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(1);
    expect((await query("SELECT * FROM audit_logs WHERE resource_id=$1 AND action='exams.exam-setup.deleted'", [created.exam.id])).rowCount).toBe(0);
    await remove({ id: created.exam.id, name: 'Renamed exam' });
  });
  it.each(['submitted', 'reviewed', 'locked', 'published', 'archived'])('deletes an exam in %s state with finalized results', async status => {
    const created = await create(); await mark(created.exam.id);
    await query("UPDATE exam_marks SET status='published' WHERE exam_series_id=$1", [created.exam.id]);
    await query('UPDATE exam_series SET status=$2,locked_at=NOW(),published_at=NOW() WHERE id=$1', [created.exam.id,status]);
    await remove(created.exam);
    expect(await saved(created.exam.id)).toBeUndefined();
    expect((await query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(0);
  });
  it('removes result children and all report revisions while preserving other exams, shared imports and audit history', async () => {
    const target = await create(); const other = await create();
    await mark(target.exam.id); await mark(other.exam.id);
    const targetMark = (await query('SELECT id FROM exam_marks WHERE exam_series_id=$1', [target.exam.id])).rows[0].id;
    const otherMark = (await query('SELECT id FROM exam_marks WHERE exam_series_id=$1', [other.exam.id])).rows[0].id;
    await query(`INSERT INTO exam_mark_versions(tenant_id,mark_id,corrected_by_user_id,reason) VALUES ('school-a',$1,$2,'Correction')`, [targetMark,ids.actor]);
    await query(`INSERT INTO exam_mark_audit_logs(tenant_id,mark_id,exam_series_id,action) VALUES ('school-a',$1,$2,'grade.created')`, [targetMark,target.exam.id]);
    const importBatch = async () => (await query(`INSERT INTO exam_mark_import_batches(tenant_id,file_name,total_rows,valid_rows,committed_rows,preview_hash,imported_by_user_id)
      VALUES ('school-a','marks.csv',2,2,2,repeat('a',64),$1) RETURNING id`, [ids.actor])).rows[0].id;
    const sharedBatch = await importBatch(); const targetBatch = await importBatch();
    for (const [batchId, markId, row] of [[sharedBatch,targetMark,1],[sharedBatch,otherMark,2],[targetBatch,targetMark,1]]) {
      await query(`INSERT INTO exam_mark_import_batch_items(tenant_id,batch_id,mark_id,row_number,previous_exists,imported_status)
        VALUES ('school-a',$1,$2,$3,false,'draft')`, [batchId,markId,row]);
    }
    const student = randomUUID(); const cardIds: string[] = [];
    for (const revision of [1,2]) {
      const card = (await query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id,status,revision_number,is_current)
        VALUES ('school-a',$1,$2,'snapshot','published',$3,$4) RETURNING id`, [target.exam.id,student,revision,revision===2])).rows[0].id;
      cardIds.push(card);
      await query(`INSERT INTO report_card_artifacts(tenant_id,report_card_id,artifact_type,storage_key,checksum_sha256,byte_size,verification_code)
        VALUES ('school-a',$1,'pdf','test.pdf',repeat('a',64),100,$2)`, [card,randomUUID()]);
      await query(`INSERT INTO student_report_card_audit_logs(tenant_id,report_card_id,exam_series_id,action)
        VALUES ('school-a',$1,$2,'report_card.published')`, [card,target.exam.id]);
    }
    await query(`INSERT INTO report_card_generation_batches(tenant_id,exam_series_id,requested_by_user_id) VALUES ('school-a',$1,$2)`, [target.exam.id,ids.actor]);
    await query(`INSERT INTO exam_result_snapshots(tenant_id,batch_id,exam_series_id,student_id,raw_total,assessment_count,average_percentage,processed_by_user_id)
      VALUES ('school-a',$1,$2,$3,50,1,50,$4)`, [randomUUID(),target.exam.id,student,ids.actor]);
    const slot = (await query(`INSERT INTO exam_timetable_slots(tenant_id,exam_series_id,date,start_time,end_time)
      VALUES ('school-a',$1,'2026-09-20','09:00','11:00') RETURNING id`, [target.exam.id])).rows[0].id;
    await query(`INSERT INTO exam_attendance_records(tenant_id,timetable_slot_id,student_id) VALUES ('school-a',$1,$2)`, [slot,student]);
    await query(`INSERT INTO exam_student_cases(tenant_id,exam_series_id,student_id,case_type,description) VALUES ('school-a',$1,$2,'absence','Absent')`, [target.exam.id,student]);
    const intervention = (await query(`INSERT INTO academic_interventions(tenant_id,exam_series_id,student_id,trigger_reason,plan,created_by_user_id)
      VALUES ('school-a',$1,$2,'Follow-up','Revision',$3) RETURNING id`, [target.exam.id,student,ids.actor])).rows[0].id;
    await query(`INSERT INTO academic_intervention_updates(tenant_id,intervention_id,notes,recorded_by_user_id) VALUES ('school-a',$1,'Progress',$2)`, [intervention,ids.actor]);
    // Same exam identifier in unrelated tenant-owned child data must remain untouched.
    await query(`INSERT INTO exam_mark_audit_logs(tenant_id,exam_series_id,action) VALUES ('school-b',$1,'foreign.audit')`, [target.exam.id]);
    await remove(target.exam);
    for (const table of ['exam_marks','student_report_cards','exam_result_snapshots','report_card_generation_batches','exam_student_cases','academic_interventions']) {
      expect((await query('SELECT * FROM '+table+' WHERE tenant_id=$1 AND exam_series_id=$2', ['school-a',target.exam.id])).rowCount).toBe(0);
    }
    expect((await query('SELECT * FROM report_card_artifacts WHERE report_card_id=ANY($1::uuid[])', [cardIds])).rowCount).toBe(0);
    expect((await query('SELECT * FROM exam_mark_versions WHERE mark_id=$1', [targetMark])).rowCount).toBe(0);
    expect((await query('SELECT * FROM exam_attendance_records WHERE timetable_slot_id=$1', [slot])).rowCount).toBe(0);
    expect((await query('SELECT * FROM academic_intervention_updates WHERE intervention_id=$1', [intervention])).rowCount).toBe(0);
    expect((await query('SELECT * FROM exam_mark_import_batches WHERE id=$1', [targetBatch])).rowCount).toBe(0);
    expect((await query('SELECT mark_id FROM exam_mark_import_batch_items WHERE batch_id=$1', [sharedBatch])).rows).toEqual([{mark_id:otherMark}]);
    expect((await query('SELECT * FROM exam_mark_import_batches WHERE id=$1', [sharedBatch])).rowCount).toBe(1);
    expect((await query('SELECT * FROM exam_marks WHERE id=$1', [otherMark])).rowCount).toBe(1);
    expect(await saved(other.exam.id)).toBeDefined();
    expect((await query('SELECT * FROM exam_mark_audit_logs WHERE exam_series_id=$1', [target.exam.id])).rowCount).toBe(2);
    expect((await query('SELECT * FROM student_report_card_audit_logs WHERE exam_series_id=$1', [target.exam.id])).rowCount).toBe(2);
    await expect(query(`INSERT INTO report_card_artifacts(tenant_id,report_card_id,artifact_type,storage_key,checksum_sha256,byte_size,verification_code)
      VALUES ('school-a',$1,'pdf','stale.pdf',repeat('a',64),100,'stale')`, [cardIds[0]])).rejects.toThrow(/no longer exists/);
    await expect(query(`INSERT INTO exam_mark_versions(tenant_id,mark_id,corrected_by_user_id,reason) VALUES ('school-a',$1,$2,'Stale')`, [targetMark,ids.actor])).rejects.toThrow(/no longer exists/);
  });
  it('keeps customized assessment names, paper weights and maxima on unchanged configuration', async () => {
    const created = await create();
    await query("UPDATE exam_assessments SET name='Paper 1',max_score=80,weight=60 WHERE exam_series_id=$1 AND subject_id=$2", [created.exam.id, ids.subject]);
    await query("INSERT INTO exam_assessments(tenant_id,exam_series_id,subject_id,name,max_score,weight) VALUES ('school-a',$1,$2,'Paper 2',60,40)", [created.exam.id, ids.subject]);
    await service.configureExamSetup(created.exam.id, payload());
    expect((await query('SELECT name,max_score::int,weight::int FROM exam_assessments WHERE exam_series_id=$1 AND subject_id=$2 ORDER BY name', [created.exam.id, ids.subject])).rows)
      .toEqual([{ name: 'Paper 1', max_score: 80, weight: 60 }, { name: 'Paper 2', max_score: 60, weight: 40 }]);
    await expect(service.configureExamSetup(created.exam.id, payload({ max_marks: 50 }))).rejects.toThrow(/multiple papers/);
  });
  it('deletes reports and published exams; does not allow publishing through configuration', async () => {
    const created = await create();
    await query(`INSERT INTO student_report_cards(tenant_id,exam_series_id,student_id,report_snapshot_id) VALUES ('school-a',$1,$2,'report')`, [created.exam.id, randomUUID()]);
    await remove(created.exam);
    expect((await query('SELECT * FROM student_report_cards WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(0);
    const published = await create();
    await expect(service.configureExamSetup(published.exam.id, payload({ status: 'published' }))).rejects.toThrow(/publishing workflow/);
    await query("UPDATE exam_series SET status='published' WHERE id=$1", [published.exam.id]);
    await remove(published.exam);
    expect(await saved(published.exam.id)).toBeUndefined();
  });
  it('denies another school and requires authenticated write permission on the endpoint', async () => {
    const created = await create();
    context.tenant_id = 'school-b';
    expect(await saved(created.exam.id)).toBeUndefined();
    await expect(remove(created.exam)).rejects.toThrow(/not found/);
    await expect(service.configureExamSetup(created.exam.id, payload())).rejects.toThrow(/not found/);
    const guard = new RbacGuard(new Reflector(), { requireStore: () => context } as never);
    const execution = { getHandler: () => ExamsManagerCommandController.prototype.deleteExamSetup, getClass: () => ExamsManagerCommandController } as never;
    context.permissions = ['exams:read'];
    expect(() => guard.canActivate(execution)).toThrow(/Permission/);
    context.permissions = ['exams:write'];
    context.is_authenticated = false;
    expect(() => guard.canActivate(execution)).toThrow(/Authenticated/);
    context.is_authenticated = true;
    expect(guard.canActivate(execution)).toBe(true);
  });
  it('rolls back deletion if durable audit recording fails', async () => {
    const created = await create();
    failAudit = true;
    await mark(created.exam.id);
    await expect(remove(created.exam)).rejects.toThrow(/school operation could not be completed/);
    expect((await query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(1);
    expect((await saved(created.exam.id)).subjects_count).toBe(2);
    expect((await query('SELECT * FROM exam_mark_entry_windows WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(4);
  });
  it('rolls back all exam, audit and outbox changes if notification persistence fails', async () => {
    const created = await create();
    failNotification = true;
    await expect(remove(created.exam)).rejects.toThrow(/notifications unavailable/);
    expect((await saved(created.exam.id)).subjects_count).toBe(2);
    expect((await query("SELECT * FROM audit_logs WHERE resource_id=$1 AND action='exams.exam-setup.deleted'", [created.exam.id])).rowCount).toBe(0);
    expect((await query("SELECT * FROM outbox_events WHERE payload->>'entity_id'=$1 AND payload->>'operation_type'='exam.series_deleted'", [created.exam.id])).rowCount).toBe(0);
  });
  it('waits for an in-flight mark and includes it in the confirmed deletion', async () => {
    const created = await create();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await mark(created.exam.id, client);
      const deletion = remove(created.exam);
      await client.query('COMMIT');
      expect((await deletion).success).toBe(true);
      expect((await query('SELECT * FROM exam_marks WHERE exam_series_id=$1', [created.exam.id])).rowCount).toBe(0);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
  it('rejects a stale mark submission after the exam is deleted', async () => {
    const created = await create();
    await remove(created.exam);
    await expect(mark(created.exam.id)).rejects.toThrow(/no longer exists/);
  });
});
