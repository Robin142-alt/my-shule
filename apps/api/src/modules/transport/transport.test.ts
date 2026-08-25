import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { TransportRepository } from './repositories/transport.repository';
import { TransportController } from './transport.controller';
import { TransportSchemaService } from './transport-schema.service';
import { TransportService } from './transport.service';

const ROUTE_ID = '00000000-0000-4000-8000-000000000101';
const FOREIGN_ROUTE_ID = '00000000-0000-4000-8000-000000000102';
const STUDENT_ONE_ID = '00000000-0000-4000-8000-000000000201';
const STUDENT_TWO_ID = '00000000-0000-4000-8000-000000000202';

test('TransportSchemaService creates tenant-safe routes, vehicles, manifests, trips, alerts, fuel, and service logs', async () => {
  let schemaSql = '';
  const service = new TransportSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'transport_routes',
    'transport_route_stops',
    'transport_vehicles',
    'transport_drivers',
    'transport_manifests',
    'transport_manifest_students',
    'transport_trips',
    'transport_trip_events',
    'transport_alerts',
    'vehicle_fuel_logs',
    'vehicle_service_logs',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /current_setting\('app\.tenant_id'/);
  assert.match(schemaSql, /NULLIF\(current_setting\('app\.role'/);
  assert.match(schemaSql, /transport_routes_name/);
  assert.match(schemaSql, /ix_transport_trips_route_date/);
  assert.match(schemaSql, /assigned_vehicle_id uuid/);
  assert.match(schemaSql, /fk_transport_routes_assigned_vehicle/);
  assert.match(schemaSql, /ix_vehicle_fuel_logs_vehicle/);
  assert.match(schemaSql, /ALTER TABLE vehicle_fuel_logs ADD COLUMN IF NOT EXISTS cost_minor bigint/);
  assert.match(schemaSql, /ALTER TABLE vehicle_service_logs ADD COLUMN IF NOT EXISTS next_service_date date/);
});

test('TransportController is gated by transport module and transport permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, TransportController), ['transport']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(TransportController.prototype, 'getDashboard')?.value;
  const createTripHandler = Object.getOwnPropertyDescriptor(TransportController.prototype, 'startTrip')?.value;

  assert.ok(dashboardHandler);
  assert.ok(createTripHandler);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['transport:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createTripHandler), ['transport:write']);
});

test('TransportController delegates vehicle and trip reads to the governed transport service', async () => {
  const calls: string[] = [];
  const controller = new TransportController(
    {
      listVehicles: async () => {
        calls.push('vehicles');
        return [{ id: 'vehicle-1', vehicle: 'Bus (KDA 123A)' }];
      },
      listTrips: async () => {
        calls.push('trips');
        return [{ id: 'assignment-1', student: 'Learner One' }];
      },
    } as never,
  );

  const vehicles = await controller.getVehicles();
  const trips = await controller.getTrips();

  assert.deepEqual(calls, ['vehicles', 'trips']);
  assert.deepEqual(vehicles, [{ id: 'vehicle-1', vehicle: 'Bus (KDA 123A)' }]);
  assert.deepEqual(trips, [{ id: 'assignment-1', student: 'Learner One' }]);
});

test('TransportController does not hide transport database failures as empty lists', async () => {
  const controller = new TransportController(
    {
      listVehicles: async () => {
        throw new Error('transport database unavailable');
      },
    } as never,
  );

  await assert.rejects(() => controller.getVehicles(), /transport database unavailable/);
});

test('TransportRepository vehicle and trip reads retain the current tenant in SQL and parameters', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const repository = new TransportRepository({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return { rows: [], rowCount: 0 };
    },
  } as never);

  await repository.listVehicles('school-a');
  await repository.listTrips('school-a');

  assert.equal(queries.length, 2);
  assert.deepEqual(queries.map((query) => query.params), [['school-a'], ['school-a']]);
  assert.match(queries[0].sql, /FROM transport_vehicles vehicle[\s\S]+vehicle\.tenant_id = \$1/);
  assert.match(queries[1].sql, /FROM transport_manifest_students[\s\S]+manifest_student\.tenant_id = \$1/);
  assert.match(queries[1].sql, /student\.tenant_id = manifest_student\.tenant_id/);
});

