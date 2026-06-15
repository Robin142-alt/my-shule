import assert from 'node:assert/strict';
import test from 'node:test';

import { RequestContextService } from '../common/request-context/request-context.service';
import { BillingFeatureMiddleware } from './billing-feature.middleware';

function createContext(path: string) {
  return {
    request_id: 'req-billing-feature-middleware',
    tenant_id: 'default',
    tenant_source: 'base_domain_default' as const,
    user_id: 'anonymous',
    role: 'guest',
    session_id: null,
    permissions: [],
    is_authenticated: false,
    client_ip: '127.0.0.1',
    user_agent: 'test-suite',
    method: 'POST',
    path,
    started_at: '2026-06-15T00:00:00.000Z',
  };
}

test('BillingFeatureMiddleware bypasses public auth routes before resolving billing access', async () => {
  const requestContext = new RequestContextService();
  const middleware = new BillingFeatureMiddleware(
    requestContext,
    {
      resolveForTenant: async () => {
        throw new Error('auth routes must not depend on billing access resolution');
      },
    } as never,
  );

  let nextCalled = false;
  let nextError: unknown;

  await requestContext.run(createContext('/auth/login'), async () => {
    await middleware.use(
      {
        path: '/auth/login',
        originalUrl: '/auth/login',
        url: '/auth/login',
      } as never,
      {} as never,
      ((error?: unknown) => {
        nextCalled = true;
        nextError = error;
      }) as never,
    );
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError, undefined);
  assert.equal(requestContext.getStore()?.billing, undefined);
});

test('BillingFeatureMiddleware degrades to unconfigured access when billing lookup fails', async () => {
  const requestContext = new RequestContextService();
  const middleware = new BillingFeatureMiddleware(
    requestContext,
    {
      resolveForTenant: async () => {
        throw new Error('billing projection unavailable');
      },
    } as never,
  );

  let nextCalled = false;
  let nextError: unknown;
  let accessMode: string | null | undefined;
  let isActive: boolean | undefined;

  await requestContext.run(createContext('/admin-command/principal/overview'), async () => {
    await middleware.use(
      {
        path: '/admin-command/principal/overview',
        originalUrl: '/admin-command/principal/overview',
        url: '/admin-command/principal/overview',
      } as never,
      {} as never,
      ((error?: unknown) => {
        nextCalled = true;
        nextError = error;
      }) as never,
    );
    accessMode = requestContext.getStore()?.billing?.access_mode;
    isActive = requestContext.getStore()?.billing?.is_active;
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError, undefined);
  assert.equal(accessMode, null);
  assert.equal(isActive, false);
});
