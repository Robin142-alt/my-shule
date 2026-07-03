import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../common/request-context/request-context.service';
import { DEFAULT_PERMISSION_CATALOG, DEFAULT_ROLE_CATALOG } from './auth.constants';
import { AuthService } from './auth.service';
import { TENANT_INVITABLE_ROLE_CODES } from './dto/tenant-invitation.dto';
import { AuthorizationRepository } from './repositories/authorization.repository';

test('AuthService register rejects direct self-service account creation', async () => {
  const requestContext = new RequestContextService();

  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      createGlobalUserFromInvitation: async () => {
        throw new Error('register should not create users');
      },
      findById: async () => null,
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {
      createSession: async () => undefined,
      invalidateSession: async () => undefined,
      getSession: async () => null,
      rotateRefreshToken: async () => undefined,
      toPrincipal: () => {
        throw new Error('not used');
      },
    } as never,
    { get: () => undefined } as never,
  );

  await assert.rejects(
    () =>
      service.register(
        {
          email: 'owner@example.test',
          password: 'SecurePass!2026',
          display_name: 'Owner',
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
    (error: unknown) =>
      error instanceof ForbiddenException
      && error.message === 'Self-service account creation is disabled. Please contact your administrator for an invitation.',
  );
});

test('AuthorizationRepository bootstraps default authorization with set-based queries', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new AuthorizationRepository({
    query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });

      if (text.includes('INSERT INTO permissions')) {
        return {
          rows: DEFAULT_PERMISSION_CATALOG.map((permission, index) => ({
            id: `permission-${index}`,
            tenant_id: values[0],
            resource: permission.resource,
            action: permission.action,
            description: permission.description,
            created_at: new Date('2026-05-21T00:00:00.000Z'),
            updated_at: new Date('2026-05-21T00:00:00.000Z'),
          })),
        };
      }

      if (text.includes('INSERT INTO roles')) {
        return {
          rows: DEFAULT_ROLE_CATALOG.map((role, index) => ({
            id: `role-${index}`,
            tenant_id: values[0],
            code: role.code,
            name: role.name,
            description: role.description,
            is_system: true,
            created_at: new Date('2026-05-21T00:00:00.000Z'),
            updated_at: new Date('2026-05-21T00:00:00.000Z'),
          })),
        };
      }

      return { rows: [] };
    },
  } as never);

  await repository.ensureTenantAuthorizationBaseline('greenhill-academy');

  assert.equal(queries.length, 3);
  assert.equal(queries.every((query) => query.text.includes('jsonb_to_recordset')), true);
});

test('Default school invite catalog exposes the required school operating roles', () => {
  const requiredSchoolRoles = [
    'principal',
    'deputy_principal',
    'secretary',
    'bursar',
    'accountant',
    'teacher',
    'dean_academics',
    'exams_manager',
    'hod',
    'class_teacher',
    'grade_master',
    'nurse',
    'school_counsellor',
    'discipline_master',
    'librarian',
    'parent',
    'student',
    'storekeeper',
    'boarding_master',
    'security_officer',
    'transport_manager',
    'lab_technician',
    'admissions_officer',
    'ict_manager',
  ];

  assert.deepEqual(TENANT_INVITABLE_ROLE_CODES, requiredSchoolRoles);

  const catalogByCode = new Map<string, (typeof DEFAULT_ROLE_CATALOG)[number]>(
    DEFAULT_ROLE_CATALOG.map((role) => [role.code, role]),
  );

  for (const roleCode of requiredSchoolRoles) {
    assert.ok(catalogByCode.has(roleCode), `${roleCode} role should be bootstrapped`);
  }

  const principal = catalogByCode.get('principal');
  assert.ok(principal, 'principal role should be present');
  const principalPermissions = principal.permissions as readonly string[];
  assert.ok(principalPermissions.includes('users:read'));
  assert.ok(principalPermissions.includes('users:write'));
  assert.ok(principalPermissions.includes('tenant_memberships:read'));
  assert.ok(principalPermissions.includes('tenant_memberships:write'));
  assert.ok(principalPermissions.includes('roles:read'));
});

