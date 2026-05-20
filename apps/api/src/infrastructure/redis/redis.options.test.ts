import assert from 'node:assert/strict';
import test from 'node:test';

import { Logger } from '@nestjs/common';

import { buildRedisClientOptions } from './redis.options';

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