test('TransportRepository resolves manifest guardians only through active same-tenant links and memberships', async () => {
  let capturedSql = '';
  let capturedParams: unknown[] = [];
  const repository = new TransportRepository({
    query: async (sql: string, params: unknown[]) => {
      capturedSql = sql;
      capturedParams = params;
      return {
        rows: [{ student_id: STUDENT_ONE_ID, guardian_id: 'guardian-1', user_id: 'guardian-user-1' }],
        rowCount: 1,
      };
    },
  } as never);

  const recipients = await repository.listActiveGuardianRecipients('tenant-a', [STUDENT_ONE_ID]);

  assert.deepEqual(capturedParams, ['tenant-a', JSON.stringify([STUDENT_ONE_ID])]);
  assert.match(capturedSql, /student\.tenant_id = \$1/);
  assert.match(capturedSql, /guardian\.tenant_id = student\.tenant_id/);
  assert.match(capturedSql, /membership\.tenant_id = guardian\.tenant_id/);
  assert.match(capturedSql, /LOWER\(guardian\.status\) = 'active'/);
  assert.match(capturedSql, /LOWER\(membership\.status\) = 'active'/);
  assert.equal(recipients[0].user_id, 'guardian-user-1');
});

test('TransportController assignment endpoint delegates to manifest assignment semantics', async () => {
  const calls: unknown[] = [];
  const controller = new TransportController({
    createAssignment: async (dto: unknown) => {
      calls.push(dto);
      return { id: 'manifest-1', status: 'active' };
    },
    createRoute: async () => {
      throw new Error('assignment endpoint must not create a route');
    },
  } as never);

  const result = await controller.createAssignment({
    routeId: 'route-1',
    studentId: 'student-1',
  });

  assert.deepEqual(calls, [{ routeId: 'route-1', studentId: 'student-1' }]);
  assert.deepEqual(result, { id: 'manifest-1', status: 'active' });
});