test('AuthService authenticateAccessToken rejects access tokens when the audience does not match the session audience', async () => {
  const requestContext = new RequestContextService();

  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      createGlobalUserFromInvitation: async () => {
        throw new Error('not used');
      },
      findById: async () => null,
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      verifyAccessToken: async () => ({
        sub: 'user-1',
        user_id: 'user-1',
        tenant_id: 'tenant-a',
        role: 'principal',
        audience: 'school',
        session_id: 'session-1',
        token_id: 'token-1',
        type: 'access' as const,
      }),
      issueTokenPair: async () => {
        throw new Error('not used');
      },
      verifyRefreshToken: async () => {
        throw new Error('not used');
      },
    } as never,
    {
      getSession: async () => ({
        user_id: 'user-1',
        tenant_id: 'tenant-a',
        role: 'principal',
        audience: 'school',
        permissions: ['students:read'],
        session_id: 'session-1',
        is_authenticated: true,
        refresh_token_id: 'refresh-1',
        created_at: '2026-05-05T00:00:00.000Z',
        updated_at: '2026-05-05T00:00:00.000Z',
        refresh_expires_at: '2026-06-05T00:00:00.000Z',
        ip_address: '127.0.0.1',
        user_agent: 'test-suite',
      }),
      createSession: async () => undefined,
      invalidateSession: async () => undefined,
      rotateRefreshToken: async () => {
        throw new Error('not used');
      },
      toPrincipal: () => {
        throw new Error('not used');
      },
    } as never,
    { get: () => undefined } as never,
  );

  await assert.rejects(
    () => service.authenticateAccessToken('access-token', 'tenant-a', 'superadmin'),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'Access token does not belong to this audience',
  );
});

test('AuthService authenticateAccessToken allows platform sessions without a tenant id', async () => {
  const requestContext = new RequestContextService();
  const sessionRecord = {
    user_id: 'user-platform',
    tenant_id: null,
    role: 'platform_owner',
    audience: 'superadmin',
    permissions: ['*:*'],
    session_id: 'session-platform',
    is_authenticated: true,
    email_verified_at: '2026-05-14T00:00:00.000Z',
    refresh_token_id: 'refresh-platform',
    created_at: '2026-05-05T00:00:00.000Z',
    updated_at: '2026-05-05T00:00:00.000Z',
    refresh_expires_at: '2026-06-05T00:00:00.000Z',
    ip_address: '127.0.0.1',
    user_agent: 'test-suite',
  };

  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      createGlobalUserFromInvitation: async () => {
        throw new Error('not used');
      },
      findById: async () => null,
      findPlatformOwnerById: async () => ({
        id: 'user-platform',
        tenant_id: 'global',
        email: 'owner@example.test',
        password_hash: 'hashed-password',
        display_name: 'Platform Owner',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
      }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      verifyAccessToken: async () => ({
        sub: 'user-platform',
        user_id: 'user-platform',
        tenant_id: null,
        role: 'platform_owner',
        audience: 'superadmin',
        session_id: 'session-platform',
        token_id: 'token-platform',
        type: 'access' as const,
      }),
      issueTokenPair: async () => {
        throw new Error('not used');
      },
      verifyRefreshToken: async () => {
        throw new Error('not used');
      },
    } as never,
    {
      getSession: async () => sessionRecord,
      createSession: async () => undefined,
      invalidateSession: async () => undefined,
      rotateRefreshToken: async () => {
        throw new Error('not used');
      },
      toPrincipal: (session: typeof sessionRecord) => ({
        user_id: session.user_id,
        tenant_id: session.tenant_id,
        role: session.role,
        audience: session.audience,
        permissions: session.permissions,
        session_id: session.session_id,
        is_authenticated: session.is_authenticated,
      }),
    } as never,
    { get: () => undefined } as never,
  );

  const principal = await service.authenticateAccessToken(
    'access-token',
    null,
    'superadmin',
  );

  assert.equal(principal.user_id, 'user-platform');
  assert.equal(principal.tenant_id, null);
  assert.equal(principal.role, 'platform_owner');
});

