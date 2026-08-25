import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { ConflictException } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { DashboardRealtimeService } from '../events/dashboard-realtime.service';
import type { DomainEvent } from '../events/events.types';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignReliefDto,
  BulkSetTeacherAvailabilityDto,
  BulkUpsertRequirementsDto,
  CancelReliefDto,
  ConfigureTimetableDto,
  GenerateTimetableDto,
  PortalTimetableQueryDto,
  ReliefCandidatesQueryDto,
} from './dto/timetable.dto';
import { TimetableController } from './timetable.controller';
import { TimetableConstraintService } from './timetable-constraint.service';
import { TimetableSchemaService } from './timetable-schema.service';
import { TimetableService } from './timetable.service';
import { TimetableWorkflowRepository } from './repositories/timetable-workflow.repository';
import { TimetableRepository } from './repositories/timetable.repository';

test('Timetable providers expose concrete Nest dependency metadata', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', TimetableSchemaService), [PrismaService]);
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', TimetableService), [
    RequestContextService,
    TimetableRepository,
    TimetableWorkflowRepository,
    TimetableConstraintService,
    EventPublisherService,
    NotificationsService,
  ]);
});

test('TimetableSchemaService creates tenant-scoped timetable tables with forced RLS', async () => {
  let schemaSql = '';
  const service = new TimetableSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS timetable_slots/);
  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS timetable_versions/);
  assert.match(schemaSql, /'timetable_slots'/);
  assert.match(schemaSql, /'timetable_versions'/);
  assert.match(schemaSql, /ALTER TABLE %I FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY %I ON %I FOR ALL USING/);
  assert.match(schemaSql, /current_setting\(''app\.tenant_id'', true\)/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX uq_timetable_versions_active_status/);
  assert.match(schemaSql, /ALTER TABLE timetable_audit_logs ALTER COLUMN version_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER TABLE timetable_audit_logs ALTER COLUMN slot_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER TABLE timetable_audit_logs ALTER COLUMN actor_user_id DROP NOT NULL/);
  assert.match(schemaSql, /ALTER TABLE timetable_audit_logs ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
});

test('Timetable configuration round-trips period times in the DTO HH:mm format', async () => {
  const queries: string[] = [];
  const repository = new TimetableWorkflowRepository({
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes('FROM timetable_configurations')) {
        return {
          rows: [{ id: 'configuration-1', academic_year: '2026', term_name: 'Term 2', row_version: 1 }],
          rowCount: 1,
        };
      }
      if (sql.includes('FROM timetable_days')) {
        return {
          rows: [{ id: 'day-1', day_of_week: 1, name: 'Monday', is_teaching_day: true, order_index: 0 }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    },
  } as never);

  await repository.getConfiguration('tenant-a', '2026', 'Term 2');

  const periodQuery = queries.find((sql) => sql.includes('FROM timetable_period_definitions')) ?? '';
  assert.match(periodQuery, /to_char\(starts_at, 'HH24:MI'\) AS starts_at/);
  assert.match(periodQuery, /to_char\(ends_at, 'HH24:MI'\) AS ends_at/);
});

test('TimetableService blocks canonical constraint conflicts before saving a slot', async () => {
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
      getOrCreateDraftVersion: async () => ({ id: 'version-1', status: 'draft' }),
    } as never,
    {
      getVersion: async () => ({ id: 'version-1', status: 'draft', row_version: 1 }),
      createSlotAtomic: async () => {
        throw new Error('conflicting slots must not be saved');
      },
    } as never,
    {
      getSnapshot: async () => ({
        configuration: {
          days: [{
            day_of_week: 1,
            periods: [{ id: 'period-1', order_index: 0, starts_at: '08:00', ends_at: '08:40', is_teaching: true }],
          }],
        },
        slots: [],
      }),
      validatePlacement: () => [
        { code: 'TEACHER_CLASH', message: 'The teacher already has another lesson at this time.' },
        { code: 'CLASS_CLASH', message: 'The class already has another lesson at this time.' },
        { code: 'RESOURCE_CLASH', message: 'The resource is already in use at this time.' },
      ],
    } as never,
  );

  await assert.rejects(
    () =>
      service.createSlot({
        academic_year: '2026',
        term_name: 'Term 2',
        class_section_id: 'class-1',
        subject_id: 'subject-1',
        teacher_id: 'teacher-1',
        room_id: 'room-1',
        period_id: 'period-1',
        day_of_week: 1,
        starts_at: '08:00',
        ends_at: '08:40',
      }),
    /teacher already has another lesson/,
  );
});

