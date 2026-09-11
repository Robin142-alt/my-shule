import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import 'reflect-metadata';

import { BoardingMasterCommandService } from './boarding-master-command.service';
import { TransportManagerCommandService } from './transport-manager-command.service';

type QueryCall = {
  sql: string;
  params: unknown[];
};

const ROUTE_ID = '22222222-2222-4222-8222-222222222222';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const MANIFEST_ID = '44444444-4444-4444-8444-444444444444';
const STUDENT_ID = '55555555-5555-4555-8555-555555555555';
const PICKUP_STOP_ID = '66666666-6666-4666-8666-666666666666';
const DROPOFF_STOP_ID = '77777777-7777-4777-8777-777777777777';
const BOARDING_HOUSE_ID = '88888888-8888-4888-8888-888888888888';
const BOARDING_HOSTEL_ID = '99999999-9999-4999-8999-999999999999';
const GUARDIAN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WARDEN_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const requestContext = {
  getStore: () => ({
    tenant_id: 'tenant-a',
    user_id: '11111111-1111-4111-8111-111111111111',
    role: 'transport_manager',
  }),
};

function createTransportMutationHarness(input: {
  queryRows?: (sql: string, params: unknown[]) => Record<string, unknown>[];
  writeRows?: (sql: string, params: unknown[]) => Record<string, unknown>[];
} = {}) {
  const queries: QueryCall[] = [];
  const writes: QueryCall[] = [];
  const prisma = {
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return {
        rows: input.queryRows?.(sql, params) ?? [],
        rowCount: 0,
      };
    },
  };
  const operations = {
    uuidOrNull: (value: unknown) => {
      const text = String(value ?? '').trim();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
        ? text
        : null;
    },
    requiredText: (value: unknown, label: string) => {
      const text = String(value ?? '').trim();
      if (!text) throw new Error(`${label} is required`);
      return text;
    },
    writeSql: async (sql: string, params: unknown[] = []) => {
      writes.push({ sql, params });
      const rows = input.writeRows?.(sql, params) ?? [];
      return { rows, rowCount: rows.length };
    },
  };

  return {
    service: new TransportManagerCommandService(
      requestContext as never,
      prisma as never,
      operations as never,
    ),
    queries,
    writes,
  };
}

function createTransportHarness() {
  const queries: QueryCall[] = [];
  const reportCalls: Array<{ tenantId: string; module: string }> = [];
  const row = {
    id: 'transport-row-1',
    total_vehicles: 1,
    total_drivers: 1,
    total_routes: 1,
    active_routes: 1,
    students_transported: 1,
    trips_today: 1,
    registration_number: 'KAA 001A',
    registration: 'KAA 001A',
    make: 'Isuzu',
    model: 'NQR',
    make_model: 'Isuzu NQR',
    ownership_type: 'school_owned',
    insurance_expiry_date: '2027-01-01',
    service_due_date: '2026-09-01',
    capacity: 51,
    driver: 'Jane Driver',
    assigned_driver: 'Jane Driver',
    assigned_route: 'North Route',
    last_service: '2026-08-01',
    status: 'Active',
    name: 'Jane Driver',
    license_number: 'DL-001',
    license_no: 'DL-001',
    phone: '+254700000001',
    assigned_vehicle: 'KAA 001A',
    on_duty: true,
    route_name: 'North Route',
    code: 'NORTH',
    zone: 'North',
    direction: 'round_trip',
    pickup_points: 3,
    students_count: 20,
    learner_count: 20,
    vehicle: 'KAA 001A',
    route_id: 'route-1',
    vehicle_id: 'vehicle-1',
    driver_id: 'driver-1',
    route: 'North Route',
    driver_name: 'Jane Driver',
    vehicle_registration: 'KAA 001A',
    departure_time: '2026-08-22T06:30:00.000Z',
    arrival_time: '',
    students: 20,
    actual_end_at: null,
    is_today: true,
    maintenance_cost_this_month_minor: '250000',
    pending_maintenance: 1,
    overdue_service: 0,
    type: 'Maintenance',
    description: 'Routine service',
    cost_minor: '250000',
    date: '2026-08-01',
    log_date: '2026-08-01',
    created_at: '2026-08-01T08:00:00.000Z',
    students_assigned: 20,
    unassigned: 2,
    student_id: 'student-1',
    manifest_id: 'manifest-1',
    pickup_stop_id: 'stop-1',
    admission_number: 'ADM-001',
    student_name: 'Amina Njeri',
    class: 'Grade 8 Unity',
    pickup_point: 'Market Stop',
    pickup_stop_name: 'Market Stop',
    guardian_phone: '+254700000002',
    guardian_contact: '+254700000002',
    channels: ['in_app', 'sms'],
    delivery_status: 'queued',
    targeted_students: 1,
    sms_queued: 1,
    in_app_notifications_created: 1,
    severity: 'Warning',
    boarding_status: 'active',
  };
  const prisma = {
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return { rows: [{ ...row }], rowCount: 1 };
    },
  };
  const operations = {
    listReportSnapshots: async (tenantId: string, module: string) => {
      reportCalls.push({ tenantId, module });
      return [{
        id: 'transport-report-1',
        reportName: 'Transport operations',
        generatedDate: '2026-08-22T09:00:00.000Z',
        type: 'PDF',
        status: 'Ready',
      }];
    },
  };

  return {
    service: new TransportManagerCommandService(
      requestContext as never,
      prisma as never,
      operations as never,
    ),
    queries,
    reportCalls,
  };
}