test('AuthService authenticateAccessToken lets default-domain requests use the signed session tenant', async () => {
  const requestContext = new RequestContextService();
  let synchronizedTenantId: string | null = null;
  const sessionRecord = {
    user_id: 'user-principal',
    tenant_id: 'greenhill-academy',
    role: 'principal',
    audience: 'school',
    permissions: ['users:write'],
    session_id: 'session-principal',
    is_authenticated: true,
    email_verified_at: '2026-05-14T00:00:00.000Z',
    refresh_token_id: 'refresh-principal',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    refresh_expires_at: '2026-06-13T00:00:00.000Z',
    ip_address: '127.0.0.1',
    user_agent: 'test-suite',
  };
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      createGlobalUserFromInvitation: async () => {
        throw new Error('not used');
      },
      findById: async () => null,
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      verifyAccessToken: async () => ({
        sub: 'user-principal',
        user_id: 'user-principal',
        tenant_id: 'greenhill-academy',
        role: 'principal',
        audience: 'school',
        session_id: 'session-principal',
        token_id: 'token-principal',
        type: 'access' as const,
      }),
      issueTokenPair: async () => {
        throw new Error('not used');
      },
      verifyRefreshToken: async () => {
        throw new Error('not used');
      },
    } as never,
    {
      getSession: async () => sessionRecord,
      createSession: async () => undefined,
      invalidateSession: async () => undefined,
      rotateRefreshToken: async () => {
        throw new Error('not used');
      },
      toPrincipal: (session: typeof sessionRecord) => ({
        user_id: session.user_id,
        tenant_id: session.tenant_id,
        role: session.role,
        audience: session.audience,
        permissions: session.permissions,
        session_id: session.session_id,
        is_authenticated: session.is_authenticated,
      }),
    } as never,
    { get: () => undefined } as never,
    undefined,
    undefined,
    {
      synchronizeRequestSession: async (context: { tenant_id?: string | null }) => {
        synchronizedTenantId = context.tenant_id ?? null;
      },
    } as never,
  );

  const principal = await requestContext.run(
    {
      request_id: 'req-default-domain-access-token',
      tenant_id: 'default-school',
      tenant_source: 'base_domain_default',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/invitations',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    async () => {
      const resolvedPrincipal = await service.authenticateAccessToken(
        'access-token',
        'default-school',
        'school',
      );
      assert.equal(requestContext.requireStore().tenant_id, 'greenhill-academy');
      return resolvedPrincipal;
    },
  );

  assert.equal(principal.tenant_id, 'greenhill-academy');
  assert.equal(synchronizedTenantId, 'greenhill-academy');
});

test('AuthService refresh lets default-domain requests use the signed refresh tenant', async () => {
  const requestContext = new RequestContextService();
  let membershipTenantId: string | null = null;
  let synchronizedTenantId: string | null = null;
  const sessionRecord = {
    user_id: 'user-principal',
    tenant_id: 'greenhill-academy',
    role: 'principal',
    audience: 'school',
    permissions: ['users:write'],
    session_id: 'session-principal',
    is_authenticated: true,
    email_verified_at: '2026-05-14T00:00:00.000Z',
    refresh_token_id: 'refresh-principal',
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    refresh_expires_at: '2026-06-13T00:00:00.000Z',
    ip_address: '127.0.0.1',
    user_agent: 'test-suite',
  };
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      createGlobalUserFromInvitation: async () => {
        throw new Error('not used');
      },
      findById: async () => ({
        id: 'user-principal',
        tenant_id: 'global',
        email: 'principal@greenhillacademy.sc.ke',
        password_hash: 'hashed-password',
        display_name: 'School Principal',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
      }),
    } as never,
    {
      findActiveMembership: async (_userId: string, tenantId: string) => {
        membershipTenantId = tenantId;
        return {
          id: 'membership-principal',
          tenant_id: tenantId,
          user_id: 'user-principal',
          role_id: 'role-principal',
          role_code: 'principal',
          role_name: 'Principal',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        };
      },
    } as never,
    {
      getPermissionsByRoleId: async () => ['users:write'],
    } as never,
    {} as never,
    {
      verifyAccessToken: async () => {
        throw new Error('not used');
      },
      verifyRefreshToken: async () => ({
        sub: 'user-principal',
        user_id: 'user-principal',
        tenant_id: 'greenhill-academy',
        role: 'principal',
        audience: 'school',
        session_id: 'session-principal',
        token_id: 'refresh-principal',
        type: 'refresh' as const,
      }),
      issueTokenPair: async (payload: { tenant_id: string | null; session_id: string }) => {
        assert.equal(payload.tenant_id, 'greenhill-academy');
        return {
          access_token: 'next-access-token',
          refresh_token: 'next-refresh-token',
          token_type: 'Bearer' as const,
          access_expires_in: 900,
          refresh_expires_in: 2592000,
          access_expires_at: '2026-05-14T00:15:00.000Z',
          refresh_expires_at: '2026-06-13T00:00:00.000Z',
          access_token_id: 'next-access-id',
          refresh_token_id: 'next-refresh-id',
          session_id: payload.session_id,
        };
      },
    } as never,
    {
      getSession: async () => sessionRecord,
      createSession: async () => undefined,
      invalidateSession: async () => undefined,
      rotateRefreshToken: async () => undefined,
      toPrincipal: () => {
        throw new Error('not used');
      },
    } as never,
    { get: () => undefined } as never,
    undefined,
    undefined,
    {
      synchronizeRequestSession: async (context: { tenant_id?: string | null }) => {
        synchronizedTenantId = context.tenant_id ?? null;
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-default-domain-refresh-token',
      tenant_id: 'default-school',
      tenant_source: 'base_domain_default',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/refresh',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () =>
      service.refresh(
        { refresh_token: 'refresh-token' },
        { ip_address: '127.0.0.1', user_agent: 'test-suite' },
      ),
  );

  assert.equal(response.user.tenant_id, 'greenhill-academy');
  assert.equal(membershipTenantId, 'greenhill-academy');
  assert.equal(synchronizedTenantId, 'greenhill-academy');
});

