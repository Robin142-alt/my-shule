import assert from 'node:assert/strict';
import test from 'node:test';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

import { RequestContextService } from '../common/request-context/request-context.service';
import { buildDatabasePoolOptions } from './database.module';
import { DatabaseService } from './database.service';
import { buildTenantSessionSettingsQuery } from './prisma.service';

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

class OrderedBootstrapClient {
  released = false;

  constructor(
    private readonly label: string,
    private readonly log: string[],
  ) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<T>> {
    const normalizedText = text.startsWith('SELECT pg_advisory_xact_lock')
      ? 'LOCK'
      : text;

    this.log.push(`${this.label}:${normalizedText}`);

    if (text === 'SCHEMA ONE') {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return {
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
      rows: [{ ok: true, values }] as unknown as T[],
    };
  }

  release(): void {
    this.released = true;
    this.log.push(`${this.label}:release`);
  }
}

class OrderedBootstrapPool {
  readonly queryLog: string[] = [];
  connectCalls = 0;

  async connect(): Promise<PoolClient> {
    this.connectCalls += 1;
    return new OrderedBootstrapClient(
      `client-${this.connectCalls}`,
      this.queryLog,
    ) as unknown as PoolClient;
  }

  async query<T extends QueryResultRow = QueryResultRow>(): Promise<QueryResult<T>> {
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

test('buildDatabasePoolOptions keeps serverless API pools small by default', () => {
  const options = buildDatabasePoolOptions({
    get: (key: string) => {
      const values: Record<string, unknown> = {
        'database.url': 'postgres://myshule:secret@ep-pooled.neon.tech:5432/myshule?sslmode=require',
        'database.ssl': false,
        'database.statementTimeoutMs': 5000,
        'database.connectionTimeoutMs': 1500,
        'database.idleTimeoutMs': 10000,
        'database.workerMaxConnections': 2,
        'app.runtime': 'serverless',
        'app.isServerlessRuntime': true,
      };

      return values[key];
    },
  } as never);

  assert.equal(options.max, 3);
  assert.equal(options.allowExitOnIdle, true);
  assert.equal(options.ssl !== undefined, true);
});

test('buildTenantSessionSettingsQuery binds tenant and user context without string interpolation', () => {
  const statement = buildTenantSessionSettingsQuery(
    "tenant-a'; SELECT pg_sleep(10); --",
    "user-b'; DROP TABLE students; --",
  ) as any;

  assert.equal(statement.sql.includes('pg_sleep'), false);
  assert.equal(statement.sql.includes('DROP TABLE'), false);
  assert.deepEqual(statement.values, [
    "tenant-a'; SELECT pg_sleep(10); --",
    "user-b'; DROP TABLE students; --",
  ]);
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
  assert.deepEqual(pool.client.queries.map((query) => normalizeSql(query.text)), [
    'BEGIN',
    'SET LOCAL ROLE my_shule_runtime',
    'SELECT set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true), set_config($7, $8, true), set_config($9, $10, true), set_config($11, $12, true), set_config($13, $14, true), set_config($15, $16, true), set_config($17, $18, true), set_config($19, $20, true), set_config($21, $22, true)',
    'SELECT 42',
    'COMMIT',
  ]);
  assert.deepEqual(pool.client.queries[2]?.values, [
    'app.tenant_id',
    'tenant-a',
    'app.user_id',
    '00000000-0000-0000-0000-000000000001',
    'app.request_id',
    'req-1',
    'app.role',
    'owner',
    'app.session_id',
    'session-1',
    'app.method',
    'GET',
    'app.path',
    '/students',
    'app.client_ip',
    '',
    'app.user_agent',
    'database.test',
    'app.started_at',
    '2026-04-26T00:00:00.000Z',
    'app.is_authenticated',
    'true',
  ]);
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

test('DatabaseService.runSchemaBootstrap serializes concurrent schema bootstraps inside one process', async () => {
  const requestContext = new RequestContextService();
  const pool = new OrderedBootstrapPool();
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

  await Promise.all([
    service.runSchemaBootstrap('SCHEMA ONE'),
    service.runSchemaBootstrap('SCHEMA TWO'),
  ]);

  assert.deepEqual(pool.queryLog, [
    'client-1:BEGIN',
    "client-1:SET LOCAL lock_timeout = '10s'",
    "client-1:SET LOCAL statement_timeout = '60s'",
    'client-1:LOCK',
    'client-1:SCHEMA ONE',
    'client-1:COMMIT',
    'client-1:release',
    'client-2:BEGIN',
    "client-2:SET LOCAL lock_timeout = '10s'",
    "client-2:SET LOCAL statement_timeout = '60s'",
    'client-2:LOCK',
    'client-2:SCHEMA TWO',
    'client-2:COMMIT',
    'client-2:release',
  ]);
});

test('DatabaseService.runSchemaBootstrap reuses identical schema bootstraps inside one process', async () => {
  const requestContext = new RequestContextService();
  const pool = new OrderedBootstrapPool();
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

  await Promise.all([
    service.runSchemaBootstrap('SCHEMA DEDUPE'),
    service.runSchemaBootstrap('SCHEMA DEDUPE'),
  ]);

  assert.deepEqual(pool.queryLog, [
    'client-1:BEGIN',
    "client-1:SET LOCAL lock_timeout = '10s'",
    "client-1:SET LOCAL statement_timeout = '60s'",
    'client-1:LOCK',
    'client-1:SCHEMA DEDUPE',
    'client-1:COMMIT',
    'client-1:release',
  ]);
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
  assert.deepEqual(pool.client.queries.map((query) => normalizeSql(query.text)), [
    'BEGIN',
    'SET LOCAL ROLE my_shule_runtime',
    'SELECT set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true), set_config($7, $8, true), set_config($9, $10, true), set_config($11, $12, true), set_config($13, $14, true), set_config($15, $16, true), set_config($17, $18, true), set_config($19, $20, true), set_config($21, $22, true)',
    'INSERT INTO auth_mfa_challenges DEFAULT VALUES',
    'COMMIT',
  ]);
  assert.deepEqual(pool.client.queries[2]?.values, [
    'app.tenant_id',
    '',
    'app.user_id',
    'anonymous',
    'app.request_id',
    'req-independent',
    'app.role',
    'guest',
    'app.session_id',
    '',
    'app.method',
    'POST',
    'app.path',
    '/auth/login',
    'app.client_ip',
    '',
    'app.user_agent',
    'database.test',
    'app.started_at',
    '2026-05-17T00:00:00.000Z',
    'app.is_authenticated',
    'false',
  ]);
});

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}
