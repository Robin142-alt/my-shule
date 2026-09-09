import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { PasswordService } from '../src/auth/password.service';
import { AuthorizationRepository } from '../src/auth/repositories/authorization.repository';
import { TrustedDeviceService } from '../src/auth/trusted-device.service';
import { InMemoryRedis } from './support/in-memory-redis';
import { AuthExperienceTestModule } from './support/auth-experience-test.module';

jest.setTimeout(180000);

type RegisteredTenantUser = {
  tenant_id: string;
  host: string;
  email: string;
  password: string;
  access_token: string;
};

const ensureIntegrationEnv = (): void => {
  (process.env as Record<string, string | undefined>).NODE_ENV = process.env.NODE_ENV ?? 'test';
  process.env.APP_BASE_DOMAIN = process.env.APP_BASE_DOMAIN ?? 'integration.test';
  process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? 'my-shule-integration-tests';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? 'my-shule-integration-clients';
  process.env.JWT_ACCESS_TOKEN_SECRET =
    process.env.JWT_ACCESS_TOKEN_SECRET ?? 'integration-access-secret';
  process.env.JWT_REFRESH_TOKEN_SECRET =
    process.env.JWT_REFRESH_TOKEN_SECRET ?? 'integration-refresh-secret';
  process.env.DATABASE_RUNTIME_ROLE =
    process.env.DATABASE_RUNTIME_ROLE ?? 'my_shule_runtime';
  process.env.SECURITY_PII_ENCRYPTION_KEY =
    process.env.SECURITY_PII_ENCRYPTION_KEY ??
    'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for auth experience integration tests');
  }
};

const createDatabasePool = (): Pool => {
  const connectionString = process.env.DATABASE_URL ?? '';

  return new Pool({
    connectionString,
    application_name: 'my-shule-auth-experience-tests',
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });
};

describe('Authentication audience separation', () => {
  let app: INestApplication;
  let testingModule: TestingModule;
  let pool: Pool;
  let tenantUser: RegisteredTenantUser;

  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);

  beforeAll(async () => {
    ensureIntegrationEnv();
    pool = createDatabasePool();

    testingModule = await Test.createTestingModule({
      imports: [AuthExperienceTestModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(new InMemoryRedis())
      .compile();

    app = testingModule.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    tenantUser = await registerTenantUser(
      app,
      testingModule,
      pool,
      `authexp-${suffix}`,
      `owner+exp-${suffix}@example.test`,
    );
  });

  afterAll(async () => {
    await cleanupSeedData(pool, [tenantUser].filter(Boolean));
    await app?.close();
    await pool?.end();
  });

  test('rejects a school token when the request audience is superadmin', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('host', tenantUser.host)
      .set('x-auth-audience', 'superadmin')
      .set('authorization', `Bearer ${tenantUser.access_token}`)
      .expect(401);

    expect(response.body.message).toContain('audience');
  });

  test('rejects tenant-scoped login requests that ask for the superadmin audience', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('host', tenantUser.host)
      .send({
        email: tenantUser.email,
        password: tenantUser.password,
        audience: 'superadmin',
      })
      .expect(401);

    expect(response.body.message).toContain('audience');
  });
});

const registerTenantUser = async (
  app: INestApplication,
  testingModule: TestingModule,
  pool: Pool,
  tenantId: string,
  email: string,
): Promise<RegisteredTenantUser> => {
  const password = `SecurePass!${tenantId.slice(-4)}`;
  const host = `${tenantId}.${process.env.APP_BASE_DOMAIN ?? 'integration.test'}`;

  // Public self-registration was retired. Seed an isolated test membership
  // through the same schema/baseline used by the security integration suite.
  const authorization = testingModule.get(AuthorizationRepository);
  await authorization.ensureTenantAuthorizationBaseline(tenantId);
  const role = await authorization.getRoleByCode(tenantId, 'member');
  const hash = await testingModule.get(PasswordService).hash(password);
  const user = await pool.query<{ id: string }>(
    `INSERT INTO users (tenant_id, email, password_hash, full_name, display_name, status, email_verified_at)
     VALUES ($1, $2, $3, $4, $4, 'active', NOW()) RETURNING id`,
    [tenantId, email, hash, `User ${tenantId}`],
  );
  await pool.query(
    `INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status) VALUES ($1, $2, $3, 'active')`,
    [tenantId, user.rows[0].id, role!.id],
  );
  const trustedDeviceToken = `trusted-device-token-${user.rows[0].id}`;
  await testingModule.get(TrustedDeviceService).trustDevice({
    userId: user.rows[0].id, rawToken: trustedDeviceToken,
    ipAddress: '127.0.0.1', userAgent: 'auth-experience.integration-spec',
  });

  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .set('host', host)
    .send({
      email,
      password,
      audience: 'school',
      trusted_device_token: trustedDeviceToken,
    })
    .expect(response => { if (response.status !== 201) throw new Error(`Fixture login failed: ${JSON.stringify(response.body)}`); });

  return {
    tenant_id: tenantId,
    host,
    email,
    password,
    access_token: response.body.tokens.access_token,
  };
};

const cleanupSeedData = async (
  pool: Pool,
  tenantUsers: RegisteredTenantUser[],
): Promise<void> => {
  if (tenantUsers.length === 0) {
    return;
  }

  const tenantIds = [...new Set(tenantUsers.map((tenantUser) => tenantUser.tenant_id))];
  const emails = tenantUsers.map((tenantUser) => tenantUser.email.toLowerCase());
  const ownerClient = await pool.connect();

  try {
    await ownerClient.query('BEGIN');
    await ownerClient.query(`DELETE FROM students WHERE tenant_id = ANY($1::text[])`, [tenantIds]);
    await ownerClient.query(`DELETE FROM role_permissions WHERE tenant_id = ANY($1::text[])`, [tenantIds]);
    await ownerClient.query(`DELETE FROM tenant_memberships WHERE tenant_id = ANY($1::text[])`, [tenantIds]);
    await ownerClient.query(`DELETE FROM permissions WHERE tenant_id = ANY($1::text[])`, [tenantIds]);
    await ownerClient.query(`DELETE FROM roles WHERE tenant_id = ANY($1::text[])`, [tenantIds]);
    await ownerClient.query(`DELETE FROM users WHERE lower(email) = ANY($1::text[])`, [emails]);
    await ownerClient.query('COMMIT');
  } catch (error) {
    await ownerClient.query('ROLLBACK');
    throw error;
  } finally {
    ownerClient.release();
  }
};
