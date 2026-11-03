import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { ProgressionAction, ProgressionCommand } from '../../../shared/student-progression';
import { ProgressionCommandDto } from '../src/modules/student-progression/progression.dto';
import { ProgressionEngine } from '../src/modules/student-progression/student-progression.service';
import { StudentProgressionFixture } from './support/student-progression-fixture';
import { SmartLibraryService } from '../src/modules/library/smart-library.service';

jest.setTimeout(120_000);

describe('Progression legacy reconciliation and staff actions in PostgreSQL', () => {
  const fixture = new StudentProgressionFixture();
  let engine: ProgressionEngine;
  const year = () => `${fixture.school}-2026`;
  const nextYear = () => `${fixture.school}-2027`;
  const actor = () => fixture.actor();
  beforeAll(async () => {
    await fixture.start();
    await fixture.q(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
      ALTER TABLE staff_profiles ADD COLUMN IF NOT EXISTS staff_number text;
      CREATE TABLE boarding_beds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,
        assigned_student_id uuid,status text NOT NULL DEFAULT 'AVAILABLE',updated_at timestamptz DEFAULT NOW());
      CREATE TABLE boarding_allocations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,
        student_id uuid NOT NULL,bed_id uuid NOT NULL,status text NOT NULL DEFAULT 'active',created_by uuid,
        released_by uuid,released_at timestamptz,release_reason text,created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      CREATE TABLE boarding_students(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,
        student_id uuid NOT NULL,status text NOT NULL DEFAULT 'active',created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      CREATE TABLE transport_manifest_students(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,
        manifest_id uuid NOT NULL,student_id uuid NOT NULL,boarding_status text NOT NULL DEFAULT 'active',notes text,
        created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW(),
        CHECK(boarding_status IN ('active','paused','left_route')));
      CREATE TABLE library_copy_loans(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,
        borrower_id uuid NOT NULL,copy_id uuid NOT NULL,due_on date NOT NULL,returned_at timestamptz,
        created_at timestamptz DEFAULT NOW(),updated_at timestamptz DEFAULT NOW());
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO "${fixture.runtimeRole}";
    `);
    for (const table of ['boarding_beds', 'boarding_allocations', 'boarding_students', 'transport_manifest_students', 'library_copy_loans']) {
      await fixture.q(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY; ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
        CREATE POLICY progression_service_scope ON ${table}
        USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));`);
    }
    engine = new ProgressionEngine(fixture.prisma as never, fixture.events as never);
  });
  beforeEach(() => fixture.reset());
  afterAll(() => fixture.close());

  async function command(ids: string[], action: ProgressionAction, extra: Partial<ProgressionCommand> = {}) {
    const students = [];
    for (const id of ids) students.push({ id, expected_version: (await engine.detail(actor(), id)).student.version });
    return { request_id: randomUUID(), academic_year_id: year(), action, reason: 'Reviewed legacy reconciliation', students, ...extra } as ProgressionCommand;
  }
  const enrollment = (id: string) => fixture.q("SELECT * FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id=$2 ORDER BY academic_year,id", [fixture.school, id]);
  const placement = (id: string) => fixture.q(`SELECT assignment.*,section.name AS class_name,stream.name AS stream_name
    FROM student_class_assignments assignment
    JOIN class_sections section ON section.tenant_id=assignment.tenant_id AND section.id=assignment.class_section_id
    LEFT JOIN class_streams stream ON stream.tenant_id=assignment.tenant_id AND stream.id=assignment.stream_id
    WHERE assignment.tenant_id=$1 AND assignment.student_id=$2 AND assignment.status='active'`, [fixture.school, id]);
  async function legacyStreamId(id: string) {
    // Older admissions stored a stream name; the cohort migration already ran for this school.
    await fixture.q(`UPDATE student_academic_enrollments SET stream_id=NULL,cohort_id=NULL,cohort_placement_id=NULL
      WHERE tenant_id=$1 AND student_id=$2 AND status='active'`, [fixture.school, id]);
  }
  async function conflictingAssignment(id: string) {
    const context = await fixture.configureClass(7, 'West');
    // A competing placement has no transition history: do not choose the latest timestamp as truth.
    await fixture.q(`UPDATE student_class_assignments SET stream_id=$3,cohort_id=$4,cohort_placement_id=$5
      WHERE tenant_id=$1 AND student_id=$2 AND status='active'`,
    [fixture.school, id, fixture.streamId(7, 'West'), context.cohort_id, context.id]);
  }

  async function linkedServices(id: string, tenant = fixture.school) {
    const [bed] = await fixture.q("INSERT INTO boarding_beds(tenant_id,assigned_student_id,status) VALUES($1,$2::uuid,'OCCUPIED') RETURNING id", [tenant, id]);
    await fixture.q('INSERT INTO boarding_allocations(tenant_id,student_id,bed_id,created_by) VALUES($1,$2::uuid,$3::uuid,$4::uuid)', [tenant, id, bed.id, fixture.user]);
    await fixture.q('INSERT INTO boarding_students(tenant_id,student_id) VALUES($1,$2::uuid)', [tenant, id]);
    for (const status of ['active', 'paused', 'left_route']) {
      await fixture.q('INSERT INTO transport_manifest_students(tenant_id,manifest_id,student_id,boarding_status) VALUES($1,$2::uuid,$3::uuid,$4)', [tenant, randomUUID(), id, status]);
    }
    const [borrower] = await fixture.q('SELECT id FROM library_borrowers WHERE tenant_id=$1 AND subject_id=$2', [tenant, id]);
    await fixture.q("INSERT INTO library_copy_loans(tenant_id,borrower_id,copy_id,due_on) VALUES($1,$2::uuid,$3::uuid,'2026-09-15')", [tenant, borrower.id, randomUUID()]);
    return bed.id as string;
  }
  async function serviceRecords(id: string, tenant = fixture.school) {
    return {
      beds: await fixture.q('SELECT * FROM boarding_beds WHERE tenant_id=$1 AND assigned_student_id=$2::uuid ORDER BY id', [tenant, id]),
      allocations: await fixture.q('SELECT * FROM boarding_allocations WHERE tenant_id=$1 AND student_id=$2::uuid ORDER BY id', [tenant, id]),
      boarders: await fixture.q('SELECT * FROM boarding_students WHERE tenant_id=$1 AND student_id=$2::uuid ORDER BY id', [tenant, id]),
      transport: await fixture.q('SELECT * FROM transport_manifest_students WHERE tenant_id=$1 AND student_id=$2::uuid ORDER BY id', [tenant, id]),
      loans: await fixture.q('SELECT loan.* FROM library_copy_loans loan JOIN library_borrowers borrower ON borrower.id=loan.borrower_id AND borrower.tenant_id=loan.tenant_id WHERE loan.tenant_id=$1 AND borrower.subject_id=$2 ORDER BY loan.id', [tenant, id]),
    };
  }

  it('repairs the direct-admission null class/year IDs from its exact cohort, current assignment and matching names', async () => {
    const student = await fixture.seed(10);
    await fixture.configureClass(11);
    // Mirrors directAdmission: names and cohort/stream IDs exist but annual class_section_id is NULL.
    await fixture.q(`UPDATE student_academic_enrollments SET class_section_id=NULL,academic_year_id=NULL
      WHERE tenant_id=$1 AND student_id=$2`, [fixture.school, student.id]);
    const relatedBefore = await fixture.relatedRecords(student.id);
    const result = await engine.command(actor(), await command([student.id], 'promote'));
    expect(result.affected).toBe(1);
    expect((await placement(student.id))[0]).toMatchObject({ academic_year_id: nextYear(), class_name: 'Grade 11', stream_name: 'East' });
    const saved = await enrollment(student.id);
    expect(saved.find(row => row.id === student.enrollment.id)).toMatchObject({
      class_section_id: fixture.classId(10), academic_year_id: year(), status: 'completed',
    });
    expect(saved.filter(row => row.status === 'active')).toHaveLength(1);
    expect(await fixture.relatedRecords(student.id)).toEqual(relatedBefore);
  });

  it('prepares an emerging senior grade from the continuing cohort without copying operational history',async()=>{
    const student=await fixture.seed(10);
    await fixture.q('DELETE FROM academic_cohort_placements WHERE tenant_id=$1 AND class_section_id=$2',[fixture.school,fixture.classId(11)]);
    await fixture.q('DELETE FROM class_streams WHERE tenant_id=$1 AND class_section_id=$2',[fixture.school,fixture.classId(11)]);
    await fixture.q('DELETE FROM class_sections WHERE tenant_id=$1 AND id=$2',[fixture.school,fixture.classId(11)]);
    await engine.synchronizeCalendar(actor(),new Date('2026-11-01T12:00:00Z'));
    const [destination]=await fixture.q("SELECT * FROM class_sections WHERE tenant_id=$1 AND academic_year_id=$2 AND name='Grade 11'",[fixture.school,nextYear()]);
    expect(destination).toBeDefined();
    expect(destination.academic_level_id).not.toBe(fixture.classId(10));
    await engine.command(actor(),await command([student.id],'promote',{reason:''}));
    expect((await engine.detail(actor(),student.id)).student).toMatchObject({class_name:'Grade 11',stream_name:'East',academic_year_id:nextYear()});
    expect((await fixture.q('SELECT subject_id,teacher_user_id FROM teacher_subject_assignments WHERE tenant_id=$1 AND class_section_id=$2 AND status=\'active\'',[fixture.school,destination.id])).length).toBeGreaterThan(0);
  });

  it('preserves an unmatched stream using identical destination-grade offerings and only common teachers',async()=>{
    const student=await fixture.seed(9);
    await fixture.q("UPDATE class_streams SET name='White' WHERE tenant_id=$1 AND id=$2",[fixture.school,fixture.streamId(9)]);
    await fixture.q("UPDATE student_academic_enrollments SET stream_name='White' WHERE tenant_id=$1 AND student_id=$2",[fixture.school,student.id]);
    await fixture.configureClass(10,'East');await fixture.configureClass(10,'West');
    await engine.command(actor(),await command([student.id],'promote',{reason:''}));
    const detail=await engine.detail(actor(),student.id);
    expect(detail.student).toMatchObject({class_name:'Grade 10',stream_name:'White',academic_year_id:nextYear()});
    expect(detail.subjects.length).toBeGreaterThan(0);
  });

  it('does not choose between destination streams offering different pathways',async()=>{
    const student=await fixture.seed(9);
    await fixture.q("UPDATE class_streams SET name='White' WHERE tenant_id=$1 AND id=$2",[fixture.school,fixture.streamId(9)]);
    await fixture.q("UPDATE student_academic_enrollments SET stream_name='White' WHERE tenant_id=$1 AND student_id=$2",[fixture.school,student.id]);
    await fixture.configureClass(10,'East');await fixture.configureClass(10,'West');
    await fixture.q("UPDATE class_subject_assignments SET status='archived' WHERE tenant_id=$1 AND stream_id=$2 AND subject_id=$3",[fixture.school,fixture.streamId(10,'West'),`${fixture.school}-art`]);
    await expect(engine.command(actor(),await command([student.id],'promote'))).rejects.toThrow(/different subjects or pathways/);
    expect((await engine.detail(actor(),student.id)).student.academic_year_id).toBe(year());
  });

  it('repairs an unstreamed learner when the school has exactly one possible stream',async()=>{
    const student=await fixture.seed();
    await fixture.q("UPDATE class_streams SET status='inactive',is_active=FALSE WHERE tenant_id=$1 AND id=$2",[fixture.school,fixture.streamId(7,'West')]);
    await fixture.q('UPDATE student_class_assignments SET stream_id=NULL,cohort_id=NULL,cohort_placement_id=NULL WHERE tenant_id=$1 AND student_id=$2',[fixture.school,student.id]);
    await fixture.q("UPDATE student_academic_enrollments SET stream_id=NULL,stream_name='Unstreamed',class_section_id=NULL,academic_year_id=NULL,cohort_id=NULL,cohort_placement_id=NULL WHERE tenant_id=$1 AND student_id=$2",[fixture.school,student.id]);
    await fixture.q('UPDATE students SET current_stream_id=NULL WHERE tenant_id=$1 AND id=$2',[fixture.school,student.id]);
    await engine.reconcileCurrentEnrollments(actor());
    expect((await engine.detail(actor(),student.id)).student).toMatchObject({stream_id:fixture.streamId(7),status:'upcoming'});
  });

  it('resolves an omitted legacy stream ID from matching current assignment, pointer and stream name before promotion', async () => {
    const student = await fixture.seed();
    await fixture.configureClass(8);
    await legacyStreamId(student.id);
    const relatedBefore = await fixture.relatedRecords(student.id);
    const request = await command([student.id], 'promote');
    const result = await engine.command(actor(), request);
    expect(result.affected).toBe(1);
    expect(await placement(student.id)).toEqual([expect.objectContaining({ academic_year_id: nextYear(), class_name: 'Grade 8', stream_name: 'East' })]);
    const enrollments = await enrollment(student.id);
    expect(enrollments).toHaveLength(2);
    expect(enrollments.find(row => row.academic_year_id === year())).toMatchObject({ id: student.enrollment.id, status: 'completed', stream_id: fixture.streamId(7) });
    expect(enrollments.filter(row => row.status === 'active')).toHaveLength(1);
    expect(await fixture.relatedRecords(student.id)).toEqual(relatedBefore);
    expect((await engine.command(actor(), request)).replayed).toBe(true);
    expect(await enrollment(student.id)).toHaveLength(2);
    expect(await fixture.q('SELECT id FROM academic_audit_logs WHERE tenant_id=$1', [fixture.school])).not.toHaveLength(0);
    expect(await fixture.q('SELECT id FROM progression_fixture_events')).not.toHaveLength(0);
  });

  it('uses an immutable placement transition and matching current pointer to repair a stale annual enrollment', async () => {
    const student = await fixture.seed();
    await fixture.configureClass(7, 'West');
    await fixture.configureClass(8, 'West');
    await engine.command(actor(), await command([student.id], 'place', {
      target_class_section_id: fixture.classId(7), target_stream_id: fixture.streamId(7, 'West'),
    }));
    const historyBefore = await fixture.q('SELECT * FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2 ORDER BY id', [fixture.school, student.id]);
    await fixture.q(`UPDATE student_academic_enrollments SET stream_id=$3,stream_name='East',cohort_id=$4,cohort_placement_id=$5
      WHERE tenant_id=$1 AND student_id=$2 AND status='active'`, [fixture.school, student.id, fixture.streamId(7), student.context.cohort_id, student.context.id]);
    const result = await engine.command(actor(), await command([student.id], 'promote'));
    expect(result.affected).toBe(1);
    expect((await placement(student.id))[0]).toMatchObject({ academic_year_id: nextYear(), class_name: 'Grade 8', stream_name: 'West' });
    for (const transition of historyBefore) {
      expect((await fixture.q('SELECT * FROM academic_student_transitions WHERE id=$1', [transition.id]))[0]).toEqual(transition);
    }
    expect((await enrollment(student.id)).find(row => row.academic_year_id === year())).toMatchObject({ id: student.enrollment.id, stream_name: 'West', stream_id: fixture.streamId(7, 'West') });
  });

  it('does not guess when valid current assignment conflicts with the enrollment and current student pointer', async () => {
    const student = await fixture.seed();
    await fixture.configureClass(8, 'West');
    await conflictingAssignment(student.id);
    const before = { placement: await placement(student.id), enrollment: await enrollment(student.id), records: await fixture.relatedRecords(student.id) };
    const outcome = await engine.command(actor(), await command([student.id], 'promote')).catch(error => error);
    expect(outcome instanceof Error || outcome.affected === 0).toBe(true);
    expect(await placement(student.id)).toEqual(before.placement);
    expect(await enrollment(student.id)).toEqual(before.enrollment);
    expect(await fixture.relatedRecords(student.id)).toEqual(before.records);
    expect(await fixture.q('SELECT id FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2', [fixture.school, student.id])).toHaveLength(0);
  });

  it('promotes 24 of 25 selected learners and reports the isolated ambiguous learner without rolling back valid work', async () => {
    await fixture.configureClass(8);
    const learners = [];
    for (let index = 0; index < 25; index++) learners.push(await fixture.seed());
    // Mix complete records and safely repairable legacy records in the same real request.
    for (const student of learners.slice(0, 12)) await legacyStreamId(student.id);
    const ambiguous = learners[12];
    await conflictingAssignment(ambiguous.id);
    const ambiguousBefore = await enrollment(ambiguous.id);
    const foreign = await fixture.seed(7, 'East', 'CBC', fixture.foreignSchool);
    const foreignBefore = await fixture.q('SELECT * FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id=$2', [fixture.foreignSchool, foreign.id]);
    const request = await command(learners.map(row => row.id), 'promote');
    const result = await engine.command(actor(), request) as Awaited<ReturnType<ProgressionEngine['command']>> & {
      results: Array<{ student_id: string; status: string; message: string }>;
    };
    expect(result.status).toBe('partial');
    expect(result.affected).toBe(24);
    expect(result.results).toHaveLength(25);
    expect(result.results.filter(row => row.status === 'completed')).toHaveLength(24);
    expect(result.results.find(row => row.student_id === ambiguous.id)).toMatchObject({ status: 'failed', message: expect.any(String) });
    for (const student of learners.filter(row => row.id !== ambiguous.id)) {
      expect((await placement(student.id))[0]).toMatchObject({ academic_year_id: nextYear(), class_name: 'Grade 8', stream_name: 'East' });
      expect((await enrollment(student.id)).filter(row => row.status === 'active')).toHaveLength(1);
    }
    expect(await enrollment(ambiguous.id)).toEqual(ambiguousBefore);
    expect(await fixture.q('SELECT * FROM student_academic_enrollments WHERE tenant_id=$1 AND student_id=$2', [fixture.foreignSchool, foreign.id])).toEqual(foreignBefore);
    const beforeRetry = await fixture.q('SELECT id FROM academic_student_transitions WHERE tenant_id=$1 ORDER BY id', [fixture.school]);
    expect((await engine.command(actor(), request)).replayed).toBe(true);
    expect(await fixture.q('SELECT id FROM academic_student_transitions WHERE tenant_id=$1 ORDER BY id', [fixture.school])).toEqual(beforeRetry);
  });

  it('rolls back the legacy repair and promotion together when the event cannot be persisted', async () => {
    const student = await fixture.seed();
    await fixture.configureClass(8);
    await legacyStreamId(student.id);
    const before = { enrollment: await enrollment(student.id), placement: await placement(student.id) };
    const request = await command([student.id], 'promote');
    fixture.failEvent = true;
    await expect(engine.command(actor(), request)).rejects.toThrow('Injected outbox persistence failure');
    expect(await enrollment(student.id)).toEqual(before.enrollment);
    expect(await placement(student.id)).toEqual(before.placement);
    expect(await fixture.q('SELECT id FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2', [fixture.school, student.id])).toHaveLength(0);
    fixture.failEvent = false;
    expect((await engine.command(actor(), request)).affected).toBe(1);
    expect(await enrollment(student.id)).toHaveLength(2);
  });

  const ordinaryActions: ProgressionAction[] = ['promote', 'hold', 'repeat', 'place', 'transfer', 'withdraw', 'expel'];
  it.each(ordinaryActions)('accepts an omitted reason for %s while recording the actor and decision', async action => {
    const student = await fixture.seed();
    await fixture.configureClass(8);
    await fixture.configureClass(7, 'West');
    const request = await command([student.id], action, {
      target_class_section_id: action === 'place' ? fixture.classId(7) : undefined,
      target_stream_id: action === 'place' ? fixture.streamId(7, 'West') : undefined,
      destination_school_name: action === 'transfer' ? 'Receiving School' : undefined,
    });
    delete (request as Partial<ProgressionCommand>).reason;
    const errors = await validate(plainToInstance(ProgressionCommandDto, request));
    expect(errors).toEqual([]);
    const result = await engine.command(actor(), request);
    expect(result.affected).toBe(1);
    if (action === 'expel') {
      expect(result.status).toBe('pending_approval');
      expect((await fixture.q('SELECT requested_by_user_id,status FROM dashboard_approval_requests WHERE tenant_id=$1', [fixture.school]))[0])
        .toMatchObject({ requested_by_user_id: fixture.user, status: 'PENDING' });
      expect(await placement(student.id)).toHaveLength(1);
    } else {
      expect((await fixture.q('SELECT action,actor_user_id,before_state,after_state FROM academic_student_transitions WHERE tenant_id=$1 AND student_id=$2', [fixture.school, student.id]))[0])
        .toMatchObject({ action, actor_user_id: fixture.user, before_state: expect.any(Object), after_state: expect.any(Object) });
    }
  });

  it('retains a configured school reason policy instead of bypassing it for a routine action', async () => {
    const student = await fixture.seed();
    await fixture.q(`INSERT INTO approval_rules(school_id,module,action,requester_roles,approver_roles,requires_reason)
      VALUES($1,'student_progression','transfer',ARRAY['deputy_principal'],ARRAY['principal'],TRUE)`, [fixture.school]);
    const request = await command([student.id], 'transfer', { reason: '' });
    await expect(engine.command(actor(), request)).rejects.toThrow();
    expect(await placement(student.id)).toHaveLength(1);
    expect(await fixture.q('SELECT id FROM student_transfer_records WHERE tenant_id=$1 AND student_id=$2', [fixture.school, student.id])).toHaveLength(0);
  });

  it('keeps boarding, transport and overdue library obligations linked to the same learner through promotion', async () => {
    const student = await fixture.seed();
    await fixture.configureClass(8);
    await linkedServices(student.id);
    const before = await serviceRecords(student.id);
    const finances = await fixture.relatedRecords(student.id);
    expect((await engine.command(actor(), await command([student.id], 'promote', { reason: '' }))).affected).toBe(1);
    expect(await serviceRecords(student.id)).toEqual(before);
    expect(await fixture.relatedRecords(student.id)).toEqual(finances);
    const [allocation] = await fixture.q('SELECT class_name,stream_name,dormitory_name,transport_route FROM student_allocations WHERE tenant_id=$1 AND student_id=$2 AND is_current', [fixture.school, student.id]);
    expect(allocation).toMatchObject({ class_name: 'Grade 8', stream_name: 'East', dormitory_name: 'Dorm A', transport_route: 'Route A' });
  });

  it.each(['transfer', 'withdraw'] as const)('closes active boarding and transport on %s without forgiving debt or returning outstanding books', async action => {
    const student = await fixture.seed();
    const bed = await linkedServices(student.id);
    const foreign = await fixture.seed(7, 'East', 'CBC', fixture.foreignSchool);
    await linkedServices(foreign.id, fixture.foreignSchool);
    const foreignBefore = await serviceRecords(foreign.id, fixture.foreignSchool);
    const before = await serviceRecords(student.id);
    const financialBefore = await fixture.relatedRecords(student.id);
    const request = await command([student.id], action, { reason: '' });
    expect((await engine.command(actor(), request)).affected).toBe(1);
    const after = await serviceRecords(student.id);
    expect(after.allocations).toHaveLength(1);
    expect(after.allocations[0]).toMatchObject({ id: before.allocations[0].id, status: 'released', released_by: fixture.user, released_at: expect.any(Date) });
    expect((await fixture.q('SELECT assigned_student_id,status FROM boarding_beds WHERE id=$1::uuid', [bed]))[0]).toEqual({ assigned_student_id: null, status: 'AVAILABLE' });
    expect(after.boarders).toEqual([expect.objectContaining({ id: before.boarders[0].id, status: 'inactive' })]);
    expect(after.transport).toHaveLength(3);
    expect(after.transport.every(row => row.boarding_status === 'left_route')).toBe(true);
    expect(after.transport.find(row => row.id === before.transport.find(row => row.boarding_status === 'left_route').id))
      .toEqual(before.transport.find(row => row.boarding_status === 'left_route'));
    expect(after.loans).toEqual(before.loans);
    expect(await fixture.relatedRecords(student.id)).toEqual(financialBefore);
    expect(await serviceRecords(foreign.id, fixture.foreignSchool)).toEqual(foreignBefore);
    expect((await engine.command(actor(), request)).replayed).toBe(true);
    expect(await serviceRecords(student.id)).toEqual(after);
  });

  it('rolls back boarding and transport closures together with the learner exit when outbox persistence fails', async () => {
    const student = await fixture.seed();
    await linkedServices(student.id);
    const before = await serviceRecords(student.id);
    const request = await command([student.id], 'withdraw', { reason: '' });
    fixture.failEvent = true;
    await expect(engine.command(actor(), request)).rejects.toThrow('Injected outbox persistence failure');
    expect(await serviceRecords(student.id)).toEqual(before);
    expect((await fixture.q('SELECT status FROM students WHERE tenant_id=$1 AND id=$2', [fixture.school, student.id]))[0].status).toBe('active');
  });

  it('keeps services active while expulsion awaits a separate Principal and closes them only after approval', async () => {
    const student = await fixture.seed();
    await linkedServices(student.id);
    const before = await serviceRecords(student.id);
    const request = await engine.command(actor(), await command([student.id], 'expel', { reason: '' }));
    expect(request.status).toBe('pending_approval');
    expect(await serviceRecords(student.id)).toEqual(before);
    await engine.decideApproval({ ...actor(), role: 'principal', userId: fixture.principal }, request.approval_id!, 'approved', 'Reviewed safeguarding decision');
    const after = await serviceRecords(student.id);
    expect(after.allocations[0].status).toBe('released');
    expect(after.boarders[0].status).toBe('inactive');
    expect(after.transport.every(row => row.boarding_status === 'left_route')).toBe(true);
    expect(after.loans).toEqual(before.loans);
  });

  it('closes live service assignments on terminal-grade graduation while retaining outstanding obligations', async () => {
    const student = await fixture.seed(12);
    await linkedServices(student.id);
    const before = await serviceRecords(student.id);
    const relatedBefore = await fixture.relatedRecords(student.id);
    await engine.runYear(actor(), year(), fixture.due);
    expect((await fixture.q('SELECT status FROM students WHERE tenant_id=$1 AND id=$2', [fixture.school, student.id]))[0].status).toBe('graduated');
    const after = await serviceRecords(student.id);
    expect(after.allocations[0].status).toBe('released');
    expect(after.boarders[0].status).toBe('inactive');
    expect(after.transport.every(row => row.boarding_status === 'left_route')).toBe(true);
    expect(after.loans).toEqual(before.loans);
    expect(await fixture.relatedRecords(student.id)).toEqual(relatedBefore);
  });

  it('excludes exited learners from new library borrower selections while retaining their searchable history', async () => {
    const students = [];
    for (const status of ['active', 'transferred_out', 'withdrawn', 'expelled', 'graduated']) {
      const student = await fixture.seed();
      await fixture.q('UPDATE students SET status=$3 WHERE tenant_id=$1 AND id=$2', [fixture.school, student.id, status]);
      students.push({ id: student.id, status });
    }
    const service = new SmartLibraryService({ query: async (sql: string, values: unknown[]) => ({ rows: await fixture.transaction(fixture.school, tx => tx.$queryRawUnsafe(sql, ...values)) }) } as never,
      { requireStore: () => ({ tenant_id: fixture.school, user_id: fixture.user, is_authenticated: true }) } as never, {} as never, {} as never);
    const active = await service.borrowers({ type: 'student' });
    expect(active.map(row => row.subject_id)).toEqual([students[0].id]);
    const historical = await service.borrowers({ type: 'student', include_inactive: 'true' });
    expect(historical.map(row => row.subject_id).sort()).toEqual(students.map(row => row.id).sort());
  });
});
