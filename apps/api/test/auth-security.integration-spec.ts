import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { ACCESS_TOKEN_TYPE } from '../src/auth/auth.constants';
import { JwtTokenPayload } from '../src/auth/auth.interfaces';
import { PasswordService } from '../src/auth/password.service';
import { AuthorizationRepository } from '../src/auth/repositories/authorization.repository';
import { TrustedDeviceService } from '../src/auth/trusted-device.service';
import { InMemoryRedis } from './support/in-memory-redis';
import { AuthSecurityTestModule } from './support/auth-security-test.module';

jest.setTimeout(180000);

type RegisteredTenantUser = {
  tenant_id: string;
  host: string;
  email: string;
  password: string;
  user_id: string;
  role: string;
  session_id: string;
  access_token: string;
  refresh_token: string;
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
    throw new Error('DATABASE_URL is required for auth security integration tests');
  }
};

const createDatabasePool = (): Pool => {
  const connectionString = process.env.DATABASE_URL ?? '';

  return new Pool({
    connectionString,
    application_name: 'my-shule-auth-security-tests',
    ssl: connectionString.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : undefined,
  });
};

describe('Authentication and authorization hardening', () => {
  let app: INestApplication;
  let testingModule: TestingModule;
  let jwtService: JwtService;
  let pool: Pool;
  let tenantOwner: RegisteredTenantUser;
  let tenantMember: RegisteredTenantUser;
  let otherTenantOwner: RegisteredTenantUser;

  const suffix = randomUUID().replace(/-/g, '').slice(0, 8);

  beforeAll(async () => {
    ensureIntegrationEnv();
    pool = createDatabasePool();

    testingModule = await Test.createTestingModule({
      imports: [AuthSecurityTestModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(new InMemoryRedis())
      .compile();

    jwtService = testingModule.get(JwtService);

    app = testingModule.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    tenantOwner = await registerTenantUser(
      { app, testingModule, pool },
      `autha-${suffix}`,
      `owner+a-${suffix}@example.test`,
    );
    tenantMember = await registerTenantUser(
      { app, testingModule, pool },
      tenantOwner.tenant_id,
      `member+a-${suffix}@example.test`,
    );
    otherTenantOwner = await registerTenantUser(
      { app, testingModule, pool },
      `authb-${suffix}`,
      `owner+b-${suffix}@example.test`,
    );
  });

  afterAll(async () => {
    await cleanupSeedData(
      pool,
      [tenantOwner, tenantMember, otherTenantOwner].filter(Boolean),
    );
    await app?.close();
    await pool?.end();
  });

  test('blocks tampered JWTs', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('host', tenantOwner.host)
      .set('authorization', `Bearer ${tamperJwtPayloadClaim(tenantOwner.access_token, 'role', 'owner-admin')}`)
      .expect(401);

    expect(response.body.message).toContain('Token validation failed');
  });

  test('rejects expired access tokens', async () => {
    const expiredToken = await signAccessToken(jwtService, {
      user_id: tenantOwner.user_id,
      tenant_id: tenantOwner.tenant_id,
      role: tenantOwner.role,
      session_id: tenantOwner.session_id,
      token_id: randomUUID(),
      expires_in: -60,
    });

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('host', tenantOwner.host)
      .set('authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.message).toContain('Token validation failed');
  });

  test('blocks role-escalation tokens and enforces RBAC owner routes', async () => {
    await request(app.getHttpServer())
      .get('/security-probe/owner-only')
      .set('host', tenantOwner.host)
      .set('authorization', `Bearer ${tenantMember.access_token}`)
      .expect(403);

    const escalatedToken = await signAccessToken(jwtService, {
      user_id: tenantMember.user_id,
      tenant_id: tenantMember.tenant_id,
      role: 'owner',
      session_id: tenantMember.session_id,
      token_id: randomUUID(),
      expires_in: 900,
    });

    const response = await request(app.getHttpServer())
      .get('/security-probe/owner-only')
      .set('host', tenantOwner.host)
      .set('authorization', `Bearer ${escalatedToken}`)
      .expect(401);

    expect(response.body.message).toContain('out of sync with the active session');
  });

  test('denies tenant login when the user has no membership in that tenant', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('host', otherTenantOwner.host)
      .send({
        email: tenantMember.email,
        password: tenantMember.password,
      })
      .expect(401);

    expect(response.body.message).toContain('does not have access to this tenant');
  });

  test('blocks cross-tenant token reuse on another tenant host', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('host', otherTenantOwner.host)
      .set('authorization', `Bearer ${tenantOwner.access_token}`)
      .expect(401);

    expect(response.body.message).toContain('does not belong to this tenant');
  });

  test('enforces ABAC ownership rules even when RBAC permissions allow the route', async () => {
    await request(app.getHttpServer())
      .get(`/security-probe/users/${tenantMember.user_id}`)
      .set('host', tenantOwner.host)
      .set('authorization', `Bearer ${tenantMember.access_token}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/security-probe/users/${tenantOwner.user_id}`)
      .set('host', tenantOwner.host)
      .set('authorization', `Bearer ${tenantMember.access_token}`)
      .expect(403);

    expect(response.body.message).toContain('Attribute-based access denied');
  });

  test('regular refresh retains the deadline and tenant scope', async () => {
    const before = jwtService.decode(tenantMember.refresh_token) as { exp: number; iat: number };
    expect(before.exp - before.iat).toBe(14 * 86400);
    await request(app.getHttpServer()).post('/auth/refresh')
      .set('host', otherTenantOwner.host).send({ refresh_token: tenantMember.refresh_token }).expect(401);
    const response = await request(app.getHttpServer()).post('/auth/refresh')
      .set('host', tenantMember.host).send({ refresh_token: tenantMember.refresh_token }).expect(201);
    const after = jwtService.decode(response.body.tokens.refresh_token) as { exp: number };
    expect(after.exp).toBeLessThanOrEqual(before.exp);
    tenantMember.access_token = response.body.tokens.access_token;
    tenantMember.refresh_token = response.body.tokens.refresh_token;
  });

  test('regular users cannot revoke another user or another school session', async () => {
    for (const target of [tenantOwner, otherTenantOwner]) {
      await request(app.getHttpServer()).post('/auth/my-sessions/revoke')
        .set('host', tenantMember.host).set('authorization', `Bearer ${tenantMember.access_token}`)
        .send({ sessionId: target.session_id }).expect(403);
      await request(app.getHttpServer()).get('/auth/me')
        .set('host', target.host).set('authorization', `Bearer ${target.access_token}`).expect(200);
    }
  });

  test('device listing and revoke-others use the authenticated context and retain the current device', async () => {
    const second = await request(app.getHttpServer()).post('/auth/login').set('host', tenantMember.host)
      .send({ email: tenantMember.email, password: tenantMember.password, audience: 'school',
        trusted_device_token: `trusted-device-token-${tenantMember.user_id}` })
      .expect(response => { if (response.status !== 201) throw new Error(`Second-device login failed: ${JSON.stringify(response.body)}`); });
    const listed = await request(app.getHttpServer()).get('/auth/my-sessions').set('host', tenantMember.host)
      .set('authorization', `Bearer ${tenantMember.access_token}`).expect(200);
    const rows = Array.isArray(listed.body) ? listed.body : listed.body.data;
    expect(rows.some((row: { id: string; status: string }) => row.id === tenantMember.session_id && row.status === 'Current')).toBe(true);
    expect(rows.some((row: { id: string }) => row.id === second.body.user.session_id)).toBe(true);
    await request(app.getHttpServer()).post('/auth/my-sessions/revoke-others').set('host', tenantMember.host)
      .set('authorization', `Bearer ${tenantMember.access_token}`).send({}).expect(201);
    await request(app.getHttpServer()).get('/auth/me').set('host', tenantMember.host)
      .set('authorization', `Bearer ${second.body.tokens.access_token}`).expect(401);
    await request(app.getHttpServer()).get('/auth/me').set('host', tenantMember.host)
      .set('authorization', `Bearer ${tenantMember.access_token}`).expect(200);
  });

  test('refresh-credential logout revokes both access and refresh and records an audit', async () => {
    await request(app.getHttpServer()).post('/auth/logout/refresh')
      .set('host', tenantMember.host).send({ refresh_token: tenantMember.refresh_token }).expect(201);
    await request(app.getHttpServer()).get('/auth/me')
      .set('host', tenantMember.host).set('authorization', `Bearer ${tenantMember.access_token}`).expect(401);
    await request(app.getHttpServer()).post('/auth/refresh')
      .set('host', tenantMember.host).send({ refresh_token: tenantMember.refresh_token }).expect(401);
    const audit = await pool.query('SELECT action FROM audit_logs WHERE tenant_id = $1 AND resource_id = $2', [tenantMember.tenant_id, tenantMember.session_id]);
    expect(audit.rows.some(row => row.action === 'auth.session.revoked')).toBe(true);
  });
});

const registerTenantUser = async (
  context: {
    app: INestApplication;
    testingModule: TestingModule;
    pool: Pool;
  },
  tenantId: string,
  email: string,
): Promise<RegisteredTenantUser> => {
  const { app, testingModule, pool } = context;
  const password = `SecurePass!${tenantId.slice(-4)}`;
  const host = `${tenantId}.${process.env.APP_BASE_DOMAIN ?? 'integration.test'}`;
  const authorizationRepository = testingModule.get(AuthorizationRepository);
  const passwordService = testingModule.get(PasswordService);
  const trustedDeviceService = testingModule.get(TrustedDeviceService);

  await authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);

  const existingMembers = await pool.query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM tenant_memberships
      WHERE tenant_id = $1
        AND status = 'active'
    `,
    [tenantId],
  );
  const roleCode = Number(existingMembers.rows[0]?.total ?? '0') === 0 ? 'owner' : 'member';
  const role = await authorizationRepository.getRoleByCode(tenantId, roleCode);
  const passwordHash = await passwordService.hash(password);
  const userResult = await pool.query<{ id: string }>(
    `
      INSERT INTO users (
        tenant_id,
        email,
        password_hash,
        full_name,
        display_name,
        status,
        email_verified_at,
        password_changed_at
      )
      VALUES ($1, lower($2), $3, $4, $4, 'active', NOW(), NOW())
      ON CONFLICT (lower(email))
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        display_name = EXCLUDED.display_name,
        status = 'active',
        email_verified_at = COALESCE(users.email_verified_at, NOW()),
        password_changed_at = NOW(),
        updated_at = NOW()
      RETURNING id
    `,
    [tenantId, email, passwordHash, `User ${tenantId}`],
  );
  const userId = userResult.rows[0].id;

  await pool.query(
    `
      INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
      VALUES ($1, $2::uuid, $3::uuid, 'active')
      ON CONFLICT (tenant_id, user_id)
      DO UPDATE SET
        role_id = EXCLUDED.role_id,
        status = 'active',
        updated_at = NOW()
    `,
    [tenantId, userId, role.id],
  );
  const trustedDeviceToken = `trusted-device-token-${userId}`;
  await trustedDeviceService.trustDevice({
    userId,
    rawToken: trustedDeviceToken,
    ipAddress: '127.0.0.1',
    userAgent: 'auth-security.integration-spec',
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
    .expect((loginResponse) => {
      if (loginResponse.status !== 201) {
        throw new Error(
          `Expected seeded login to return 201, got ${loginResponse.status}: ${JSON.stringify(loginResponse.body)}`,
        );
      }
    });

  return {
    tenant_id: tenantId,
    host,
    email,
    password,
    user_id: response.body.user.user_id,
    role: response.body.user.role,
    session_id: response.body.user.session_id,
    access_token: response.body.tokens.access_token,
    refresh_token: response.body.tokens.refresh_token,
  };
};

const signAccessToken = async (
  jwtService: JwtService,
  input: {
    user_id: string;
    tenant_id: string;
    role: string;
    session_id: string;
    token_id: string;
    expires_in: number;
  },
): Promise<string> => {
  const payload: JwtTokenPayload = {
    sub: input.user_id,
    user_id: input.user_id,
    tenant_id: input.tenant_id,
    role: input.role,
    audience: 'school',
    session_id: input.session_id,
    token_id: input.token_id,
    type: ACCESS_TOKEN_TYPE,
  };

  return jwtService.signAsync(payload, {
    secret: process.env.JWT_ACCESS_TOKEN_SECRET,
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
    expiresIn: input.expires_in,
  });
};

const tamperJwtPayloadClaim = (
  token: string,
  claim: string,
  nextValue: string,
): string => {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    throw new Error('Invalid JWT shape');
  }

  const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
  decodedPayload[claim] = nextValue;

  return `${header}.${Buffer.from(JSON.stringify(decodedPayload)).toString('base64url')}.${signature}`;
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