test('TimetableService publishes immutable versions only after conflict checks pass', async () => {
  const calls: string[] = [];
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
      getPlannerVersion: async () => ({ id: 'version-1', status: 'draft', row_version: 1 }),
    } as never,
    {
      getVersion: async () => ({ id: 'version-1', status: 'draft', row_version: 1 }),
      countOpenUnscheduled: async () => 0,
      publishVersionAtomic: async (input: Record<string, unknown>) => {
        calls.push('publish');
        return {
          id: 'version-1',
          tenant_id: input.tenant_id,
          status: 'published',
          immutable: true,
        };
      },
    } as never,
    {
      getSnapshot: async () => ({
        configuration: {
          days: [{
            day_of_week: 1,
            periods: [{ id: 'period-1', order_index: 0, starts_at: '08:00', ends_at: '08:40', is_teaching: true }],
          }],
        },
        slots: [],
      }),
      validateVersion: () => ({ valid: true, hard_conflicts: [], warnings: [], summary: { slots: 4 } }),
    } as never,
  );

  const version = await service.publishVersion({
    academic_year: '2026',
    term_name: 'Term 2',
    notes: 'Ready for release',
  });

  assert.equal(version.immutable, true);
  assert.deepEqual(calls, ['publish']);
});

test('TimetableService validates setup and emits an event after creating a draft slot', async () => {
  const calls: string[] = [];
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }),
    } as never,
    {
      getOrCreateDraftVersion: async () => ({ id: 'version-1', status: 'draft' }),
    } as never,
    {
      getVersion: async () => ({ id: 'version-1', status: 'draft', row_version: 1 }),
      createSlotAtomic: async (input: Record<string, unknown>) => {
        calls.push(`create:${input.tenant_id}:${input.version_id}`);
        return { id: 'slot-1', ...input };
      },
    } as never,
    {
      getSnapshot: async () => ({
        configuration: {
          days: [{
            day_of_week: 1,
            periods: [{ id: 'period-1', order_index: 0, starts_at: '08:00', ends_at: '08:40', is_teaching: true }],
          }],
        },
        slots: [],
      }),
      validatePlacement: () => [],
    } as never,
    {
      publish: async (input: Record<string, unknown>) => {
        calls.push(`event:${input.event_name}`);
      },
    } as never,
  );

  const slot = await service.createSlot({
    academic_year: '2026',
    term_name: 'Term 2',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    teacher_id: 'teacher-1',
    period_id: 'period-1',
    day_of_week: 1,
    starts_at: '08:00',
    ends_at: '08:40',
  });

  assert.equal(slot.id, 'slot-1');
  assert.deepEqual(calls, [
    'create:tenant-a:version-1',
    'event:timetable.slot.created',
  ]);
});

test('TimetableService only updates and cancels slots in a tenant draft', async () => {
  const calls: string[] = [];
  const workflowRepository = {
    getSlotForEdit: async () => ({
      id: 'slot-1',
      version_id: 'version-1',
      version_status: 'draft',
      version_row_version: 3,
      row_version: 2,
      academic_year: '2026',
      term_name: 'Term 2',
    }),
    updateSlotAtomic: async (input: Record<string, unknown>) => {
      calls.push(`update:${input.slot_id}`);
      return { id: input.slot_id, ...input };
    },
    cancelSlotAtomic: async (input: Record<string, unknown>) => {
      calls.push(`cancel:${input.tenant_id}:${input.slot_id}`);
      return { id: input.slot_id, academic_year: '2026', term_name: 'Term 2' };
    },
  };
  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }) } as never,
    {} as never,
    workflowRepository as never,
    {
      getSnapshot: async () => ({
        configuration: {
          days: [{
            day_of_week: 2,
            periods: [{ id: 'period-1', order_index: 0, starts_at: '09:00', ends_at: '09:40', is_teaching: true }],
          }],
        },
        slots: [],
      }),
      validatePlacement: () => [],
    } as never,
  );
  const dto = {
    academic_year: '2026',
    term_name: 'Term 2',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    teacher_id: 'teacher-1',
    period_id: 'period-1',
    day_of_week: 2,
    starts_at: '09:00',
    ends_at: '09:40',
    expected_row_version: 2,
    expected_version_row_version: 3,
  };

  await service.updateSlot('slot-1', dto);
  await service.cancelSlot('slot-1', { expected_row_version: 1 });

  assert.deepEqual(calls, ['update:slot-1', 'cancel:tenant-a:slot-1']);
});

test('TimetableService creates an editable revision from the published tenant version', async () => {
  const calls: string[] = [];
  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }) } as never,
    {} as never,
    {
      createRevisionAtomic: async (input: Record<string, unknown>) => {
        calls.push(`revise:${input.tenant_id}`);
        return { id: 'version-2', status: 'draft', immutable: false };
      },
    } as never,
    {
      getSnapshot: async () => ({ slots: [] }),
    } as never,
  );

  const version = await service.createRevision({
    academic_year: '2026',
    term_name: 'Term 2',
    notes: 'Correct room allocation',
  });

  assert.equal(version.status, 'draft');
  assert.deepEqual(calls, ['revise:tenant-a']);
});