function createBoardingHarness() {
  const queries: QueryCall[] = [];
  const row = {
    id: 'boarding-row-1',
    total_boarders: 1,
    hostels: 1,
    incidents_open: 1,
    on_leave: 0,
    hostel_name: 'Jamhuri House',
    type: 'Boys',
    capacity: 48,
    occupied: 40,
    warden: 'Peter Warden',
    status: 'Active',
    hostel: 'Jamhuri House',
    room_number: 'J-01',
    allocated: 40,
    unallocated: 2,
    student_name: 'Amina Njeri',
    class: 'Grade 8 Unity',
    room: 'J-01',
    bed: 'B01',
    checks_today: 1,
    clear: 1,
    attention_required: 0,
    house_id: 'house-1',
    house_name: 'Jamhuri House',
    checked_at: '2026-08-22T18:00:00.000Z',
    notes: 'All learners accounted for',
    student_id: 'student-1',
    leave_type: 'Weekend',
    from_date: '2026-08-23',
    to_date: '2026-08-24',
    guardian_name: 'Mary Njeri',
    guardian_phone: '+254700000003',
    reason: 'Family visit',
    approved_by: null,
    open_incidents: 1,
    resolved_this_week: 0,
    date: '2026-08-22T08:00:00.000Z',
    title: 'Dormitory window damaged',
    description: 'Dormitory window damaged',
    severity: 'Warning',
    generated_at: '2026-08-22T09:00:00.000Z',
    created_at: '2026-08-22T09:00:00.000Z',
  };
  const prisma = {
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      return { rows: [{ ...row }], rowCount: 1 };
    },
  };

  return {
    service: new BoardingMasterCommandService(
      requestContext as never,
      prisma as never,
      {} as never,
    ),
    queries,
  };
}

function createBoardingMutationHarness(input: {
  queryRows?: (sql: string, params: unknown[]) => Record<string, unknown>[];
  writeRows?: (sql: string, params: unknown[]) => Record<string, unknown>[];
  readRows?: (sql: string, params: unknown[]) => Record<string, unknown>[];
  generateResult?: Record<string, unknown>;
} = {}) {
  const queries: QueryCall[] = [];
  const writes: QueryCall[] = [];
  const reads: QueryCall[] = [];
  const audits: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];
  const reportInputs: Array<Record<string, unknown>> = [];
  const prisma = {
    query: async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      const rows = input.queryRows?.(sql, params) ?? [];
      return { rows, rowCount: rows.length };
    },
  };
  const operations = {
    uuidOrNull: (value: unknown) => {
      const text = String(value ?? '').trim();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
        ? text
        : null;
    },
    requiredText: (value: unknown, label: string) => {
      const text = String(value ?? '').trim();
      if (!text) throw new Error(`${label} is required`);
      return text;
    },
    writeSql: async (sql: string, params: unknown[] = []) => {
      writes.push({ sql, params });
      const rows = input.writeRows?.(sql, params) ?? [];
      return { rows, rowCount: rows.length };
    },
    readSql: async (sql: string, params: unknown[] = []) => {
      reads.push({ sql, params });
      const rows = input.readRows?.(sql, params) ?? [];
      return { rows, rowCount: rows.length };
    },
    recordAudit: async (
      tenantId: string,
      action: string,
      resourceType: string,
      resourceId: string | null,
      metadata: Record<string, unknown>,
      actorUserId: string | null,
    ) => {
      audits.push({ tenantId, action, resourceType, resourceId, metadata, actorUserId });
    },
    notifyRoles: async (tenantId: string, notification: Record<string, unknown>) => {
      notifications.push({ tenantId, ...notification });
    },
    generateReportSnapshot: async (reportInput: Record<string, unknown>) => {
      reportInputs.push(reportInput);
      return input.generateResult ?? {
        success: true,
        snapshotId: 'boarding-master-command-snapshot-1',
        artifact: { content_base64: 'Qm9hcmRpbmc=' },
      };
    },
  };

  return {
    service: new BoardingMasterCommandService(
      {
        getStore: () => ({
          tenant_id: 'tenant-a',
          user_id: '11111111-1111-4111-8111-111111111111',
          role: 'boarding_master',
        }),
      } as never,
      prisma as never,
      operations as never,
    ),
    queries,
    writes,
    reads,
    audits,
    notifications,
    reportInputs,
  };
}

function assertListWrapper(
  value: Record<string, unknown>,
  listKey: string,
) {
  assert.ok(value.metrics && typeof value.metrics === 'object');
  assert.ok(Array.isArray(value[listKey]), `${listKey} must be an array`);
}

