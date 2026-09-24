import 'reflect-metadata';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { PrismaService } from '../src/database/prisma.service';
import { DatabaseService } from '../src/database/database.service';

test('nested repository transactions share connections, roll back together, and isolate schools', { timeout: 25_000 }, async () => {
  const url = new URL(process.env.DATABASE_URL ?? 'postgres://invalid');
  assert.equal(process.env.MYSHULE_DISPOSABLE_POSTGRES, '1', 'Use the disposable PostgreSQL runner');
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname));
  assert.equal(url.pathname.slice(1), process.env.MYSHULE_DISPOSABLE_POSTGRES_DATABASE);
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  const context = new RequestContextService();
  const originalLimit = process.env.DATABASE_API_MAX_CONNECTIONS;
  process.env.DATABASE_API_MAX_CONNECTIONS = '2';
  const prisma = new PrismaService(context, { getRuntimeRoleName: () => 'transaction_fixture_runtime' } as never);
  const database = new DatabaseService({
    connect: async () => { throw new Error('A nested SQL repository must reuse the workflow connection'); },
  } as never, context, {} as never, { get: () => undefined } as never, prisma);
  if (originalLimit === undefined) delete process.env.DATABASE_API_MAX_CONNECTIONS;
  else process.env.DATABASE_API_MAX_CONNECTIONS = originalLimit;
  const inSchool = <T>(tenantId: string, callback: () => Promise<T>) => context.run({
    request_id: `transaction-${tenantId}`, tenant_id: tenantId, user_id: 'staff-user',
    role: 'teacher', session_id: 'test-session', permissions: ['teacher:write'],
    is_authenticated: true, client_ip: null, user_agent: 'transaction-test',
    method: 'POST', path: '/test/transaction', started_at: new Date().toISOString(),
  }, callback);
  try {
    await admin.query(`
      CREATE ROLE transaction_fixture_runtime NOLOGIN NOBYPASSRLS;
      CREATE TABLE transaction_probe (tenant_id text NOT NULL, value text NOT NULL);
      ALTER TABLE transaction_probe ENABLE ROW LEVEL SECURITY;
      ALTER TABLE transaction_probe FORCE ROW LEVEL SECURITY;
      CREATE POLICY school_scope ON transaction_probe
        USING (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
      GRANT USAGE ON SCHEMA public TO transaction_fixture_runtime;
      GRANT SELECT, INSERT ON transaction_probe TO transaction_fixture_runtime;
    `);
    await prisma.onModuleInit();
    let started = 0;
    let release!: () => void;
    const bothConnectionsInUse = new Promise<void>((resolve) => { release = resolve; });
    const beganAt = performance.now();
    const results = await Promise.all(['school-a', 'school-b'].map((tenantId) => inSchool(tenantId, () =>
      prisma.withRequestTransaction(async (outer) => {
        if (++started === 2) release();
        await bothConnectionsInUse;
        const outerPid = await outer.$queryRawUnsafe('SELECT pg_backend_pid() AS pid');
        await prisma.query('INSERT INTO transaction_probe (tenant_id, value) VALUES ($1, $2)', [tenantId, 'committed']);
        return prisma.withRequestTransaction(async (inner) => {
          assert.equal(inner, outer);
          const nestedPid = await prisma.query('SELECT pg_backend_pid() AS pid');
          assert.equal(nestedPid.rows[0].pid, outerPid[0].pid);
          await database.withRequestTransaction(async () => {
            const sqlPid = await database.query('SELECT pg_backend_pid() AS pid');
            assert.equal(sqlPid.rows[0].pid, outerPid[0].pid);
          });
          const visible = await prisma.query('SELECT tenant_id FROM transaction_probe');
          assert.deepEqual(visible.rows, [{ tenant_id: tenantId }]);
          await assert.rejects(() => prisma.executeWithTenant('another-school', null, async () => null), /school scope/);
          return tenantId;
        });
      }),
    )));
    assert.deepEqual(results, ['school-a', 'school-b']);
    assert.ok(performance.now() - beganAt < 5000, 'Two busy connections must not wait for a third');
    assert.equal(prisma.getPoolMetrics().waitingCount, 0);

    await assert.rejects(() => inSchool('school-a', () => prisma.withRequestTransaction(async () => {
      await prisma.query('INSERT INTO transaction_probe (tenant_id, value) VALUES ($1, $2)', ['school-a', 'must-rollback']);
      await prisma.executeWithTenant('school-a', 'staff-user', async () => {
        await database.query('INSERT INTO transaction_probe (tenant_id, value) VALUES ($1, $2)', ['school-a', 'also-rollback']);
      });
      throw new Error('workflow failed');
    })), /workflow failed/);
    assert.deepEqual((await admin.query('SELECT value FROM transaction_probe ORDER BY tenant_id')).rows,
      [{ value: 'committed' }, { value: 'committed' }]);
    // The completed/failed async scope must not leak into the next request.
    await inSchool('school-b', async () => {
      const visible = await prisma.query('SELECT tenant_id FROM transaction_probe');
      assert.deepEqual(visible.rows, [{ tenant_id: 'school-b' }]);
    });
    console.log(`Concurrent nested workflows completed in ${Math.round(performance.now() - beganAt)} ms with a two-connection pool`);
  } finally {
    await prisma.onModuleDestroy();
    await admin.query('DROP TABLE IF EXISTS transaction_probe; DROP OWNED BY transaction_fixture_runtime; DROP ROLE transaction_fixture_runtime;');
    await admin.end();
  }
});