test('TimetableService returns the tenant planner with real draft metrics', async () => {
  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }) } as never,
    {
      getPlannerVersion: async (input: Record<string, unknown>) => ({
        id: 'version-1',
        tenant_id: input.tenant_id,
        status: 'draft',
      }),
      listVersionSlots: async () => [
        { id: 'slot-1', class_section_id: 'class-1', teacher_id: 'teacher-1' },
        { id: 'slot-2', class_section_id: 'class-2', teacher_id: 'teacher-1' },
      ],
    } as never,
  );

  const planner = await service.getPlanner({ academic_year: '2026', term_name: 'Term 2' });

  assert.equal(planner.version?.tenant_id, 'tenant-a');
  assert.deepEqual(planner.metrics, {
    total_slots: 2,
    unique_classes: 2,
    unique_teachers: 1,
    draft: true,
    published: false,
  });
});

test('TimetableService preserves the principal approval dashboard across active terms', async () => {
  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'principal-1' }) } as never,
    {
      listActiveVersions: async (tenantId: string) => [
        {
          id: 'version-1',
          academic_year: '2026',
          term_name: 'Term 2',
          status: 'draft',
          immutable: false,
          slot_count: 42,
          conflict_count: 2,
          tenant_id: tenantId,
        },
        {
          id: 'version-2',
          academic_year: '2026',
          term_name: 'Term 1',
          status: 'published',
          immutable: true,
          slot_count: 40,
          conflict_count: 0,
          tenant_id: tenantId,
        },
      ],
    } as never,
  );

  const dashboard = await service.getTimetableDashboard() as any;

  assert.equal(dashboard.metrics.active_versions, 2);
  assert.equal(dashboard.metrics.conflict_count, 2);
  assert.equal(dashboard.published_candidates[0]?.id, 'version-1');
  assert.equal(dashboard.conflicts[0]?.id, 'version-1');
  assert.equal(dashboard.timetables[1]?.owner_name, 'Deputy Principal / Timetable Manager');
});

test('TimetableController protects raw published schedules as a management endpoint', () => {
  const handler = TimetableController.prototype.listPublishedSchedules as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'published');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['timetable:write']);
});

test('TimetableController exposes governed planner mutations', () => {
  const updateHandler = TimetableController.prototype.updateSlot as unknown as Function;
  const cancelHandler = TimetableController.prototype.cancelSlot as unknown as Function;
  const reviseHandler = TimetableController.prototype.createRevision as unknown as Function;
  const plannerHandler = TimetableController.prototype.getPlanner as unknown as Function;

  assert.equal(Reflect.getMetadata(PATH_METADATA, updateHandler), 'slots/:slotId');
  assert.equal(Reflect.getMetadata(PATH_METADATA, cancelHandler), 'slots/:slotId');
  assert.equal(Reflect.getMetadata(PATH_METADATA, reviseHandler), 'versions/revise');
  assert.equal(Reflect.getMetadata(PATH_METADATA, plannerHandler), 'planner');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, updateHandler), ['timetable:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, cancelHandler), ['timetable:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, reviseHandler), ['timetable:write']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, plannerHandler), ['timetable:write']);
});

test('TimetableController keeps management, personal, export, and portal reads on explicit RBAC boundaries', () => {
  const expectedPermissions: Array<[keyof TimetableController, string]> = [
    ['getReadiness', 'timetable:write'],
    ['getConfiguration', 'timetable:write'],
    ['getRequirements', 'timetable:write'],
    ['getAvailability', 'timetable:write'],
    ['listResources', 'timetable:write'],
    ['listUnscheduled', 'timetable:write'],
    ['getHistory', 'timetable:write'],
    ['getReliefAffected', 'timetable:write'],
    ['getReliefCandidates', 'timetable:write'],
    ['getPlanner', 'timetable:write'],
    ['listPublishedSchedules', 'timetable:write'],
    ['getTimetableDashboard', 'timetable:write'],
    ['getView', 'timetable:read'],
    ['exportCsv', 'timetable:read'],
    ['getMySchedule', 'timetable:read'],
    ['getPortal', 'auth:read'],
  ];

  for (const [methodName, permission] of expectedPermissions) {
    const handler = TimetableController.prototype[methodName] as unknown as Function;
    assert.equal(typeof handler, 'function', `${String(methodName)} must remain wired`);
    assert.deepEqual(
      Reflect.getMetadata(PERMISSIONS_KEY, handler),
      [permission],
      `${String(methodName)} must require ${permission}`,
    );
  }
});