test('TransportService creates auditable routes, vehicles, manifests, trips, events, and principal dashboard data', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new TransportService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['transport:*'] }) } as never,
    { execute: async (params: any) => params.handler() } as never,
    {
      createRoute: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createRoute', ...input });
        return { id: 'route-1', name: input.name, status: 'active' };
      },
      createVehicle: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createVehicle', ...input });
        return { id: 'vehicle-1', registration_number: input.registration_number, status: 'active' };
      },
      validateManifestReferences: async (input: Record<string, unknown>) => {
        calls.push({ method: 'validateManifestReferences', ...input });
        return { route_exists: true, academic_term_exists: true, student_count: 2 };
      },
      listActiveGuardianRecipients: async (tenantId: string, studentIds: string[]) => {
        calls.push({ method: 'listActiveGuardianRecipients', tenant_id: tenantId, student_ids: studentIds });
        return [{ student_id: STUDENT_ONE_ID, guardian_id: 'guardian-1', user_id: 'guardian-user-1' }];
      },
      createManifest: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createManifest', ...input });
        return { id: 'manifest-1', route_id: input.route_id, status: 'active' };
      },
      startTrip: async (input: Record<string, unknown>) => {
        calls.push({ method: 'startTrip', ...input });
        return { id: 'trip-1', route_id: input.route_id, status: 'in_progress' };
      },
      recordTripEvent: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordTripEvent', ...input });
        return { id: 'event-1', trip_id: input.trip_id, event_type: input.event_type };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        calls.push({ method: 'appendAuditLog', ...input });
      },
      getDashboard: async (tenantId: string) => {
        calls.push({ method: 'getDashboard', tenant_id: tenantId });
        return {
          active_routes: 1,
          active_vehicles: 1,
          active_manifests: 1,
          trips_today: 1,
          open_alerts: 0,
          service_due_vehicles: 0,
          routes: [{ id: 'route-1', name: 'Eastlands AM', learner_count: 32 }],
          trips: [{ id: 'trip-1', status: 'in_progress' }],
          alerts: [],
        };
      },
    } as never,
    { recordSchoolOperation: async () => undefined } as never,
  );

  const route = await service.createRoute({
    name: ' Eastlands AM ',
    direction: 'morning',
    stops: [{ name: 'Donholm', sequence: 1, planned_time: '06:45' }],
  });
  const vehicle = await service.createVehicle({
    registration_number: ' kda 123a ',
    capacity: 33,
    ownership_type: 'school_owned',
  });
  const manifest = await service.createManifest({
    route_id: ROUTE_ID,
    student_ids: [STUDENT_ONE_ID, STUDENT_TWO_ID],
  });
  const trip = await service.startTrip({
    route_id: 'route-1',
    vehicle_id: 'vehicle-1',
    driver_id: 'driver-1',
    trip_date: '2026-05-21',
  });
  await service.recordTripEvent('trip-1', {
    event_type: 'pickup',
    student_id: 'student-1',
    notes: 'Boarded at Donholm',
  });
  const dashboard = await service.getDashboard();

  assert.deepEqual(route, { id: 'route-1', name: 'Eastlands AM', status: 'active' });
  assert.deepEqual(vehicle, { id: 'vehicle-1', registration_number: 'KDA 123A', status: 'active' });
  assert.deepEqual(manifest, { id: 'manifest-1', route_id: ROUTE_ID, status: 'active' });
  assert.deepEqual(trip, { id: 'trip-1', route_id: 'route-1', status: 'in_progress' });
  assert.equal(dashboard.active_routes, 1);
  assert.deepEqual(calls.map((call) => call.method), [
    'createRoute',
    'appendAuditLog',
    'createVehicle',
    'appendAuditLog',
    'validateManifestReferences',
    'createManifest',
    'listActiveGuardianRecipients',
    'appendAuditLog',
    'startTrip',
    'appendAuditLog',
    'recordTripEvent',
    'appendAuditLog',
    'getDashboard',
  ]);
  assert.equal(calls[0]?.tenant_id, 'tenant-a');
  assert.equal(calls[0]?.created_by_user_id, 'user-1');
  assert.equal(calls[2]?.registration_number, 'KDA 123A');
  assert.deepEqual(calls[4]?.student_ids, [STUDENT_ONE_ID, STUDENT_TWO_ID]);
  assert.deepEqual(calls[5]?.student_ids, [STUDENT_ONE_ID, STUDENT_TWO_ID]);
  assert.deepEqual(calls[6]?.student_ids, [STUDENT_ONE_ID, STUDENT_TWO_ID]);
});

test('TransportService addresses learner assignment notices to exact active guardian accounts', async () => {
  const operations: Array<Record<string, any>> = [];
  const service = new TransportService(
    {
      getStore: () => ({
        tenant_id: 'tenant-a',
        user_id: 'transport-user-1',
        role: 'transport_manager',
        permissions: ['transport:*'],
      }),
    } as never,
    {} as never,
    {
      validateManifestReferences: async () => ({
        route_exists: true,
        academic_term_exists: true,
        student_count: 1,
      }),
      createManifest: async () => ({ id: 'manifest-1', status: 'active' }),
      listActiveGuardianRecipients: async (tenantId: string, studentIds: string[]) => {
        assert.equal(tenantId, 'tenant-a');
        assert.deepEqual(studentIds, [STUDENT_ONE_ID]);
        return [{ student_id: STUDENT_ONE_ID, guardian_id: 'guardian-1', user_id: 'guardian-user-1' }];
      },
      appendAuditLog: async () => undefined,
    } as never,
    {
      recordSchoolOperation: async (input: Record<string, unknown>) => {
        operations.push(input);
      },
    } as never,
  );

  await service.createManifest({ route_id: ROUTE_ID, student_ids: [STUDENT_ONE_ID] });

  assert.equal(operations.length, 1);
  const notifications = operations[0].notifications as Array<Record<string, unknown>>;
  assert.deepEqual(notifications[0].audienceRoles, ['accountant', 'finance']);
  assert.equal(notifications[1].targetUserId, 'guardian-user-1');
  assert.equal(notifications[1].recipientGuardianId, 'guardian-1');
  assert.deepEqual(notifications[1].audienceRoles, ['parent']);
  assert.equal(notifications[1].recipientScope, 'exact_active_guardian_account');
});

