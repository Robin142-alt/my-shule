import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { VisitorsController } from './visitors.controller';
import { VisitorsSchemaService } from './visitors-schema.service';
import { VisitorsService } from './visitors.service';

test('VisitorsSchemaService creates tenant-safe visitors registry tables', async () => {
  let schemaSql = '';
  const service = new VisitorsSchemaService({ runSchemaBootstrap: async (sql: string) => { schemaSql += sql; } } as never);

  await service.onModuleInit();

  for (const table of ['visitors_registry', 'visitors_appointments', 'visitors_logs', 'student_exits']) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(schemaSql, /CREATE OR REPLACE VIEW visitor_checkins/);
  assert.match(schemaSql, /FROM visitors_logs/);
});

test('VisitorsController is gated by visitor management module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, VisitorsController), ['visitor_management']);
  const dashboardHandler = Object.getOwnPropertyDescriptor(VisitorsController.prototype, 'getDashboard')?.value;
  const createAppointmentHandler = Object.getOwnPropertyDescriptor(VisitorsController.prototype, 'createAppointment')?.value;

  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, dashboardHandler), ['visitors:read']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, createAppointmentHandler), ['visitors:write']);
});

test('VisitorsService creates domain-specific visitors records', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new VisitorsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      createAppointment: async (tenantId: string, data: any) => { calls.push({ method: 'createAppointment', tenantId, ...data }); return { id: 'appt-1' }; },
      logVisitor: async (tenantId: string, data: any) => { calls.push({ method: 'logVisitor', tenantId, ...data }); return { id: 'log-1' }; },
      checkOutVisitor: async (tenantId: string, logId: string) => { calls.push({ method: 'checkOutVisitor', tenantId, logId }); return { id: logId, status: 'checked_out' }; },
      logStudentExit: async (tenantId: string, data: any) => { calls.push({ method: 'logStudentExit', tenantId, ...data }); return { id: 'exit-1' }; },
    } as never,
  );

  await service.createAppointment({ visitor_name: 'John Doe', purpose: 'Meeting' });
  await service.logVisitor({ visitor_name: 'Jane Doe', purpose: 'Interview' });
  await service.checkOutVisitor('log-1');
  await service.logStudentExit({ student_id: 'std-1', reason: 'Medical' });

  assert.deepEqual(calls.map((call) => call.method), ['createAppointment', 'logVisitor', 'checkOutVisitor', 'logStudentExit']);
});
