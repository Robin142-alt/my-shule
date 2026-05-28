import assert from 'node:assert/strict';
import test from 'node:test';

import { Logger } from '@nestjs/common';

import { buildRedisClientOptions } from './redis.options';
import { RedisService } from './redis.service';

test('buildRedisClientOptions enables TLS from explicit production Redis flag', () => {
  const options = buildRedisClientOptions(
    {
      get: (key: string) => {
        const values: Record<string, unknown> = {
          'redis.url': 'redis://cache.example.test:6379',
          'redis.tlsEnabled': true,
          'redis.connectTimeoutMs': 1500,
          'app.isServerlessRuntime': true,
        };

        return values[key];
      },
    } as never,
    new Logger('RedisOptionsTest'),
  );

  assert.deepEqual(options.clientOptions.tls, {});
  assert.deepEqual(options.bullConnection.tls, {});
});

test('RedisService treats string false required config as optional degradation', async () => {
  const error = new Error('redis unavailable');
  const service = new RedisService(
    {
      status: 'wait',
      connect: async () => {
        throw error;
      },
      ping: async () => {
        throw error;
      },
    } as never,
    {
      get: (key: string) => (key === 'redis.required' ? 'false' : undefined),
    } as never,
  );

  await service.onModuleInit();

  assert.equal(service.isDegraded(), true);
  assert.equal(await service.ping(), 'degraded');
});
