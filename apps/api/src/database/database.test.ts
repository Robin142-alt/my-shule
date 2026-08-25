import assert from 'node:assert/strict';
import test from 'node:test';
import type { PoolClient, QueryResult, QueryResultRow } from 'pg';

import { RequestContextService } from '../common/request-context/request-context.service';
import { buildDatabasePoolOptions } from './database.module';
import { DatabaseSecurityService } from './database-security.service';
import { DatabaseService } from './database.service';
import {
  buildRequestSessionSettingsQuery,
  buildTenantSessionSettingsQuery,
  PrismaService,
} from './prisma.service';

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

test('buildRequestSessionSettingsQuery carries the guarded route into Prisma transactions', () => {
  const statement = buildRequestSessionSettingsQuery({
    request_id: 'req-parent-login',
    trace_id: 'trace-parent-login',
    span_id: 'span-parent-login',
    parent_span_id: null,
    tenant_id: null,
    tenant_source: null,
    audience: 'portal',
    user_id: 'anonymous',
    role: 'guest',
    session_id: null,
    permissions: [],
    is_authenticated: false,
    client_ip: '127.0.0.1',
    user_agent: 'database.test',
    method: 'POST',
    path: '/auth/parent/login',
    started_at: '2026-08-02T09:30:00.000Z',
  }) as any;

  assert.equal(statement.sql.includes('/auth/parent/login'), false);
  assert.equal(statement.values.includes('/auth/parent/login'), true);
  assert.equal(statement.values.includes('anonymous'), true);
  assert.equal(statement.values.includes('POST'), true);
});

test('PrismaService.executeWithTenant assumes the non-bypass runtime role before setting tenant GUCs', async () => {
  const calls: string[] = [];
  const prisma = Object.create(PrismaService.prototype) as any;
  prisma.databaseSecurityService = {
    getRuntimeRoleName: () => 'my_shule_runtime',
  };
  prisma.$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    $executeRawUnsafe: async (sql: string) => {
      calls.push(normalizeSql(sql));
      return 0;
    },
    $queryRaw: async () => {
      calls.push('TENANT SETTINGS');
      return [];
    },
  });

  await prisma.executeWithTenant('homabay-high', null, async () => {
    calls.push('WORK');
  });

  assert.deepEqual(calls, [
    'SET LOCAL ROLE "my_shule_runtime"',
    'TENANT SETTINGS',
    'WORK',
  ]);
});