test('Timetable DTO compatibility aliases remain nested, coercing, and strictly validated', async () => {
  const configuration = plainToInstance(ConfigureTimetableDto, {
    academic_year: '2026',
    term_name: 'Term 2',
    teaching_days: [{
      day_of_week: '1',
      name: 'Monday',
      periods: [{
        period_id: 'period-1',
        name: 'Lesson 1',
        starts_at: '08:00',
        ends_at: '08:40',
        is_teaching: true,
      }],
    }],
    expected_row_version: '2',
  });
  const requirements = plainToInstance(BulkUpsertRequirementsDto, {
    academic_year: '2026',
    term_name: 'Term 2',
    requirements: [{
      id: 'requirement-1',
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      weekly_periods: '6',
      consecutive_periods: '2',
    }],
  });
  const availability = plainToInstance(BulkSetTeacherAvailabilityDto, {
    academic_year: '2026',
    term_name: 'Term 2',
    availability: [{
      id: 'availability-1',
      teacher_id: 'teacher-1',
      day_of_week: '1',
      period_id: 'period-1',
      state: 'PROTECTED_ADMIN',
    }],
  });
  const candidates = plainToInstance(ReliefCandidatesQueryDto, {
    slot_id: 'slot-1',
    date: '2026-08-10',
    include_prefer_free: 'false',
    limit: '25',
  });
  const assignment = plainToInstance(AssignReliefDto, {
    slot_id: 'slot-1',
    relief_teacher_id: 'teacher-2',
    relief_date: '2026-08-10',
    expected_version_row_version: '3',
  });
  const cancellation = plainToInstance(CancelReliefDto, {
    cancellation_reason: 'Teacher returned',
    expected_row_version: '2',
  });
  const portal = plainToInstance(PortalTimetableQueryDto, {
    child_id: 'student-2',
    date: '2026-08-10',
    day_of_week: '1',
  });
  const generation = plainToInstance(GenerateTimetableDto, {
    academic_year: '2026',
    term_name: 'Term 2',
    expected_row_version: '4',
    allow_partial: false,
  });

  const instances = [
    configuration,
    requirements,
    availability,
    candidates,
    assignment,
    cancellation,
    portal,
    generation,
  ];
  for (const instance of instances) {
    assert.deepEqual(await validate(instance), []);
  }

  assert.equal(configuration.teaching_days?.[0]?.day_of_week, 1);
  assert.equal(configuration.expected_row_version, 2);
  assert.equal(requirements.requirements[0]?.weekly_periods, 6);
  assert.equal(availability.availability?.[0]?.day_of_week, 1);
  assert.equal(candidates.include_prefer_free, false);
  assert.equal(candidates.limit, 25);
  assert.equal(assignment.expected_version_row_version, 3);
  assert.equal(cancellation.expected_row_version, 2);
  assert.equal(portal.day_of_week, 1);
  assert.equal(generation.expected_row_version, 4);

  const invalidRequirements = plainToInstance(BulkUpsertRequirementsDto, {
    academic_year: '2026',
    term_name: 'Term 2',
    requirements: [{
      class_section_id: 'class-1',
      subject_id: 'subject-1',
      weekly_periods: '41',
    }],
  });
  const invalidCandidates = plainToInstance(ReliefCandidatesQueryDto, {
    slot_id: 'slot-1',
    date: '2026-08-10',
    include_prefer_free: 'sometimes',
  });
  const invalidConfiguration = plainToInstance(ConfigureTimetableDto, {
    academic_year: '2026',
    term_name: 'Term 2',
    teaching_days: [{
      day_of_week: 1,
      periods: [{
        name: 'Lesson 1',
        starts_at: '8am',
        ends_at: '08:40',
        is_teaching: true,
      }],
    }],
  });

  assert.notEqual((await validate(invalidRequirements)).length, 0);
  assert.notEqual((await validate(invalidCandidates)).length, 0);
  assert.notEqual((await validate(invalidConfiguration)).length, 0);
});

test('Timetable portal parent scope returns all active children, defaults safely, and rejects unlinked children', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const children = [
    {
      student_id: 'student-1',
      student_name: 'Amina Otieno',
      admission_number: 'ADM-001',
      class_section_id: 'class-1',
      class_name: 'Grade 7',
      stream_id: 'stream-a',
      stream_name: 'East',
    },
    {
      student_id: 'student-2',
      student_name: 'Baraka Otieno',
      admission_number: 'ADM-002',
      class_section_id: 'class-2',
      class_name: 'Grade 5',
      stream_id: null,
      stream_name: null,
    },
  ];
  const repository = new TimetableWorkflowRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: sql.includes('FROM student_guardians') ? children : [], rowCount: children.length };
    },
  } as never);

  const defaultScope = await repository.resolvePortalScope({
    tenant_id: 'tenant-a',
    user_id: 'parent-1',
    role: 'Parent',
  });
  const selectedScope = await repository.resolvePortalScope({
    tenant_id: 'tenant-a',
    user_id: 'parent-1',
    role: 'parent',
    requested_student_id: 'student-2',
  });

  assert.equal(defaultScope.active_student?.student_id, 'student-1');
  assert.equal(defaultScope.students.length, 2);
  assert.deepEqual(defaultScope.scope, {
    kind: 'class',
    student_id: 'student-1',
    class_section_id: 'class-1',
    stream_id: 'stream-a',
  });
  assert.equal(selectedScope.active_student?.student_id, 'student-2');
  assert.deepEqual(queries[0]?.params, ['tenant-a', 'parent-1']);
  assert.match(queries[0]?.sql ?? '', /guardian\.tenant_id = \$1/);
  assert.match(queries[0]?.sql ?? '', /assignment\.status = 'active'/);

  await assert.rejects(
    () => repository.resolvePortalScope({
      tenant_id: 'tenant-a',
      user_id: 'parent-1',
      role: 'parent',
      requested_student_id: 'student-outside-tenant',
    }),
    /not actively linked to this parent account/,
  );
});