test('TransportManagerCommandService returns every routed workspace wrapper from canonical tenant-scoped tables', async () => {
  const { service, queries, reportCalls } = createTransportHarness();
  const overview = await service.getOverview();
  const vehicles = await service.getVehicles();
  const drivers = await service.getDrivers();
  const routes = await service.getRoutes();
  const trips = await service.getTrips();
  const fuelMaintenance = await service.getFuelMaintenance();
  const studentTransport = await service.getStudentTransportList();
  const notices = await service.getNotices();
  const incidents = await service.getIncidents();
  const reports = await service.getReports();

  assertListWrapper(overview, 'overviewList');
  assertListWrapper(vehicles, 'vehiclesList');
  assertListWrapper(drivers, 'driversList');
  assertListWrapper(routes, 'routesList');
  assertListWrapper(trips, 'tripsList');
  assertListWrapper(fuelMaintenance, 'fuelmaintenanceList');
  assertListWrapper(studentTransport, 'studenttransportlistList');
  assertListWrapper(notices, 'noticesList');
  assertListWrapper(incidents, 'incidentsList');
  assertListWrapper(reports, 'reportsList');
  assert.deepEqual(reportCalls, [{ tenantId: 'tenant-a', module: 'transport-manager-command' }]);

  assert.ok(queries.length > 0);
  for (const query of queries) {
    assert.equal(query.params[0], 'tenant-a', 'each transport read must bind the active tenant first');
  }

  const sql = queries.map((query) => query.sql).join('\n');
  assert.match(sql, /FROM transport_vehicles vehicle/);
  assert.match(sql, /FROM transport_routes route/);
  assert.match(sql, /FROM transport_trips trip/);
  assert.match(sql, /FROM vehicle_service_logs service_log/);
  assert.match(sql, /FROM transport_manifest_students manifest_student/);
  assert.match(sql, /FROM workflow_events event/);
  assert.match(sql, /event\.event_type = 'transport\.notice_queued'/);
  assert.match(sql, /FROM transport_trip_events trip_event/);
  assert.match(sql, /FROM transport_alerts alert/);
  assert.match(sql, /driver\.tenant_id = trip\.tenant_id/);
  assert.match(sql, /route\.tenant_id = trip\.tenant_id/);
  assert.match(sql, /vehicle\.tenant_id = trip\.tenant_id/);
  assert.match(sql, /student\.tenant_id = manifest_student\.tenant_id/);
  assert.doesNotMatch(sql, /transport_(?:fuel|maintenance)_logs/);
});

test('BoardingMasterCommandService returns every routed workspace wrapper from canonical tenant-scoped tables', async () => {
  const { service, queries } = createBoardingHarness();
  const overview = await service.getOverview();
  const hostels = await service.getHostels();
  const roomsBeds = await service.getRoomsBeds();
  const allocation = await service.getAllocation();
  const attendance = await service.getBoardingAttendance();
  const leaveExit = await service.getLeaveExit();
  const incidents = await service.getIncidents();
  const reports = await service.getReports();

  assertListWrapper(overview, 'overviewList');
  assertListWrapper(hostels, 'hostelsList');
  assertListWrapper(roomsBeds, 'roomsbedsList');
  assertListWrapper(allocation, 'allocationList');
  assertListWrapper(attendance, 'boardingattendanceList');
  assertListWrapper(leaveExit, 'leaveexitList');
  assertListWrapper(incidents, 'incidentsList');
  assertListWrapper(reports, 'reportsList');

  assert.ok(queries.length > 0);
  for (const query of queries) {
    assert.equal(query.params[0], 'tenant-a', 'each boarding read must bind the active tenant first');
  }

  const sql = queries.map((query) => query.sql).join('\n');
  assert.match(sql, /FROM boarding_hostels hostel/);
  assert.match(sql, /FROM boarding_beds b/);
  assert.match(sql, /FROM boarding_allocations allocation/);
  assert.match(sql, /FROM boarding_dormitory_checks dormitory_check/);
  assert.match(sql, /FROM boarding_incidents incident/);
  assert.match(sql, /FROM report_snapshots snapshot/);
  assert.match(sql, /snapshot\.module = 'boarding-master-command'/);
  assert.match(sql, /student\.tenant_id = allocation\.tenant_id/);
  assert.match(sql, /house\.tenant_id = dormitory_check\.tenant_id/);
  assert.match(sql, /house\.tenant_id = incident\.tenant_id/);
  assert.doesNotMatch(sql, /boarding_rooms|boarding_attendance_logs/);
});

test('Transport and boarding wrapper reads preserve command-center row compatibility', async () => {
  const transport = createTransportHarness().service;
  const boarding = createBoardingHarness().service;

  const transportOverview = await transport.getOverview();
  const vehicles = await transport.getVehicles();
  const routes = await transport.getRoutes();
  const transportReports = await transport.getReports();
  assert.equal(transportOverview.metrics.totalVehicles, transportOverview.metrics.total_vehicles);
  assert.equal(transportOverview.metrics.totalRoutes, 1);
  assert.equal(transportOverview.metrics.todayTrips, transportOverview.metrics.trips_today);
  assert.deepEqual(vehicles.data, vehicles.vehiclesList);
  assert.deepEqual(routes.data, routes.routesList);
  assert.deepEqual(transportReports.data, transportReports.reportsList);
  assert.equal((vehicles.data[0] as unknown as Record<string, unknown>).registration_number, 'KAA 001A');
  assert.equal((routes.data[0] as unknown as Record<string, unknown>).code, 'NORTH');

  const hostels = await boarding.getHostels();
  const allocation = await boarding.getAllocation();
  const attendance = await boarding.getBoardingAttendance();
  const boardingReports = await boarding.getReports();
  assert.deepEqual(hostels.data, hostels.hostelsList);
  assert.deepEqual(allocation.data, allocation.allocationList);
  assert.deepEqual(boardingReports.data, boardingReports.reportsList);
  assert.deepEqual(Object.keys(attendance).sort(), ['boardingattendanceList', 'metrics']);
});

