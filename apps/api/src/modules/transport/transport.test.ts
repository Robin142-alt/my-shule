import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { TransportController } from './transport.controller';
import { TransportSchemaService } from './transport-schema.service';
import { TransportService } from './transport.service';

test('TransportSchemaService creates tenant-safe routes, vehicles, manifests, trips, alerts, and service logs', async () => {
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
    'vehicle_service_logs',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /current_setting\('app\.tenant_id'/);
  assert.match(schemaSql, /NULLIF\(current_setting\('app\.role'/);
  assert.match(schemaSql, /transport_routes_name/);
  assert.match(schemaSql, /ix_transport_trips_route_date/);
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

test('TransportService creates auditable routes, vehicles, manifests, trips, events, and principal dashboard data', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new TransportService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['transport:*'] }) } as never,
    {
      createRoute: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createRoute', ...input });
        return { id: 'route-1', name: input.name, status: 'active' };
      },
      createVehicle: async (input: Record<string, unknown>) => {
        calls.push({ method: 'createVehicle', ...input });
        return { id: 'vehicle-1', registration_number: input.registration_number, status: 'active' };
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
    route_id: 'route-1',
    student_ids: ['student-1', 'student-2'],
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
  assert.deepEqual(manifest, { id: 'manifest-1', route_id: 'route-1', status: 'active' });
  assert.deepEqual(trip, { id: 'trip-1', route_id: 'route-1', status: 'in_progress' });
  assert.equal(dashboard.active_routes, 1);
  assert.deepEqual(calls.map((call) => call.method), [
    'createRoute',
    'appendAuditLog',
    'createVehicle',
    'appendAuditLog',
    'createManifest',
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
  assert.deepEqual(calls[4]?.student_ids, ['student-1', 'student-2']);
});

test('TransportService rejects unsafe transport mutations before repository writes', async () => {
  const calls: string[] = [];
  const service = new TransportService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', permissions: ['transport:*'] }) } as never,
    {
      createVehicle: async () => {
        calls.push('createVehicle');
      },
      appendAuditLog: async () => undefined,
    } as never,
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
