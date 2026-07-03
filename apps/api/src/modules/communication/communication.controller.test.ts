import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { CommunicationController } from './communication.controller';

test('CommunicationController is gated by communication_sms module and permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, CommunicationController), ['communication_sms']);
  
  const sendSmsHandler = Object.getOwnPropertyDescriptor(CommunicationController.prototype, 'sendSms')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, sendSmsHandler), ['school_sms:send']);
});

test('CommunicationController cancels scheduled broadcasts only inside the current tenant', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const controller = new CommunicationController(
    {
      communicationBroadcast: {
        updateMany: async (input: Record<string, unknown>) => {
          calls.push(input);
          return { count: 1 };
        },
      },
    } as never,
    {} as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {} as never,
  );

  const result = await controller.cancelBroadcast('broadcast-1');

  assert.equal(result.success, true);
  assert.deepEqual(calls[0].where, {
    id: 'broadcast-1',
    schoolId: 'tenant-a',
    status: { in: ['PENDING', 'SCHEDULED', 'DRAFT'] },
  });
});

test('CommunicationController returns tenant-scoped message and summary rows from broadcasts', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const broadcast = {
    id: 'broadcast-1',
    createdAt: new Date('2026-05-21T07:00:00.000Z'),
    audience: 'parents',
    channels: ['sms', 'email'],
    status: 'SENT',
    userId: 'user-1',
    message: 'Exam timetable released',
  };
  const controller = new CommunicationController(
    {
      communicationBroadcast: {
        findMany: async (input: Record<string, unknown>) => {
          calls.push(input);
          return [broadcast];
        },
      },
    } as never,
    {} as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {} as never,
  );

  const summary = await controller.getSummary();
  const messages = await controller.getMessages();

  assert.deepEqual(calls.map((call) => call.where), [{ schoolId: 'tenant-a' }, { schoolId: 'tenant-a' }]);
  assert.equal(summary.totalBroadcasts, 1);
  assert.deepEqual(summary.metrics, { total: 1, sent: 1, pending: 0, failed: 0 });
  assert.deepEqual(messages, [{
    id: 'broadcast-1',
    date: '2026-05-21T07:00:00.000Z',
    recipient: 'parents',
    channel: 'sms, email',
    message_type: 'Broadcast',
    status: 'SENT',
    sent_by: 'user-1',
    message: 'Exam timetable released',
  }]);
});

test('CommunicationController does not hide broadcast database failures as empty communication data', async () => {
  const controller = new CommunicationController(
    {
      communicationBroadcast: {
        findMany: async () => {
          throw new Error('communication database unavailable');
        },
      },
    } as never,
    {} as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {} as never,
  );

  await assert.rejects(() => controller.getMessages(), /communication database unavailable/);
  await assert.rejects(() => controller.getSummary(), /communication database unavailable/);
});
