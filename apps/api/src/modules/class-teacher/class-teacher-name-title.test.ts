import assert from 'node:assert/strict';
import test from 'node:test';
import { ClassTeacherService } from './class-teacher.service';

function setup(allowed = true) {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new ClassTeacherService({ query: async (sql: string, params: unknown[]) => {
    queries.push({ sql, params });
    if (/WITH previous AS/.test(sql)) return { rows: [{ name_title: params[3], display_name: `${params[3]} Amani` }], rowCount: 1 };
    return { rows: allowed ? [{ id: 'assignment' }] : [], rowCount: allowed ? 1 : 0 };
  } } as never, {} as never);
  return { service, queries };
}

test('title changes bind the authenticated school/user and atomically write profile, audit and workflow event', async () => {
  const { service, queries } = setup();
  const result = await service.saveSettings('school-a', 'teacher-a', 'class-a', { nameTitle: 'Mrs.', defaultView: 'Overview', notificationsEnabled: true, userId: 'someone-else', tenant_id: 'school-b' });
  const write = queries.find(query => /WITH previous AS/.test(query.sql))!;
  assert.deepEqual(write.params.slice(0, 4), ['school-a', 'teacher-a', 'class-a', 'Mrs.']);
  assert.match(write.sql, /UPDATE staff_profiles/);
  assert.match(write.sql, /INSERT INTO staff_audit_logs/);
  assert.match(write.sql, /INSERT INTO workflow_events/);
  assert.match(write.sql, /staff\.tenant_id = \$1/);
  assert.ok('nameTitle' in result.settings);
  assert.equal(result.settings.nameTitle, 'Mrs.');
});

test('invalid titles and unassigned teachers cannot mutate a staff profile', async () => {
  for (const nameTitle of ['Administrator', '<script>', null, {}, 'Mrs. Dr.']) {
    const { service, queries } = setup();
    await assert.rejects(service.saveSettings('school-a', 'teacher-a', 'class-a', { nameTitle }), /valid name title/);
    assert.ok(!queries.some(query => /UPDATE staff_profiles/.test(query.sql)));
  }
  const { service, queries } = setup(false);
  await assert.rejects(service.saveSettings('school-a', 'teacher-a', 'class-a', { nameTitle: 'Mr.' }));
  assert.ok(!queries.some(query => /UPDATE staff_profiles/.test(query.sql)));
});