test('Timetable relief assignment requires active teaching allocation and maps the unique race to conflict', async () => {
  const statements: string[] = [];
  const transaction = {
    $queryRawUnsafe: async (sql: string) => {
      statements.push(sql);
      if (sql.includes('FROM timetable_slots slot')) {
        return [{
          id: 'slot-1',
          version_id: 'version-1',
          version_status: 'published',
          status: 'published',
          teacher_id: 'teacher-1',
          academic_year: '2026',
          term_name: 'Term 2',
          day_of_week: 1,
          starts_at: '08:00',
          ends_at: '08:40',
          period_id: 'period-1',
        }];
      }
      if (sql.includes('pg_advisory_xact_lock')) return [{ locked: true }];
      if (sql.includes('FROM staff_profiles staff')) {
        return [{ user_id: 'teacher-2', teacher_name: 'Jane Wanjiku' }];
      }
      if (sql.includes('AS permanent_clash')) {
        return [{ permanent_clash: false, relief_clash: false, unavailable: false }];
      }
      if (sql.includes('INSERT INTO timetable_relief_assignments')) {
        throw Object.assign(new Error('duplicate relief assignment'), { code: '23505' });
      }
      return [];
    },
    $executeRawUnsafe: async () => 1,
  };
  const repository = new TimetableWorkflowRepository({
    executeWithTenant: async (_tenantId: string, _actorUserId: string, callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  await assert.rejects(
    () => repository.assignRelief({
      tenant_id: 'tenant-a',
      slot_id: 'slot-1',
      relief_date: '2026-08-10',
      absent_teacher_id: 'teacher-1',
      substitute_teacher_id: 'teacher-2',
      actor_user_id: 'deputy-1',
    }),
    (error: unknown) => error instanceof ConflictException
      && /already been assigned/.test(error.message),
  );

  const substituteQuery = statements.find((sql) => sql.includes('FROM staff_profiles staff')) ?? '';
  assert.match(substituteQuery, /FROM teacher_subject_assignments teaching_assignment/);
  assert.match(substituteQuery, /teaching_assignment\.status = 'active'/);
  assert.match(substituteQuery, /teaching_year\.name = \$3/);
  assert.match(substituteQuery, /teaching_term\.name = \$4/);
  assert.equal(statements.some((sql) => sql.includes('pg_advisory_xact_lock')), true);
});

test('Timetable slot mutations and generation persistence retain atomic transaction invariants', () => {
  const source = readFileSync(
    join(process.cwd(), 'apps/api/src/modules/timetable/repositories/timetable-workflow.repository.ts'),
    'utf8',
  );
  const methodSource = (start: string, end: string) => {
    const startIndex = source.indexOf(start);
    const endIndex = source.indexOf(end, startIndex + start.length);
    assert.notEqual(startIndex, -1, `${start} must exist`);
    assert.notEqual(endIndex, -1, `${end} must follow ${start}`);
    return source.slice(startIndex, endIndex);
  };
  const createSource = methodSource('async createSlotAtomic', 'async updateSlotAtomic');
  const updateSource = methodSource('async updateSlotAtomic', 'async cancelSlotAtomic');
  const cancelSource = methodSource('async cancelSlotAtomic', 'async getSlotForEdit');
  const generationSource = methodSource('async saveGenerationResult', 'async listUnscheduled');

  for (const [name, atomicSource] of [
    ['create', createSource],
    ['update', updateSource],
    ['cancel', cancelSource],
  ] as const) {
    assert.match(atomicSource, /executeWithTenant/, `${name} must use the tenant transaction`);
    assert.match(atomicSource, /acquireTimetableVersionLock/, `${name} must take the version advisory lock`);
    assert.match(atomicSource, /FOR UPDATE/, `${name} must lock canonical rows`);
    assert.match(atomicSource, /row_version/, `${name} must enforce optimistic concurrency`);
    assert.match(atomicSource, /timetable_audit_logs/, `${name} must audit inside the transaction`);
  }
  assert.match(createSource, /'timetable\.slot\.created'/);
  assert.match(updateSource, /'timetable\.slot\.updated'/);
  assert.match(cancelSource, /'timetable\.slot\.cancelled'/);
  assert.match(cancelSource, /reason: input\.reason/);
  assert.match(generationSource, /jsonb_to_recordset\(\$4::jsonb\)/);
  assert.doesNotMatch(generationSource, /for \(const placement of input\.placements\)/);
});

test('Timetable relief realtime events target the assigned teacher without broadcasting to unrelated teachers', () => {
  const service = new DashboardRealtimeService({} as never, {} as never, {} as never);
  const event: DomainEvent<'timetable.relief.assigned'> = {
    id: 'event-relief-1',
    tenant_id: 'tenant-a',
    event_key: 'timetable.relief.assigned:slot-1:2026-08-10',
    event_name: 'timetable.relief.assigned',
    aggregate_type: 'timetable_relief',
    aggregate_id: 'relief-1',
    payload: {
      tenant_id: 'tenant-a',
      entity_id: 'relief-1',
      action: 'relief_assigned',
      occurred_at: '2026-08-09T08:00:00.000Z',
      version_id: 'version-1',
      timetable_slot_id: 'slot-1',
      original_teacher_id: 'teacher-1',
      relief_teacher_id: 'teacher-2',
      relief_date: '2026-08-10',
    },
    headers: {},
    status: 'published',
    attempt_count: 1,
    available_at: '2026-08-09T08:00:00.000Z',
    published_at: '2026-08-09T08:00:01.000Z',
    last_error: null,
    created_at: '2026-08-09T08:00:00.000Z',
    updated_at: '2026-08-09T08:00:01.000Z',
  };

  const assignedTeacherEvent = service.toDashboardEvent(event, {
    enabledModules: ['timetable'],
    permissions: ['timetable:read'],
    role: 'teacher',
    userId: 'teacher-2',
  });
  const unrelatedTeacherEvent = service.toDashboardEvent(event, {
    enabledModules: ['timetable'],
    permissions: ['timetable:read'],
    role: 'teacher',
    userId: 'teacher-3',
  });

  assert.equal(assignedTeacherEvent?.sourceModule, 'timetable');
  assert.equal(assignedTeacherEvent?.type, 'SCHOOL_DATA_CHANGED');
  assert.equal(assignedTeacherEvent?.channels.includes('user:teacher-2'), true);
  assert.match(assignedTeacherEvent?.notification.body ?? '', /2026-08-10/);
  assert.equal(unrelatedTeacherEvent, null);
});

test('TimetableConstraintService generates the maximum valid timetable and reports the remainder', () => {
  const constraint = new TimetableConstraintService({} as never);
  const configuration = {
    days: [{
      day_of_week: 1,
      order_index: 0,
      is_teaching_day: true,
      periods: [{
        id: 'period-1',
        name: 'Period 1',
        order_index: 0,
        starts_at: '08:00',
        ends_at: '08:40',
        is_teaching: true,
      }],
    }],
    common_blocks: [],
  };
  const requirements = [
    {
      id: 'requirement-1', status: 'active', class_section_id: 'class-1', stream_id: 'stream-1',
      subject_id: 'subject-1', teacher_id: 'teacher-1', periods_per_week: 1, duration_periods: 1,
    },
    {
      id: 'requirement-2', status: 'active', class_section_id: 'class-1', stream_id: 'stream-1',
      subject_id: 'subject-2', teacher_id: 'teacher-1', periods_per_week: 1, duration_periods: 1,
    },
  ];
  const assignments = requirements.map((requirement) => ({
    class_section_id: requirement.class_section_id,
    stream_id: requirement.stream_id,
    subject_id: requirement.subject_id,
    teacher_id: requirement.teacher_id,
  }));

  const generated = constraint.generate({
    configuration,
    requirements,
    assignments,
    availability: [],
    resources: [],
    slots: [],
  });

  assert.equal(generated.placements.length, 1);
  assert.equal(generated.gaps.length, 1);
  assert.equal(generated.gaps[0]?.reason_code, 'NO_VALID_SLOT');
  assert.equal(generated.warnings[0]?.code, 'PARTIAL_GENERATION');

  const locked = constraint.generate({
    configuration,
    requirements: [requirements[0]],
    assignments,
    availability: [],
    resources: [],
    slots: [{
      id: 'locked-slot', class_section_id: 'class-2', subject_id: 'subject-3', teacher_id: 'teacher-1',
      day_of_week: 1, period_id: 'period-1', starts_at: '08:00', ends_at: '08:40',
      duration_periods: 1, locked: true,
    }],
  });
  assert.equal(locked.placements.length, 0);
  assert.equal(locked.gaps.length, 1, 'locked lessons must remain hard scheduling constraints');
});

test('TimetableConstraintService centralizes clashes, availability, locks, and requirement coverage', () => {
  const constraint = new TimetableConstraintService({} as never);
  const configuration = {
    days: [{
      day_of_week: 1,
      order_index: 0,
      is_teaching_day: true,
      periods: [
        { id: 'period-1', name: 'Period 1', order_index: 0, starts_at: '08:00', ends_at: '08:40', is_teaching: true },
        { id: 'period-2', name: 'Period 2', order_index: 1, starts_at: '08:40', ends_at: '09:20', is_teaching: true },
      ],
    }],
    common_blocks: [],
  };
  const assignment = {
    class_section_id: 'class-1', stream_id: 'stream-1', subject_id: 'subject-1', teacher_id: 'teacher-1',
  };
  const existing = {
    id: 'slot-1', requirement_id: 'requirement-1', ...assignment, resource_id: 'lab-1',
    day_of_week: 1, period_id: 'period-1', starts_at: '08:00', ends_at: '08:40',
    duration_periods: 1, locked: true,
  };
  const snapshot = {
    configuration,
    assignments: [assignment],
    availability: [{ teacher_id: 'teacher-1', day_of_week: 1, period_id: 'period-1', state: 'unavailable' }],
    resources: [{ id: 'lab-1', status: 'active', is_exclusive: true }],
    requirements: [{ id: 'requirement-1', status: 'active', ...assignment, periods_per_week: 3 }],
    slots: [existing],
  };
  const conflicts = constraint.validatePlacement(snapshot, {
    ...assignment,
    resource_id: 'lab-1',
    day_of_week: 1,
    period_id: 'period-1',
    starts_at: '08:00',
    ends_at: '08:40',
    duration_periods: 1,
  });
  const codes = new Set(conflicts.map((conflict) => conflict.code));

  for (const code of [
    'TEACHER_UNAVAILABLE', 'TEACHER_CLASH', 'CLASS_CLASH', 'STREAM_CLASH',
    'RESOURCE_CLASH', 'LOCKED_LESSON_CONFLICT',
  ]) {
    assert.equal(codes.has(code), true, `${code} should be enforced by the shared conflict engine`);
  }

  const versionValidation = constraint.validateVersion(snapshot, 0);
  assert.equal(versionValidation.valid, false);
  assert.equal(versionValidation.summary.required_lessons, 3);
  assert.equal(versionValidation.summary.scheduled_required_lessons, 1);
  assert.equal(versionValidation.summary.unscheduled, 2);
  assert.equal(versionValidation.warnings[0]?.code, 'UNSCHEDULED_LESSONS');
});

test('read-only timetable roles cannot opt into a draft or request a draft version', async () => {
  const service = new TimetableService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'Teacher', permissions: ['timetable:read'],
      }),
    } as never,
    {} as never,
    {
      getVersion: async () => ({
        id: 'draft-1', academic_year: '2026', term_name: 'Term 2', status: 'draft',
      }),
    } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.getView({ academic_year: '2026', term_name: 'Term 2', include_draft: true }),
    /management permission/,
  );
  await assert.rejects(
    () => service.getView({ academic_year: '2026', term_name: 'Term 2', version_id: 'draft-1' }),
    /current published timetable/,
  );
});