test('AuthService authenticateAccessToken blocks existing unverified sensitive sessions', async () => {
  const requestContext = new RequestContextService();
  let invalidatedSessionId: string | null = null;
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      createGlobalUserFromInvitation: async () => {
        throw new Error('not used');
      },
      findById: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: null,
      }),
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {
      verifyAccessToken: async () => ({
        sub: 'user-admin',
        user_id: 'user-admin',
        tenant_id: 'tenant-a',
        role: 'admin',
        audience: 'school',
        session_id: 'session-admin',
        token_id: 'token-admin',
        type: 'access' as const,
      }),
      issueTokenPair: async () => {
        throw new Error('not used');
      },
      verifyRefreshToken: async () => {
        throw new Error('not used');
      },
    } as never,
    {
      getSession: async () => ({
        user_id: 'user-admin',
        tenant_id: 'tenant-a',
        role: 'admin',
        audience: 'school',
        permissions: ['students:write'],
        session_id: 'session-admin',
        is_authenticated: true,
        refresh_token_id: 'refresh-admin',
        created_at: '2026-05-14T00:00:00.000Z',
        updated_at: '2026-05-14T00:00:00.000Z',
        refresh_expires_at: '2026-06-13T00:00:00.000Z',
        ip_address: '127.0.0.1',
        user_agent: 'test-suite',
      }),
      createSession: async () => undefined,
      invalidateSession: async (sessionId: string) => {
        invalidatedSessionId = sessionId;
      },
      rotateRefreshToken: async () => {
        throw new Error('not used');
      },
      toPrincipal: () => {
        throw new Error('unverified sessions should not become principals');
      },
    } as never,
    { get: () => undefined } as never,
  );

  await assert.rejects(
    () => service.authenticateAccessToken('access-token', 'tenant-a', 'school'),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'Verify your email before accessing sensitive workspace actions',
  );

  assert.equal(invalidatedSessionId, 'session-admin');
});

test('AuthService limits unverified email users to verification-only tenant sessions', async () => {
  const requestContext = new RequestContextService();
  let sessionPermissions: string[] | null = null;
  let sessionEmailVerifiedAt: string | null | undefined;
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: null,
      }),
      findActiveTenantUserByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: null,
      }),
    } as never,
    {
      findActiveMembership: async () => ({
        id: 'membership-admin',
        tenant_id: 'tenant-a',
        user_id: 'user-admin',
        role_id: 'role-admin',
        role_code: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getPermissionsByRoleId: async () => ['students:write'],
    } as never,
    {
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 2592000,
        access_expires_at: '2026-05-14T00:15:00.000Z',
        refresh_expires_at: '2026-06-13T00:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: 'session-admin',
      }),
    } as never,
    {
      createSession: async (input: { permissions: string[]; email_verified_at?: string | null }) => {
        sessionPermissions = input.permissions;
        sessionEmailVerifiedAt = input.email_verified_at;
      },
      invalidateSession: async () => undefined,
      getSession: async () => null,
      rotateRefreshToken: async () => undefined,
      toPrincipal: () => {
        throw new Error('not used');
      },
    } as never,
    { get: () => undefined } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-auth-email-unverified',
      tenant_id: 'tenant-a',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () =>
      service.login(
        {
          email: 'admin@example.test',
          password: 'SecurePass!2026',
          audience: 'school',
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
  );

  assert.deepEqual(response.user.permissions, ['auth:read']);
  assert.equal(response.user.email_verified, false);
  assert.deepEqual(sessionPermissions, ['auth:read']);
  assert.equal(sessionEmailVerifiedAt, null);
});

