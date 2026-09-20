import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { HrSchemaService } from '../src/modules/hr/hr-schema.service';
import { TimetableSchemaService } from '../src/modules/timetable/timetable-schema.service';
import { TimetableWorkflowRepository } from '../src/modules/timetable/repositories/timetable-workflow.repository';
import { TimetableService } from '../src/modules/timetable/timetable.service';
import { EventsSchemaService } from '../src/modules/events/events-schema.service';
import { EventPublisherService } from '../src/modules/events/event-publisher.service';
import { OutboxEventsRepository } from '../src/modules/events/repositories/outbox-events.repository';
import { TimetableConstraintService } from '../src/modules/timetable/timetable-constraint.service';

describe('School day configuration persistence', () => {
  let pool: Pool;
  let repository: TimetableWorkflowRepository;
  const actor = randomUUID();
  const types = [
    { id: 'lesson', name: 'Lesson', default_duration_minutes: 40, is_teaching: true },
    { id: 'tea', name: 'Tea Break', default_duration_minutes: 15, is_teaching: false },
  ];
  const makeInput = (tenant = 'school-a') => ({
    tenant_id: tenant, actor_user_id: actor, academic_year: '2026', term_name: 'Term 1',
    school_starts_at: '08:00', period_types: types,
    days: [{ day_of_week: 1, name: 'Monday', is_teaching_day: true, periods: [
      { id: randomUUID(), name: 'Period 1', starts_at: '08:00', ends_at: '08:45', period_type: 'lesson', is_teaching: false },
      { id: randomUUID(), name: 'Tea Break', starts_at: '08:45', ends_at: '09:00', period_type: 'tea', is_teaching: true },
    ] }], common_blocks: [],
  });

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL || 'postgres://invalid/invalid');
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || !url.pathname.slice(1).startsWith('my_shule_disposable_')) throw new Error('Use disposable local PostgreSQL.');
    pool = new Pool({ connectionString: url.toString() });
    await new TimetableSchemaService({ runSchemaBootstrap: async (sql: string) => pool.query(sql) } as never).onModuleInit();
    await pool.query(`CREATE TABLE academic_years (id uuid, tenant_id text, name text, status text, archived_at timestamptz);
      CREATE TABLE academic_terms (id uuid, tenant_id text, academic_year_id uuid, name text, status text, archived_at timestamptz,
        starts_on date, ends_on date);
      CREATE TABLE class_sections (id text, tenant_id text, academic_year_id uuid, name text,
        is_active boolean DEFAULT TRUE, status text DEFAULT 'active', archived_at timestamptz);
      CREATE TABLE class_streams (id text, tenant_id text, class_section_id text, name text,
        is_active boolean DEFAULT TRUE, status text DEFAULT 'active', archived_at timestamptz);
      CREATE TABLE subjects (id text, tenant_id text, name text, status text DEFAULT 'active');
      CREATE TABLE teacher_subject_assignments (id uuid DEFAULT gen_random_uuid(), tenant_id text,
        academic_term_id uuid, class_section_id text, stream_id text, subject_id text, teacher_user_id text,
        department_id uuid, status text DEFAULT 'active', effective_from date, effective_to date);`);
    let hrSchema = '';
    await new HrSchemaService({ runSchemaBootstrap: async (sql: string) => { hrSchema += sql; } } as never).onModuleInit();
    const staffTable = hrSchema.match(/CREATE TABLE IF NOT EXISTS staff_profiles \([\s\S]*?\n      \);/)?.[0];
    if (!staffTable) throw new Error('The canonical HR staff table was not found');
    await pool.query(staffTable);
    let eventSchema = '';
    await new EventsSchemaService({ runSchemaBootstrap: async (sql: string) => { eventSchema += sql; } } as never, { onModuleInit: async () => {} } as never).onModuleInit();
    const outboxTable = eventSchema.match(/CREATE TABLE IF NOT EXISTS outbox_events \([\s\S]*?\n      \);/)?.[0];
    if (!outboxTable) throw new Error('The canonical event outbox was not found');
    await pool.query(outboxTable);
    for (const tenant of ['school-a', 'school-b']) {
      const year = randomUUID();
      await pool.query(`INSERT INTO academic_years VALUES ($1, $2, '2026', 'active', NULL)`, [year, tenant]);
      await pool.query(`INSERT INTO academic_terms VALUES ($1, $2, $3, 'Term 1', 'active', NULL, '2026-01-01', '2026-12-31')`, [randomUUID(), tenant, year]);
    }
    repository = new TimetableWorkflowRepository({
      query: (sql: string, values: unknown[]) => pool.query(sql, values),
      executeWithTenant: async (tenant: string, user: string, callback: (tx: unknown) => Promise<unknown>) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenant]);
          const result = await callback({
            $queryRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rows,
            $executeRawUnsafe: async (sql: string, ...values: unknown[]) => (await client.query(sql, values)).rowCount,
          });
          await client.query('COMMIT'); return result;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
    } as never);
  }, 30_000);
  afterAll(async () => { await pool?.end(); });
  beforeEach(async () => { await pool.query('TRUNCATE timetable_configurations, timetable_days, timetable_period_definitions, timetable_common_blocks, timetable_teacher_availability, timetable_audit_logs CASCADE'); });

  it('round-trips definitions, start time, custom occurrence duration and authoritative teaching status', async () => {
    const input = makeInput();
    const saved = await repository.saveConfiguration(input);
    expect(saved.period_types).toEqual(types);
    expect(saved.school_starts_at).toBe('08:00');
    expect(saved.days[0].periods.map((period: any) => [period.id, period.ends_at, period.is_teaching])).toEqual([
      [input.days[0].periods[0].id, '08:45', true], [input.days[0].periods[1].id, '09:00', false],
    ]);
    expect((await pool.query(`SELECT action FROM timetable_audit_logs WHERE tenant_id = 'school-a'`)).rows).toEqual([{ action: 'timetable.configuration.updated' }]);
  });

  it('retains availability across saves and reorders instead of deleting every period', async () => {
    const input = makeInput();
    const saved = await repository.saveConfiguration(input);
    await pool.query(`INSERT INTO timetable_teacher_availability
      (tenant_id, academic_year, term_name, teacher_id, day_of_week, period_id, state)
      VALUES ('school-a', '2026', 'Term 1', $1, 1, $2, 'unavailable')`, [actor, input.days[0].periods[0].id]);
    input.days[0].periods.reverse();
    input.days[0].periods[0].starts_at = '08:00'; input.days[0].periods[0].ends_at = '08:15';
    input.days[0].periods[1].starts_at = '08:15'; input.days[0].periods[1].ends_at = '09:00';
    const updated = await repository.saveConfiguration({ ...input, expected_row_version: saved.row_version });
    expect(updated.row_version).toBe(2);
    expect(updated.days[0].periods[0].period_type).toBe('tea');
    expect((await pool.query('SELECT period_id::text FROM timetable_teacher_availability')).rows).toEqual([{ period_id: input.days[0].periods[1].id }]);
  });

  it('saves periods, requirements and availability with the production Prisma adapter, HR schema and restricted role', async () => {
    await pool.query(`CREATE ROLE timetable_period_test_writer NOLOGIN NOSUPERUSER;
      GRANT USAGE ON SCHEMA public TO timetable_period_test_writer;
      GRANT SELECT ON academic_years, academic_terms, class_sections, class_streams, subjects, staff_profiles, teacher_subject_assignments
        TO timetable_period_test_writer;
      GRANT SELECT, INSERT, UPDATE, DELETE ON timetable_configurations, timetable_days,
        timetable_period_definitions, timetable_common_blocks, timetable_versions, timetable_audit_logs,
        timetable_subject_requirements, timetable_teacher_availability, timetable_unscheduled_requirements,
        timetable_resources, timetable_slots, timetable_relief_assignments
        TO timetable_period_test_writer;`);
    const prisma = new PrismaService(undefined as never, {
      getRuntimeRoleName: () => 'timetable_period_test_writer',
    } as never);
    try {
      const productionRepository = new TimetableWorkflowRepository(prisma);
      const input = makeInput();
      input.days.push({ ...structuredClone(input.days[0]), day_of_week: 2, name: 'Tuesday',
        periods: input.days[0].periods.map((period) => ({ ...period, id: randomUUID() })),
      });
      const saved = await productionRepository.saveConfiguration(input);
      expect(saved.days).toHaveLength(2);
      expect(saved.period_types).toEqual(types);
      expect(saved.row_version).toBe(1);
      input.days[0].periods[1].ends_at = '09:15';
      const updated = await productionRepository.saveConfiguration({ ...input, expected_row_version: 1 });
      expect(updated.row_version).toBe(2);
      expect(updated.days[0].periods[1].ends_at).toBe('09:15');
      expect(updated.days[1].periods[1].ends_at).toBe('09:00');
      expect(await productionRepository.getConfiguration('school-b', '2026', 'Term 1')).toBeNull();
      expect((await pool.query('SELECT count(*)::int AS count FROM timetable_audit_logs')).rows[0].count).toBe(2);

      expect(await productionRepository.listRequirements('school-a', '2026', 'Term 1')).toEqual([]);
      expect(await productionRepository.listAvailability('school-a', '2026', 'Term 1')).toEqual([]);
      for (const tenant of ['school-a', 'school-b']) {
        await pool.query(`INSERT INTO staff_profiles (tenant_id, user_id, display_name, staff_number, status)
          VALUES ($1, $2, $3, 'T-001', 'active')`, [tenant, actor, tenant === 'school-a' ? 'Assigned Teacher' : 'Other School Teacher']);
        await pool.query(`INSERT INTO class_sections (id, tenant_id, academic_year_id, name)
          SELECT 'class-1', tenant_id, id, 'Form 1' FROM academic_years WHERE tenant_id=$1`, [tenant]);
        await pool.query(`INSERT INTO subjects (id, tenant_id, name) VALUES ('math', $1, 'Mathematics')`, [tenant]);
        const requirements = await productionRepository.saveRequirements({
          tenant_id: tenant, academic_year: '2026', term_name: 'Term 1', actor_user_id: actor,
          requirements: [{ class_section_id: 'class-1', subject_id: 'math', teacher_id: actor, periods_per_week: 5 }],
        });
        expect(requirements).toHaveLength(1);
        expect(requirements[0].teacher_name).toBe(tenant === 'school-a' ? 'Assigned Teacher' : 'Other School Teacher');
      }
      const availability = await productionRepository.saveAvailability({
        tenant_id: 'school-a', academic_year: '2026', term_name: 'Term 1', actor_user_id: actor,
        items: [{ teacher_id: actor, day_of_week: 1, period_id: input.days[0].periods[0].id, state: 'unavailable' }],
      });
      expect(availability).toHaveLength(1);
      expect(availability[0]).toMatchObject({ teacher_name: 'Assigned Teacher', state: 'unavailable' });
      expect(await productionRepository.listAvailability('school-b', '2026', 'Term 1')).toEqual([]);
      expect(await productionRepository.listUnscheduled('school-a', '2026', 'Term 1')).toEqual([]);
      expect(await productionRepository.getReliefAffected('school-a', actor, '2026-01-05')).toMatchObject({
        absent_teacher: { teacher_name: 'Assigned Teacher' }, lessons: [],
      });
      await pool.query("UPDATE staff_profiles SET display_name='' WHERE tenant_id='school-a'");
      expect((await productionRepository.listAvailability('school-a', '2026', 'Term 1'))[0].teacher_name).toBe('T-001');
      expect((await pool.query('SELECT action FROM timetable_audit_logs ORDER BY action')).rows.map((row) => row.action))
        .toEqual(['timetable.availability.updated', 'timetable.configuration.updated', 'timetable.configuration.updated',
          'timetable.requirements.updated', 'timetable.requirements.updated']);
    } finally {
      await prisma.$disconnect();
      await pool.query('DROP OWNED BY timetable_period_test_writer; DROP ROLE timetable_period_test_writer');
    }
  });

  it('saves setup edits and UUID events atomically, removes rows, and rejects duplicate, stale and cross-school edits', async () => {
    const prisma = new PrismaService(undefined as never, undefined as never);
    const repo = new TimetableWorkflowRepository(prisma);
    const context = { tenant_id: 'school-a', user_id: actor, role: 'deputy_principal', is_authenticated: true, request_id: randomUUID(), trace_id: randomUUID() };
    const requestContext = { getStore: () => context, requireStore: () => context } as never;
    const publisher = new EventPublisherService(requestContext, new OutboxEventsRepository(prisma));
    const service = new TimetableService(requestContext, {} as never, repo, {} as never, publisher);
    try {
      for (const tenant of ['school-a', 'school-b']) {
        await pool.query('INSERT INTO staff_profiles (tenant_id, user_id, display_name, staff_number, status) SELECT $1, $2::uuid, $3, $4, $5 WHERE NOT EXISTS (SELECT 1 FROM staff_profiles WHERE tenant_id=$1 AND user_id=$2::uuid)', [tenant, actor, 'Teacher', 'T-001', 'active']);
        await pool.query("INSERT INTO class_sections (id, tenant_id, academic_year_id, name) SELECT 'class-1', tenant_id, id, 'Form 1' FROM academic_years WHERE tenant_id=$1 AND NOT EXISTS (SELECT 1 FROM class_sections WHERE tenant_id=$1 AND id='class-1')", [tenant]);
        await pool.query("INSERT INTO subjects SELECT 'math', $1, 'Mathematics' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE tenant_id=$1 AND id='math')", [tenant]);
      }
      // Match production's human-readable academic-year name that cannot be cast to uuid.
      await pool.query("UPDATE academic_years SET name='2026 Academic year'");
      const scope = { academic_year: '2026 Academic year', term_name: 'Term 1' };
      const config = makeInput(); config.academic_year = scope.academic_year;
      await repo.saveConfiguration(config);
      const subject = { class_section_id: 'class-1', subject_id: 'math', periods_per_week: 3, duration_periods: 2 };
      let saved = await service.saveRequirements({ ...scope, replace_existing: true, requirements: [subject] });
      expect(saved.items).toHaveLength(1);
      const id = saved.items[0].id;
      saved = await service.saveRequirements({ ...scope, replace_existing: true, requirements: [{ ...subject, id, teacher_id: actor, expected_row_version: 1, periods_per_week: 5 }] });
      expect(saved.items[0]).toMatchObject({ id, teacher_id: actor, row_version: 2, periods_per_week: 5 });
      await expect(service.saveRequirements({ ...scope, requirements: [{ ...subject, id, expected_row_version: 1 }] })).rejects.toThrow('changed since');
      await expect(service.saveRequirements({ ...scope, requirements: [subject, subject] })).rejects.toThrow('Duplicate');
      await expect(service.saveRequirements({ ...scope, requirements: [{ ...subject, id: randomUUID() }] })).rejects.toThrow('no longer available');
      const other = await repo.saveRequirements({ ...scope, tenant_id: 'school-b', actor_user_id: actor, requirements: [subject] });
      await expect(service.saveRequirements({ ...scope, requirements: [{ ...subject, id: other[0].id }] })).rejects.toThrow('no longer available');
      expect(await repo.listRequirements('school-b', scope.academic_year, scope.term_name)).toHaveLength(1);
      const failPublish = jest.spyOn(publisher, 'publish').mockRejectedValueOnce(new Error('Outbox unavailable'));
      await expect(service.saveRequirements({ ...scope, requirements: [{ ...subject, id, teacher_id: actor, periods_per_week: 8 }] })).rejects.toThrow('Outbox unavailable');
      failPublish.mockRestore();
      expect((await repo.listRequirements('school-a', scope.academic_year, scope.term_name))[0]).toMatchObject({ periods_per_week: 5, row_version: 2 });
      expect(await service.saveRequirements({ ...scope, replace_existing: true, requirements: [] })).toEqual({ items: [] });
      const rule = { teacher_id: actor, day_of_week: 1, period_id: config.days[0].periods[0].id, state: 'unavailable' as const };
      const availability = await service.saveAvailability({ ...scope, replace_existing: true, items: [rule] });
      const edited = await service.saveAvailability({ ...scope, replace_existing: true, items: [{ ...rule, id: availability.items[0].id, period_id: config.days[0].periods[1].id, expected_row_version: 1 }] });
      expect(edited.items[0]).toMatchObject({ id: availability.items[0].id, row_version: 2, period_id: config.days[0].periods[1].id });
      await expect(service.saveAvailability({ ...scope, items: [rule, rule] })).rejects.toThrow('Duplicate');
      const failAvailability = jest.spyOn(publisher, 'publish').mockRejectedValueOnce(new Error('Outbox unavailable'));
      await expect(service.saveAvailability({ ...scope, replace_existing: true, items: [] })).rejects.toThrow('Outbox unavailable');
      failAvailability.mockRestore();
      expect(await repo.listAvailability('school-a', scope.academic_year, scope.term_name)).toHaveLength(1);
      expect(await service.saveAvailability({ ...scope, replace_existing: true, items: [] })).toEqual({ items: [] });
      const events = (await pool.query(`SELECT event.aggregate_id::text, event.tenant_id, event.actor_user_id::text, event.payload, audit.id::text AS audit_id
        FROM outbox_events event LEFT JOIN timetable_audit_logs audit ON audit.id=event.aggregate_id AND audit.tenant_id=event.tenant_id`)).rows;
      expect(events).toHaveLength(6);
      for (const event of events) {
        expect(event.aggregate_id).toBe(event.audit_id);
        expect(event).toMatchObject({ tenant_id: 'school-a', actor_user_id: actor, payload: { academic_year: scope.academic_year, term_name: scope.term_name } });
      }
    } finally {
      await pool.query("UPDATE academic_years SET name='2026'");
      await prisma.$disconnect();
    }
  });

  it('resolves automatic teachers for readiness, generation and saved lessons without rewriting requirements', async () => {
    const tenant = 'school-allocations';
    const year = randomUUID(); const term = randomUUID(); const otherTerm = randomUUID();
    const teacher = randomUUID(); const replacement = randomUUID(); const version = randomUUID();
    await pool.query(`INSERT INTO academic_years VALUES ($1, $2, '2026', 'active', NULL)`, [year, tenant]);
    await pool.query(`INSERT INTO academic_terms VALUES ($1, $3, $4, 'Term 1', 'active', NULL, '2026-01-01', '2026-12-31'),
      ($2, $3, $4, 'Term 2', 'active', NULL, '2026-01-01', '2026-12-31')`, [term, otherTerm, tenant, year]);
    await pool.query(`INSERT INTO class_sections (id, tenant_id, academic_year_id, name) VALUES ('class', $1, $2, 'Form 4')`, [tenant, year]);
    await pool.query(`INSERT INTO class_streams (id, tenant_id, class_section_id, name) VALUES ('blue', $1, 'class', 'Blue'), ('red', $1, 'class', 'Red')`, [tenant]);
    await pool.query(`INSERT INTO subjects (id, tenant_id, name) VALUES ('math', $1, 'Mathematics')`, [tenant]);
    await pool.query(`INSERT INTO staff_profiles (tenant_id, user_id, display_name, staff_number, status)
      VALUES ($1, $2, 'Allocated Teacher', 'T1', 'active'), ($1, $3, 'Replacement Teacher', 'T2', 'active')`, [tenant, teacher, replacement]);
    const input = makeInput(tenant);
    await repository.saveConfiguration(input);
    const requirement = { class_section_id: 'class', subject_id: 'math', teacher_id: null, periods_per_week: 1, duration_periods: 1 };
    const saved = await repository.saveRequirements({ ...input, requirements: [requirement] });
    const constraints = new TimetableConstraintService(repository);
    expect((await constraints.readiness(tenant, '2026', 'Term 1')).checks.teacher_allocations).toBe(false);
    const insertAssignment = async (school: string, staff: string, termId: string | null = term) => (await pool.query(`INSERT INTO teacher_subject_assignments
      (tenant_id, academic_term_id, class_section_id, subject_id, teacher_user_id)
      VALUES ($1, $2, 'class', 'math', $3) RETURNING id::text`, [school, termId, staff])).rows[0].id;
    const assignment = await insertAssignment(tenant, teacher);
    await insertAssignment('school-b', replacement); // Identical IDs in another school cannot affect resolution.
    await insertAssignment(tenant, replacement, otherTerm);
    const readiness = await constraints.readiness(tenant, '2026', 'Term 1');
    expect(readiness.status).toBe('READY');
    expect(readiness.metrics.active_teachers).toBe(1); // A null effective_from is valid.
    expect((await repository.listRequirements(tenant, '2026', 'Term 1'))[0]).toMatchObject({
      id: saved[0].id, teacher_id: null, resolved_teacher_id: teacher, resolved_teacher_name: 'Allocated Teacher', row_version: 1,
    });
    const snapshot = await constraints.getSnapshot(tenant, '2026', 'Term 1');
    const generated = constraints.generate(snapshot);
    expect(generated.gaps).toEqual([]);
    expect(generated.placements).toEqual([expect.objectContaining({ teacher_id: teacher, requirement_id: saved[0].id })]);
    await pool.query(`INSERT INTO timetable_versions (id, tenant_id, academic_year, term_name, status) VALUES ($1, $2, '2026', 'Term 1', 'draft')`, [version, tenant]);
    await repository.saveGenerationResult({ tenant_id: tenant, version_id: version, scope: { type: 'school' },
      ...generated, required_lessons: 1, actor_user_id: actor });
    const persisted = await constraints.getSnapshot(tenant, '2026', 'Term 1', version);
    expect(persisted.slots[0].teacher_id).toBe(teacher);
    expect(constraints.validateVersion(persisted)).toMatchObject({ valid: true, summary: { unscheduled: 0 } });
    const partial = { placements: [], gaps: [{ requirement_id: saved[0].id, remaining_periods: 1,
      duration_periods: 1, reason_code: 'NO_VALID_SLOT', reason_message: 'Review availability' }], warnings: [] };
    await repository.saveGenerationResult({ tenant_id: tenant, version_id: version, scope: { type: 'school' },
      ...partial, required_lessons: 1, actor_user_id: actor });
    const unresolved = await repository.listUnscheduled(tenant, '2026', 'Term 1', version);
    expect(unresolved[0]).toMatchObject({ teacher_id: teacher, teacher_name: 'Allocated Teacher' });
    expect(await repository.getUnscheduled(tenant, unresolved[0].id)).toMatchObject({ teacher_id: teacher });
    await repository.saveGenerationResult({ tenant_id: tenant, version_id: version, scope: { type: 'teacher', id: teacher },
      ...generated, required_lessons: 1, actor_user_id: actor });
    expect(await repository.listUnscheduled(tenant, '2026', 'Term 1', version)).toEqual([]);
    expect(await repository.countOpenUnscheduled(tenant, version)).toBe(0);
    await pool.query(`UPDATE teacher_subject_assignments SET teacher_user_id=$2 WHERE id=$1`, [assignment, replacement]);
    expect((await constraints.getSnapshot(tenant, '2026', 'Term 1')).requirements[0].teacher_id).toBe(replacement);
    expect((await repository.listRequirements(tenant, '2026', 'Term 1'))[0].teacher_id).toBeNull();
    const duplicate = await insertAssignment(tenant, teacher, null);
    const blocked = await constraints.readiness(tenant, '2026', 'Term 1');
    expect(blocked.blockers).toContainEqual(expect.objectContaining({ code: 'INVALID_TEACHER_ALLOCATIONS',
      action_url: '/school/deputy-principal/academics', details: [expect.objectContaining({ class_name: 'Form 4', subject_name: 'Mathematics', reason: expect.stringContaining('More than one') })] }));
    await pool.query(`UPDATE teacher_subject_assignments SET status='ended' WHERE id=$1`, [duplicate]);
    for (const patch of ["effective_from=CURRENT_DATE+1", "effective_from=NULL, effective_to=CURRENT_DATE-1", "effective_to=NULL, status='ended'", "status='active', stream_id='red'"]) {
      await pool.query(`UPDATE teacher_subject_assignments SET ${patch} WHERE id=$1`, [assignment]);
      expect((await constraints.readiness(tenant, '2026', 'Term 1')).checks.teacher_allocations).toBe(false);
    }
    await pool.query(`UPDATE teacher_subject_assignments SET stream_id='blue' WHERE id=$1`, [assignment]);
    await repository.saveRequirements({ ...input, requirements: [{ ...requirement, id: saved[0].id, stream_id: 'blue' }] });
    expect((await constraints.readiness(tenant, '2026', 'Term 1')).status).toBe('READY');
    await pool.query(`UPDATE staff_profiles SET status='suspended' WHERE tenant_id=$1 AND user_id=$2`, [tenant, replacement]);
    expect((await constraints.readiness(tenant, '2026', 'Term 1')).checks.teacher_allocations).toBe(false);
    await pool.query(`UPDATE staff_profiles SET status='active' WHERE tenant_id=$1 AND user_id=$2`, [tenant, replacement]);
    await repository.saveRequirements({ ...input, requirements: [{ ...requirement, id: saved[0].id, stream_id: 'blue', teacher_id: teacher }] });
    expect((await constraints.readiness(tenant, '2026', 'Term 1')).checks.teacher_allocations).toBe(false);
  });

  it('keeps schools separate and rolls back attempts to reuse another school period ID', async () => {
    const a = makeInput(); const b = makeInput('school-b');
    await repository.saveConfiguration(a);
    await repository.saveConfiguration(b);
    const loaded = await repository.getConfiguration('school-b', '2026', 'Term 1');
    expect(loaded.days[0].periods[0].id).toBe(b.days[0].periods[0].id);
    a.days[0].periods[0].id = b.days[0].periods[0].id;
    await expect(repository.saveConfiguration({ ...a, expected_row_version: 1 })).rejects.toThrow('does not belong');
    expect((await repository.getConfiguration('school-b', '2026', 'Term 1')).row_version).toBe(1);
    expect((await repository.getConfiguration('school-a', '2026', 'Term 1')).row_version).toBe(1);
    expect(await repository.getConfiguration('school-c', '2026', 'Term 1')).toBeNull();
  });

  it('rejects stale saves, overlaps, unknown types and duplicate types without partial writes', async () => {
    const input = makeInput(); await repository.saveConfiguration(input);
    await expect(repository.saveConfiguration({ ...input, expected_row_version: 9 })).rejects.toThrow('changed since');
    await expect(repository.saveConfiguration({ ...input, period_types: [types[0], types[0]] })).rejects.toThrow('unique');
    const overlap = structuredClone(input); overlap.days[0].periods[1].starts_at = '08:30';
    await expect(repository.saveConfiguration(overlap)).rejects.toThrow('non-overlapping');
    const unknown = structuredClone(input); unknown.days[0].periods[0].period_type = 'missing';
    await expect(repository.saveConfiguration(unknown)).rejects.toThrow('configured period type');
    expect((await repository.getConfiguration('school-a', '2026', 'Term 1')).row_version).toBe(1);
    expect((await pool.query('SELECT count(*)::int AS count FROM timetable_audit_logs')).rows[0].count).toBe(1);
  });

  it('keeps saved definitions for older clients that omit the new fields', async () => {
    const input = makeInput(); await repository.saveConfiguration(input);
    const { period_types, school_starts_at, ...legacy } = input;
    const saved = await repository.saveConfiguration({ ...legacy, expected_row_version: 1 });
    expect(saved.period_types).toEqual(period_types);
    expect(saved.school_starts_at).toBe(school_starts_at);
    expect(saved.days[0].periods[1].is_teaching).toBe(false);
  });

  it('applies row-level security to the catalogue even when a query omits the tenant filter', async () => {
    await repository.saveConfiguration(makeInput());
    await repository.saveConfiguration(makeInput('school-b'));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('CREATE ROLE timetable_period_test_reader NOLOGIN NOSUPERUSER');
      await client.query('GRANT SELECT ON timetable_configurations TO timetable_period_test_reader');
      await client.query('SET LOCAL ROLE timetable_period_test_reader');
      await client.query(`SELECT set_config('app.tenant_id', 'school-a', true)`);
      const rows = (await client.query('SELECT tenant_id, period_types FROM timetable_configurations')).rows;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({ tenant_id: 'school-a', period_types: types });
    } finally { await client.query('ROLLBACK'); client.release(); }
  });
});
