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

test('RedisService ping reports degraded quickly when Redis does not answer', async () => {
  const service = new RedisService(
    {
      status: 'ready',
      ping: async () => new Promise(() => undefined),
      disconnect: () => undefined,
    } as never,
    {
      get: (key: string) => {
        const values: Record<string, unknown> = {
          'redis.required': 'true',
          'redis.connectTimeoutMs': 20,
        };

        return values[key];
      },
    } as never,
  );

  const startedAt = Date.now();
  const status = await service.ping();

  assert.equal(status, 'degraded');
  assert.equal(service.isDegraded(), true);
  assert.equal(Date.now() - startedAt < 250, true);
});

test('RedisService startup degrades quickly when required Redis does not answer', async () => {
  const service = new RedisService(
    {
      status: 'wait',
      connect: async () => new Promise(() => undefined),
      ping: async () => new Promise(() => undefined),
      disconnect: () => undefined,
    } as never,
    {
      get: (key: string) => {
        const values: Record<string, unknown> = {
          'redis.required': 'true',
          'redis.connectTimeoutMs': 20,
        };

        return values[key];
      },
    } as never,
  );

  const startedAt = Date.now();
  await service.onModuleInit();

  assert.equal(service.isDegraded(), true);
  assert.equal(Date.now() - startedAt < 500, true);
});

test('RedisService cached degraded pings do not keep touching the client', async () => {
  let pingCalls = 0;
  const service = new RedisService(
    {
      status: 'ready',
      ping: async () => {
        pingCalls += 1;
        throw new Error('redis unavailable');
      },
      disconnect: () => undefined,
    } as never,
    {
      get: (key: string) => {
        const values: Record<string, unknown> = {
          'redis.required': 'true',
          'redis.connectTimeoutMs': 20,
          'redis.degradedRetryAfterMs': 60000,
        };

        return values[key];
      },
    } as never,
  );

  assert.equal(await service.ping(), 'degraded');
  assert.equal(await service.ping(), 'degraded');
  assert.equal(pingCalls, 1);
});
