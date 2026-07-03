import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { SecretaryController } from './secretary.controller';

test('SecretaryController lists tenant-scoped visitors from real visitor logs', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const controller = new SecretaryController(
    {
      visitorLog: {
        findMany: async (input: Record<string, unknown>) => {
          calls.push(input);
          return [{
            id: 'visit-1',
            visitor: { fullName: 'Visitor One', phone: '0712000000', idNumber: 'ID-1' },
            personToSeeUserId: 'staff-1',
            studentToSeeId: null,
            purpose: 'Fees office',
            passNumber: 'PASS-1',
            status: 'CHECKED_IN',
            timeIn: new Date('2026-05-21T08:30:00.000Z'),
          }];
        },
      },
    } as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
  );

  const visitors = await controller.getVisitors();

  assert.deepEqual(calls[0]?.where, { schoolId: 'tenant-a' });
  assert.deepEqual(visitors, [{
    id: 'visit-1',
    visitor: 'Visitor One',
    phoneOrId: '0712000000',
    visiting: 'staff-1',
    reason: 'Fees office',
    vehicle: 'PASS-1',
    status: 'Inside',
    checkInTime: '2026-05-21T08:30:00.000Z',
    slipPrinted: true,
  }]);
});

test('SecretaryController lists tenant-scoped inquiries and surfaces query failures', async () => {
  const controller = new SecretaryController(
    {
      workflowTask: {
        findMany: async () => [{
          id: 'task-1',
          title: 'Inquiry: Parent One',
          description: JSON.stringify({
            parent: 'Parent One',
            student: 'Learner One',
            className: 'Class A',
            phone: '0712000000',
            issue: 'Fee statement',
            department: 'Finance',
            status: 'Waiting',
            smsSent: false,
          }),
          createdAt: new Date('2026-05-21T08:30:00.000Z'),
        }],
      },
    } as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
  );

  assert.deepEqual(await controller.getInquiries(), [{
    id: 'task-1',
    parent: 'Parent One',
    student: 'Learner One',
    className: 'Class A',
    phone: '0712000000',
    issue: 'Fee statement',
    department: 'Finance',
    status: 'Waiting',
    smsSent: false,
  }]);

  const failingController = new SecretaryController(
    {
      visitorLog: {
        findMany: async () => {
          throw new Error('secretary database unavailable');
        },
      },
    } as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
  );

  await assert.rejects(() => failingController.getVisitors(), /secretary database unavailable/);
});
