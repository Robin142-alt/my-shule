import assert from 'node:assert/strict';
import test from 'node:test';

import { EmailDeliveryError } from '../../auth/auth-email.service';
import { PlatformOnboardingService } from './platform-onboarding.service';

test('PlatformOnboardingService creates a school and sends an invite without exposing the token', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const baselines: string[] = [];
  const sentInvites: Array<{ to: string; inviteUrl: string }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
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
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: { to: string; inviteUrl: string }) => {
        sentInvites.push(input);
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      getStore: () => ({
        user_id: 'platform-owner',
      }),
    } as never,
  );

  const response = await service.createSchool({
    school_name: 'Green Valley School',
    tenant_id: 'Green Valley',
    admin_email: 'Principal@Example.test',
    admin_name: 'Principal User',
  });

  assert.deepEqual(baselines, ['green-valley']);
  assert.equal(sentInvites.length, 1);
  assert.equal(sentInvites[0]?.to, 'principal@example.test');
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/my-shule-erp\.vercel\.app\/invite\/accept\?token=/);
  assert.equal(response.tenant_id, 'green-valley');
  assert.equal(response.invitation_sent, true);
  assert.equal(response.invitation_status, 'sent');
  assert.match(response.invitation_message, /Invitation sent/i);
  assert.equal(JSON.stringify(response).includes('token='), false);
  const tokenInsert = queries.find((query) => query.text.includes('INSERT INTO auth_action_tokens'));
  assert.match(String(tokenInsert?.values[3]), /^[a-f0-9]{64}$/);
  assert.equal(String(tokenInsert?.values[2]), 'principal@example.test');
  const outboxInsert = queries.find((query) => query.text.includes('INSERT INTO auth_email_outbox'));
  assert.doesNotMatch(String(outboxInsert?.values[3] ?? ''), /token=|invite_url/);
});

test('PlatformOnboardingService rejects duplicate school URL slugs without sending an invite', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const baselines: string[] = [];
  const sentInvites: Array<{ to: string; inviteUrl: string }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO tenants')) {
          return { rows: [] };
        }

        throw new Error(`Unexpected query after duplicate tenant: ${text}`);
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async (tenantId: string) => {
        baselines.push(tenantId);
      },
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: { to: string; inviteUrl: string }) => {
        sentInvites.push(input);
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      getStore: () => ({
        user_id: 'platform-owner',
      }),
    } as never,
  );

  await assert.rejects(
    () =>
      service.createSchool({
        school_name: 'Existing School',
        tenant_id: 'existing-school',
        admin_email: 'principal@example.test',
        admin_name: 'Principal User',
      }),
    /already exists/i,
  );

  assert.deepEqual(baselines, []);
  assert.equal(sentInvites.length, 0);
  assert.equal(queries.some((query) => query.text.includes('auth_action_tokens')), false);
  assert.equal(queries.some((query) => query.text.includes('auth_email_outbox')), false);
});

test('PlatformOnboardingService creates the school even when invitation delivery fails', async () => {
  let transactionCalls = 0;

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => {
        transactionCalls += 1;
        return callback();
      },
      query: async (text: string) => {
        if (text.includes('INSERT INTO tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
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
      ensureTenantAuthorizationBaseline: async () => undefined,
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => {
        throw new Error('Resend rejected the invitation');
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      getStore: () => ({
        user_id: 'platform-owner',
      }),
    } as never,
  );

  const response = await service.createSchool({
    school_name: 'Green Valley School',
    tenant_id: 'Green Valley',
    admin_email: 'principal@example.test',
    admin_name: 'Principal User',
  });

  assert.equal(transactionCalls, 1);
  assert.equal(response.tenant_id, 'green-valley');
  assert.equal(response.invitation_sent, false);
  assert.equal(response.invitation_status, 'failed');
  assert.match(response.invitation_message, /resend it/i);
});

test('PlatformOnboardingService resends a school administrator invite with a rotated token', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const sentInvites: Array<{ to: string; inviteUrl: string }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('FROM tenants') && text.includes('latest_token.email')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
                admin_email: 'principal@example.test',
                invite_metadata: { display_name: 'Principal User' },
              },
            ],
          };
        }

        if (text.includes('INSERT INTO auth_action_tokens')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000802' }] };
        }

        if (text.includes('INSERT INTO auth_email_outbox')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000902' }] };
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: { to: string; inviteUrl: string }) => {
        sentInvites.push(input);
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      getStore: () => ({
        user_id: 'platform-owner',
      }),
    } as never,
  );

  const response = await service.resendSchoolAdminInvite('green-valley');

  assert.equal(response.tenant_id, 'green-valley');
  assert.equal(response.invitation_status, 'sent');
  assert.equal(response.admin_email, 'principal@example.test');
  assert.equal(sentInvites.length, 1);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/my-shule-erp\.vercel\.app\/invite\/accept\?token=/);
  assert.equal(
    queries.some(
      (query) =>
        query.text.includes('UPDATE auth_action_tokens') &&
        String(query.values[1]) === 'principal@example.test',
    ),
    true,
  );
});

