import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';

import { CommunicationSchemaService } from '../src/modules/communication/communication-schema.service';

jest.setTimeout(120_000);

describe('communication SMS outbox NOBYPASSRLS claim lifecycle', () => {
  const suffix = randomUUID().replace(/-/g, '').slice(0, 10);
  const ownerRole = `sms_owner_${suffix}`;
  const workerRole = `sms_worker_${suffix}`;
  let pool: Pool;
  let client: PoolClient;
  let disposableDatabaseVerified = false;

  beforeAll(async () => {
    if (process.env.MYSHULE_DISPOSABLE_POSTGRES !== '1') {
      throw new Error(
        'Communication SMS outbox integration tests require the disposable local PostgreSQL wrapper',
      );
    }

    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    const disposableTarget = verifyDisposableDatabaseUrl(process.env.DATABASE_URL);
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    client = await pool.connect();
    const databaseIdentity = await client.query<{
      database_name: string;
      server_address: string | null;
      server_port: number | null;
    }>(`
      SELECT current_database() AS database_name,
             inet_server_addr()::text AS server_address,
             inet_server_port() AS server_port
    `);
    const connectedDatabase = databaseIdentity.rows[0];

    if (!connectedDatabase || connectedDatabase.database_name !== disposableTarget.databaseName) {
      throw new Error('Refusing SMS outbox DDL because the connected database is not the disposable wrapper database');
    }
    if (!connectedDatabase.server_address || !isLoopbackAddress(connectedDatabase.server_address)) {
      throw new Error('Refusing SMS outbox DDL because the connected PostgreSQL server is not loopback');
    }
    if (connectedDatabase.server_port !== disposableTarget.port) {
      throw new Error('Refusing SMS outbox DDL because DATABASE_URL does not identify the connected server port');
    }

    // Cleanup may issue DDL only after these read-only identity checks prove
    // that this connection belongs to the exact disposable wrapper database.
    disposableDatabaseVerified = true;
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query('CREATE SCHEMA IF NOT EXISTS app');
    await client.query(`CREATE ROLE ${quoteIdentifier(ownerRole)} NOLOGIN NOBYPASSRLS`);
    await client.query(`CREATE ROLE ${quoteIdentifier(workerRole)} NOLOGIN NOBYPASSRLS`);
    await client.query(`GRANT ${quoteIdentifier(ownerRole)} TO CURRENT_USER`);
    await client.query(`GRANT ${quoteIdentifier(workerRole)} TO CURRENT_USER`);
    const databaseName = await client.query<{ current_database: string }>('SELECT current_database()');
    await client.query(
      `GRANT CONNECT, CREATE, TEMPORARY ON DATABASE ${quoteIdentifier(databaseName.rows[0].current_database)} TO ${quoteIdentifier(ownerRole)}`,
    );
    await client.query(`GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdentifier(ownerRole)}`);
    await client.query(`GRANT USAGE, CREATE ON SCHEMA app TO ${quoteIdentifier(ownerRole)}`);
    await client.query(`SET ROLE ${quoteIdentifier(ownerRole)}`);

    await client.query(`
      CREATE TABLE tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'active'
      );
      ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
      CREATE POLICY tenants_rls_policy ON tenants
      FOR ALL
      USING (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      )
      WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
        OR NULLIF(current_setting('app.role', true), '') = 'platform_owner'
      );

      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        actor_user_id uuid,
        action text NOT NULL,
        module text NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        resource_type text NOT NULL,
        resource_id uuid,
        aggregate_id uuid,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        occurred_at timestamptz NOT NULL DEFAULT NOW(),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      );

      CREATE TABLE outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,
        school_id text NOT NULL,
        event_key text NOT NULL,
        event_name text NOT NULL,
        aggregate_type text NOT NULL,
        aggregate_id uuid NOT NULL,
        payload jsonb NOT NULL,
        headers jsonb NOT NULL DEFAULT '{}'::jsonb,
        status text NOT NULL DEFAULT 'pending',
        available_at timestamptz NOT NULL DEFAULT NOW(),
        actor_role text,
        source_dashboard text,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_outbox_events_tenant_event_key UNIQUE (tenant_id, event_key)
      );
    `);

    let schemaSql = '';
    const schemaService = new CommunicationSchemaService({
      runSchemaBootstrap: async (sql: string) => {
        schemaSql = sql;
      },
    } as never);
    await schemaService.onModuleInit();
    await client.query(schemaSql);

    await client.query('RESET ROLE');
    await client.query(`GRANT USAGE ON SCHEMA app TO ${quoteIdentifier(workerRole)}`);
    await client.query(
      `GRANT EXECUTE ON FUNCTION app.claim_communication_sms_outbox(integer, integer) TO ${quoteIdentifier(workerRole)}`,
    );
    await client.query(`SET ROLE ${quoteIdentifier(ownerRole)}`);

    await client.query(`SELECT set_config('app.role', 'platform_owner', false)`);
    await client.query(`
      INSERT INTO tenants (tenant_id, status)
      VALUES
        ('tenant-a', 'active'),
        ('homabay-high', 'active'),
        ('suspended-school', 'suspended')
    `);

    for (const tenantId of ['tenant-a', 'homabay-high', 'suspended-school']) {
      await client.query(`SELECT set_config('app.role', 'teacher', false)`);
      await client.query(`SELECT set_config('app.tenant_id', $1, false)`, [tenantId]);
      await client.query(
        `
          INSERT INTO communication_sms_outbox (
            tenant_id,
            recipient_phone,
            message,
            dispatch_key
          )
          VALUES ($1, '+254700000001', 'Tenant-safe notice', $2)
        `,
        [tenantId, `integration:${tenantId}`],
      );
    }
  });

  afterAll(async () => {
    if (client) {
      await client.query('RESET ROLE').catch(() => undefined);
      if (disposableDatabaseVerified) {
        await client.query(`DROP OWNED BY ${quoteIdentifier(workerRole)} CASCADE`).catch(() => undefined);
        await client.query(`DROP OWNED BY ${quoteIdentifier(ownerRole)} CASCADE`).catch(() => undefined);
        await client.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`).catch(() => undefined);
        await client.query(`DROP ROLE IF EXISTS ${quoteIdentifier(ownerRole)}`).catch(() => undefined);
      }
      client.release();
    }
    await pool?.end();
  });

  const claimAsWorker = async (batchSize: number, leaseMs: number) => {
    await client.query('RESET ROLE');
    await client.query(`SET ROLE ${quoteIdentifier(workerRole)}`);

    try {
      await client.query(`SELECT set_config('app.role', $1, false)`, [workerRole]);
      await client.query(`SELECT set_config('app.tenant_id', 'tenant-a', false)`);
      const before = await client.query<{
        current_user: string;
        app_role: string;
        tenant_id: string;
      }>(`
        SELECT current_user,
               current_setting('app.role', true) AS app_role,
               current_setting('app.tenant_id', true) AS tenant_id
      `);
      const claims = await client.query<{
        invoked_by: string;
        tenant_id: string;
        lease_token: string;
      }>(`
        SELECT current_user AS invoked_by,
               claimed.tenant_id,
               claimed.lease_token::text
        FROM app.claim_communication_sms_outbox($1, $2) AS claimed
        ORDER BY claimed.tenant_id
      `, [batchSize, leaseMs]);
      const after = await client.query<{
        current_user: string;
        app_role: string;
        tenant_id: string;
      }>(`
        SELECT current_user,
               current_setting('app.role', true) AS app_role,
               current_setting('app.tenant_id', true) AS tenant_id
      `);

      return {
        before: before.rows[0],
        after: after.rows[0],
        claims: claims.rows,
      };
    } finally {
      await client.query('RESET ROLE');
      await client.query(`SET ROLE ${quoteIdentifier(ownerRole)}`);
    }
  };

  test('least-privilege NOBYPASSRLS worker claims across tenants while direct owner reads remain scoped', async () => {
    const securityState = await client.query<{
      owner_name: string;
      owner_can_login: boolean;
      owner_bypass_rls: boolean;
      security_definer: boolean;
      public_execute: boolean;
      worker_is_superuser: boolean;
      worker_can_login: boolean;
      worker_can_create_database: boolean;
      worker_can_create_role: boolean;
      worker_bypass_rls: boolean;
      worker_is_owner_member: boolean;
      worker_schema_usage: boolean;
      worker_schema_create: boolean;
      worker_execute: boolean;
      worker_table_access: boolean;
    }>(`
      SELECT claim_owner.rolname AS owner_name,
             claim_owner.rolcanlogin AS owner_can_login,
             claim_owner.rolbypassrls AS owner_bypass_rls,
             claim.prosecdef AS security_definer,
             EXISTS (
               SELECT 1
               FROM aclexplode(COALESCE(claim.proacl, acldefault('f', claim.proowner))) AS privilege
               WHERE privilege.grantee = 0
                 AND privilege.privilege_type = 'EXECUTE'
             ) AS public_execute,
             worker.rolsuper AS worker_is_superuser,
             worker.rolcanlogin AS worker_can_login,
             worker.rolcreatedb AS worker_can_create_database,
             worker.rolcreaterole AS worker_can_create_role,
             worker.rolbypassrls AS worker_bypass_rls,
             pg_has_role(worker.oid, claim_owner.oid, 'MEMBER') AS worker_is_owner_member,
             has_schema_privilege(worker.oid, 'app', 'USAGE') AS worker_schema_usage,
             has_schema_privilege(worker.oid, 'app', 'CREATE') AS worker_schema_create,
             has_function_privilege(worker.oid, claim.oid, 'EXECUTE') AS worker_execute,
             (
               has_table_privilege(worker.oid, 'public.communication_sms_outbox', 'SELECT')
               OR has_table_privilege(worker.oid, 'public.communication_sms_outbox', 'INSERT')
               OR has_table_privilege(worker.oid, 'public.communication_sms_outbox', 'UPDATE')
               OR has_table_privilege(worker.oid, 'public.communication_sms_outbox', 'DELETE')
             ) AS worker_table_access
      FROM pg_proc AS claim
      JOIN pg_roles AS claim_owner ON claim_owner.oid = claim.proowner
      JOIN pg_roles AS worker ON worker.rolname = $1
      WHERE claim.oid = 'app.claim_communication_sms_outbox(integer,integer)'::regprocedure
    `, [workerRole]);
    expect(securityState.rows[0]).toEqual({
      owner_name: ownerRole,
      owner_can_login: false,
      owner_bypass_rls: false,
      security_definer: true,
      public_execute: false,
      worker_is_superuser: false,
      worker_can_login: false,
      worker_can_create_database: false,
      worker_can_create_role: false,
      worker_bypass_rls: false,
      worker_is_owner_member: false,
      worker_schema_usage: true,
      worker_schema_create: false,
      worker_execute: true,
      worker_table_access: false,
    });

    await client.query(`SELECT set_config('app.role', 'teacher', false)`);
    await client.query(`SELECT set_config('app.tenant_id', 'tenant-a', false)`);
    const visibleBefore = await client.query<{ tenant_id: string }>(`
      SELECT tenant_id FROM communication_sms_outbox ORDER BY tenant_id
    `);
    expect(visibleBefore.rows.map((row) => row.tenant_id)).toEqual(['tenant-a']);

    const workerClaim = await claimAsWorker(2, 120000);
    expect(workerClaim.before).toEqual({
      current_user: workerRole,
      app_role: workerRole,
      tenant_id: 'tenant-a',
    });
    expect(workerClaim.after).toEqual(workerClaim.before);
    expect(workerClaim.claims.map((row) => row.invoked_by)).toEqual([workerRole, workerRole]);
    expect(workerClaim.claims.map((row) => row.tenant_id)).toEqual(['homabay-high', 'tenant-a']);
    expect(workerClaim.claims.every((row) => Boolean(row.lease_token))).toBe(true);

    await client.query(`SELECT set_config('app.tenant_id', 'suspended-school', false)`);
    const suspendedQueue = await client.query<{ status: string }>(`
      SELECT status
      FROM communication_sms_outbox
      WHERE tenant_id = 'suspended-school'
    `);
    expect(suspendedQueue.rows).toEqual([{ status: 'Pending' }]);

    await client.query(`SELECT set_config('app.tenant_id', 'tenant-a', false)`);
    const visibleAfter = await client.query<{ tenant_id: string }>(`
      SELECT tenant_id FROM communication_sms_outbox ORDER BY tenant_id
    `);
    expect(visibleAfter.rows.map((row) => row.tenant_id)).toEqual(['tenant-a']);
  });

  test('expired unstarted claims requeue safely while provider-started claims become DeliveryUnknown', async () => {
    await client.query(`SELECT set_config('app.role', 'teacher', false)`);
    await client.query(`SELECT set_config('app.tenant_id', 'tenant-a', false)`);
    await client.query(`
      UPDATE communication_sms_outbox
      SET status = 'Processing',
          lease_token = gen_random_uuid(),
          lease_expires_at = NOW() - INTERVAL '1 second',
          dispatch_started_at = NULL
      WHERE tenant_id = 'tenant-a'
    `);

    await client.query(`SELECT set_config('app.tenant_id', 'homabay-high', false)`);
    await client.query(`
      UPDATE communication_sms_outbox
      SET status = 'Processing',
          lease_token = gen_random_uuid(),
          lease_expires_at = NOW() - INTERVAL '1 second',
          dispatch_started_at = NOW()
      WHERE tenant_id = 'homabay-high'
    `);

    await client.query(`SELECT set_config('app.tenant_id', 'suspended-school', false)`);
    await client.query(`
      UPDATE communication_sms_outbox
      SET status = 'Processing',
          lease_token = gen_random_uuid(),
          lease_expires_at = NOW() - INTERVAL '1 second',
          dispatch_started_at = NOW()
      WHERE tenant_id = 'suspended-school'
    `);

    const workerClaim = await claimAsWorker(2, 120000);
    expect(workerClaim.after).toEqual(workerClaim.before);

    const statuses: Array<{ tenant_id: string; status: string }> = [];
    for (const tenantId of ['tenant-a', 'homabay-high', 'suspended-school']) {
      await client.query(`SELECT set_config('app.tenant_id', $1, false)`, [tenantId]);
      const result = await client.query<{ tenant_id: string; status: string }>(`
        SELECT tenant_id, status FROM communication_sms_outbox WHERE tenant_id = $1
      `, [tenantId]);
      statuses.push(result.rows[0]);
    }

    expect(statuses).toEqual([
      { tenant_id: 'tenant-a', status: 'Pending' },
      { tenant_id: 'homabay-high', status: 'DeliveryUnknown' },
      { tenant_id: 'suspended-school', status: 'DeliveryUnknown' },
    ]);
  });
});

function quoteIdentifier(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(value)) {
    throw new Error('Unsafe PostgreSQL identifier');
  }
  return `"${value.replace(/"/g, '""')}"`;
}

function verifyDisposableDatabaseUrl(databaseUrl: string): { databaseName: string; port: number } {
  const expectedDatabaseName = process.env.MYSHULE_DISPOSABLE_POSTGRES_DATABASE?.trim();

  if (!expectedDatabaseName || !/^my_shule_disposable_[a-f0-9]{32}$/.test(expectedDatabaseName)) {
    throw new Error('Disposable PostgreSQL wrapper did not provide a valid generated database name');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is not a valid PostgreSQL URL');
  }

  if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }
  if (!isLoopbackAddress(parsedUrl.hostname)) {
    throw new Error('Disposable PostgreSQL DATABASE_URL must use a loopback host');
  }
  if (!parsedUrl.port) {
    throw new Error('Disposable PostgreSQL DATABASE_URL must include its generated server port');
  }

  const port = Number(parsedUrl.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Disposable PostgreSQL DATABASE_URL contains an invalid port');
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
  if (databaseName !== expectedDatabaseName) {
    throw new Error('DATABASE_URL database does not match the disposable wrapper database name');
  }

  return { databaseName, port };
}

function isLoopbackAddress(value: string): boolean {
  const normalized = value.toLowerCase().replace(/^\[|\]$/g, '').split('/')[0];
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}
