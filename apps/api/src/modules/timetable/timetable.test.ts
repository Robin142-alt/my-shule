import assert from 'node:assert/strict';
import test from 'node:test';

import { PATH_METADATA } from '@nestjs/common/constants';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { TimetableController } from './timetable.controller';
import { TimetableSchemaService } from './timetable-schema.service';
import { TimetableService } from './timetable.service';
import { TimetableRepository } from './repositories/timetable.repository';

test('Timetable providers expose concrete Nest dependency metadata', () => {
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', TimetableSchemaService), [PrismaService]);
  assert.deepEqual(Reflect.getMetadata('design:paramtypes', TimetableService), [
    RequestContextService,
    TimetableRepository,
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
});

test('TimetableService blocks teacher, class, and room conflicts before saving a slot', async () => {
  const service = new TimetableService(
    {
      getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }),
    } as never,
    {
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

test('TimetableController exposes published schedules as a read endpoint', () => {
  const handler = TimetableController.prototype.listPublishedSchedules as unknown as Function;

  assert.equal(typeof handler, 'function');
  assert.equal(Reflect.getMetadata(PATH_METADATA, handler), 'published');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['timetable:read']);
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