test('AuthService exposes verified email state on tenant auth responses', async () => {
  const requestContext = new RequestContextService();
  let sessionCreated = false;
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
      }),
      findActiveTenantUserByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
      }),
    } as never,
    {
      findActiveMembership: async () => ({
        id: 'membership-admin',
        tenant_id: 'tenant-a',
        user_id: 'user-admin',
        role_id: 'role-admin',
        role_code: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getPermissionsByRoleId: async () => ['students:write'],
    } as never,
    {
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 2592000,
        access_expires_at: '2026-05-14T00:15:00.000Z',
        refresh_expires_at: '2026-06-13T00:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: 'session-admin',
      }),
    } as never,
    {
      createSession: async () => {
        sessionCreated = true;
      },
      invalidateSession: async () => undefined,
      getSession: async () => null,
      rotateRefreshToken: async () => undefined,
      toPrincipal: () => {
        throw new Error('not used');
      },
    } as never,
    { get: () => undefined } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-auth-email-verified',
      tenant_id: 'tenant-a',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () =>
      service.login(
        {
          email: 'admin@example.test',
          password: 'SecurePass!2026',
          audience: 'school',
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
  );

  assert.equal(sessionCreated, true);
  assert.equal(response.user.email_verified, true);
  assert.equal(response.user.email_verified_at, '2026-05-14T00:00:00.000Z');
});

test('AuthService resolves a single active school membership without requiring a tenant code', async () => {
  const requestContext = new RequestContextService();
  let synchronizedTenantId: string | null = null;
  let ensuredTenantId: string | null = null;
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'global',
        email: 'principal@greenhillacademy.sc.ke',
        password_hash: 'hashed-password',
        display_name: 'School Principal',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
      }),
    } as never,
    {
      findActiveMembershipsByUser: async () => [
        {
          id: 'membership-greenhill',
          tenant_id: 'greenhill-academy',
          user_id: 'user-admin',
          role_id: 'role-owner',
          role_code: 'owner',
          role_name: 'Owner',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    } as never,
    {
      ensureTenantAuthorizationBaseline: async (tenantId: string) => {
        ensuredTenantId = tenantId;
      },
      getPermissionsByRoleId: async () => ['*:*'],
    } as never,
    {
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async (payload: Record<string, unknown>) => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 86400,
        access_expires_at: '2026-05-14T00:15:00.000Z',
        refresh_expires_at: '2026-05-15T00:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: String(payload.session_id),
      }),
    } as never,
    {
      createSession: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    undefined,
    undefined,
    {
      synchronizeRequestSession: async (context: { tenant_id?: string | null }) => {
        synchronizedTenantId = context.tenant_id ?? null;
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-auto-tenant-login',
      tenant_id: null,
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-05-16T00:00:00.000Z',
    },
    () =>
      service.login(
        {
          email: 'principal@greenhillacademy.sc.ke',
          password: 'SecurePass!2026',
          audience: 'school',
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
  );

  assert.equal(response.user.tenant_id, 'greenhill-academy');
  assert.equal(ensuredTenantId, 'greenhill-academy');
  assert.equal(synchronizedTenantId, 'greenhill-academy');
});

test('AuthService ignores default tenant context when generic login resolves one active school membership', async () => {
  const requestContext = new RequestContextService();
  let attemptedTenantId: string | null = null;
  let synchronizedTenantId: string | null = null;
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'global',
        email: 'principal@greenhillacademy.sc.ke',
        password_hash: 'hashed-password',
        display_name: 'School Principal',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
      }),
    } as never,
    {
      findActiveMembership: async (_userId: string, tenantId: string) => {
        attemptedTenantId = tenantId;
        return null;
      },
      findActiveMembershipsByUser: async () => [
        {
          id: 'membership-greenhill',
          tenant_id: 'greenhill-academy',
          user_id: 'user-admin',
          role_id: 'role-owner',
          role_code: 'owner',
          role_name: 'Owner',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getPermissionsByRoleId: async () => ['*:*'],
    } as never,
    {
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async (payload: Record<string, unknown>) => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 86400,
        access_expires_at: '2026-05-14T00:15:00.000Z',
        refresh_expires_at: '2026-05-15T00:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: String(payload.session_id),
      }),
    } as never,
    {
      createSession: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    undefined,
    undefined,
    {
      synchronizeRequestSession: async (context: { tenant_id?: string | null }) => {
        synchronizedTenantId = context.tenant_id ?? null;
      },
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-default-tenant-generic-login',
      tenant_id: 'default-school',
      tenant_source: 'base_domain_default',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-05-16T00:00:00.000Z',
    },
    () =>
      service.login(
        {
          email: 'principal@greenhillacademy.sc.ke',
          password: 'SecurePass!2026',
          audience: 'school',
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
  );

  assert.equal(attemptedTenantId, null);
  assert.equal(response.user.tenant_id, 'greenhill-academy');
  assert.equal(synchronizedTenantId, 'greenhill-academy');
});