test('Transport fuel and maintenance writes are atomic, canonical, actor-bound, and tenant-scoped', async () => {
  const { service, writes } = createTransportMutationHarness({
    writeRows: (sql) => {
      if (sql.includes('vehicle_fuel_logs')) {
        return [{ id: 'fuel-1', vehicle_id: VEHICLE_ID, workflow_event_id: 'event-fuel-1', audits_created: 1 }];
      }
      if (sql.includes('vehicle_service_logs')) {
        return [{ id: 'service-1', vehicle_id: VEHICLE_ID, workflow_event_id: 'event-service-1', audits_created: 1 }];
      }
      return [];
    },
  });

  const fuel = await service.logFuel({
    vehicle_id: VEHICLE_ID,
    litres: '42.5',
    cost: '123.45',
    fuel_date: '2026-08-20',
    odometer_reading: '80420',
    station: ' Nairobi Fuel Stop ',
    receipt_reference: ' RCPT-101 ',
  });
  const maintenance = await service.logMaintenance({
    vehicle_id: VEHICLE_ID,
    description: 'Routine brake inspection',
    cost_minor: 185000,
    service_date: '2026-08-21',
    next_service_date: '2026-11-21',
    odometer_reading: 80500,
    service_provider: 'School Garage',
    priority: 'high',
  });

  assert.equal(fuel.success, true);
  assert.equal(maintenance.success, true);
  assert.equal(writes.length, 2);

  const fuelWrite = writes[0];
  assert.deepEqual(fuelWrite.params, [
    'tenant-a',
    VEHICLE_ID,
    '2026-08-20',
    42.5,
    12345,
    80420,
    'Nairobi Fuel Stop',
    'RCPT-101',
    '11111111-1111-4111-8111-111111111111',
    'transport_manager',
  ]);
  assert.match(fuelWrite.sql, /FROM transport_vehicles vehicle[\s\S]+vehicle\.tenant_id = \$1[\s\S]+vehicle\.id = \$2::uuid/);
  assert.match(fuelWrite.sql, /INSERT INTO vehicle_fuel_logs/);
  assert.match(fuelWrite.sql, /INSERT INTO workflow_events/);
  assert.match(fuelWrite.sql, /INSERT INTO audit_logs/);
  assert.match(fuelWrite.sql, /INSERT INTO notifications/);
  assert.match(fuelWrite.sql, /'correlation_id'/);
  assert.doesNotMatch(fuelWrite.sql, /transport_fuel_logs/);

  const maintenanceWrite = writes[1];
  assert.equal(maintenanceWrite.params[0], 'tenant-a');
  assert.equal(maintenanceWrite.params[1], VEHICLE_ID);
  assert.equal(maintenanceWrite.params.at(-1), 'transport_manager');
  assert.match(maintenanceWrite.sql, /INSERT INTO vehicle_service_logs/);
  assert.match(maintenanceWrite.sql, /UPDATE transport_vehicles vehicle[\s\S]+vehicle\.tenant_id = inserted_log\.tenant_id/);
  assert.match(maintenanceWrite.sql, /INSERT INTO workflow_events/);
  assert.match(maintenanceWrite.sql, /INSERT INTO audit_logs/);
  assert.match(maintenanceWrite.sql, /INSERT INTO notifications/);
  assert.doesNotMatch(maintenanceWrite.sql, /transport_maintenance_logs/);
});

test('Transport fuel and maintenance writes reject invalid or foreign-school records without truthful success', async () => {
  const { service, writes } = createTransportMutationHarness();

  await assert.rejects(
    () => service.logFuel({ vehicle_id: VEHICLE_ID, litres: 0 }),
    /Fuel litres must be greater than zero/i,
  );
  await assert.rejects(
    () => service.logMaintenance({
      vehicle_id: VEHICLE_ID,
      description: 'Service',
      service_date: '2026-08-22',
      next_service_date: '2026-08-21',
    }),
    /Next service date cannot be before the service date/i,
  );
  await assert.rejects(
    () => service.logFuel({ vehicle_id: VEHICLE_ID, litres: 20 }),
    /active vehicle was not found in this school/i,
  );

  assert.equal(writes.length, 1, 'only the valid-shaped foreign-school attempt may reach the atomic SQL write');
});