test('Timetable view references reject inactive, wrong-year, and cross-tenant classes while explicit history remains readable', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new TimetableWorkflowRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      const [tenantId, classSectionId, streamId, , , , academicYear, historical] = params;
      const classExists = tenantId === 'tenant-a'
        && (classSectionId === 'class-active' || classSectionId === 'class-archived');
      const streamExists = tenantId === 'tenant-a'
        && (streamId == null || streamId === 'stream-active' || streamId === 'stream-archived');
      const activeScope = academicYear === '2026'
        && classSectionId === 'class-active'
        && (streamId == null || streamId === 'stream-active');
      return {
        rows: [{
          class_ok: classSectionId == null || (classExists && (historical === true || activeScope)),
          stream_ok: streamId == null || (streamExists && (historical === true || activeScope)),
          teacher_ok: true,
          resource_ok: true,
          department_ok: true,
        }],
        rowCount: 1,
      };
    },
  } as never);

  await repository.validateViewReference('tenant-a', {
    academic_year: '2026',
    class_section_id: 'class-active',
    stream_id: 'stream-active',
  });
  await assert.rejects(
    () => repository.validateViewReference('tenant-a', {
      academic_year: '2025',
      class_section_id: 'class-active',
      stream_id: 'stream-active',
    }),
    /inactive, belongs to another academic year, or is outside this school/,
  );
  await assert.rejects(
    () => repository.validateViewReference('tenant-a', {
      academic_year: '2026',
      class_section_id: 'class-archived',
      stream_id: 'stream-archived',
    }),
    /inactive, belongs to another academic year, or is outside this school/,
  );
  await assert.rejects(
    () => repository.validateViewReference('tenant-b', {
      academic_year: '2026',
      class_section_id: 'class-active',
    }),
    /outside this school/,
  );
  await repository.validateViewReference('tenant-a', {
    academic_year: '2025',
    class_section_id: 'class-archived',
    stream_id: 'stream-archived',
  }, true);

  const contractSql = queries[0]?.sql ?? '';
  assert.match(contractSql, /section\.academic_year_id/);
  assert.match(contractSql, /year\.name = \$7/);
  assert.match(contractSql, /section\.status, 'active'/);
  assert.match(contractSql, /stream\.status, 'active'/);
  assert.match(contractSql, /archived_at IS NULL/);
  assert.equal(queries.at(-1)?.params[7], true);
});