test('TransportService rejects foreign assignment references before persistence', async () => {
  const calls: string[] = [];
  const service = new TransportService(
    { getStore: () => ({ tenant_id: 'school-a', user_id: 'user-1', permissions: ['transport:*'] }) } as never,
    {} as never,
    {
      validateManifestReferences: async (input: Record<string, unknown>) => {
        calls.push(`validate:${input.tenant_id}`);
        return { route_exists: false, academic_term_exists: true, student_count: 1 };
      },
      createManifest: async () => {
        calls.push('persist');
      },
    } as never,
    { recordSchoolOperation: async () => undefined } as never,
  );

  await assert.rejects(
    () => service.createAssignment({ routeId: FOREIGN_ROUTE_ID, studentId: STUDENT_ONE_ID }),
    /owned by the current school/i,
  );
  assert.deepEqual(calls, ['validate:school-a']);
});

test('TransportService propagates assignment audit and event failures', async () => {
  const baseRepository = {
    validateManifestReferences: async () => ({
      route_exists: true,
      academic_term_exists: true,
      student_count: 1,
    }),
    createManifest: async () => ({ id: 'manifest-1', status: 'active' }),
    listActiveGuardianRecipients: async () => [],
  };
  const context = {
    getStore: () => ({
      tenant_id: 'school-a',
      user_id: 'user-1',
      role: 'transport_manager',
      permissions: ['transport:*'],
    }),
  };
  const auditFailure = new TransportService(
    context as never,
    {} as never,
    {
      ...baseRepository,
      appendAuditLog: async () => {
        throw new Error('audit unavailable');
      },
    } as never,
    { recordSchoolOperation: async () => undefined } as never,
  );

  await assert.rejects(
    () => auditFailure.createAssignment({ routeId: ROUTE_ID, studentId: STUDENT_ONE_ID }),
    /audit unavailable/,
  );

  const eventFailure = new TransportService(
    context as never,
    {} as never,
    { ...baseRepository, appendAuditLog: async () => undefined } as never,
    {
      recordSchoolOperation: async () => {
        throw new Error('event unavailable');
      },
    } as never,
  );

  await assert.rejects(
    () => eventFailure.createAssignment({ routeId: ROUTE_ID, studentId: STUDENT_ONE_ID }),
    /event unavailable/,
  );
});

test('TransportService rejects unsafe transport mutations before repository writes', async () => {
  const calls: string[] = [];
  const service = new TransportService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['transport:*'] }) } as never,
    { execute: async (params: any) => params.handler() } as never,
    {
      createVehicle: async () => {
        calls.push('createVehicle');
      },
      appendAuditLog: async () => undefined,
    } as never,
    { recordSchoolOperation: async () => undefined } as never,
  );

  await assert.rejects(
    () =>
      service.createVehicle({
        registration_number: 'KDA 123A',
        capacity: 0,
        ownership_type: 'school_owned',
      }),
    /capacity must be greater than zero/i,
  );
  assert.deepEqual(calls, []);
});
