import assert from 'node:assert/strict';
import test from 'node:test';

import { PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { EventPublisherService } from '../events/event-publisher.service';
import { TimetableController } from './timetable.controller';
import { TimetableSchemaService } from './timetable-schema.service';
import { TimetableService } from './timetable.service';
import { TimetableRepository } from './repositories/timetable.repository';

test('Timetable providers expose concrete Nest dependency metadata', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', TimetableSchemaService), [PrismaService]);
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', TimetableService), [
    RequestContextService,
    TimetableRepository,
    EventPublisherService,
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
  assert.match(schemaSql, /ALTER TABLE timetable_slots FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /ALTER TABLE timetable_versions FORCE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE UNIQUE INDEX uq_timetable_versions_active_status/);
});

test('TimetableService blocks teacher, class, and room conflicts before saving a slot', async () => {
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
      validateSlotReferences: async () => ({
        academic_year: true,
        term: true,
        class_section: true,
        subject: true,
        teacher: true,
        teacher_assignment: true,
      }),
      getOrCreateDraftVersion: async () => ({ id: 'version-1', status: 'draft' }),
      findSlotConflicts: async () => [
        { type: 'teacher', slot_id: 'slot-teacher' },
        { type: 'class', slot_id: 'slot-class' },
        { type: 'room', slot_id: 'slot-room' },
      ],
      createSlot: async () => {
        throw new Error('conflicting slots must not be saved');
      },
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
        day_of_week: 1,
        starts_at: '08:00',
        ends_at: '08:40',
      }),
    /teacher, class, room conflict/,
  );
});

test('TimetableService publishes immutable versions only after conflict checks pass', async () => {
  const calls: string[] = [];
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
      getPlannerVersion: async () => ({ id: 'version-1', status: 'draft' }),
      countVersionSlots: async () => 4,
      findVersionConflicts: async () => [],
      publishVersion: async (input: Record<string, unknown>) => {
        calls.push('publish');
        return {
          id: 'version-1',
          tenant_id: input.tenant_id,
          status: 'published',
          immutable: true,
        };
      },
      appendAuditLog: async () => {
        calls.push('audit');
      },
    } as never,
  );

  const version = await service.publishVersion({
    academic_year: '2026',
    term_name: 'Term 2',
    notes: 'Ready for release',
  });

  assert.equal(version.immutable, true);
  assert.deepEqual(calls, ['publish', 'audit']);
});

test('TimetableService validates setup and emits an event after creating a draft slot', async () => {
  const calls: string[] = [];
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }),
    } as never,
    {
      validateSlotReferences: async () => ({
        academic_year: true,
        term: true,
        class_section: true,
        subject: true,
        teacher: true,
        teacher_assignment: true,
      }),
      getOrCreateDraftVersion: async () => ({ id: 'version-1', status: 'draft' }),
      findSlotConflicts: async () => [],
      createSlot: async (input: Record<string, unknown>) => {
        calls.push(`create:${input.tenant_id}:${input.version_id}`);
        return { id: 'slot-1', ...input };
      },
      appendAuditLog: async () => calls.push('audit'),
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
    day_of_week: 1,
    starts_at: '08:00',
    ends_at: '08:40',
  });

  assert.equal(slot.id, 'slot-1');
  assert.deepEqual(calls, [
    'create:tenant-a:version-1',
    'audit',
    'event:timetable.slot.created',
  ]);
});

test('TimetableService only updates and cancels slots in a tenant draft', async () => {
  const calls: string[] = [];
  const repository = {
    validateSlotReferences: async () => ({
      academic_year: true,
      term: true,
      class_section: true,
      subject: true,
      teacher: true,
      teacher_assignment: true,
    }),
    getPlannerVersion: async () => ({ id: 'version-1', status: 'draft' }),
    findSlotConflicts: async () => [],
    updateSlot: async (input: Record<string, unknown>) => {
      calls.push(`update:${input.slot_id}`);
      return { id: input.slot_id, ...input };
    },
    cancelSlot: async (tenantId: string, slotId: string) => {
      calls.push(`cancel:${tenantId}:${slotId}`);
      return {
        id: slotId,
        academic_year: '2026',
        term_name: 'Term 2',
      };
    },
    appendAuditLog: async () => calls.push('audit'),
  };
  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }) } as never,
    repository as never,
  );
  const dto = {
    academic_year: '2026',
    term_name: 'Term 2',
    class_section_id: 'class-1',
    subject_id: 'subject-1',
    teacher_id: 'teacher-1',
    day_of_week: 2,
    starts_at: '09:00',
    ends_at: '09:40',
  };

  await service.updateSlot('slot-1', dto);
  await service.cancelSlot('slot-1');

  assert.deepEqual(calls, ['update:slot-1', 'audit', 'cancel:tenant-a:slot-1', 'audit']);
});

test('TimetableService creates an editable revision from the published tenant version', async () => {
  const calls: string[] = [];
  const service = new TimetableService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'deputy-1' }) } as never,
    {
      createRevision: async (input: Record<string, unknown>) => {
        calls.push(`revise:${input.tenant_id}`);
        return { id: 'version-2', status: 'draft', immutable: false };
      },
      appendAuditLog: async () => calls.push('audit'),
    } as never,
  );

  const version = await service.createRevision({
    academic_year: '2026',
    term_name: 'Term 2',
    notes: 'Correct room allocation',
  });

  assert.equal(version.status, 'draft');
  assert.deepEqual(calls, ['revise:tenant-a', 'audit']);
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

test('TimetableController exposes published schedules as a read endpoint', () => {
  const handler = TimetableController.prototype.listPublishedSchedules as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'published');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['timetable:read']);
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
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, plannerHandler), ['timetable:read']);
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