test('Timetable slot reference validation binds active class and stream to tenant and academic year', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new TimetableRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      const [tenantId, academicYear, termName, classSectionId, , , streamId] = params;
      const valid = tenantId === 'tenant-a'
        && academicYear === '2026'
        && termName === 'Term 2'
        && classSectionId === 'class-active'
        && (streamId == null || streamId === 'stream-active');
      return {
        rows: [{
          academic_year: valid,
          term: valid,
          class_section: valid,
          stream: valid,
          subject: valid,
          teacher: valid,
          teacher_assignment: valid,
        }],
        rowCount: 1,
      };
    },
  } as never);
  const baseSlot = {
    academic_year: '2026',
    term_name: 'Term 2',
    class_section_id: 'class-active',
    stream_id: 'stream-active',
    subject_id: 'subject-1',
    teacher_id: 'teacher-1',
    day_of_week: 1,
    starts_at: '08:00',
    ends_at: '08:40',
  };

  const active = await repository.validateSlotReferences('tenant-a', baseSlot);
  const wrongYear = await repository.validateSlotReferences('tenant-a', {
    ...baseSlot,
    academic_year: '2025',
  });
  const inactive = await repository.validateSlotReferences('tenant-a', {
    ...baseSlot,
    class_section_id: 'class-archived',
    stream_id: 'stream-archived',
  });
  const otherTenant = await repository.validateSlotReferences('tenant-b', baseSlot);

  assert.equal(active.class_section, true);
  assert.equal(active.stream, true);
  assert.equal(wrongYear.class_section, false);
  assert.equal(inactive.class_section, false);
  assert.equal(inactive.stream, false);
  assert.equal(otherTenant.class_section, false);
  const contractSql = queries[0]?.sql ?? '';
  assert.match(contractSql, /section\.tenant_id = \$1/);
  assert.match(contractSql, /year\.name = \$2/);
  assert.match(contractSql, /stream\.class_section_id::text = \$4/);
  assert.match(contractSql, /COALESCE\(stream\.is_active, TRUE\) = TRUE/);
  assert.match(contractSql, /stream\.archived_at IS NULL/);

  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    { validateSlotReferences: async () => inactive } as never,
    {} as never,
    {} as never,
  );
  await assert.rejects(
    () => (service as any).validateSlotReferences('tenant-a', baseSlot),
    /Invalid timetable setup: academic year, term, class, stream/,
  );
});

