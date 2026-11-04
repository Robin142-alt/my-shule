import assert from 'node:assert/strict';
import test from 'node:test';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { AdmissionsCommandService } from './admissions-command.service';

test('application approval refreshes the same school only after canonical admission succeeds', async () => {
  const context = new RequestContextService();
  const events: any[] = [];
  const student = { id: 'learner', firstName: 'Test', lastName: 'Learner', admissionNumber: 'ADM-1' };
  const service = new AdmissionsCommandService(context, {
    recordWorkflowAction: async (event: any) => { events.push(event); },
  } as never, {
    approveApplication: async (tenant: string, id: string, actor: string) => {
      assert.equal(tenant, 'school-a');
      assert.equal(actor, 'officer');
      if (id === 'rejected') throw new Error('Application is already processed');
      return student;
    },
  } as never, {} as never, {} as never);
  await assert.rejects(service.approveApplication('application'), /Tenant context/);
  await context.run({ tenant_id: 'school-a', user_id: 'officer', role: 'admissions_officer' } as never, async () => {
    assert.equal(await service.approveApplication('application'), student);
    await assert.rejects(service.approveApplication('rejected'), /already processed/);
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].tenantId, 'school-a');
  assert.equal(events[0].entityId, student.id);
  assert.equal(events[0].eventType, 'admissions.student.admitted');
  assert.ok(events[0].targetRoles.includes('teacher'));
});

function fixture(link: Record<string, unknown> | null, delivery: Record<string, unknown> = {}) {
  const context = new RequestContextService();
  const calls: Array<{ action: string; args: unknown[] }> = [];
  const service = new AdmissionsCommandService(context, {
    recordAudit: async (...args: unknown[]) => calls.push({ action: 'audit', args }),
  } as never, {
    findParentLink: async (...args: unknown[]) => { calls.push({ action: 'read', args }); return link; },
    bindParentInvitation: async (...args: unknown[]) => calls.push({ action: 'bind', args }),
    linkParent: async (...args: unknown[]) => { calls.push({ action: 'link', args }); return link; },
  } as never, {
    sendSms: async (...args: unknown[]) => { calls.push({ action: 'sms', args }); return { success: true, status: 'Pending', messageId: 'queue-id' }; },
  } as never, {
    inviteTenantUser: async (...args: unknown[]) => { calls.push({ action: 'email', args }); return { id: 'invitation-id', status: 'email_failed', invitation_message: 'Provider unavailable', ...delivery }; },
  } as never);
  const run = () => context.run({ tenant_id: 'school-a', user_id: 'officer', role: 'admissions_officer' } as never, () => service.sendParentInvitation('link-id'));
  return { run, calls, service, context };
}

test('phone-linked guardians receive real queued portal instructions with a retry-safe key', async () => {
  const { run, calls } = fixture({ guardian_profile_id: 'profile', phone: '+254700000001' });
  const result = await run();
  await run();
  assert.equal(result.status, 'Pending');
  assert.match(result.message!, /queued/);
  assert.deepEqual(calls[0], { action: 'read', args: ['school-a', 'link-id'] });
  const sends = calls.filter(call => call.action === 'sms').map(call => call.args[0] as Record<string, unknown>);
  assert.equal(sends[0].tenantId, 'school-a');
  assert.equal(sends[0].idempotencyKey, sends[1].idempotencyKey);
  assert.match(String(sends[0].message), /parent\/login/);
  assert.equal(calls.some(call => call.action === 'bind'), false);
});

test('failed email delivery is returned truthfully while preserving its invitation binding', async () => {
  const { run, calls } = fixture({ student_id: 'student', email: 'parent@example.test', display_name: 'Parent' });
  const result = await run();
  assert.equal(result.status, 'email_failed');
  assert.equal(result.message, 'Provider unavailable');
  assert.deepEqual(calls.find(call => call.action === 'bind')?.args, ['school-a', 'link-id', 'invitation-id']);
  assert.ok(calls.some(call => call.action === 'audit'));
});

test('missing school or guardian never sends an invitation', async () => {
  const { service, run, calls } = fixture(null);
  await assert.rejects(service.sendParentInvitation('link-id'), /Tenant context/);
  await assert.rejects(run(), /not found for this school/);
  assert.equal(calls.some(call => ['sms', 'email'].includes(call.action)), false);
});

test('a phone-less guardian remains linked without a false invitation success', async () => {
  const { run, calls } = fixture({ guardian_profile_id: 'profile', phone: null, email: null });
  await assert.rejects(run(), /Add a guardian phone or email/);
  assert.equal(calls.some(call => ['sms', 'email'].includes(call.action)), false);
});

test('guardian links reject malformed and oversized email before persistence', async () => {
  const { context, service, calls } = fixture({ id: 'link', student_id: 'student' });
  for (const email of ['not-an-email', 'parent@@example.test', '!@!.' + '!.'.repeat(100_000)]) {
    await context.run({ tenant_id: 'school-a', user_id: 'officer' } as never, () =>
      assert.rejects(service.linkParent({ parent_email: email, relationship: 'mother' }), /valid parent email/));
  }
  assert.equal(calls.length, 0);
  await context.run({ tenant_id: 'school-a', user_id: 'officer' } as never, () =>
    service.linkParent({ id: 'student', parent_email: ' parent@example.test ', relationship: 'mother' }));
  assert.deepEqual(calls.find(call => call.action === 'link')?.args, ['school-a', {
    id: 'student', parent_email: 'parent@example.test', relationship: 'mother',
  }]);
  assert.ok(calls.some(call => call.action === 'audit'));
});
