import assert from 'node:assert/strict';
import test from 'node:test';

import { BadRequestException } from '@nestjs/common';

import { TenantInvitationsService } from './tenant-invitations.service';

test('TenantInvitationsService sends a tenant-scoped role invitation without exposing the token', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const baselines: string[] = [];
  const roleLookups: Array<{ tenantId: string; code: string }> = [];
  const sentInvites: Array<{
    to: string;
    displayName: string;
    schoolName: string;
    assignedRole?: string;
    inviterName?: string;
    inviteUrl: string;
    supportNote?: string;
  }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('SELECT name FROM tenants')) {
          return { rows: [{ name: 'Green Valley School' }] };
        }

        if (text.includes('FROM users') && text.includes('display_name')) {
          return { rows: [{ display_name: 'Principal Wanjiku', email: 'principal@example.test' }] };
        }

        if (text.includes('INSERT INTO auth_action_tokens')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000801' }] };
        }

        if (text.includes('INSERT INTO auth_email_outbox')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000901' }] };
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async (tenantId: string) => {
        baselines.push(tenantId);
      },
      getRoleByCode: async (tenantId: string, code: string) => {
        roleLookups.push({ tenantId, code });
        return { id: 'role-1', code, name: 'Teacher' };
      },
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: {
        to: string;
        displayName: string;
        schoolName: string;
        assignedRole?: string;
        inviterName?: string;
        inviteUrl: string;
        supportNote?: string;
      }) => {
        sentInvites.push(input);
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.inviteTenantUser({
    email: 'Teacher@Example.test',
    display_name: 'Teacher One',
    role_code: 'teacher',
  });

  assert.deepEqual(baselines, ['green-valley']);
  assert.deepEqual(roleLookups, [{ tenantId: 'green-valley', code: 'teacher' }]);
  assert.equal(sentInvites.length, 1);
  assert.equal(sentInvites[0]?.to, 'teacher@example.test');
  assert.equal(sentInvites[0]?.displayName, 'Teacher One');
  assert.equal(sentInvites[0]?.schoolName, 'Green Valley School');
  assert.equal(sentInvites[0]?.assignedRole, 'Teacher');
  assert.equal(sentInvites[0]?.inviterName, 'Principal Wanjiku');
  assert.match(sentInvites[0]?.supportNote ?? '', /school administrator or MyShule support/i);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/my-shule-erp\.vercel\.app\/invite\/accept\?token=/);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /[?&]tenant=green-valley(?:&|$)/);
  assert.equal(response.tenant_id, 'green-valley');
  assert.equal(response.email, 'teacher@example.test');
  assert.equal(response.role_code, 'teacher');
  assert.equal(response.invitation_sent, true);
  assert.equal(JSON.stringify(response).includes('token='), false);
  const tokenInsert = queries.find((query) => query.text.includes('INSERT INTO auth_action_tokens'));
  assert.match(String(tokenInsert?.values[3]), /^[a-f0-9]{64}$/);
  assert.equal(String(tokenInsert?.values[2]), 'teacher@example.test');
  const tokenMetadata = JSON.parse(String(tokenInsert?.values[5] ?? '{}'));
  assert.equal(tokenMetadata.role_name, 'Teacher');
  assert.equal(tokenMetadata.invited_by_display_name, 'Principal Wanjiku');
  const outboxInsert = queries.find((query) => query.text.includes('INSERT INTO auth_email_outbox'));
  const markDeliveryQuery = queries.find((query) => query.text.includes('app.mark_auth_email_outbox_delivery'));
  assert.match(markDeliveryQuery?.text ?? '', /\$1::uuid,\s*\$2::text/);
  assert.doesNotMatch(String(outboxInsert?.values[3] ?? ''), /token=|invite_url/);
  const outboxPayload = JSON.parse(String(outboxInsert?.values[3] ?? '{}'));
  assert.equal(outboxPayload.role_name, 'Teacher');
  assert.equal(outboxPayload.invited_by_display_name, 'Principal Wanjiku');
});

test('TenantInvitationsService rejects unsupported tenant invitation roles before sending email', async () => {
  const sentInvites: unknown[] = [];
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({ id: 'role-1' }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: unknown) => {
        sentInvites.push(input);
      },
    } as never,
    { get: () => undefined } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  await assert.rejects(
    () =>
      service.inviteTenantUser({
        email: 'user@example.test',
        display_name: 'User One',
        role_code: 'platform_owner',
      }),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message.includes('Unsupported invitation role'),
  );

  assert.equal(queries.length, 0);
  assert.equal(sentInvites.length, 0);
});

