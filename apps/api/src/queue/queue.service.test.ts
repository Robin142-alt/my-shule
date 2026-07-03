import assert from 'node:assert/strict';
import test from 'node:test';

import { ServiceUnavailableException } from '@nestjs/common';

import { QueueService } from './queue.service';

test('QueueService fails fast without creating BullMQ queues when Redis is degraded', async () => {
  const service = new QueueService(
    {
      isDegraded: () => true,
      getBullConnectionOptions: () => {
        throw new Error('BullMQ options should not be requested while Redis is degraded');
      },
    } as never,
    {
      get: () => undefined,
    } as never,
  );

  assert.throws(
    () => service.getQueue('events'),
    ServiceUnavailableException,
  );

  await assert.rejects(
    () => service.add('job', { ok: true }, undefined, 'events'),
    ServiceUnavailableException,
  );

  await assert.rejects(
    () => service.addBulk([{ job_name: 'job', payload: { ok: true } }], 'events'),
    ServiceUnavailableException,
  );

  await assert.rejects(
    () => service.getJobCounts('events'),
    ServiceUnavailableException,
  );

  await assert.rejects(
    () => service.getQueueLagSnapshot('events'),
    ServiceUnavailableException,
  );
});