test('Route vehicle assignment persists the same-tenant assignment before emitting audit, event, and notifications', async () => {
  const { service, writes } = createTransportMutationHarness({
    writeRows: () => [{
      route_id: ROUTE_ID,
      vehicle_id: VEHICLE_ID,
      registration_number: 'KAA 001A',
      workflow_event_id: 'event-route-1',
      audits_created: 1,
      notifications_created: 2,
    }],
  });

  const result = await service.assignVehicleToRoute(ROUTE_ID, { vehicle_id: VEHICLE_ID });

  assert.equal(result.success, true);
  assert.equal(result.assignment.route_id, ROUTE_ID);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].params, [
    'tenant-a',
    ROUTE_ID,
    VEHICLE_ID,
    '11111111-1111-4111-8111-111111111111',
    'transport_manager',
  ]);
  assert.match(writes[0].sql, /selected_vehicle[\s\S]+vehicle\.tenant_id = \$1[\s\S]+lower\(vehicle\.status::text\) = 'active'/);
  assert.match(writes[0].sql, /UPDATE transport_routes route[\s\S]+assigned_vehicle_id = selected_vehicle\.id/);
  assert.match(writes[0].sql, /route\.tenant_id = \$1[\s\S]+route\.id = \$2::uuid/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
});

test('Route vehicle assignment rejects a foreign-school route or vehicle when the guarded update returns no row', async () => {
  const { service } = createTransportMutationHarness();

  await assert.rejects(
    () => service.assignVehicleToRoute(ROUTE_ID, { vehicle_id: VEHICLE_ID }),
    /active route and vehicle were not found in this school/i,
  );
});

test('Student transport assignment proves manifest, student, and stops belong to the active school route', async () => {
  const { service, queries, writes } = createTransportMutationHarness({
    writeRows: (sql) => sql.includes('transport_manifest_students')
      ? [{ id: 'assignment-1', manifest_id: MANIFEST_ID, student_id: STUDENT_ID, route_id: ROUTE_ID }]
      : [],
  });

  const result = await service.assignStudentTransport({
    manifest_id: MANIFEST_ID,
    student_id: STUDENT_ID,
    pickup_stop_id: PICKUP_STOP_ID,
    dropoff_stop_id: DROPOFF_STOP_ID,
    guardian_contact: '+254700000001',
  });

  assert.equal(result.success, true);
  assert.equal(queries.length, 0, 'reference validation and persistence stay in one atomic write');
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].params.slice(0, 6), [
    'tenant-a',
    MANIFEST_ID,
    null,
    STUDENT_ID,
    PICKUP_STOP_ID,
    DROPOFF_STOP_ID,
  ]);
  assert.match(writes[0].sql, /FROM students student[\s\S]+student\.tenant_id = \$1[\s\S]+student\.id = \$4::uuid/);
  assert.match(writes[0].sql, /manifest\.tenant_id = \$1/);
  assert.match(writes[0].sql, /route\.tenant_id = manifest\.tenant_id/);
  assert.match(writes[0].sql, /pickup_stop\.tenant_id = candidate_route\.tenant_id/);
  assert.match(writes[0].sql, /pickup_stop\.route_id = candidate_route\.route_id/);
  assert.match(writes[0].sql, /dropoff_stop\.tenant_id = candidate_route\.tenant_id/);
  assert.match(writes[0].sql, /INSERT INTO workflow_events/);
  assert.match(writes[0].sql, /INSERT INTO audit_logs/);
  assert.match(writes[0].sql, /INSERT INTO notifications/);
});

test('Student transport assignment rejects a foreign-school manifest without a partial manifest or assignment', async () => {
  const { service, writes } = createTransportMutationHarness();

  await assert.rejects(
    () => service.assignStudentTransport({ manifest_id: MANIFEST_ID, student_id: STUDENT_ID }),
    /active transport assignment records were not found in this school/i,
  );
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /created_manifest AS \([\s\S]+FROM validated_references/);
  assert.match(writes[0].sql, /INSERT INTO transport_manifest_students[\s\S]+FROM validated_assignment/);
});

