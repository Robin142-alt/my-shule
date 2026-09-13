import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { RequestContextService } from '../common/request-context/request-context.service';
import {
  ACADEMIC_TEACHING_ROLE_CODES,
  DEFAULT_PERMISSION_CATALOG,
  DEFAULT_ROLE_CATALOG,
} from './auth.constants';
import type { IssuedTokenPair } from './auth.interfaces';
import { AuthService } from './auth.service';
import { DashboardRoleService } from './dashboard-role.service';
import { TENANT_INVITABLE_ROLE_CODES } from './dto/tenant-invitation.dto';
import { AuthorizationRepository } from './repositories/authorization.repository';
import { UserRoleAssignmentsRepository } from './repositories/user-role-assignments.repository';
import { SessionService } from './session.service';

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

  const seededRolePermissions = JSON.parse(String(queries[2]?.values[1])) as Array<{
    role_code: string;
    resource: string;
    action: string;
  }>;
  const deputyPermissions = seededRolePermissions
    .filter((permission) => permission.role_code === 'deputy_principal')
    .map((permission) => `${permission.resource}:${permission.action}`);

  for (const requiredPermission of [
    'users:read',
    'users:write',
    'tenant_memberships:read',
    'tenant_memberships:write',
  ]) {
    assert.ok(
      deputyPermissions.includes(requiredPermission),
      `baseline should provision ${requiredPermission} for Deputy Principal`,
    );
  }
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
    'head_of_subject',
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
  assert.ok(principalPermissions.includes('academics:write'));
  assert.ok(principalPermissions.includes('academics:assign-teachers'));

  const deputyPrincipal = catalogByCode.get('deputy_principal');
  assert.ok(deputyPrincipal, 'deputy principal role should be present');
  const deputyPermissions = deputyPrincipal.permissions as readonly string[];
  assert.ok(deputyPermissions.includes('users:read'));
  assert.ok(deputyPermissions.includes('users:write'));
  assert.ok(deputyPermissions.includes('tenant_memberships:read'));
  assert.ok(deputyPermissions.includes('tenant_memberships:write'));
  assert.ok(deputyPermissions.includes('roles:read'));
  assert.ok(deputyPermissions.includes('academics:write'));
  assert.ok(deputyPermissions.includes('academics:assign-teachers'));
});

