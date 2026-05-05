import assert from 'node:assert/strict';
import test from 'node:test';

import { RequestContextService } from '../common/request-context/request-context.service';
import { AuthService } from './auth.service';

test('AuthService register creates missing global users through the registration helper', async () => {
  const requestContext = new RequestContextService();
  let helperCallCount = 0;
  let createUserCallCount = 0;

  const service = new AuthService(
    requestContext,
    {
      findByEmail: async () => null,
      ensureGlobalUserForRegistration: async (input: {
        email: string;
        password_hash: string;
        display_name: string;
      }) => {
        helperCallCount += 1;

        return {
          id: '00000000-0000-0000-0000-000000000101',
          tenant_id: 'global',
          email: input.email,
          password_hash: input.password_hash,
          display_name: input.display_name,
          status: 'active',
          created_at: new Date('2026-05-04T00:00:00.000Z'),
          updated_at: new Date('2026-05-04T00:00:00.000Z'),
        };
      },
      createUser: async () => {
        createUserCallCount += 1;
        throw new Error('register should not call createUser directly');
      },
      findById: async () => null,
    } as never,
    {
      findMembershipByUserAndTenant: async () => null,
      countActiveMembershipsByTenant: async () => 0,
      createOrActivateMembership: async () => ({
        id: '00000000-0000-0000-0000-000000000201',
        tenant_id: 'tenant-a',
        user_id: '00000000-0000-0000-0000-000000000101',
        role_id: '00000000-0000-0000-0000-000000000301',
        role_code: 'owner',
        status: 'active',
        created_at: new Date('2026-05-04T00:00:00.000Z'),
        updated_at: new Date('2026-05-04T00:00:00.000Z'),
      }),
      findActiveMembership: async () => null,
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({
        id: '00000000-0000-0000-0000-000000000301',
        tenant_id: 'tenant-a',
        code: 'owner',
        name: 'Owner',
        description: 'Full access',
        is_system: true,
        created_at: new Date('2026-05-04T00:00:00.000Z'),
        updated_at: new Date('2026-05-04T00:00:00.000Z'),
      }),
      getPermissionsByRoleId: async () => ['*:*'],
    } as never,
    {
      hash: async () => 'hashed-password',
      compare: async () => true,
    } as never,
    {
      issueTokenPair: async () => ({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        token_type: 'Bearer',
        access_expires_in: 900,
        refresh_expires_in: 2592000,
        access_expires_at: '2026-05-04T01:00:00.000Z',
        refresh_expires_at: '2026-06-04T00:00:00.000Z',
        session_id: 'session-1',
        refresh_token_id: 'refresh-1',
      }),
      verifyAccessToken: async () => {
        throw new Error('not used');
      },
      verifyRefreshToken: async () => {
        throw new Error('not used');
      },
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
  );

  const response = await requestContext.run(
    {
      request_id: 'req-auth-1',
      tenant_id: 'tenant-a',
      user_id: 'anonymous',
      role: 'guest',
      session_id: null,
      permissions: [],
      is_authenticated: false,
      client_ip: '127.0.0.1',
      user_agent: 'test-suite',
      method: 'POST',
      path: '/auth/register',
      started_at: '2026-05-04T00:00:00.000Z',
    },
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
  );

  assert.equal(helperCallCount, 1);
  assert.equal(createUserCallCount, 0);
  assert.equal(response.user.email, 'owner@example.test');
  assert.equal(response.user.tenant_id, 'tenant-a');
});