test('copy-previous remaps target periods and never reuses stale source period identifiers', () => {
  const source = readFileSync(
    join(process.cwd(), 'apps/api/src/modules/timetable/repositories/timetable-workflow.repository.ts'),
    'utf8',
  );
  const copyStart = source.indexOf('async copyVersionAtomic');
  const copyEnd = source.indexOf('async applyMovesAtomic', copyStart);
  const copyContract = source.slice(copyStart, copyEnd);

  assert.match(copyContract, /FROM timetable_period_definitions period/);
  assert.match(copyContract, /COPIED_PERIOD_STRUCTURE_CHANGED/);
  assert.match(copyContract, /valid\.target_requirement_id \?\? null/);
  assert.match(copyContract, /String\(targetPeriod\.id\)/);
  assert.doesNotMatch(copyContract, /slot\.period_id\?\.toString\(\) \?\? null/);
});

test('TimetableService lists published schedules for the current tenant', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
      listPublishedSchedules: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [
          {
            version_id: 'version-1',
            class_section_id: 'class-1',
            day_of_week: 1,
            starts_at: '08:00',
            ends_at: '08:40',
          },
        ];
      },
    } as never,
  );

  const rows = await (service as unknown as {
    listPublishedSchedules: (query: Record<string, string | undefined>) => Promise<Array<Record<string, unknown>>>;
  }).listPublishedSchedules({
    academic_year: ' 2026 ',
    term_name: 'Term 2',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    academic_year: '2026',
    term_name: 'Term 2',
    limit: 50,
    offset: 0,
  });
  assert.equal(rows[0]?.version_id, 'version-1');
});

test('TimetableRepository bounds published schedule reads with pagination', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new TimetableRepository({
        executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return { rows: [] };
    },
  } as never);

  await repository.listPublishedSchedules({
    tenant_id: 'tenant-a',
    academic_year: '2026',
    term_name: 'Term 2',
    limit: 999,
    offset: 15,
  } as never);

  const schedulesQuery = queries[0]?.text ?? '';
  assert.match(schedulesQuery, /WHERE version\.tenant_id = \$1/);
  assert.doesNotMatch(schedulesQuery, /LIMIT 500/);
  assert.match(schedulesQuery, /LIMIT \$4::integer/);
  assert.match(schedulesQuery, /OFFSET \$5::integer/);
  assert.deepEqual(queries[0]?.values, ['tenant-a', '2026', 'Term 2', 100, 15]);
});

test('TimetableService normalizes published schedule pagination', async () => {
  let capturedInput: Record<string, unknown> | null = null;
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
      listPublishedSchedules: async (input: Record<string, unknown>) => {
        capturedInput = input;
        return [];
      },
    } as never,
  );

  await service.listPublishedSchedules({
    academic_year: ' 2026 ',
    term_name: ' Term 2 ',
    limit: '999',
    offset: '-3',
  });

  assert.deepEqual(capturedInput, {
    tenant_id: 'tenant-a',
    academic_year: '2026',
    term_name: 'Term 2',
    limit: 100,
    offset: 0,
  });
});