test('fee follow-up permission is limited to authorized school office roles', () => {
  const permission = DEFAULT_PERMISSION_CATALOG.find(
    (candidate) => candidate.resource === 'finance' && candidate.action === 'follow-up',
  );
  assert.ok(permission, 'finance:follow-up should be provisioned');

  const rolesWithFeeFollowUp = DEFAULT_ROLE_CATALOG
    .filter((role) => (role.permissions as readonly string[]).includes('finance:follow-up'))
    .map((role) => role.code)
    .sort();

  assert.deepEqual(rolesWithFeeFollowUp, [
    'accountant',
    'bursar',
    'deputy_principal',
    'principal',
    'secretary',
  ]);
  for (const roleCode of ['teacher', 'class_teacher', 'grade_master']) {
    const role = DEFAULT_ROLE_CATALOG.find((candidate) => candidate.code === roleCode);
    assert.equal((role?.permissions as readonly string[]).includes('finance:follow-up'), false);
  }
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
    mfa_assured_at: '2026-05-14T00:00:00.000Z',
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
    mfa_assured_at: '2026-05-14T00:00:00.000Z',
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
  let authorizationBaselineTenantId: string | null = null;
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
    mfa_assured_at: '2026-05-14T00:00:00.000Z',
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
      ensureTenantAuthorizationBaseline: async (tenantId: string) => {
        authorizationBaselineTenantId = tenantId;
      },
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
  assert.equal(authorizationBaselineTenantId, 'greenhill-academy');
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

test('AuthService bases login MFA assurance on every authorized dashboard role without widening the active role permissions', async () => {
  const requestContext = new RequestContextService();
  let mfaInput: Record<string, unknown> | undefined;
  let createdSession: Record<string, unknown> | undefined;
  const roleContext = {
    primary_role: 'dean_academics',
    active_role: 'dean_academics',
    assigned_roles: ['dean_academics'],
    available_roles: [
      {
        role_code: 'dean_academics',
        role_name: 'Dean of Academics',
        is_primary: true,
        is_teacher_mode: false,
        sources: ['primary_membership' as const],
      },
      {
        role_code: 'teacher',
        role_name: 'Teacher',
        is_primary: false,
        is_teacher_mode: true,
        sources: ['teacher_eligibility' as const],
      },
    ],
    teacher_dashboard_eligible: true,
  };
  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => ({
        id: 'user-dean',
        tenant_id: 'tenant-a',
        email: 'dean@example.test',
        password_hash: 'hashed-password',
        display_name: 'Academic Dean',
        status: 'active',
        email_verified_at: '2026-08-09T00:00:00.000Z',
        mfa_enabled: false,
      }),
    } as never,
    {
      findActiveMembership: async () => ({
        id: 'membership-dean',
        tenant_id: 'tenant-a',
        user_id: 'user-dean',
        role_id: 'role-dean',
        role_code: 'dean_academics',
        role_name: 'Dean of Academics',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getPermissionsByRoleId: async (tenantId: string, roleId: string) => {
        assert.equal(tenantId, 'tenant-a');
        if (roleId === 'role-dean') return ['auth:read', 'academics:read'];
        if (roleId === 'role-teacher') return ['auth:read', 'teacher:read', 'teacher:write'];
        throw new Error(`Unexpected role lookup: ${roleId}`);
      },
    } as never,
    { compare: async () => true } as never,
    {
      issueTokenPair: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer' as const,
        access_expires_in: 900,
        refresh_expires_in: 2592000,
        access_expires_at: '2026-08-09T00:15:00.000Z',
        refresh_expires_at: '2026-09-08T00:00:00.000Z',
        access_token_id: 'access-token-id',
        refresh_token_id: 'refresh-token-id',
        session_id: 'session-dean',
      }),
    } as never,
    {
      createSession: async (input: Record<string, unknown>) => {
        createdSession = input;
      },
    } as never,
    { get: () => undefined } as never,
    {
      enforceLoginChallenge: async (input: Record<string, unknown>) => {
        mfaInput = input;
        return { status: 'verified' as const };
      },
    } as never,
    undefined,
    undefined,
    {
      getAuthorizedRoleSet: async () => ({
        context: roleContext,
        roles: [
          { role_id: 'role-dean', role_code: 'dean_academics' },
          { role_id: 'role-teacher', role_code: 'teacher' },
        ],
      }),
    } as never,
  );

  const response = await requestContext.run(
    {
      request_id: 'req-auth-role-union-mfa',
      tenant_id: 'tenant-a',
      tenant_source: 'subdomain',
      audience: 'school',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/login',
      started_at: '2026-08-09T00:00:00.000Z',
    },
    () => service.login(
      {
        email: 'dean@example.test',
        password: 'SecurePass!2026',
        audience: 'school',
        mfa_code: '123456',
      },
      { ip_address: '127.0.0.1', user_agent: 'test-suite' },
    ),
  );

  assert.deepEqual(mfaInput?.permissions, [
    'auth:read',
    'academics:read',
    'teacher:read',
    'teacher:write',
  ]);
  assert.deepEqual(response.user.permissions, ['auth:read', 'academics:read']);
  assert.deepEqual(createdSession?.permissions, ['auth:read', 'academics:read']);
  assert.equal(response.user.role, 'dean_academics');
  assert.equal(response.role_context.teacher_dashboard_eligible, true);
  assert.equal(
    Number.isFinite(Date.parse(String(createdSession?.mfa_assured_at))),
    true,
  );
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

const SESSION_ROTATION_ID = 'session-rotation-1';
const SESSION_ROTATION_USER_ID = 'user-rotation-1';
const SESSION_ROTATION_TENANT_ID = 'school-rotation-1';
const SESSION_ROTATION_CLIENT_IP = '127.0.0.1';
const SESSION_ROTATION_CLIENT_AGENT = 'MyShule session test';

function createSessionRotationTokenPair(refreshTokenId: string): IssuedTokenPair {
  return {
    access_token: `access-${refreshTokenId}`,
    refresh_token: `refresh-${refreshTokenId}`,
    token_type: 'Bearer',
    access_expires_in: 15 * 60,
    refresh_expires_in: 30 * 24 * 60 * 60,
    access_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    refresh_expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    access_token_id: `access-id-${refreshTokenId}`,
    refresh_token_id: refreshTokenId,
    session_id: SESSION_ROTATION_ID,
  };
}

async function createDegradedSessionService() {
  const service = new SessionService(
    {
      isDegraded: () => true,
    } as never,
    {
      get: (key: string) =>
        key === 'auth.refreshTokenRotationGraceSeconds' ? 30 : undefined,
    } as never,
  );

  await service.createSession({
    user_id: SESSION_ROTATION_USER_ID,
    tenant_id: SESSION_ROTATION_TENANT_ID,
    role: 'teacher',
    audience: 'school',
    permissions: ['academics:read'],
    session_id: SESSION_ROTATION_ID,
    is_authenticated: true,
    email_verified_at: new Date().toISOString(),
    refresh_token_id: 'refresh-0',
    refresh_expires_at: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    ip_address: SESSION_ROTATION_CLIENT_IP,
    user_agent: SESSION_ROTATION_CLIENT_AGENT,
  });

  return service;
}

function createSessionRotationInput(nextTokenPair: IssuedTokenPair) {
  return {
    session_id: SESSION_ROTATION_ID,
    current_refresh_token_id: 'refresh-0',
    next_token_pair: nextTokenPair,
    role: 'teacher',
    permissions: ['academics:read'],
    email_verified_at: new Date().toISOString(),
    ip_address: SESSION_ROTATION_CLIENT_IP,
    user_agent: SESSION_ROTATION_CLIENT_AGENT,
  };
}

test('concurrent refresh requests return the exact same rotated token pair', async () => {
  const service = await createDegradedSessionService();
  const firstCandidate = createSessionRotationTokenPair('refresh-1');
  const secondCandidate = createSessionRotationTokenPair('refresh-2');

  const [first, second] = await Promise.all([
    service.rotateRefreshToken(createSessionRotationInput(firstCandidate)),
    service.rotateRefreshToken(createSessionRotationInput(secondCandidate)),
  ]);

  assert.equal(first.replayed, false);
  assert.equal(second.replayed, true);
  assert.deepEqual(second.token_pair, firstCandidate);
  assert.equal(
    (await service.getSession(SESSION_ROTATION_ID))?.refresh_token_id,
    'refresh-1',
  );
});

test('refresh replay from a different client invalidates the session', async () => {
  const service = await createDegradedSessionService();

  await service.rotateRefreshToken(
    createSessionRotationInput(createSessionRotationTokenPair('refresh-1')),
  );

  await assert.rejects(
    () =>
      service.rotateRefreshToken({
        ...createSessionRotationInput(
          createSessionRotationTokenPair('refresh-2'),
        ),
        ip_address: '203.0.113.10',
        user_agent: 'Unexpected client',
      }),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'Refresh token reuse detected',
  );
  assert.equal(await service.getSession(SESSION_ROTATION_ID), null);
});

test('refresh replay outside the grace period invalidates the session', async () => {
  const service = await createDegradedSessionService();

  await service.rotateRefreshToken(
    createSessionRotationInput(createSessionRotationTokenPair('refresh-1')),
  );

  const rotations = (
    service as unknown as {
      fallbackRefreshRotations: Map<string, { expires_at: number }>;
    }
  ).fallbackRefreshRotations;

  for (const replay of rotations.values()) {
    replay.expires_at = Date.now() - 1;
  }

  await assert.rejects(
    () =>
      service.rotateRefreshToken(
        createSessionRotationInput(
          createSessionRotationTokenPair('refresh-2'),
        ),
      ),
    (error: unknown) =>
      error instanceof UnauthorizedException
      && error.message === 'Refresh token reuse detected',
  );
  assert.equal(await service.getSession(SESSION_ROTATION_ID), null);
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

test('DashboardRoleService grants Teacher mode to every teaching-eligible assigned role', async () => {
  for (const roleCode of new Set([...ACADEMIC_TEACHING_ROLE_CODES, 'admissions_officer'])) {
    const service = new DashboardRoleService(
      {
        findActiveMembership: async () => ({
          id: `membership-${roleCode}`,
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: `role-${roleCode}`,
          role_code: roleCode,
          role_name: DEFAULT_ROLE_CATALOG.find((role) => role.code === roleCode)?.name ?? roleCode,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        }),
      } as never,
      {
        findActiveRolesForUser: async () => [],
      } as never,
      {
        getRoleByCode: async (_tenantId: string, requestedRole: string) => ({
          id: `role-${requestedRole}`,
          tenant_id: 'tenant-a',
          code: requestedRole,
          name: 'Teacher',
          description: null,
          is_system: true,
          created_at: new Date(),
          updated_at: new Date(),
        }),
      } as never,
    );

    const context = await service.getRoleContext({
      user_id: 'user-a',
      tenant_id: 'tenant-a',
      active_role: roleCode,
    });
    const teacherOption = context.available_roles.find((role) => role.role_code === 'teacher');

    assert.equal(context.teacher_dashboard_eligible, true, roleCode);
    assert.equal(teacherOption?.is_teacher_mode, true, roleCode);

    const teacherSelection = await service.authorizeRole({
      user_id: 'user-a',
      tenant_id: 'tenant-a',
      active_role: 'teacher',
      requested_role: 'teacher',
    });
    assert.equal(teacherSelection.role_code, 'teacher', roleCode);
  }
});

test('DashboardRoleService rejects unauthorized, cross-tenant, and unsupported additional roles', async () => {
  const service = new DashboardRoleService(
    {
      findActiveMembership: async () => ({
        id: 'membership-accountant',
        tenant_id: 'tenant-a',
        user_id: 'user-a',
        role_id: 'role-accountant',
        role_code: 'accountant',
        role_name: 'Accountant',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      findActiveRolesForUser: async () => [
        {
          assignment_id: 'cross-tenant-role',
          tenant_id: 'tenant-b',
          user_id: 'user-a',
          role_id: 'role-principal-b',
          role_code: 'principal',
          role_name: 'Principal',
          scope_type: 'SCHOOL',
          scope_id: null,
        },
        {
          assignment_id: 'unknown-role',
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: 'role-custom',
          role_code: 'custom_dashboard_admin',
          role_name: 'Custom dashboard admin',
          scope_type: 'SCHOOL',
          scope_id: null,
        },
      ],
    } as never,
    {
      getRoleByCode: async () => {
        throw new Error('Teacher role must not resolve for an unauthorized account');
      },
    } as never,
  );

  const context = await service.getRoleContext({
    user_id: 'user-a',
    tenant_id: 'tenant-a',
    active_role: 'accountant',
  });
  assert.deepEqual(context.assigned_roles, ['accountant']);
  assert.equal(context.teacher_dashboard_eligible, false);
  assert.equal(context.available_roles.some((role) => role.role_code === 'principal'), false);
  assert.equal(context.available_roles.some((role) => role.role_code === 'custom_dashboard_admin'), false);

  await assert.rejects(
    () => service.authorizeRole({
      user_id: 'user-a',
      tenant_id: 'tenant-a',
      active_role: 'teacher',
      requested_role: 'teacher',
    }),
    ForbiddenException,
  );
});

test('DashboardRoleService deduplicates primary and additional roles while preserving genuine sources', async () => {
  const service = new DashboardRoleService(
    {
      findActiveMembership: async () => ({
        id: 'membership-principal',
        tenant_id: 'tenant-a',
        user_id: 'user-a',
        role_id: 'role-principal',
        role_code: 'principal',
        role_name: 'Principal',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      findActiveRolesForUser: async () => [
        {
          assignment_id: 'duplicate-principal',
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: 'role-principal',
          role_code: 'principal',
          role_name: 'Principal',
          scope_type: 'SCHOOL',
          scope_id: null,
        },
        {
          assignment_id: 'hod-role',
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: 'role-hod',
          role_code: 'hod',
          role_name: 'Head of Department',
          scope_type: 'SCHOOL',
          scope_id: null,
        },
      ],
    } as never,
    {
      getRoleByCode: async () => ({ id: 'role-teacher' }),
    } as never,
  );

  const context = await service.getRoleContext({
    user_id: 'user-a',
    tenant_id: 'tenant-a',
    active_role: 'principal',
  });
  const principal = context.available_roles.find((role) => role.role_code === 'principal');

  assert.deepEqual(context.assigned_roles, ['principal', 'hod']);
  assert.deepEqual(principal?.sources, ['primary_membership', 'additional_assignment']);
  assert.equal(context.available_roles.filter((role) => role.role_code === 'teacher').length, 1);
});

test('DashboardRoleService refuses to elevate scoped additional assignments into tenant-wide dashboard sessions', async () => {
  const service = new DashboardRoleService(
    {
      findActiveMembership: async () => ({
        id: 'membership-accountant',
        tenant_id: 'tenant-a',
        user_id: 'user-a',
        role_id: 'role-accountant',
        role_code: 'accountant',
        role_name: 'Accountant',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    {
      findActiveRolesForUser: async () => [
        {
          assignment_id: 'department-hod',
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: 'role-hod',
          role_code: 'hod',
          role_name: 'Head of Department',
          scope_type: 'DEPARTMENT',
          scope_id: 'department-science',
        },
        {
          assignment_id: 'class-teacher',
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: 'role-class-teacher',
          role_code: 'class_teacher',
          role_name: 'Class Teacher',
          scope_type: 'CLASS',
          scope_id: 'class-a',
        },
        {
          assignment_id: 'school-secretary',
          tenant_id: 'tenant-a',
          user_id: 'user-a',
          role_id: 'role-secretary',
          role_code: 'secretary',
          role_name: 'Secretary',
          scope_type: 'SCHOOL',
          scope_id: null,
        },
      ],
    } as never,
    {
      getRoleByCode: async () => {
        throw new Error('Scoped teaching roles must not create Teacher eligibility');
      },
    } as never,
  );

  const context = await service.getRoleContext({
    user_id: 'user-a',
    tenant_id: 'tenant-a',
    active_role: 'accountant',
  });

  assert.deepEqual(context.assigned_roles, ['accountant', 'secretary']);
  assert.equal(context.teacher_dashboard_eligible, false);
  await assert.rejects(
    () => service.authorizeRole({
      user_id: 'user-a',
      tenant_id: 'tenant-a',
      active_role: 'hod',
      requested_role: 'hod',
    }),
    ForbiddenException,
  );
  await assert.rejects(
    () => service.authorizeRole({
      user_id: 'user-a',
      tenant_id: 'tenant-a',
      active_role: 'teacher',
      requested_role: 'teacher',
    }),
    ForbiddenException,
  );
});

test('DashboardRoleService preserves the existing least-privilege member session without teacher eligibility', async () => {
  const service = new DashboardRoleService(
    {
      findActiveMembership: async () => ({
        id: 'membership-member',
        tenant_id: 'tenant-a',
        user_id: 'user-a',
        role_id: 'role-member',
        role_code: 'member',
        role_name: 'Member',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    { findActiveRolesForUser: async () => [] } as never,
    {} as never,
  );

  const context = await service.getRoleContext({
    user_id: 'user-a',
    tenant_id: 'tenant-a',
    active_role: 'member',
  });

  assert.deepEqual(context.assigned_roles, ['member']);
  assert.equal(context.active_role, 'member');
  assert.equal(context.teacher_dashboard_eligible, false);
  assert.deepEqual(context.available_roles.map((role) => role.role_code), ['member']);
});

test('DashboardRoleService rejects unsupported primary account roles', async () => {
  const service = new DashboardRoleService(
    {
      findActiveMembership: async () => ({
        id: 'membership-custom',
        tenant_id: 'tenant-a',
        user_id: 'user-a',
        role_id: 'role-custom',
        role_code: 'custom_dashboard_admin',
        role_name: 'Custom dashboard admin',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      }),
    } as never,
    { findActiveRolesForUser: async () => [] } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.getRoleContext({
      user_id: 'user-a',
      tenant_id: 'tenant-a',
      active_role: 'custom_dashboard_admin',
    }),
    ForbiddenException,
  );
});

test('UserRoleAssignmentsRepository binds active assignments to the requested user and tenant', async () => {
  let capturedSql = '';
  let capturedValues: unknown[] = [];
  const repository = new UserRoleAssignmentsRepository({
    query: async (sql: string, values: unknown[]) => {
      capturedSql = sql;
      capturedValues = values;
      return { rows: [] };
    },
  } as never);

  await repository.findActiveRolesForUser('user-a', 'tenant-a');

  assert.match(capturedSql, /user_role\.tenant_id = \$1/);
  assert.match(capturedSql, /user_role\.user_id = \$2/);
  assert.match(capturedSql, /upper\(user_role\.status\) = 'ACTIVE'/);
  assert.match(capturedSql, /user_role\.deleted_at IS NULL/);
  assert.match(capturedSql, /role\.tenant_id = user_role\.tenant_id/);
  assert.match(capturedSql, /upper\(COALESCE\(user_role\.scope_type, ''\)\) = 'SCHOOL'/);
  assert.match(capturedSql, /NULLIF\(btrim\(COALESCE\(user_role\.scope_id, ''\)\), ''\) IS NULL/);
  assert.deepEqual(capturedValues, ['tenant-a', 'user-a']);
});

test('AuthService switches and refreshes the active role with exact permissions and one identity', async () => {
  const requestContext = new RequestContextService();
  const roleContext = {
    primary_role: 'principal',
    active_role: 'teacher',
    assigned_roles: ['principal'],
    available_roles: [
      {
        role_code: 'principal',
        role_name: 'Principal',
        is_primary: true,
        is_teacher_mode: false,
        sources: ['primary_membership' as const],
      },
      {
        role_code: 'teacher',
        role_name: 'Teacher',
        is_primary: false,
        is_teacher_mode: true,
        sources: ['teacher_eligibility' as const],
      },
    ],
    teacher_dashboard_eligible: true,
  };
  const tokenPairs: IssuedTokenPair[] = [];
  let session = {
    user_id: 'user-principal',
    tenant_id: 'tenant-a',
    role: 'principal',
    audience: 'school' as const,
    permissions: ['principal:read'],
    session_id: 'session-a',
    is_authenticated: true,
    email_verified_at: '2026-08-09T00:00:00.000Z',
    mfa_assured_at: null as string | null,
    refresh_token_id: 'refresh-original',
    created_at: '2026-08-09T00:00:00.000Z',
    updated_at: '2026-08-09T00:00:00.000Z',
    refresh_expires_at: '2026-09-09T00:00:00.000Z',
    ip_address: '127.0.0.1',
    user_agent: 'test-suite',
  };
  let auditMetadata: Record<string, unknown> | undefined;
  let synchronizedRole: string | null = null;
  const tokenService = {
    issueTokenPair: async (subject: { role: string; session_id: string }) => {
      const sequence = tokenPairs.length + 1;
      const pair: IssuedTokenPair = {
        access_token: `access-${sequence}`,
        refresh_token: `refresh-${sequence}`,
        token_type: 'Bearer',
        access_expires_in: 900,
        refresh_expires_in: 2592000,
        access_expires_at: '2026-08-09T00:15:00.000Z',
        refresh_expires_at: '2026-09-09T00:00:00.000Z',
        access_token_id: `access-id-${sequence}`,
        refresh_token_id: `refresh-id-${sequence}`,
        session_id: subject.session_id,
      };
      assert.equal(subject.role, 'teacher');
      tokenPairs.push(pair);
      return pair;
    },
    verifyAccessToken: async () => ({
      sub: 'user-principal',
      user_id: 'user-principal',
      tenant_id: 'tenant-a',
      role: 'principal',
      audience: 'school' as const,
      session_id: 'session-a',
      token_id: 'old-access-id',
      type: 'access' as const,
    }),
    verifyRefreshToken: async () => ({
      sub: 'user-principal',
      user_id: 'user-principal',
      tenant_id: 'tenant-a',
      role: 'teacher',
      audience: 'school' as const,
      session_id: 'session-a',
      token_id: session.refresh_token_id,
      type: 'refresh' as const,
    }),
  };
  const service = new AuthService(
    requestContext,
    {
      findById: async () => ({
        id: 'user-principal',
        tenant_id: 'global',
        email: 'principal@example.test',
        password_hash: 'hashed-password',
        display_name: 'School Principal',
        status: 'active',
        email_verified_at: '2026-08-09T00:00:00.000Z',
      }),
    } as never,
    {
      findActiveMembership: async () => ({
        id: 'membership-principal',
        tenant_id: 'tenant-a',
        user_id: 'user-principal',
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
      getPermissionsByRoleId: async (_tenantId: string, roleId: string) => {
        assert.equal(roleId, 'role-teacher');
        return ['auth:read', 'teacher:read', 'teacher:write'];
      },
    } as never,
    {} as never,
    tokenService as never,
    {
      getSession: async () => session,
      invalidateSession: async () => undefined,
      rotateRefreshToken: async (input: {
        current_refresh_token_id: string;
        next_token_pair: IssuedTokenPair;
        role: string;
        permissions: string[];
      }) => {
        assert.equal(input.current_refresh_token_id, session.refresh_token_id);
        session = {
          ...session,
          role: input.role,
          permissions: input.permissions,
          refresh_token_id: input.next_token_pair.refresh_token_id,
          refresh_expires_at: input.next_token_pair.refresh_expires_at,
        };
        return { session, token_pair: input.next_token_pair, replayed: false };
      },
      toPrincipal: (activeSession: typeof session) => ({
        user_id: activeSession.user_id,
        tenant_id: activeSession.tenant_id,
        role: activeSession.role,
        audience: activeSession.audience,
        permissions: activeSession.permissions,
        session_id: activeSession.session_id,
        is_authenticated: true,
      }),
    } as never,
    { get: () => undefined } as never,
    undefined,
    undefined,
    {
      synchronizeRequestSession: async (context: { role?: string | null }) => {
        synchronizedRole = context.role ?? null;
      },
    } as never,
    {
      authorizeRole: async (input: { requested_role: string }) => {
        assert.equal(input.requested_role, 'teacher');
        return { role_id: 'role-teacher', role_code: 'teacher', context: roleContext };
      },
      getRoleContext: async () => roleContext,
    } as never,
    {
      record: async (record: { metadata?: Record<string, unknown> }) => {
        auditMetadata = record.metadata;
      },
    } as never,
  );

  await requestContext.run(
    {
      request_id: 'req-role-switch',
      tenant_id: 'tenant-a',
      tenant_source: 'subdomain',
      audience: 'school',
      user_id: 'user-principal',
      role: 'principal',
      session_id: 'session-a',
      permissions: ['principal:read'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/active-role',
      started_at: '2026-08-09T00:00:00.000Z',
    },
    async () => {
      await assert.rejects(
        () => service.switchActiveRole(
          { role_code: 'teacher' },
          { ip_address: '127.0.0.1', user_agent: 'test-suite' },
        ),
        (error: unknown) =>
          error instanceof UnauthorizedException
          && /not MFA-assured/i.test(error.message),
      );
      assert.equal(tokenPairs.length, 0);

      session = {
        ...session,
        mfa_assured_at: '2026-08-09T00:00:00.000Z',
      };
      const switched = await service.switchActiveRole(
        { role_code: 'teacher' },
        { ip_address: '127.0.0.1', user_agent: 'test-suite' },
      );

      assert.equal(switched.user.user_id, 'user-principal');
      assert.equal(switched.user.tenant_id, 'tenant-a');
      assert.equal(switched.user.session_id, 'session-a');
      assert.equal(switched.user.role, 'teacher');
      assert.deepEqual(switched.user.permissions, ['auth:read', 'teacher:read', 'teacher:write']);
      assert.equal(switched.role_context.active_role, 'teacher');
      assert.equal(synchronizedRole, 'teacher');
      assert.deepEqual(auditMetadata, {
        previous_role: 'principal',
        active_role: 'teacher',
        primary_role: 'principal',
        teacher_dashboard_eligible: true,
      });

      await assert.rejects(
        () => service.authenticateAccessToken('old-access-token', 'tenant-a', 'school'),
        /out of sync with the active session/,
      );

      const refreshed = await service.refresh(
        { refresh_token: 'refresh-1' },
        { ip_address: '127.0.0.1', user_agent: 'test-suite' },
      );
      assert.equal(refreshed.user.role, 'teacher');
      assert.equal(refreshed.role_context.active_role, 'teacher');

      const me = await service.me();
      assert.equal(me.user.role, 'teacher');
      assert.equal(me.role_context.active_role, 'teacher');
    },
  );
});

test('AuthService never exposes staff dashboard role switching to portal sessions', async () => {
  const requestContext = new RequestContextService();
  let dashboardRoleCalls = 0;
  const service = new AuthService(
    requestContext,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    undefined,
    undefined,
    undefined,
    {
      getRoleContext: async () => {
        dashboardRoleCalls += 1;
        throw new Error('Portal sessions must not resolve staff dashboards');
      },
      authorizeRole: async () => {
        dashboardRoleCalls += 1;
        throw new Error('Portal sessions must not authorize staff dashboards');
      },
    } as never,
    {} as never,
  );

  await requestContext.run(
    {
      request_id: 'req-portal-role-switch',
      tenant_id: 'tenant-a',
      tenant_source: 'subdomain',
      audience: 'portal',
      user_id: 'parent-a',
      role: 'parent',
      session_id: 'session-parent',
      permissions: ['auth:read', 'portal:read_own_children'],
      is_authenticated: true,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/active-role',
      started_at: '2026-08-09T00:00:00.000Z',
    },
    async () => {
      await assert.rejects(() => service.dashboardRoles(), ForbiddenException);
      await assert.rejects(
        () => service.switchActiveRole(
          { role_code: 'teacher' },
          { ip_address: '127.0.0.1', user_agent: 'test-suite' },
        ),
        ForbiddenException,
      );
    },
  );

  assert.equal(dashboardRoleCalls, 0);
});

test('default Teacher and Class Teacher roles receive exact Teacher command permissions only', () => {
  const teacher = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'teacher');
  const classTeacher = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'class_teacher');
  const dean = DEFAULT_ROLE_CATALOG.find((role) => role.code === 'dean_academics');

  for (const role of [teacher, classTeacher]) {
    const permissions: readonly string[] = role?.permissions ?? [];
    assert.equal(permissions.includes('teacher:read'), true);
    assert.equal(permissions.includes('teacher:write'), true);
  }

  const deanPermissions: readonly string[] = dean?.permissions ?? [];
  assert.equal(deanPermissions.includes('teacher:read'), false);
  assert.equal(deanPermissions.includes('teacher:write'), false);
});

test('timetable permissions keep role views read-only while the Deputy retains timetable write access', () => {
  const role = (code: string): readonly string[] =>
    DEFAULT_ROLE_CATALOG.find((candidate) => candidate.code === code)?.permissions ?? [];

  for (const roleCode of [
    'teacher',
    'class_teacher',
    'grade_master',
    'hod',
    'dean_academics',
    'exams_manager',
    'discipline_master',
    'school_counsellor',
    'boarding_master',
  ]) {
    assert.equal(role(roleCode).includes('timetable:read'), true, `${roleCode} should read assigned timetable views`);
    assert.equal(role(roleCode).includes('timetable:write'), false, `${roleCode} must not mutate the master timetable`);
  }

  assert.equal(role('principal').includes('timetable:read'), true);
  assert.equal(role('principal').includes('timetable:write'), false, 'Principal retains timetable oversight without draft mutation');
  assert.equal(role('deputy_principal').includes('timetable:read'), true);
  assert.equal(role('deputy_principal').includes('timetable:write'), true);
});