test('PlatformOnboardingService reports Resend testing mode as blocked instead of encouraging repeated resends', async () => {
  const markDeliveryCalls: Array<{ values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        if (text.includes('INSERT INTO tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('INSERT INTO auth_action_tokens')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000801' }] };
        }

        if (text.includes('INSERT INTO auth_email_outbox')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000901' }] };
        }

        if (text.includes('app.mark_auth_email_outbox_delivery')) {
          markDeliveryCalls.push({ values });
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => {
        throw new EmailDeliveryError(
          'resend_domain_not_verified',
          'Email delivery is blocked by Resend testing mode. Verify a Resend sending domain and set EMAIL_FROM to that verified domain before resending school invitations.',
          403,
        );
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      getStore: () => ({
        user_id: 'platform-owner',
        request_id: 'request-1',
      }),
    } as never,
  );

  const response = await service.createSchool({
    school_name: 'Green Valley School',
    tenant_id: 'Green Valley',
    admin_email: 'principal@example.test',
    admin_name: 'Principal User',
  });

  assert.equal(response.invitation_status, 'blocked');
  assert.equal(response.invitation_sent, false);
  assert.equal(response.can_resend_invite, false);
  assert.equal(response.invitation_failure_code, 'resend_domain_not_verified');
  assert.match(response.invitation_action_required ?? '', /Verify a Resend sending domain/i);
  assert.equal(markDeliveryCalls[0]?.values[2], 'resend_domain_not_verified');
  assert.equal(markDeliveryCalls[0]?.values[4], 403);
});

test('PlatformOnboardingService hard deletes an empty failed-invite school after slug confirmation', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('FROM tenants') && text.includes('WHERE tenant_id = $1')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('AS memberships') && text.includes('AS students')) {
          return {
            rows: [
              {
                memberships: '1',
                students: '0',
                invoices: '0',
                support_tickets: '0',
                mpesa_transactions: '0',
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    { getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }) } as never,
    { get: () => undefined } as never,
    {
      getStore: () => ({
        user_id: '00000000-0000-0000-0000-000000000111',
        request_id: 'request-1',
        ip_address: '127.0.0.1',
        user_agent: 'node:test',
      }),
    } as never,
  );

  const response = await service.deleteSchool('green-valley', {
    confirmation: 'green-valley',
    reason: 'Duplicate test tenant',
    hard_delete_empty_tenant: true,
  });

  assert.equal(response.deleted, true);
  assert.equal(response.deprovisioned, false);
  assert.equal(
    queries.some((query) => query.text.includes('DELETE FROM tenants') && query.values[0] === 'green-valley'),
    true,
  );
  assert.equal(
    queries.some((query) => query.text.includes('INSERT INTO audit_logs') && JSON.stringify(query.values).includes('platform.school.deleted')),
    true,
  );
});

test('PlatformOnboardingService refuses delete when confirmation does not match tenant id', async () => {
  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async () => ({ rows: [] }),
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    { getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }) } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
  );

  await assert.rejects(
    () =>
      service.deleteSchool('green-valley', {
        confirmation: 'wrong-school',
        reason: 'Duplicate test tenant',
        hard_delete_empty_tenant: true,
      }),
    /Type green-valley to confirm/i,
  );
});

test('PlatformOnboardingService deprovisions instead of hard deleting a tenant with operational records', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('FROM tenants') && text.includes('WHERE tenant_id = $1')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('AS memberships') && text.includes('AS students')) {
          return {
            rows: [
              {
                memberships: '4',
                students: '23',
                invoices: '8',
                support_tickets: '1',
                mpesa_transactions: '2',
              },
            ],
          };
        }

        if (text.includes('UPDATE tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'inactive',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    { getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }) } as never,
    { get: () => undefined } as never,
    {
      getStore: () => ({
        user_id: '00000000-0000-0000-0000-000000000111',
        request_id: 'request-1',
      }),
    } as never,
  );

  const response = await service.deleteSchool('green-valley', {
    confirmation: 'green-valley',
    reason: 'Pilot ended',
    hard_delete_empty_tenant: true,
  });

  assert.equal(response.deleted, false);
  assert.equal(response.deprovisioned, true);
  assert.equal(response.school?.status, 'inactive');
  assert.equal(queries.some((query) => query.text.includes('DELETE FROM tenants')), false);
  assert.equal(queries.some((query) => query.text.includes('UPDATE tenants')), true);
});

test('PlatformOnboardingService exports a tenant offboarding manifest before contract closeout', async () => {
  const service = new PlatformOnboardingService(
    {
      query: async (text: string) => {
        if (text.includes('FROM tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'inactive',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('AS memberships') && text.includes('AS students')) {
          return {
            rows: [
              {
                memberships: '3',
                students: '120',
                invoices: '48',
                support_tickets: '2',
                mpesa_transactions: '20',
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    { getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }) } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner', request_id: 'request-1' }) } as never,
  );

  const manifest = await service.exportTenantOffboardingPackage('green-valley');

  assert.equal(manifest.tenant_id, 'green-valley');
  assert.equal(manifest.export_type, 'contract_offboarding');
  assert.equal(manifest.tables.some((table) => table.name === 'students'), true);
  assert.equal(manifest.retention_policy.raw_provider_payloads, 'expire encrypted raw payloads after operational review window');
});

test('PlatformOnboardingService anonymizes tenant shell metadata for legal offboarding', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('FROM tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'inactive',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('AS memberships') && text.includes('AS students')) {
          return {
            rows: [
              {
                memberships: '0',
                students: '0',
                invoices: '0',
                support_tickets: '0',
                mpesa_transactions: '0',
              },
            ],
          };
        }

        if (text.includes('UPDATE tenants')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Anonymized School green-valley',
                subdomain: 'green-valley',
                status: 'inactive',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        return { rows: [] };
      },
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    { getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }) } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner', request_id: 'request-1' }) } as never,
  );

  const response = await service.anonymizeTenantForLegalOffboarding('green-valley', {
    confirmation: 'green-valley',
    reason: 'Legal deletion request completed',
  });

  assert.equal(response.anonymized, true);
  assert.equal(response.school.school_name, 'Anonymized School green-valley');
  assert.equal(
    queries.some((query) => query.values.some((value) => String(value).includes('legal_offboarding_anonymized_at'))),
    true,
  );
});