test('TenantInvitationsService lists active users and pending tenant invitations without tokens', async () => {
  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        assert.deepEqual(values, ['green-valley', null, null, null, 25, 0]);
        assert.match(text, /tenant_memberships/);
        assert.match(text, /auth_action_tokens/);
        assert.doesNotMatch(text, /SELECT \*/);
        assert.match(text, /LIMIT \$5::integer/);
        assert.match(text, /OFFSET \$6::integer/);
        assert.match(text, /ORDER BY\s+CASE managed_users\.kind WHEN 'invitation' THEN 0 ELSE 1 END/);

        return {
          rows: [
            {
              id: 'membership-1',
              kind: 'member',
              display_name: 'Mary Wanjiku',
              email: 'principal@example.test',
              role_code: 'admin',
              role_name: 'School admin',
              status: 'active',
              expires_at: null,
              created_at: new Date('2026-05-12T09:00:00.000Z'),
            },
            {
              id: 'invite-1',
              kind: 'invitation',
              display_name: 'Jane Parent',
              email: 'parent@example.test',
              role_code: 'parent',
              role_name: 'Parent',
              status: 'invited',
              expires_at: new Date('2026-05-20T09:00:00.000Z'),
              created_at: new Date('2026-05-13T09:00:00.000Z'),
            },
          ],
        };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({ id: 'role-1' }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.listTenantUsers();

  assert.equal(response.users.length, 2);
  assert.equal(response.users[0]?.display_name, 'Mary Wanjiku');
  assert.equal(response.users[1]?.status, 'invited');
  assert.equal(JSON.stringify(response).includes('token'), false);
});

test('TenantInvitationsService scopes user search and caps page size', async () => {
  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        assert.deepEqual(values, ['green-valley', '%mary%', 'teacher', 'active', 50, 75]);
        assert.match(text, /tm\.tenant_id = \$1/);
        assert.match(text, /token\.tenant_id = \$1/);
        assert.match(text, /managed_users\.role_code = \$3::text/);
        assert.match(text, /managed_users\.status = \$4::text/);
        assert.match(text, /LIMIT \$5::integer/);
        assert.match(text, /OFFSET \$6::integer/);

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({ id: 'role-1' }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.listTenantUsers({
    search: ' Mary ',
    role_code: 'teacher',
    status: 'active',
    limit: 1000,
    offset: 75,
  });

  assert.deepEqual(response.users, []);
  assert.deepEqual(response.pagination, {
    limit: 50,
    offset: 75,
    returned: 0,
  });
});

test('TenantInvitationsService resends a pending invitation with a rotated token', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const sentInvites: Array<{
    to: string;
    displayName: string;
    schoolName: string;
    assignedRole?: string;
    inviterName?: string;
    inviteUrl: string;
  }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('FOR UPDATE')) {
          return {
            rows: [
              {
                id: 'invite-1',
                tenant_id: 'green-valley',
                email: 'Parent@Example.test',
                display_name: 'Jane Parent',
                role_code: 'parent',
                role_name: 'Parent',
                invited_by_display_name: 'Principal Wanjiku',
                expires_at: new Date('2026-05-14T09:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('SELECT name FROM tenants')) {
          return { rows: [{ name: 'Green Valley School' }] };
        }

        if (text.includes('FROM users') && text.includes('display_name')) {
          return { rows: [{ display_name: 'Deputy Otieno', email: 'deputy@example.test' }] };
        }

        if (text.includes('INSERT INTO auth_email_outbox')) {
          return { rows: [{ id: 'outbox-1' }] };
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({ id: 'role-parent', code: 'parent', name: 'Parent' }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: {
        to: string;
        displayName: string;
        schoolName: string;
        assignedRole?: string;
        inviterName?: string;
        inviteUrl: string;
      }) => {
        sentInvites.push(input);
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.resendTenantInvitation('invite-1');

  assert.equal(response.id, 'invite-1');
  assert.equal(response.invitation_sent, true);
  assert.equal(sentInvites.length, 1);
  assert.equal(sentInvites[0]?.to, 'parent@example.test');
  assert.equal(sentInvites[0]?.assignedRole, 'Parent');
  assert.equal(sentInvites[0]?.inviterName, 'Deputy Otieno');
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/my-shule-erp\.vercel\.app\/invite\/accept\?token=/);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /[?&]tenant=green-valley(?:&|$)/);
  const tokenUpdate = queries.find((query) => query.text.includes('UPDATE auth_action_tokens'));
  const markDeliveryQuery = queries.find((query) => query.text.includes('app.mark_auth_email_outbox_delivery'));
  assert.equal(tokenUpdate?.values[0], 'invite-1');
  assert.match(String(tokenUpdate?.values[2]), /^[a-f0-9]{64}$/);
  const tokenMetadata = JSON.parse(String(tokenUpdate?.values[4] ?? '{}'));
  assert.equal(tokenMetadata.role_name, 'Parent');
  assert.equal(tokenMetadata.invited_by_display_name, 'Deputy Otieno');
  assert.match(markDeliveryQuery?.text ?? '', /\$1::uuid,\s*\$2::text/);
});

test('TenantInvitationsService revokes only pending tenant invitations for the current tenant', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return { rows: [{ id: 'invite-1' }] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({ id: 'role-1' }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.revokeTenantInvitation('invite-1');

  assert.deepEqual(response, { id: 'invite-1', status: 'revoked' });
  assert.match(queries[0]?.text ?? '', /UPDATE auth_action_tokens/);
  assert.deepEqual(queries[0]?.values, ['invite-1', 'green-valley', 'school-admin']);
});

test('TenantInvitationsService updates tenant membership status for the current tenant', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return {
          rows: [
            {
              id: 'membership-1',
              kind: 'member',
              display_name: 'Mary Wanjiku',
              email: 'principal@example.test',
              role_code: 'admin',
              role_name: 'School admin',
              status: 'suspended',
              expires_at: null,
              created_at: new Date('2026-05-12T09:00:00.000Z'),
            },
          ],
        };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async () => ({ id: 'role-1' }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.updateTenantMembershipStatus('membership-1', 'suspended');

  assert.equal(response.status, 'suspended');
  assert.equal(response.display_name, 'Mary Wanjiku');
  assert.match(queries[0]?.text ?? '', /UPDATE tenant_memberships/);
  assert.deepEqual(queries[0]?.values, ['membership-1', 'green-valley', 'suspended']);
});

test('TenantInvitationsService updates tenant membership role after validating role code', async () => {
  const roleLookups: Array<{ tenantId: string; code: string }> = [];
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });
        return {
          rows: [
            {
              id: 'membership-1',
              kind: 'member',
              display_name: 'Mary Wanjiku',
              email: 'principal@example.test',
              role_code: 'teacher',
              role_name: 'Teacher',
              status: 'active',
              expires_at: null,
              created_at: new Date('2026-05-12T09:00:00.000Z'),
            },
          ],
        };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async (tenantId: string, code: string) => {
        roleLookups.push({ tenantId, code });
        return { id: 'role-teacher', code };
      },
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: () => undefined } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
  );

  const response = await service.updateTenantMembershipRole('membership-1', 'teacher');

  assert.equal(response.role_code, 'teacher');
  assert.deepEqual(roleLookups, [{ tenantId: 'green-valley', code: 'teacher' }]);
  assert.match(queries[0]?.text ?? '', /UPDATE tenant_memberships/);
  assert.deepEqual(queries[0]?.values, ['membership-1', 'green-valley', 'role-teacher']);
});

test('TenantInvitationsService records audit logs for invitation and membership actions', async () => {
  const auditLogs: Array<{
    action: string;
    resource_type: string;
    resource_id?: string | null;
    metadata?: Record<string, unknown>;
  }> = [];

  const service = new TenantInvitationsService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string) => {
        if (text.includes('SELECT name FROM tenants')) {
          return { rows: [{ name: 'Green Valley School' }] };
        }

        if (text.includes('INSERT INTO auth_action_tokens')) {
          return { rows: [{ id: 'invite-1' }] };
        }

        if (text.includes('INSERT INTO auth_email_outbox')) {
          return { rows: [{ id: 'outbox-1' }] };
        }

        if (text.includes('FOR UPDATE')) {
          return {
            rows: [
              {
                id: 'invite-1',
                tenant_id: 'green-valley',
                email: 'teacher@example.test',
                display_name: 'Teacher One',
                role_code: 'teacher',
                expires_at: new Date('2026-05-14T09:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('UPDATE auth_action_tokens')) {
          return { rows: [{ id: 'invite-1' }] };
        }

        if (text.includes('UPDATE tenant_memberships')) {
          return {
            rows: [
              {
                id: 'membership-1',
                kind: 'member',
                display_name: 'Mary Wanjiku',
                email: 'principal@example.test',
                role_code: text.includes('role_id') ? 'teacher' : 'admin',
                role_name: text.includes('role_id') ? 'Teacher' : 'School admin',
                status: text.includes('status = $3') ? 'suspended' : 'active',
                expires_at: null,
                created_at: new Date('2026-05-12T09:00:00.000Z'),
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
      getRoleByCode: async (_tenantId: string, code: string) => ({ id: `role-${code}`, code }),
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      requireStore: () => ({
        tenant_id: 'green-valley',
        user_id: 'school-admin',
      }),
    } as never,
    {
      record: async (input: {
        action: string;
        resource_type: string;
        resource_id?: string | null;
        metadata?: Record<string, unknown>;
      }) => {
        auditLogs.push(input);
      },
    } as never,
  );

  await service.inviteTenantUser({
    email: 'teacher@example.test',
    display_name: 'Teacher One',
    role_code: 'teacher',
  });
  await service.resendTenantInvitation('invite-1');
  await service.revokeTenantInvitation('invite-1');
  await service.updateTenantMembershipStatus('membership-1', 'suspended');
  await service.updateTenantMembershipRole('membership-1', 'teacher');

  assert.deepEqual(
    auditLogs.map((entry) => entry.action),
    [
      'tenant.invitation.created',
      'tenant.invitation.resent',
      'tenant.invitation.revoked',
      'tenant.membership.status_changed',
      'tenant.membership.role_changed',
    ],
  );
  assert.equal(auditLogs[0]?.resource_type, 'tenant_invitation');
  assert.equal(auditLogs[0]?.resource_id, 'invite-1');
  assert.equal(auditLogs[0]?.metadata?.email, 'teacher@example.test');
  assert.equal(auditLogs[3]?.resource_type, 'tenant_membership');
  assert.equal(auditLogs[4]?.metadata?.role_code, 'teacher');
});