test('AuthService resolves invited user then enforces tenant membership for school login', async () => {
  const requestContext = new RequestContextService();
  let lookedUpEmail: string | null = null;
  let membershipTenantId: string | null = null;
  let ensuredTenantId: string | null = null;
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async (email: string) => {
        lookedUpEmail = email;
        return {
          id: 'user-teacher',
          tenant_id: 'global',
          email: 'tabithanjuguna410@gmail.com',
          password_hash: 'hashed-password',
          display_name: 'Tabitha Wanjiru',
          status: 'active',
          email_verified_at: '2026-06-01T08:00:00.000Z',
        };
      },
      findActiveTenantUserByEmail: async () => {
        throw new Error('tenant-scoped lookup should not hide wrong-school membership denial');
      },
    } as never,
    {
      findActiveMembership: async (userId: string, tenantId: string) => {
        membershipTenantId = tenantId;
        return {
          id: 'membership-teacher',
          tenant_id: tenantId,
          user_id: userId,
          role_id: 'role-teacher',
          role_code: 'teacher',
          role_name: 'Teacher',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async (tenantId: string) => {
        ensuredTenantId = tenantId;
      },
      getPermissionsByRoleId: async () => ['attendance:write'],
    } as never,
    {
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async (payload: Record<string, unknown>) => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 86400,
        access_expires_at: '2026-06-01T08:15:00.000Z',
        refresh_expires_at: '2026-06-02T08:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: String(payload.session_id),
      }),
    } as never,
    {
      createSession: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    undefined,
    undefined,
    {
      synchronizeRequestSession: async () => undefined,
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-invite-school-login',
      tenant_id: 'kb-high',
      tenant_source: 'signed_header',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-06-01T08:00:00.000Z',
    },
    () =>
      service.login(
        {
          email: 'tabithanjuguna410@gmail.com',
          password: 'SecurePass!2026',
          audience: 'school',
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
  );

  assert.equal(lookedUpEmail, 'tabithanjuguna410@gmail.com');
  assert.equal(membershipTenantId, 'kb-high');
  assert.equal(response.user.tenant_id, 'kb-high');
  assert.equal(response.user.role, 'teacher');
  assert.equal(ensuredTenantId, 'kb-high');
});

test('AuthService clearly denies correct credentials without membership in the requested tenant', async () => {
  const requestContext = new RequestContextService();
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-teacher',
        tenant_id: 'global',
        email: 'teacher@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Teacher',
        status: 'active',
        email_verified_at: '2026-06-01T08:00:00.000Z',
      }),
      findActiveTenantUserByEmail: async () => {
        throw new Error('tenant-scoped lookup should not hide wrong-school membership denial');
      },
    } as never,
    {
      findActiveMembership: async () => null,
    } as never,
    {} as never,
    {
      compare: async () => true,
    } as never,
    {} as never,
    {} as never,
    { get: () => undefined } as never,
  );

  await assert.rejects(
    () =>
      requestContext.run(
        {
          request_id: 'req-wrong-tenant-login',
          tenant_id: 'other-school',
          tenant_source: 'signed_header',
          user_id: 'anonymous',
          role: 'guest',
          session_id: null,
          permissions: [],
          is_authenticated: false,
          client_ip: '127.0.0.1',
          user_agent: 'test-suite',
          method: 'POST',
          path: '/auth/login',
          started_at: '2026-06-01T08:00:00.000Z',
        },
        () =>
          service.login(
            {
              email: 'teacher@example.test',
              password: 'SecurePass!2026',
              audience: 'school',
            },
            {
              ip_address: '127.0.0.1',
              user_agent: 'test-suite',
            },
          ),
      ),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      String(error.message).includes('does not have access to this tenant'),
  );
});

