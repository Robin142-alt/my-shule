import assert from 'node:assert/strict';
import test from 'node:test';

import { RateLimitMiddleware } from './rate-limit.middleware';

test('RateLimitMiddleware skips all health probe routes', async () => {
  const middleware = new RateLimitMiddleware(
    {
      evaluateRequest: async () => {
        throw new Error('health probes must not depend on Redis rate limiting');
      },
    } as never,
    {
      warn: () => undefined,
    } as never,
  );
  let nextCalled = false;

  await middleware.use(
    {
      path: '/health/ready',
      originalUrl: '/health/ready',
      url: '/health/ready',
    } as never,
    {
      setHeader: () => undefined,
    } as never,
    ((error?: Error) => {
      assert.equal(error, undefined);
      nextCalled = true;
    }) as never,
  );

  assert.equal(nextCalled, true);
});