test('PrismaService.query applies request path before guarded parent login lookup', async () => {
  const requestContext = new RequestContextService();
  const calls: Array<{ kind: string; value: unknown }> = [];
  const prisma = Object.create(PrismaService.prototype) as any;
  prisma.requestContext = requestContext;
  prisma.databaseSecurityService = {
    getRuntimeRoleName: () => 'my_shule_runtime',
  };
  prisma.$transaction = async (callback: (tx: any) => Promise<unknown>) => callback({
    $queryRaw: async (statement: any) => {
      calls.push({ kind: 'settings', value: statement.values });
      return [];
    },
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      calls.push({ kind: 'query', value: [normalizeSql(sql), ...params] });
      return [];
    },
    $executeRawUnsafe: async (sql: string) => {
      calls.push({ kind: 'role', value: normalizeSql(sql) });
      return 0;
    },
  });

  await requestContext.run(
    {
      request_id: 'req-parent-login',
      tenant_id: null,
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'database.test',
      method: 'POST',
      path: '/auth/parent/login',
      started_at: '2026-08-02T09:30:00.000Z',
    },
    async () => {
      await prisma.query(
        'SELECT * FROM app.find_linked_parent_password_auth_subject($1, $2)',
        [null, 'ADM-00001'],
      );
    },
  );

  assert.deepEqual(calls[0], { kind: 'role', value: 'SET LOCAL ROLE "my_shule_runtime"' });
  assert.equal(calls[1]?.kind, 'settings');
  assert.equal((calls[1]?.value as unknown[]).includes('/auth/parent/login'), true);
  assert.deepEqual(calls[2], {
    kind: 'query',
    value: [
      'SELECT * FROM app.find_linked_parent_password_auth_subject($1, $2)',
      null,
      'ADM-00001',
    ],
  });
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

test('PrismaService.query uses executeRaw for non-returning mutations and reports row count', async () => {
  const calls: string[] = [];
  const tenantCalls: Array<[string, string | null]> = [];
  const prisma = Object.create(PrismaService.prototype) as any;

  prisma.executeWithTenant = async (
    tenantId: string,
    userId: string | null,
    callback: (tx: unknown) => Promise<unknown>,
  ) => {
    tenantCalls.push([tenantId, userId]);
    return callback(prisma);
  };

  prisma.$executeRawUnsafe = async (sql: string, ...params: unknown[]) => {
    calls.push(`execute:${normalizeSql(sql)}:${params.join(',')}`);
    return 2;
  };
  prisma.$queryRawUnsafe = async (sql: string, ...params: unknown[]) => {
    calls.push(`query:${normalizeSql(sql)}:${params.join(',')}`);
    return [{ ignored: true }];
  };

  const result = await prisma.query(
    `
      UPDATE subscriptions
      SET status = $2
      WHERE tenant_id = $1
    `,
    ['homabay-high', 'active'],
  );

  assert.deepEqual(result, { rows: [], rowCount: 2 });
  assert.deepEqual(tenantCalls, [['homabay-high', null]]);
  assert.equal(calls.length, 1);
  assert.match(calls[0] ?? '', /^execute:UPDATE subscriptions/);
});

test('PrismaService.query keeps returning mutations on queryRaw', async () => {
  const calls: string[] = [];
  const tenantCalls: Array<[string, string | null]> = [];
  const prisma = Object.create(PrismaService.prototype) as any;

  prisma.executeWithTenant = async (
    tenantId: string,
    userId: string | null,
    callback: (tx: unknown) => Promise<unknown>,
  ) => {
    tenantCalls.push([tenantId, userId]);
    return callback(prisma);
  };

  prisma.$executeRawUnsafe = async (sql: string, ...params: unknown[]) => {
    calls.push(`execute:${normalizeSql(sql)}:${params.join(',')}`);
    return 1;
  };
  prisma.$queryRawUnsafe = async (sql: string, ...params: unknown[]) => {
    calls.push(`query:${normalizeSql(sql)}:${params.join(',')}`);
    return [{ id: 'sub-1' }];
  };

  const result = await prisma.query(
    `
      INSERT INTO subscriptions (tenant_id, status)
      VALUES ($1, $2)
      RETURNING id
    `,
    ['homabay-high', 'active'],
  );

  assert.deepEqual(result, { rows: [{ id: 'sub-1' }], rowCount: 1 });
  assert.deepEqual(tenantCalls, [['homabay-high', null]]);
  assert.equal(calls.length, 1);
  assert.match(calls[0] ?? '', /^query:INSERT INTO subscriptions/);
});

test('PrismaService.query does not mistake an arbitrary string record id for a tenant', async () => {
  const tenantCalls: string[] = [];
  const prisma = Object.create(PrismaService.prototype) as any;

  prisma.executeWithTenant = async (tenantId: string) => {
    tenantCalls.push(tenantId);
    throw new Error('unexpected tenant inference');
  };
  prisma.$queryRawUnsafe = async () => [{ id: 'record-a' }];

  const result = await prisma.query(
    'SELECT id FROM documents WHERE id = $1 AND tenant_id = $2',
    ['record-a', 'homabay-high'],
  );

  assert.deepEqual(result, { rows: [{ id: 'record-a' }], rowCount: 1 });
  assert.deepEqual(tenantCalls, []);
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

test('DatabaseSecurityService repairs migrated managed function owners before runtime use', async () => {
  const queries: RecordedQuery[] = [];
  const pool = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values });

      if (
        text.includes('to_regprocedure($1)')
        && values?.[0] === 'app.claim_outbox_events(integer,integer)'
      ) {
        return {
          rows: [
            {
              signature: 'app.claim_outbox_events(integer,integer)',
              owner_name: 'neondb_owner',
              security_definer: true,
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    },
  };
  const service = new DatabaseSecurityService(
    pool as never,
    { get: () => undefined } as never,
  );

  (service as unknown as { currentUserName: string }).currentUserName = 'postgres';
  await service.onApplicationBootstrap();

  assert.equal(
    queries.some(
      (query) =>
        normalizeSql(query.text)
        === 'ALTER FUNCTION app.claim_outbox_events(integer,integer) OWNER TO postgres',
    ),
    true,
  );
  assert.equal(
    queries.some(
      (query) =>
        normalizeSql(query.text).includes('ALTER FUNCTION app.find_user_by_email_for_auth'),
    ),
    false,
  );
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
