import assert from 'node:assert/strict';
import test from 'node:test';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

import { RequestContextService } from '../common/request-context/request-context.service';
import { buildDatabasePoolOptions } from './database.module';
import { DatabaseService } from './database.service';

interface RecordedQuery {
  text: string;
  values?: unknown[];
}

class FakePoolClient {
  readonly queries: RecordedQuery[] = [];
  released = false;

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    this.queries.push({ text, values });

    return {
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [{ ok: true }] as unknown as T[],
    };
  }

  release(): void {
    this.released = true;
  }
}

class FakePool {
  readonly queryCalls: RecordedQuery[] = [];
  readonly client = new FakePoolClient();
  connectCalls = 0;

  async connect(): Promise<PoolClient> {
    this.connectCalls += 1;
    return this.client as unknown as PoolClient;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    this.queryCalls.push({ text, values });

    return {
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [{ ok: true }] as unknown as T[],
    };
  }

  async end(): Promise<void> {
    return Promise.resolve();
  }
}

test('buildDatabasePoolOptions enables PostgreSQL SSL from explicit production flag', () => {
  const options = buildDatabasePoolOptions({
    get: (key: string) => {
      const values: Record<string, unknown> = {
        'database.url': 'postgres://myshule:secret@db.example.test:5432/myshule',
        'database.ssl': true,
        'database.statementTimeoutMs': 5000,
        'database.connectionTimeoutMs': 1500,
        'database.apiMaxConnections': 15,
        'database.workerMaxConnections': 5,
        'database.idleTimeoutMs': 10000,
        'app.runtime': 'server',
      };

      return values[key];
    },
  } as never);

  assert.deepEqual(options.ssl, { rejectUnauthorized: false });
  assert.equal(options.max, 15);
});

test('DatabaseService.query scopes request-context calls into a transaction-local session', async () => {
  const requestContext = new RequestContextService();
  const pool = new FakePool();
  const service = new DatabaseService(
    pool as never,
    requestContext,
    {
      getRuntimeRoleName: () => 'my_shule_runtime',
    } as never,
    {
      get: () => undefined,
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-1',
      tenant_id: 'tenant-a',
      user_id: '00000000-0000-0000-0000-000000000001',
      role: 'owner',
      session_id: 'session-1',
      permissions: ['students:read'],
      is_authenticated: true,
      client_ip: null,
      user_agent: 'database.test',
      method: 'GET',
      path: '/students',
      started_at: '2026-04-26T00:00:00.000Z',
    },
    async () => {
      await service.query('SELECT 42');
    },
  );

  assert.equal(pool.connectCalls, 1);
  assert.equal(pool.client.released, true);
  assert.deepEqual(
    pool.client.queries.map((query) => query.text),
    [
      'BEGIN',
      "SET LOCAL ROLE my_shule_runtime; SET LOCAL app.tenant_id = 'tenant-a'; SET LOCAL app.user_id = '00000000-0000-0000-0000-000000000001'; SET LOCAL app.request_id = 'req-1'; SET LOCAL app.role = 'owner'; SET LOCAL app.session_id = 'session-1'; SET LOCAL app.method = 'GET'; SET LOCAL app.path = '/students'; SET LOCAL app.client_ip = ''; SET LOCAL app.user_agent = 'database.test'; SET LOCAL app.started_at = '2026-04-26T00:00:00.000Z'; SET LOCAL app.is_authenticated = 'true'",
      'SELECT 42',
      'COMMIT',
    ],
  );
});

test('DatabaseService.query bypasses request transactions for safe public read-only GETs', async () => {
  const requestContext = new RequestContextService();
  const pool = new FakePool();
  const service = new DatabaseService(
    pool as never,
    requestContext,
    {
      getRuntimeRoleName: () => 'my_shule_runtime',
    } as never,
    {
      get: () => undefined,
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-public-read',
      tenant_id: null,
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: null,
      user_agent: 'database.test',
      method: 'GET',
      path: '/health/ready',
      started_at: '2026-05-20T00:00:00.000Z',
    },
    async () => {
      await service.query('SELECT 1');
    },
  );

  assert.equal(pool.connectCalls, 0);
  assert.deepEqual(pool.queryCalls, [{ text: 'SELECT 1', values: [] }]);
});

test('DatabaseService.query uses the raw pool when no request context exists', async () => {
  const requestContext = new RequestContextService();
  const pool = new FakePool();
  const service = new DatabaseService(
    pool as never,
    requestContext,
    {
      getRuntimeRoleName: () => 'my_shule_runtime',
    } as never,
    {
      get: () => undefined,
    } as never,
  );

  await service.query('SELECT 1');

  assert.equal(pool.connectCalls, 0);
  assert.deepEqual(pool.queryCalls, [{ text: 'SELECT 1', values: [] }]);
});

test('DatabaseService.withIndependentRequestTransaction commits outside the request client', async () => {
  const requestContext = new RequestContextService();
  const pool = new FakePool();
  const service = new DatabaseService(
    pool as never,
    requestContext,
    {
      getRuntimeRoleName: () => 'my_shule_runtime',
    } as never,
    {
      get: () => undefined,
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-independent',
      tenant_id: null,
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: null,
      user_agent: 'database.test',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-05-17T00:00:00.000Z',
      db_client: {
        query: async () => {
          throw new Error('request client should not be used');
        },
      } as never,
    },
    async () => {
      await service.withIndependentRequestTransaction(async (client) => {
        await client.query('INSERT INTO auth_mfa_challenges DEFAULT VALUES');
      });
    },
  );

  assert.equal(pool.connectCalls, 1);
  assert.equal(pool.client.released, true);
  assert.deepEqual(
    pool.client.queries.map((query) => query.text),
    [
      'BEGIN',
      "SET LOCAL ROLE my_shule_runtime; SET LOCAL app.tenant_id = ''; SET LOCAL app.user_id = 'anonymous'; SET LOCAL app.request_id = 'req-independent'; SET LOCAL app.role = 'guest'; SET LOCAL app.session_id = ''; SET LOCAL app.method = 'POST'; SET LOCAL app.path = '/auth/login'; SET LOCAL app.client_ip = ''; SET LOCAL app.user_agent = 'database.test'; SET LOCAL app.started_at = '2026-05-17T00:00:00.000Z'; SET LOCAL app.is_authenticated = 'false'",
      'INSERT INTO auth_mfa_challenges DEFAULT VALUES',
      'COMMIT',
    ],
  );
});
