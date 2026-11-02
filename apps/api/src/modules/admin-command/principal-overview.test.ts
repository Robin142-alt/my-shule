import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PrincipalOverviewService } from './principal-overview.service';
import { receptionEntry } from './reception-queue';
import { SecretaryCommandService } from './secretary-command.service';

function setup(modules: string[] = [], permissions = ['principal:read', 'academics:read', 'clinic:reports', 'finance:read']) {
  const queries: string[] = [];
  const actor = { tenant_id: 'school-a', user_id: 'principal-a', is_authenticated: true, permissions };
  let failCalendar = false;
  const prisma = { executeWithTenant: async (tenant: string, user: string, work: (tx: unknown) => unknown) => {
    assert.equal(tenant, actor.tenant_id); assert.equal(user, actor.user_id);
    return work({ $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      assert.equal(params[0], actor.tenant_id); queries.push(sql);
      if (failCalendar && sql.includes('academic_terms')) throw new Error('database unavailable');
      if (sql.includes('overview:finance')) return [{ collected_today_minor: '12345', arrears_minor: '89000' }];
      if (sql.includes('overview:lessons')) return [{ taught: 4, recorded: 6 }];
      if (sql.includes('overview:health')) return [{ cases: 2 }];
      return [];
    } });
  } };
  const service = new PrincipalOverviewService({ getStore: () => actor } as never, prisma as never,
    { listCurrentTenantModules: async () => modules } as never);
  return { service, queries, actor, failCalendar: () => { failCalendar = true; } };
}

test('Principal overview omits finance and never queries its records until the module is enabled', async () => {
  const fixture = setup(); const data = await fixture.service.getDetails();
  assert.equal(data.finance.state, 'hidden');
  assert.ok(!fixture.queries.some(sql => sql.includes('manual_fee_payments')));
  assert.deepEqual(data.lessons, { state: 'ready', data: { taught: 4, recorded: 6 } });
});

test('Principal overview keeps financial minor units and requires finance permission', async () => {
  const enabled = setup(['finance']);
  assert.deepEqual((await enabled.service.getDetails()).finance,
    { state: 'ready', data: { collectedTodayMinor: '12345', arrearsMinor: '89000', currency: 'KES' } });
  const locked = setup(['finance'], ['principal:read']);
  assert.equal((await locked.service.getDetails()).finance.state, 'locked');
  assert.ok(!locked.queries.some(sql => sql.includes('manual_fee_payments')));
});

test('A failed calendar does not fabricate zero metrics or take down other overview sections', async () => {
  const fixture = setup(); fixture.failCalendar();
  const data = await fixture.service.getDetails();
  assert.equal(data.calendar.state, 'error');
  assert.equal(data.visitors.state, 'ready');
  assert.equal(data.health.state, 'ready');
});

test('Overview refuses unauthenticated or missing tenant context before reading records', async () => {
  const fixture = setup(); fixture.actor.is_authenticated = false;
  await assert.rejects(fixture.service.getDetails(), /verified school session/i);
  assert.equal(fixture.queries.length, 0);
});

test('Reception entries preserve recorded roles, purposes and arrival timestamps', () => {
  const entry = receptionEntry({ id: 'first-arrival', title: 'Reception Visitor', message: 'School meeting',
    status: 'pending', created_at: '2026-11-02T08:00:00Z', payload: { role_relationship: 'Parent', person_to_see: 'Principal' } },
    Date.parse('2026-11-02T08:12:35Z'));
  assert.equal(entry.visitor_name, 'Reception Visitor'); assert.equal(entry.purpose, 'School meeting');
  assert.equal(entry.role_relationship, 'Parent'); assert.equal(entry.wait_time_minutes, 12);
  assert.equal(entry.status, 'Waiting'); assert.equal(entry.arrival_time, '2026-11-02T08:00:00.000Z');
  assert.equal(receptionEntry({ id: 'second', title: '', message: '', status: 'called', created_at: '2026-11-02T08:00:00Z' }).status, 'Being Served');
});

test('Secretary queue contract includes waiting, called, and completed counts from persisted events', async () => {
  const rows = ['pending', 'called', 'completed'].map((status, index) => ({ id: `event-${index}`, status,
    title: `Visitor ${index}`, message: 'School visit', created_at: new Date(), payload: { role_relationship: 'Visitor' } }));
  const service = new SecretaryCommandService({ getStore: () => ({ tenant_id: 'school-a' }) } as never,
    { query: async (_sql: string, params: string[]) => { assert.deepEqual(params, ['school-a']); return { rows }; } } as never, {} as never);
  const queue = await service.getReceptionQueue();
  assert.equal(queue.queue.length, 3); assert.equal(queue.metrics.total_in_queue, 1);
  assert.equal(queue.metrics.being_served, 1); assert.equal(queue.metrics.completed_today, 1);
});

test('Secretary check-in records verified actor scope and rejects incomplete visitor details', async () => {
  const writes: unknown[][] = [];
  const operations = {
    requiredText: (value: unknown, label: string) => { if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`); return value.trim(); },
    uuidOrNull: (value: unknown) => value,
    writeSql: async (_sql: string, params: unknown[]) => { writes.push(params); return { rows: [{ id: 'new-entry' }] }; }, recordAudit: async () => {},
  };
  const service = new SecretaryCommandService({ getStore: () => ({ tenant_id: 'school-a', user_id: 'secretary-a', role: 'secretary' }) } as never, {} as never, operations as never);
  await assert.rejects(service.createQueueEntry({ visitor_name: 'Test', purpose: 'Meeting', person_to_see: 'Principal' }), /relationship/);
  assert.equal(writes.length, 0);
  await service.createQueueEntry({ visitor_name: 'Test', purpose: 'Meeting', person_to_see: 'Principal', role_relationship: 'Parent', tenant_id: 'school-b' });
  assert.equal(writes[0][0], 'school-a'); assert.equal(writes[0][1], 'secretary-a');
  assert.deepEqual(JSON.parse(writes[0][3] as string), ['secretary', 'principal']);
  assert.equal(JSON.parse(writes[0][11] as string).tenant_id, undefined);
});
