import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import type { NextFunction } from 'express';
import type { Request, Response } from 'express';

import { RequestContextService } from '../common/request-context/request-context.service';
import { TenantMiddleware } from './tenant.middleware';

class TestResponse extends EventEmitter {
  statusCode = 200;
}

function createRequestContext() {
  return {
    request_id: 'req-tenant-middleware',
    tenant_id: null,
    user_id: '00000000-0000-0000-0000-000000000000',
    role: null,
    session_id: null,
    permissions: [],
    is_authenticated: false,
    client_ip: '127.0.0.1',
    user_agent: 'test-suite',
    method: 'GET',
    path: '/events/dashboard/stream',
    started_at: '2026-05-25T08:30:00.000Z',
  };
}

test('TenantMiddleware defers request transactions for dashboard SSE streams', async () => {
  const requestContext = new RequestContextService();
  const calls = {
    acquireClient: 0,
    initializeRequestSession: 0,
    release: 0,
  };
  const response = new TestResponse();
  const middleware = new TenantMiddleware(
    {
      resolveTenantContextForRequest: async () => ({
        tenant_id: 'tenant-a',
        source: 'signed_header',
      }),
    } as never,
    requestContext,
  );

  await requestContext.run(createRequestContext(), async () => {
    let nextError: unknown;
    let nextCalled = false;

    await middleware.use(
      {
        headers: {
          host: 'tenant-a.myshule.localhost',
          'x-tenant-id': 'tenant-a',
          accept: 'text/event-stream',
        },
      } as unknown as Request,
      response as unknown as Response,
      ((error?: unknown) => {
        nextCalled = true;
        nextError = error;
      }) as NextFunction,
    );

    assert.equal(nextCalled, true);
    assert.equal(nextError, undefined);
    assert.equal(requestContext.requireStore().tenant_id, 'tenant-a');
    assert.equal(requestContext.requireStore().tenant_source, 'signed_header');
  });

  assert.deepEqual(calls, {
    acquireClient: 0,
    initializeRequestSession: 0,
    release: 0,
  });
});

test('TenantMiddleware bypasses tenant resolution for liveness health probes', async () => {
  const requestContext = new RequestContextService();
  const calls = {
    resolveTenant: 0,
    acquireClient: 0,
    initializeRequestSession: 0,
  };
  const response = new TestResponse();
  const middleware = new TenantMiddleware(
    {
      resolveTenantContextForRequest: async () => {
        calls.resolveTenant += 1;
        throw new Error('health probes must not resolve tenant context');
      },
    } as never,
    requestContext,
  );

  await requestContext.run(
    {
      ...createRequestContext(),
      path: '/health',
    },
    async () => {
      await middleware.use(
        {
          headers: {
            host: 'myshule.localhost',
            accept: 'application/json',
          },
          path: '/health',
        } as unknown as Request,
        response as unknown as Response,
        ((error?: unknown) => {
          assert.equal(error, undefined);
        }) as NextFunction,
      );

      assert.equal(requestContext.requireStore().tenant_id, null);
      assert.equal(requestContext.requireStore().tenant_source, null);
    },
  );

  assert.deepEqual(calls, {
    resolveTenant: 0,
    acquireClient: 0,
    initializeRequestSession: 0,
  });
});

test('TenantMiddleware resolves tenant context for readiness health probes', async () => {
  const requestContext = new RequestContextService();
  const calls = {
    resolveTenant: 0,
    acquireClient: 0,
    initializeRequestSession: 0,
    release: 0,
  };
  const response = new TestResponse();
  const middleware = new TenantMiddleware(
    {
      resolveTenantContextForRequest: async () => {
        calls.resolveTenant += 1;
        return {
          tenant_id: 'tenant-ready',
          source: 'subdomain',
        };
      },
    } as never,
    requestContext,
  );

  await requestContext.run(
    {
      ...createRequestContext(),
      path: '/health/ready',
    },
    async () => {
      await middleware.use(
        {
          headers: {
            host: 'tenant-ready.myshule.localhost',
            accept: 'application/json',
          },
          path: '/health/ready',
        } as unknown as Request,
        response as unknown as Response,
        ((error?: unknown) => {
          assert.equal(error, undefined);
        }) as NextFunction,
      );

      assert.equal(requestContext.requireStore().tenant_id, 'tenant-ready');
      assert.equal(requestContext.requireStore().tenant_source, 'subdomain');
    },
  );

  assert.deepEqual(calls, {
    resolveTenant: 1,
    acquireClient: 0,
    initializeRequestSession: 0,
    release: 0,
  });
});

test('TenantMiddleware defers request transactions for CORS preflight requests', async () => {
  const requestContext = new RequestContextService();
  const calls = {
    acquireClient: 0,
    initializeRequestSession: 0,
  };
  const response = new TestResponse();
  const middleware = new TenantMiddleware(
    {
      resolveTenantContextForRequest: async () => ({
        tenant_id: 'tenant-a',
        source: 'subdomain',
      }),
    } as never,
    requestContext,
  );

  await requestContext.run(
    {
      ...createRequestContext(),
      method: 'OPTIONS',
      path: '/students',
    },
    async () => {
      await middleware.use(
        {
          method: 'OPTIONS',
          headers: {
            host: 'tenant-a.myshule.localhost',
            accept: '*/*',
            origin: 'https://myshule.online',
            'access-control-request-method': 'GET',
          },
          path: '/students',
        } as unknown as Request,
        response as unknown as Response,
        ((error?: unknown) => {
          assert.equal(error, undefined);
        }) as NextFunction,
      );

      assert.equal(requestContext.requireStore().tenant_id, 'tenant-a');
      assert.equal(requestContext.requireStore().tenant_source, 'subdomain');
    },
  );

  assert.deepEqual(calls, {
    acquireClient: 0,
    initializeRequestSession: 0,
  });
});

test('TenantMiddleware leaves transaction lifecycle to explicit service transactions', async () => {
  const requestContext = new RequestContextService();
  const queries: string[] = [];
  const response = new TestResponse();
  const middleware = new TenantMiddleware(
    {
      resolveTenantContextForRequest: async () => ({
        tenant_id: 'tenant-a',
        source: 'subdomain',
      }),
    } as never,
    requestContext,
  );

  await requestContext.run(createRequestContext(), async () => {
    await middleware.use(
      {
        headers: {
          host: 'tenant-a.myshule.localhost',
          accept: 'application/json',
        },
      } as unknown as Request,
      response as unknown as Response,
      ((error?: unknown) => {
        assert.equal(error, undefined);
      }) as NextFunction,
    );

    assert.equal(requestContext.requireStore().db_client, undefined);
  });

  assert.deepEqual(queries, []);
});