test('AuthService enforces MFA and can persist a trusted device during high-privilege login', async () => {
  const requestContext = new RequestContextService();
  const securityChecks: Record<string, unknown> = {};
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
        mfa_enabled: true,
        mfa_verified_at: '2026-05-14T00:00:00.000Z',
      }),
      findActiveTenantUserByEmail: async () => ({
        id: 'user-admin',
        tenant_id: 'tenant-a',
        email: 'admin@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Admin',
        status: 'active',
        email_verified_at: '2026-05-14T00:00:00.000Z',
        mfa_enabled: true,
        mfa_verified_at: '2026-05-14T00:00:00.000Z',
      }),
    } as never,
    {
      findActiveMembership: async () => ({
        id: 'membership-admin',
        tenant_id: 'tenant-a',
        user_id: 'user-admin',
        role_id: 'role-admin',
        role_code: 'admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getPermissionsByRoleId: async () => ['users:write'],
    } as never,
    {
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 2592000,
        access_expires_at: '2026-05-14T00:15:00.000Z',
        refresh_expires_at: '2026-06-13T00:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: 'session-admin',
      }),
    } as never,
    {
      createSession: async () => undefined,
      invalidateSession: async () => undefined,
      getSession: async () => null,
      rotateRefreshToken: async () => undefined,
      toPrincipal: () => {
        throw new Error('not used');
      },
    } as never,
    { get: () => undefined } as never,
    {
      enforceLoginChallenge: async (input: Record<string, unknown>) => {
        securityChecks.mfa = input;
        return { status: 'verified' };
      },
    } as never,
    {
      isTrustedDevice: async (input: Record<string, unknown>) => {
        securityChecks.lookup = input;
        return false;
      },
      trustDevice: async (input: Record<string, unknown>) => {
        securityChecks.trust = input;
        return { trusted: true };
      },
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-auth-mfa-login',
      tenant_id: 'tenant-a',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-05-14T00:00:00.000Z',
    },
    () =>
      service.login(
        {
          email: 'admin@example.test',
          password: 'SecurePass!2026',
          audience: 'school',
          mfa_code: '123456',
          trusted_device_token: 'trusted-device-token-1',
          trust_device: true,
        },
        {
          ip_address: '127.0.0.1',
          user_agent: 'test-suite',
        },
      ),
  );

  assert.deepEqual(securityChecks.lookup, {
    userId: 'user-admin',
    rawToken: 'trusted-device-token-1',
  });
  assert.deepEqual(securityChecks.mfa, {
    userId: 'user-admin',
    email: 'admin@example.test',
    displayName: 'School Admin',
    role: 'admin',
    permissions: ['users:write'],
    mfaEnabled: true,
    mfaCode: '123456',
    trustedDevice: false,
  });
  assert.deepEqual(securityChecks.trust, {
    userId: 'user-admin',
    rawToken: 'trusted-device-token-1',
    ipAddress: '127.0.0.1',
    userAgent: 'test-suite',
  });
});

test('AuthService allows the contract demo MFA bypass only for kb-high demo users outside production', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousBypass = process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS;
  process.env.NODE_ENV = 'test';
  process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS = 'true';

  const requestContext = new RequestContextService();
  let mfaChallengeCount = 0;
  let sessionCount = 0;

  try {
    const service = new AuthService(
      requestContext,
      {
        findByEmail: async () => ({
          id: 'user-principal-demo',
          tenant_id: 'kb-high',
          email: 'principal@kisumuboys.demo',
          password_hash: 'hashed-password',
          display_name: 'Kisumu Boys Principal',
          status: 'active',
          email_verified_at: '2026-05-14T00:00:00.000Z',
          mfa_enabled: true,
          mfa_verified_at: '2026-05-14T00:00:00.000Z',
        }),
      } as never,
      {
        findActiveMembership: async () => ({
          id: 'membership-principal-demo',
          tenant_id: 'kb-high',
          user_id: 'user-principal-demo',
          role_id: 'role-principal',
          role_code: 'principal',
          role_name: 'Principal',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      } as never,
      {
        ensureTenantAuthorizationBaseline: async () => undefined,
        getPermissionsByRoleId: async () => ['students:read', 'users:write'],
      } as never,
      {
        compare: async () => true,
      } as never,
      {
        issueTokenPair: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          token_type: 'Bearer' as const,
          access_expires_in: 900,
          refresh_expires_in: 2592000,
          access_expires_at: '2026-05-14T00:15:00.000Z',
          refresh_expires_at: '2026-06-13T00:00:00.000Z',
          access_token_id: 'access-token-id',
          refresh_token_id: 'refresh-token-id',
          session_id: 'session-principal-demo',
        }),
      } as never,
      {
        createSession: async () => {
          sessionCount += 1;
        },
        invalidateSession: async () => undefined,
        getSession: async () => null,
        rotateRefreshToken: async () => undefined,
        toPrincipal: () => {
          throw new Error('not used');
        },
      } as never,
      { get: () => undefined } as never,
      {
        enforceLoginChallenge: async () => {
          mfaChallengeCount += 1;
          throw new UnauthorizedException('MFA should not run for non-production contract demo users');
        },
      } as never,
      {} as never,
    );

    await requestContext.run(
      {
        request_id: 'req-contract-demo-bypass',
        tenant_id: 'kb-high',
        tenant_source: 'subdomain',
        user_id: 'anonymous',
        role: 'guest',
        session_id: null,
        permissions: [],
        is_authenticated: false,
        client_ip: '127.0.0.1',
        user_agent: 'test-suite',
        method: 'POST',
        path: '/auth/login',
        started_at: '2026-05-14T00:00:00.000Z',
      },
      () =>
        service.login(
          {
            email: 'principal@kisumuboys.demo',
            password: 'SecurePass!2026',
            audience: 'school',
          },
          {
            ip_address: '127.0.0.1',
            user_agent: 'test-suite',
          },
        ),
    );

    assert.equal(mfaChallengeCount, 0);
    assert.equal(sessionCount, 1);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousBypass === undefined) delete process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS;
    else process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS = previousBypass;
  }
});

