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
import { TimetableRepository } from '../src/modules/timetable/repositories/timetable.repository';
import { TimetableController } from '../src/modules/timetable/timetable.controller';

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
    // Reproduce the production tables created by the legacy Prisma models.
    // CREATE TABLE IF NOT EXISTS alone cannot repair these constraints.
    await pool.query(`CREATE TABLE timetable_versions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
      academic_year text NOT NULL, term_name text NOT NULL, status text NOT NULL,
      immutable boolean NOT NULL, notes text NOT NULL,
      published_at timestamp NOT NULL, published_by_user_id uuid NOT NULL,
      created_at timestamp NOT NULL DEFAULT NOW(), updated_at timestamp NOT NULL);
      CREATE TABLE timetable_slots (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id text NOT NULL,
      academic_year text NOT NULL, term_name text NOT NULL, class_section_id text NOT NULL,
      subject_id text NOT NULL, teacher_id text NOT NULL, room_id text NOT NULL,
      day_of_week integer NOT NULL, starts_at time NOT NULL, ends_at time NOT NULL,
      created_by_user_id uuid NOT NULL, created_at timestamp NOT NULL DEFAULT NOW(), updated_at timestamp NOT NULL);`);
    await new TimetableSchemaService({ runSchemaBootstrap: async (sql: string) => pool.query(sql) } as never).onModuleInit();
    await pool.query(`CREATE TABLE academic_years (id uuid, tenant_id text, name text, status text, archived_at timestamptz);
      CREATE TABLE academic_terms (id uuid, tenant_id text, academic_year_id uuid, name text, status text, archived_at timestamptz,
        starts_on date, ends_on date);
      CREATE TABLE class_sections (id text, tenant_id text, academic_year_id uuid, name text,
        is_active boolean DEFAULT TRUE, status text DEFAULT 'active', archived_at timestamptz);
      CREATE TABLE class_streams (id text, tenant_id text, class_section_id text, name text,
        is_active boolean DEFAULT TRUE, status text DEFAULT 'active', archived_at timestamptz);
      CREATE TABLE subjects (id text, tenant_id text, name text, status text DEFAULT 'active', department_id uuid);
      CREATE TABLE academics_departments (id uuid, tenant_id text, is_active boolean DEFAULT TRUE);
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
        await pool.query("INSERT INTO subjects (id,tenant_id,name) SELECT 'math', $1, 'Mathematics' WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE tenant_id=$1 AND id='math')", [tenant]);
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

  it('completes Generate against upgraded production tables, persists the draft and events, and safely retries failures', async () => {
    const tenant = 'school-generate'; const year = randomUUID();
    const context = { tenant_id: tenant, user_id: actor, role: 'deputy_principal', permissions: ['timetable:write', 'timetable:read'],
      is_authenticated: true, request_id: randomUUID(), trace_id: randomUUID() };
    const requestContext = { getStore: () => context, requireStore: () => context } as never;
    await pool.query(`CREATE ROLE timetable_generation_writer NOLOGIN NOSUPERUSER;
      GRANT USAGE ON SCHEMA public TO timetable_generation_writer;
      GRANT SELECT ON academic_years, academic_terms, class_sections, class_streams, subjects, staff_profiles, teacher_subject_assignments, academics_departments TO timetable_generation_writer;
      GRANT SELECT, INSERT, UPDATE, DELETE ON timetable_configurations, timetable_days, timetable_period_definitions,
        timetable_common_blocks, timetable_versions, timetable_audit_logs, timetable_subject_requirements, timetable_teacher_availability,
        timetable_unscheduled_requirements, timetable_resources, timetable_slots, timetable_generation_runs, outbox_events TO timetable_generation_writer;`);
    const prisma = new PrismaService(requestContext, { getRuntimeRoleName: () => 'timetable_generation_writer' } as never);
    const repo = new TimetableWorkflowRepository(prisma);
    const publisher = new EventPublisherService(requestContext, new OutboxEventsRepository(prisma));
    const constraints = new TimetableConstraintService(repo);
    const service = new TimetableService(requestContext, new TimetableRepository(prisma), repo, constraints, publisher);
    const controller = new TimetableController(service);
    const scope = { academic_year: '2026 Academic year', term_name: 'TERM 3' };
    try {
      await pool.query(`INSERT INTO academic_years VALUES ($1,$2,$3,'active',NULL)`, [year,tenant,scope.academic_year]);
      await pool.query(`INSERT INTO academic_terms VALUES ($1,$2,$3,$4,'active',NULL,'2026-01-01','2026-12-31')`, [randomUUID(),tenant,year,scope.term_name]);
      await pool.query(`INSERT INTO class_sections (id,tenant_id,academic_year_id,name) VALUES ('form4',$1,$2,'Form 4')`, [tenant,year]);
      await pool.query(`INSERT INTO class_streams (id,tenant_id,class_section_id,name) VALUES ('yellow',$1,'form4','Yellow')`, [tenant]);
      const teachers = Array.from({length:10}, () => randomUUID());
      const periods = [3,3,4,4,3,3,4,3,5,1];
      for (let i=0;i<10;i++) {
        await pool.query(`INSERT INTO subjects (id,tenant_id,name) VALUES ($1,$2,$1)`, [`subject-${i}`,tenant]);
        await pool.query(`INSERT INTO staff_profiles (tenant_id,user_id,display_name,staff_number,status) VALUES ($1,$2,$3,$3,'active')`, [tenant,teachers[i],`Teacher ${i}`]);
        await pool.query(`INSERT INTO teacher_subject_assignments (tenant_id,class_section_id,stream_id,subject_id,teacher_user_id)
          VALUES ($1,'form4','yellow',$2,$3)`, [tenant,`subject-${i}`,teachers[i]]);
      }
      const time = (minutes: number) => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
      const configuration = await repo.saveConfiguration({ ...makeInput(tenant), ...scope,
        days: Array.from({length:5}, (_,day) => ({ day_of_week:day+1, name:`Day ${day+1}`, is_teaching_day:true,
          periods:Array.from({length:9}, (_,index) => ({id:randomUUID(),name:`Period ${index+1}`,starts_at:time(480+index*40),ends_at:time(520+index*40),period_type:'lesson',is_teaching:true})) })) });
      await repo.saveRequirements({tenant_id:tenant, actor_user_id:actor, ...scope,
        requirements:periods.map((count,i)=>({class_section_id:'form4',subject_id:`subject-${i}`,teacher_id:null,stream_id:null,periods_per_week:count,duration_periods:1}))});
      expect((await controller.getReadiness(scope)).status).toBe('READY');
      const result = await controller.generate({...scope,scope:'whole_school',preserve_locked:true,allow_partial:true});
      expect(result).toMatchObject({status:'COMPLETED',gaps:[],run:{status:'completed',required_lessons:45,scheduled_lessons:45,unscheduled_lessons:0},
        version:{status:'draft',row_version:2,immutable:false,notes:null,published_at:null,published_by_user_id:null,created_by_user_id:actor}});
      const snapshot = await constraints.getSnapshot(tenant,scope.academic_year,scope.term_name,result.version.id);
      expect(snapshot.slots).toHaveLength(45);
      expect(snapshot.requirements.map((row:any) => row.periods_per_week).sort()).toEqual([4,4,4,4,4,5,5,5,5,5]);
      expect(snapshot.slots.every((slot:any)=>slot.stream_id==='yellow' && !slot.room_id)).toBe(true);
      expect((await controller.validate({...scope,version_id:result.version.id})).valid).toBe(true);
      expect((await service.getPlanner(scope)).slots).toHaveLength(45);
      expect((await controller.getView({...scope,view:'class',class_section_id:'form4',include_draft:true})).items).toHaveLength(45);
      expect((await controller.getView({...scope,view:'teacher',teacher_id:teachers[0],include_draft:true})).items).toHaveLength(5);
      const events = (await pool.query(`SELECT aggregate_id::text,actor_user_id::text,actor_role,source_dashboard,payload FROM outbox_events WHERE tenant_id=$1 AND event_name='timetable.generation.completed'`,[tenant])).rows;
      expect(events).toEqual([expect.objectContaining({aggregate_id:result.run.id,actor_user_id:actor,actor_role:'deputy_principal',source_dashboard:'deputy_principal',payload:expect.objectContaining({version_id:result.version.id,scheduled_lessons:45})})]);
      expect((await pool.query(`SELECT COUNT(*)::int AS count FROM timetable_audit_logs WHERE tenant_id=$1 AND action='timetable.generation.completed'`,[tenant])).rows[0].count).toBe(1);
      // A failed event write must not leave replacement lessons or a false success run.
      const failPublish = jest.spyOn(publisher,'publish').mockRejectedValueOnce(new Error('Outbox unavailable'));
      await expect(controller.generate({...scope,version_id:result.version.id,expected_version_row_version:2})).rejects.toThrow('Outbox unavailable');
      failPublish.mockRestore();
      expect((await constraints.getSnapshot(tenant,scope.academic_year,scope.term_name,result.version.id)).slots).toEqual(snapshot.slots);
      expect((await repo.getVersion(tenant,result.version.id)).row_version).toBe(2);
      expect((await pool.query(`SELECT COUNT(*)::int AS count FROM timetable_generation_runs WHERE tenant_id=$1`,[tenant])).rows[0].count).toBe(1);
      const lockedSlot = snapshot.slots.find((slot:any)=>slot.teacher_id!==teachers[9]);
      await pool.query(`UPDATE timetable_slots SET locked=TRUE WHERE tenant_id=$1 AND id=$2`,[tenant,lockedSlot.id]);
      const retry = await controller.generate({...scope,version_id:result.version.id,expected_version_row_version:2,preserve_locked:true});
      expect(retry.status).toBe('COMPLETED');
      let retried = await constraints.getSnapshot(tenant,scope.academic_year,scope.term_name,result.version.id);
      expect(retried.slots).toHaveLength(45);
      expect(retry.run.scheduled_lessons).toBe(45);
      expect(retried.slots).toContainEqual(expect.objectContaining({id:lockedSlot.id,locked:true}));
      await expect(controller.generate({...scope,version_id:result.version.id,expected_version_row_version:2})).rejects.toThrow('changed since');
      await expect(controller.generate({...scope,version_id:randomUUID()})).rejects.toThrow('No draft timetable');
      // A full timetable stays full when two lessons are exchanged, with both writes audited atomically.
      const source = retried.slots.find((slot:any) => !slot.locked);
      const options = await service.findValidSlots({...scope,version_id:result.version.id,slot_id:source.id});
      const destination = options.items.find((item:any) => item.swap_slot_id);
      expect(destination).toBeDefined();
      const target = retried.slots.find((slot:any) => slot.id === destination.swap_slot_id);
      const swap = {destination_day_of_week:destination.day_of_week,destination_period_id:destination.period_id,
        swap_slot_id:target.id,expected_row_version:Number(source.row_version),expected_version_row_version:retry.version.row_version};
      const eventFailure = jest.spyOn(publisher,'publish').mockRejectedValueOnce(new Error('Swap outbox unavailable'));
      await expect(service.moveSlot(source.id,swap)).rejects.toThrow('Swap outbox unavailable');
      eventFailure.mockRestore();
      expect((await constraints.getSnapshot(tenant,scope.academic_year,scope.term_name,result.version.id)).slots).toEqual(retried.slots);
      await expect(service.moveSlot(source.id,{...swap,expected_row_version:999})).rejects.toThrow('changed');
      await expect(service.moveSlot(source.id,{...swap,swap_slot_id:lockedSlot.id})).rejects.toThrow('cannot be swapped');
      await expect(service.moveSlot(source.id,{...swap,swap_slot_id:randomUUID()})).rejects.toThrow('cannot be swapped');
      // Availability of the target teacher at the source time is checked too.
      await repo.saveAvailability({tenant_id:tenant,actor_user_id:actor,...scope,items:[{teacher_id:target.teacher_id,
        day_of_week:Number(source.day_of_week),period_id:source.period_id,state:'unavailable'}]});
      await expect(service.moveSlot(source.id,swap)).rejects.toThrow('cannot be swapped');
      await repo.saveAvailability({tenant_id:tenant,actor_user_id:actor,...scope,replace_existing:true,items:[]});
      swap.expected_version_row_version = (await repo.getVersion(tenant,result.version.id)).row_version;
      await service.moveSlot(source.id,swap);
      await expect(service.moveSlot(source.id,swap)).rejects.toThrow();
      retried = await constraints.getSnapshot(tenant,scope.academic_year,scope.term_name,result.version.id);
      expect(retried.slots.find((slot:any) => slot.id===source.id)).toMatchObject({day_of_week:target.day_of_week,period_id:target.period_id});
      expect(retried.slots.find((slot:any) => slot.id===target.id)).toMatchObject({day_of_week:source.day_of_week,period_id:source.period_id});
      expect(constraints.validateVersion(retried)).toMatchObject({valid:true,summary:{empty_teaching_periods:0}});
      expect((await pool.query(`SELECT COUNT(*)::int AS count FROM timetable_audit_logs WHERE tenant_id=$1 AND action='timetable.slots.swapped'`,[tenant])).rows[0].count).toBe(1);
      expect((await pool.query(`SELECT payload FROM outbox_events WHERE tenant_id=$1 AND event_name='timetable.slot.updated'`,[tenant])).rows)
        .toEqual([expect.objectContaining({payload:expect.objectContaining({metadata:expect.objectContaining({swap_slot_id:target.id})})})]);
      // An impossible full week must keep the saved draft, even for legacy clients requesting partial output.
      await repo.saveAvailability({tenant_id:tenant,actor_user_id:actor,...scope,items:configuration.days.flatMap((day:any)=>day.periods.map((period:any)=>({teacher_id:teachers[9],day_of_week:day.day_of_week,period_id:period.id,state:'unavailable'})))});
      const updatedVersion = await repo.getVersion(tenant,result.version.id);
      await expect(controller.generate({...scope,version_id:result.version.id,expected_version_row_version:updatedVersion.row_version,allow_partial:true})).rejects.toThrow('full teaching week could not be filled');
      expect((await constraints.getSnapshot(tenant,scope.academic_year,scope.term_name,result.version.id)).slots).toEqual(retried.slots);
      expect(await repo.countOpenUnscheduled(tenant,result.version.id)).toBe(0);
      expect((await pool.query(`SELECT COUNT(*)::int AS count FROM outbox_events WHERE tenant_id=$1 AND event_name='timetable.generation.partial'`,[tenant])).rows[0].count).toBe(0);
      context.tenant_id='school-b';
      await expect(service.moveSlot(source.id,swap)).rejects.toThrow('not found for this school');
      expect(await repo.getVersion('school-b',result.version.id)).toBeNull();
      expect((await prisma.query('SELECT id FROM timetable_slots WHERE tenant_id=$1 AND version_id=$2::uuid',['school-b',result.version.id])).rows).toEqual([]);
    } finally {
      await prisma.$disconnect();
      await pool.query('DROP OWNED BY timetable_generation_writer; DROP ROLE timetable_generation_writer');
    }
  }, 60_000);

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
    await repository.saveRequirements({ ...input, requirements: [{ ...requirement, id: saved[0].id, stream_id: 'blue' }] });
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

  it('uses an existing across-term stream allocation for legacy requirements through generation and gap recovery', async () => {
    const tenant = 'school-yellow'; const year = randomUUID(); const teacher = randomUUID(); const version = randomUUID();
    await pool.query(`INSERT INTO academic_years VALUES ($1, $2, '2026', 'active', NULL)`, [year, tenant]);
    await pool.query(`INSERT INTO academic_terms VALUES ($1, $2, $3, 'Term 1', 'active', NULL, '2026-01-01', '2026-12-31')`, [randomUUID(), tenant, year]);
    await pool.query(`INSERT INTO class_sections (id, tenant_id, academic_year_id, name) VALUES ('form4', $1, $2, 'Form 4')`, [tenant, year]);
    await pool.query(`INSERT INTO class_streams (id, tenant_id, class_section_id, name) VALUES ('yellow', $1, 'form4', 'Yellow'), ('blue', $1, 'form4', 'Blue')`, [tenant]);
    await pool.query(`INSERT INTO subjects (id, tenant_id, name) VALUES ('agriculture', $1, 'Agriculture')`, [tenant]);
    await pool.query(`INSERT INTO staff_profiles (tenant_id, user_id, display_name, staff_number, status) VALUES ($1, $2, 'Allocated Teacher', 'Y1', 'active')`, [tenant, teacher]);
    const insertAssignment = async (school: string, stream: string | null) => (await pool.query(`INSERT INTO teacher_subject_assignments
      (tenant_id, class_section_id, stream_id, subject_id, teacher_user_id, academic_term_id)
      VALUES ($1, 'form4', $2, 'agriculture', $3, NULL) RETURNING id::text`, [school, stream, teacher])).rows[0].id;
    await insertAssignment(tenant, 'yellow');
    await insertAssignment('school-b', 'blue');
    const input = makeInput(tenant); await repository.saveConfiguration(input);
    const [saved] = await repository.saveRequirements({ ...input, requirements: [{ class_section_id: 'form4', subject_id: 'agriculture',
      teacher_id: null, stream_id: null, periods_per_week: 1, duration_periods: 1 }] });
    const constraints = new TimetableConstraintService(repository);
    expect(saved).toMatchObject({ teacher_id: null, stream_id: null, resolved_teacher_id: teacher,
      resolved_stream_id: 'yellow', resolved_stream_name: 'Yellow', allocation_status: 'resolved', row_version: 1 });
    expect((await constraints.readiness(tenant, '2026', 'Term 1')).status).toBe('READY');
    const generated = constraints.generate(await constraints.getSnapshot(tenant, '2026', 'Term 1'));
    expect(generated.gaps).toEqual([]);
    expect(generated.placements).toEqual([expect.objectContaining({ teacher_id: teacher, stream_id: 'yellow', requirement_id: saved.id })]);
    await pool.query(`INSERT INTO timetable_versions (id, tenant_id, academic_year, term_name, status) VALUES ($1, $2, '2026', 'Term 1', 'draft')`, [version, tenant]);
    await repository.saveGenerationResult({ tenant_id: tenant, version_id: version, scope: { type: 'school' }, ...generated, required_lessons: 1, actor_user_id: actor });
    const persisted = await constraints.getSnapshot(tenant, '2026', 'Term 1', version);
    expect(persisted.slots[0]).toMatchObject({ stream_id: 'yellow', teacher_id: teacher });
    expect(constraints.validateVersion(persisted)).toMatchObject({ valid: true, summary: { unscheduled: 0 } });
    await repository.saveGenerationResult({ tenant_id: tenant, version_id: version, scope: { type: 'school' }, placements: [], warnings: [],
      gaps: [{ requirement_id: saved.id, remaining_periods: 1, duration_periods: 1, reason_code: 'NO_VALID_SLOT', reason_message: 'Review availability' }], required_lessons: 1, actor_user_id: actor });
    const [gap] = await repository.listUnscheduled(tenant, '2026', 'Term 1', version);
    expect(gap).toMatchObject({ stream_id: 'yellow', stream_name: 'Yellow', teacher_id: teacher });
    expect(await repository.getUnscheduled(tenant, gap.id)).toMatchObject({ stream_id: 'yellow', teacher_id: teacher });
    await repository.saveGenerationResult({ tenant_id: tenant, version_id: version, scope: { type: 'stream', id: 'yellow' }, ...generated, required_lessons: 1, actor_user_id: actor });
    expect(await repository.countOpenUnscheduled(tenant, version)).toBe(0);
    // The same teacher teaching two streams must never become a whole-class lesson.
    const secondStream = await insertAssignment(tenant, 'blue');
    expect((await repository.listRequirements(tenant, '2026', 'Term 1'))[0]).toMatchObject({ allocation_status: 'stream_required', resolved_teacher_id: null });
    expect((await constraints.readiness(tenant, '2026', 'Term 1')).blockers).toContainEqual(expect.objectContaining({
      details: [expect.objectContaining({ reason: expect.stringContaining('Teachers are already allocated to multiple streams') })] }));
    expect(constraints.generate(await constraints.getSnapshot(tenant, '2026', 'Term 1')).placements).toEqual([]);
    // An explicit whole-class allocation takes precedence over stream inference.
    const wholeClass = await insertAssignment(tenant, null);
    expect((await repository.listRequirements(tenant, '2026', 'Term 1'))[0]).toMatchObject({ allocation_status: 'resolved', resolved_stream_id: null, resolved_teacher_id: teacher });
    await pool.query(`UPDATE teacher_subject_assignments SET status='ended' WHERE id=ANY($1::uuid[])`, [[secondStream, wholeClass]]);
    await pool.query(`UPDATE class_streams SET is_active=FALSE WHERE tenant_id=$1 AND id='yellow'`, [tenant]);
    expect((await repository.listRequirements(tenant, '2026', 'Term 1'))[0].allocation_status).toBe('missing');
    // Resolution is read-only: no resave, row-version change or migration is required.
    expect((await pool.query(`SELECT teacher_id, stream_id, row_version FROM timetable_subject_requirements WHERE tenant_id=$1 AND id=$2`, [tenant, saved.id])).rows[0])
      .toEqual({ teacher_id: null, stream_id: null, row_version: 1 });
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