test('Route-based student assignment creates a manifest only from fully validated same-tenant references', async () => {
  const { service, writes } = createTransportMutationHarness({
    writeRows: () => [{ id: 'assignment-2', manifest_id: MANIFEST_ID, student_id: STUDENT_ID, route_id: ROUTE_ID }],
  });

  const result = await service.assignStudentTransport({ route_id: ROUTE_ID, student_id: STUDENT_ID });

  assert.equal(result.success, true);
  assert.deepEqual(writes[0].params.slice(0, 4), ['tenant-a', null, ROUTE_ID, STUDENT_ID]);
  assert.match(writes[0].sql, /selected_route AS \([\s\S]+route\.tenant_id = \$1[\s\S]+route\.id = \$3::uuid/);
  assert.match(writes[0].sql, /created_manifest AS \([\s\S]+FROM validated_references[\s\S]+NOT EXISTS \(SELECT 1 FROM route_manifest\)/);
  assert.match(writes[0].sql, /resolved_manifest AS \([\s\S]+FROM created_manifest/);
});

test('Transport guardian notices are atomically scoped to selected active route assignments and report only real delivery records', async () => {
  const { service, writes } = createTransportMutationHarness({
    writeRows: (sql) => sql.includes("'transport.notice_queued'")
      ? [{
          id: 'notice-event-1',
          targeted_students: 2,
          sms_queued: 2,
          in_app_notifications_created: 1,
          delivery_status: 'queued',
          workflow_status: 'pending',
          audits_created: 1,
        }]
      : [],
  });

  const result = await service.sendNotice({
    title: 'Bus delayed',
    message: 'The North Route bus is delayed by 15 minutes.',
    notice_type: 'bus_delayed',
    route_id: ROUTE_ID,
    student_ids: [STUDENT_ID],
    channels: ['in_app', 'sms'],
    priority: 'high',
    target_roles: ['parent', 'principal'],
  });

  assert.equal(result.success, true);
  assert.equal(result.status, 'queued');
  assert.equal(result.sms_queued, 2);
  assert.equal(result.in_app_notifications_created, 1);
  assert.equal(result.event.type, 'transport.notice_queued');
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /ARRAY\['transport_manager'\]::text\[\]/);
  assert.doesNotMatch(writes[0].sql, /ARRAY\['parent'\]::text\[\]/);
  assert.deepEqual(writes[0].params, [
    'tenant-a',
    ROUTE_ID,
    [STUDENT_ID],
    'Bus delayed',
    'The North Route bus is delayed by 15 minutes.',
    'bus_delayed',
    'high',
    ['in_app', 'sms'],
    '11111111-1111-4111-8111-111111111111',
    'transport_manager',
  ]);

  const sql = writes[0].sql;
  assert.match(sql, /FROM transport_manifest_students manifest_student/);
  assert.match(sql, /manifest_student\.tenant_id = \$1/);
  assert.match(sql, /manifest\.route_id = \$2::uuid/);
  assert.match(sql, /manifest_student\.student_id = ANY\(\$3::uuid\[\]\)/);
  assert.match(sql, /INNER JOIN students student[\s\S]+student\.tenant_id = manifest_student\.tenant_id/);
  assert.match(sql, /LEFT JOIN student_guardians guardian[\s\S]+guardian\.tenant_id = \$1/);
  assert.match(sql, /INSERT INTO notifications/);
  assert.match(sql, /recipient_guardian_id/);
  assert.match(sql, /INSERT INTO communication_sms_outbox/);
  assert.match(sql, /'Pending'/);
  assert.match(sql, /INSERT INTO workflow_events/);
  assert.match(sql, /'transport\.notice_queued'/);
  assert.match(sql, /INSERT INTO audit_logs/);
  assert.match(sql, /'linked_transport_guardians'/);
  assert.doesNotMatch(sql, /notifyRoles|target_roles[^\n]+\$11/);
  assert.doesNotMatch(JSON.stringify(writes[0].params), /principal/);
});

test('Transport guardian notices reject broad or undeliverable targets without a truthful success response', async () => {
  const { service, writes } = createTransportMutationHarness();

  await assert.rejects(
    () => service.sendNotice({
      title: 'Broad notice',
      message: 'This must not broadcast to every parent.',
      target_roles: ['parent'],
      channels: ['in_app'],
    }),
    /Select a transport route or student/i,
  );
  await assert.rejects(
    () => service.sendNotice({
      title: 'No delivery contact',
      message: 'This must not claim delivery.',
      route_id: ROUTE_ID,
      channels: ['sms'],
    }),
    /No selected transport guardian has a deliverable/i,
  );

  assert.equal(writes.length, 1, 'only the selected-route attempt may reach the atomic delivery write');
});

test('Boarding hostel and room writes accept only active same-tenant staff and hostels', async () => {
  const { service, writes } = createBoardingMutationHarness({
    writeRows: (sql) => {
      if (sql.includes('INSERT INTO boarding_hostels')) return [{ id: BOARDING_HOSTEL_ID, hostel_name: 'Jamhuri House' }];
      if (sql.includes('INSERT INTO boarding_beds')) {
        return [
          { id: 'bed-1', hostel_id: BOARDING_HOSTEL_ID, bed_number: 'B01' },
          { id: 'bed-2', hostel_id: BOARDING_HOSTEL_ID, bed_number: 'B02' },
        ];
      }
      return [];
    },
  });

  const hostel = await service.createHostel({ name: 'Jamhuri House', capacity: 48, warden_id: WARDEN_ID });
  const room = await service.createRoom({ hostel_id: BOARDING_HOSTEL_ID, room_number: 'J-01', capacity: 2 });

  assert.equal(hostel.success, true);
  assert.equal(room.success, true);
  assert.equal(writes.length, 2);
  assert.deepEqual(writes[0].params, ['tenant-a', 'Jamhuri House', 48, 'mixed', WARDEN_ID]);
  assert.match(writes[0].sql, /FROM tenant_memberships membership/);
  assert.match(writes[0].sql, /membership\.tenant_id::text = \$1/);
  assert.match(writes[0].sql, /lower\(membership\.status::text\) = 'active'/);
  assert.match(writes[0].sql, /WHERE \$5::uuid IS NULL OR EXISTS \(SELECT 1 FROM selected_warden\)/);
  assert.deepEqual(writes[1].params, ['tenant-a', BOARDING_HOSTEL_ID, 'J-01', ['B01', 'B02']]);
  assert.match(writes[1].sql, /FROM boarding_hostels hostel/);
  assert.match(writes[1].sql, /hostel\.tenant_id::text = \$1/);
  assert.match(writes[1].sql, /CROSS JOIN bed_numbers/);
});

test('Boarding hostel and room writes fail closed when guarded school references return no rows', async () => {
  const { service, writes } = createBoardingMutationHarness();

  await assert.rejects(
    () => service.createHostel({ name: 'Foreign hostel', capacity: 20, warden_id: WARDEN_ID }),
    /warden is not an active member of this school/i,
  );
  await assert.rejects(
    () => service.createRoom({ hostel_id: BOARDING_HOSTEL_ID, room_number: 'X-01', capacity: 1 }),
    /active hostel was not found in this school/i,
  );
  assert.equal(writes.length, 2);
});

test('Boarding roll call, leave, and incident mutations validate tenant-owned targets and notify linked guardians only', async () => {
  const { service, writes } = createBoardingMutationHarness({
    writeRows: (sql) => {
      if (sql.includes('INSERT INTO boarding_dormitory_checks')) {
        return [{
          id: 'roll-call-1',
          expected_students: 20,
          missing_students: 1,
          guardian_notifications_created: 1,
        }];
      }
      if (sql.includes('INSERT INTO boarding_exeats')) {
        return [{
          id: 'leave-1',
          student_id: STUDENT_ID,
          guardian_id: GUARDIAN_ID,
          student_name: 'Amina Njeri',
          hostel: 'Jamhuri House',
          leave_type: 'Weekend',
          from_date: '2026-08-23',
          to_date: '2026-08-24',
          status: 'pending',
          guardian_name: 'Mary Njeri',
          guardian_notifications_created: 1,
        }];
      }
      if (sql.includes('INSERT INTO boarding_incidents')) {
        return [{
          id: 'incident-1',
          student_id: STUDENT_ID,
          house_id: BOARDING_HOUSE_ID,
          title: 'Missing learner follow-up',
          severity: 'high',
          guardian_notifications_created: 1,
        }];
      }
      return [];
    },
  });

  const rollCall = await service.submitRollCall({
    house_id: BOARDING_HOUSE_ID,
    status: 'attention_required',
    missing_student_ids: [STUDENT_ID],
    notes: 'Learner not in house at roll call.',
  });
  const leave = await service.createLeaveRequest({
    student_id: STUDENT_ID,
    guardian_id: GUARDIAN_ID,
    leave_type: 'Weekend',
    from_date: '2026-08-23',
    to_date: '2026-08-24',
    reason: 'Family visit',
    guardian_name: 'Untrusted free text',
    guardian_phone: '+254799999999',
  });
  const incident = await service.reportIncident({
    house_id: BOARDING_HOUSE_ID,
    student_id: STUDENT_ID,
    title: 'Missing learner follow-up',
    severity: 'high',
  });

  assert.equal(rollCall.success, true);
  assert.equal(leave.success, true);
  assert.equal(leave.leave.guardian_name, 'Mary Njeri');
  assert.equal(incident.success, true);
  assert.equal(writes.length, 3);

  const rollCallWrite = writes[0];
  assert.deepEqual(rollCallWrite.params, [
    'tenant-a',
    BOARDING_HOUSE_ID,
    '11111111-1111-4111-8111-111111111111',
    'attention_required',
    'Learner not in house at roll call.',
    [STUDENT_ID],
    'boarding_master',
  ]);
  assert.match(rollCallWrite.sql, /FROM boarding_houses house/);
  assert.match(rollCallWrite.sql, /house\.category[\s\S]*IN \('house', 'hostel', 'dormitory'\)/);
  assert.match(rollCallWrite.sql, /FROM boarding_students boarding_student/);
  assert.match(rollCallWrite.sql, /requested_missing_count = validation\.validated_missing_count/);
  assert.match(rollCallWrite.sql, /INNER JOIN student_guardians guardian/);
  assert.match(rollCallWrite.sql, /recipient_guardian_id/);
  assert.match(rollCallWrite.sql, /INSERT INTO workflow_events/);
  assert.match(rollCallWrite.sql, /INSERT INTO audit_logs/);

  const leaveWrite = writes[1];
  assert.deepEqual(leaveWrite.params, [
    'tenant-a',
    STUDENT_ID,
    GUARDIAN_ID,
    'Weekend',
    '2026-08-23',
    '2026-08-24',
    'Family visit',
    '11111111-1111-4111-8111-111111111111',
    'boarding_master',
  ]);
  assert.match(leaveWrite.sql, /FROM students student/);
  assert.match(leaveWrite.sql, /FROM boarding_students boarding_student/);
  assert.match(leaveWrite.sql, /FROM boarding_allocations allocation/);
  assert.match(leaveWrite.sql, /boarding_student\.tenant_id = student\.tenant_id/);
  assert.match(leaveWrite.sql, /allocation\.tenant_id = student\.tenant_id/);
  assert.match(leaveWrite.sql, /guardian\.tenant_id = \$1/);
  assert.match(leaveWrite.sql, /guardian\.id = \$3::uuid/);
  assert.match(leaveWrite.sql, /INSERT INTO notifications/);
  assert.match(leaveWrite.sql, /INSERT INTO workflow_events/);
  assert.match(leaveWrite.sql, /INSERT INTO audit_logs/);
  assert.doesNotMatch(JSON.stringify(leaveWrite.params), /Untrusted free text|254799999999/);

  const incidentWrite = writes[2];
  assert.match(incidentWrite.sql, /house\.tenant_id = \$1/);
  assert.match(incidentWrite.sql, /student\.tenant_id = \$1/);
  assert.match(incidentWrite.sql, /boarding_student\.house_id = \$2::uuid/);
  assert.match(incidentWrite.sql, /INNER JOIN student_guardians guardian/);
});

test('Boarding target mutations reject foreign-school references without truthful success', async () => {
  const { service, writes } = createBoardingMutationHarness();

  await assert.rejects(
    () => service.submitRollCall({
      house_id: BOARDING_HOUSE_ID,
      status: 'attention_required',
      missing_student_ids: [STUDENT_ID],
      notes: 'Missing learner',
    }),
    /house or one of the selected students was not found in this school/i,
  );
  await assert.rejects(
    () => service.createLeaveRequest({
      student_id: STUDENT_ID,
      guardian_id: GUARDIAN_ID,
      leave_type: 'Weekend',
      from_date: '2026-08-23',
      to_date: '2026-08-24',
      reason: 'Family visit',
    }),
    /active boarder and linked guardian were not found in this school/i,
  );
  await assert.rejects(
    () => service.reportIncident({
      house_id: BOARDING_HOUSE_ID,
      student_id: STUDENT_ID,
      title: 'Foreign record attempt',
    }),
    /house or student was not found in this school/i,
  );
  assert.equal(writes.length, 3);
});

test('Boarding generic workflow actions reject client-selected parent broadcasts', async () => {
  const { service, writes } = createBoardingMutationHarness();

  await assert.rejects(
    () => service.recordAction({
      action: 'private_boarder_follow_up',
      title: 'Private boarder follow-up',
      message: 'Sensitive learner follow-up',
      targetRoles: ['parent'],
    }),
    /authorized boarding, safeguarding, or school leadership roles/i,
  );

  assert.equal(writes.length, 0);
});

test('Boarding reports persist live snapshots and only download checksum-verified same-tenant artifacts', async () => {
  const content = Buffer.from('Boarding report artifact\n', 'utf8');
  const artifact = {
    kind: 'generated-report',
    filename: 'boarding-operations-20260822.csv',
    content_type: 'text/csv; charset=utf-8',
    byte_length: content.length,
    checksum_sha256: createHash('sha256').update(content).digest('hex'),
    encoding: 'base64',
    content_base64: content.toString('base64'),
  };
  const { service, queries, reads, writes, reportInputs } = createBoardingMutationHarness({
    queryRows: (sql) => sql.includes('FROM report_snapshots snapshot')
      ? [{
          id: 'boarding-master-command-snapshot-1',
          title: 'Boarding operations report',
          generated_at: '2026-08-22T09:00:00.000Z',
          type: 'csv',
          artifact,
        }]
      : [],
    readRows: () => [{
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      snapshotId: 'boarding-master-command-snapshot-1',
      title: 'Boarding operations report',
      format: 'csv',
      artifact,
      manifest: { module: 'boarding-master-command' },
      generatedDate: '2026-08-22T09:00:00.000Z',
    }],
  });

  const generated = await service.generateReport({ format: 'xlsx', title: 'Weekly boarding report' });
  const listed = await service.getReports();
  const downloaded = await service.downloadReport('boarding-master-command-snapshot-1');

  assert.equal(generated.success, true);
  assert.equal(reportInputs.length, 1);
  assert.equal(reportInputs[0].tenantId, 'tenant-a');
  assert.equal(reportInputs[0].module, 'boarding-master-command');
  assert.equal(reportInputs[0].format, 'xlsx');
  assert.ok(reportInputs[0].sections && typeof reportInputs[0].sections === 'object');
  assert.equal(listed.reportsList[0].status, 'Ready');
  assert.deepEqual(downloaded.report.artifact, artifact);
  assert.match(queries.at(-1)?.sql ?? '', /snapshot\.tenant_id = \$1/);
  assert.match(reads[0].sql, /snapshot\.tenant_id = \$1/);
  assert.match(reads[0].sql, /snapshot\.module = 'boarding-master-command'/);
  assert.match(writes.at(-1)?.sql ?? '', /report\.snapshot\.downloaded/);
  assert.match(writes.at(-1)?.sql ?? '', /boarding-master-command\.report\.downloaded/);
});

test('Boarding report download fails closed for corrupt or foreign-school artifacts', async () => {
  const corruptContent = Buffer.from('tampered artifact', 'utf8');
  const { service, writes } = createBoardingMutationHarness({
    readRows: () => [{
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      snapshotId: 'boarding-master-command-corrupt',
      title: 'Corrupt boarding report',
      format: 'pdf',
      artifact: {
        kind: 'generated-report',
        filename: 'boarding.pdf',
        content_type: 'application/pdf',
        byte_length: corruptContent.length,
        checksum_sha256: '0'.repeat(64),
        encoding: 'base64',
        content_base64: corruptContent.toString('base64'),
      },
      manifest: {},
      generatedDate: '2026-08-22T09:00:00.000Z',
    }],
  });

  await assert.rejects(
    () => service.downloadReport('boarding-master-command-corrupt'),
    /failed integrity verification/i,
  );
  assert.equal(writes.length, 0, 'a corrupt artifact must not be audited as a successful download');

  const missing = createBoardingMutationHarness();
  await assert.rejects(
    () => missing.service.downloadReport('foreign-school-report'),
    /not found in this school/i,
  );
});