test('AuthService never honors the contract demo MFA bypass in production', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousBypass = process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS;
  process.env.NODE_ENV = 'production';
  process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS = 'true';

  const requestContext = new RequestContextService();
  let mfaChallengeCount = 0;

  try {
    const service = new AuthService(
      requestContext,
      {
        findByEmail: async () => ({
          id: 'user-principal-demo',
          tenant_id: 'kb-high',
          email: 'principal@kisumuboys.demo',
          password_hash: 'hashed-password',
          display_name: 'Kisumu Boys Principal',
          status: 'active',
          email_verified_at: '2026-05-14T00:00:00.000Z',
          mfa_enabled: true,
          mfa_verified_at: '2026-05-14T00:00:00.000Z',
        }),
      } as never,
      {
        findActiveMembership: async () => ({
          id: 'membership-principal-demo',
          tenant_id: 'kb-high',
          user_id: 'user-principal-demo',
          role_id: 'role-principal',
          role_code: 'principal',
          role_name: 'Principal',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      } as never,
      {
        ensureTenantAuthorizationBaseline: async () => undefined,
        getPermissionsByRoleId: async () => ['students:read', 'users:write'],
      } as never,
      {
        compare: async () => true,
      } as never,
      {
        issueTokenPair: async () => {
          throw new Error('tokens should not be issued before MFA');
        },
      } as never,
      {
        createSession: async () => {
          throw new Error('session should not be created before MFA');
        },
        invalidateSession: async () => undefined,
        getSession: async () => null,
        rotateRefreshToken: async () => undefined,
        toPrincipal: () => {
          throw new Error('not used');
        },
      } as never,
      { get: () => undefined } as never,
      {
        enforceLoginChallenge: async () => {
          mfaChallengeCount += 1;
          throw new UnauthorizedException('MFA challenge required for this role');
        },
      } as never,
      {} as never,
    );

    await assert.rejects(
      () =>
        requestContext.run(
          {
            request_id: 'req-contract-demo-prod-bypass-denied',
            tenant_id: 'kb-high',
            tenant_source: 'subdomain',
            user_id: 'anonymous',
            role: 'guest',
            session_id: null,
            permissions: [],
            is_authenticated: false,
            client_ip: '127.0.0.1',
            user_agent: 'test-suite',
            method: 'POST',
            path: '/auth/login',
            started_at: '2026-05-14T00:00:00.000Z',
          },
          () =>
            service.login(
              {
                email: 'principal@kisumuboys.demo',
                password: 'SecurePass!2026',
                audience: 'school',
              },
              {
                ip_address: '127.0.0.1',
                user_agent: 'test-suite',
              },
            ),
        ),
      (error: unknown) =>
        error instanceof UnauthorizedException
        && error.message === 'MFA challenge required for this role',
    );

    assert.equal(mfaChallengeCount, 1);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;

    if (previousBypass === undefined) delete process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS;
    else process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS = previousBypass;
  }
});
