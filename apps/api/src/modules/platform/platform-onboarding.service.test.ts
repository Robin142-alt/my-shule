import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';

import { EmailDeliveryError } from '../../auth/auth-email.service';
import { PlatformOnboardingService } from './platform-onboarding.service';
import { PlatformOnboardingSchemaService } from './platform-onboarding.schema';
import { MaintenanceModeGuard } from '../../guards/maintenance-mode.guard';
import { SUPERADMIN_ROLE_OWNER } from '../../auth/auth.constants';

test('PlatformOnboardingService creates a school and sends an invite without exposing the token', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const baselines: string[] = [];
  const sentInvites: Array<{
    to: string;
    assignedRole?: string;
    inviterName?: string;
    inviteUrl: string;
    supportNote?: string;
  }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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

        if (text.includes('FROM users') && text.includes('display_name')) {
          return { rows: [{ display_name: 'Platform Owner', email: 'owner@myshule.online' }] };
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
      sendInvitationEmail: async (input: {
        to: string;
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
  assert.equal(sentInvites[0]?.assignedRole, 'School Principal/Admin');
  assert.equal(sentInvites[0]?.inviterName, 'Platform Owner');
  assert.match(sentInvites[0]?.supportNote ?? '', /MyShule support/i);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/my-shule-erp\.vercel\.app\/invite\/accept\?token=/);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /[?&]tenant=green-valley(?:&|$)/);
  assert.equal(response.tenant_id, 'green-valley');
  assert.equal(response.invitation_sent, true);
  assert.equal(response.invitation_status, 'sent');
  assert.match(response.invitation_message, /Invitation sent/i);
  assert.equal(JSON.stringify(response).includes('token='), false);
  const tokenInsert = queries.find((query) => query.text.includes('INSERT INTO auth_action_tokens'));
  assert.match(String(tokenInsert?.values[3]), /^[a-f0-9]{64}$/);
  assert.equal(String(tokenInsert?.values[2]), 'principal@example.test');
  const tokenMetadata = JSON.parse(String(tokenInsert?.values[5] ?? '{}'));
  assert.equal(tokenMetadata.role_name, 'School Principal/Admin');
  assert.equal(tokenMetadata.invited_by_display_name, 'Platform Owner');
  const outboxInsert = queries.find((query) => query.text.includes('INSERT INTO auth_email_outbox'));
  assert.doesNotMatch(String(outboxInsert?.values[3] ?? ''), /token=|invite_url/);
  const outboxPayload = JSON.parse(String(outboxInsert?.values[3] ?? '{}'));
  assert.equal(outboxPayload.role_name, 'School Principal/Admin');
  assert.equal(outboxPayload.invited_by_display_name, 'Platform Owner');
});

test('PlatformOnboardingService keeps a delivered school invite successful when outbox delivery marking fails', async () => {
  const sentInvites: Array<{ to: string; inviteUrl: string }> = [];
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[] = []) => {
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

        if (text.includes('FROM users') && text.includes('display_name')) {
          return { rows: [{ display_name: 'Platform Owner', email: 'owner@myshule.online' }] };
        }

        if (text.includes('app.mark_auth_email_outbox_delivery')) {
          throw new Error('outbox write failed after provider accepted email');
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

  const response = await service.createSchool({
    school_name: 'Green Valley School',
    tenant_id: 'Green Valley',
    admin_email: 'principal@example.test',
    admin_name: 'Principal User',
  });

  assert.equal(sentInvites.length, 1);
  assert.equal(response.tenant_id, 'green-valley');
  assert.equal(response.invitation_sent, true);
  assert.equal(response.invitation_status, 'sent');
  assert.match(response.invitation_message, /Invitation sent/i);
  assert.equal(
    queries.some(
      (query) =>
        query.text.includes('UPDATE auth_email_outbox') &&
        String(query.values[0]) === 'sent' &&
        String(query.values[1]) === '00000000-0000-0000-0000-000000000901',
    ),
    true,
  );
});

test('PlatformOnboardingService persists the full blueprint onboarding profile and tenant domain', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO tenants')) {
          return {
            rows: [
              {
                tenant_id: 'nairobi-international',
                name: 'Nairobi International Academy',
                subdomain: 'nairobi-international',
                status: 'active',
                metadata: JSON.parse(String(values[4])),
                created_at: new Date('2026-05-11T00:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('INSERT INTO auth_action_tokens')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000803' }] };
        }

        if (text.includes('INSERT INTO auth_email_outbox')) {
          return { rows: [{ id: '00000000-0000-0000-0000-000000000903' }] };
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => undefined,
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://my-shule-erp.vercel.app' : undefined) } as never,
    {
      getStore: () => ({
        user_id: 'platform-owner',
      }),
    } as never,
  );

  const response = await service.createSchool({
    school_name: 'Nairobi International Academy',
    tenant_id: 'Nairobi International',
    admin_email: 'principal@example.test',
    admin_name: 'Principal User',
    registration_number: 'REG-2026-001',
    knec_code: 'KNEC-473821',
    county: 'Nairobi',
    location: 'Westlands',
    contacts: {
      phone: '+254700000000',
      email: 'office@nairobi-international.test',
    },
    curriculum: 'cambridge',
    institution_category: 'international_school',
    campuses: [{ name: 'Main Campus', code: 'MAIN' }],
    academic_calendar: { academic_year: '2026', terms: ['Term 1', 'Term 2', 'Term 3'] },
    fee_categories: ['tuition', 'transport', 'boarding'],
    sms_sender_id: 'MYSHULE',
    domain: 'nairobi-international.myshule.africa',
    module_codes: ['students', 'finance', 'exams', 'parent_portal'],
    quotas: { students: 1200, staff: 160, storage_gb: 200, sms_per_term: 50000, devices: 24 },
    import_plan: ['students', 'staff', 'fees', 'results', 'inventory'],
    service_activation: ['sms', 'parent_portal', 'mobile_apps', 'cbt', 'biometrics'],
    training_status: 'scheduled',
    audit_verification_status: 'pending',
  });

  const tenantInsert = queries.find((query) => query.text.includes('INSERT INTO tenants'));
  const tenantMetadata = JSON.parse(String(tenantInsert?.values[4]));
  const domainInsert = queries.find((query) => query.text.includes('INSERT INTO tenant_domains'));

  assert.match(tenantInsert?.text ?? '', /created_at,\s*updated_at/);
  assert.match(tenantInsert?.text ?? '', /NOW\(\),\s*NOW\(\)/);
  assert.match(domainInsert?.text ?? '', /created_at,\s*updated_at/);
  assert.match(domainInsert?.text ?? '', /NOW\(\),\s*NOW\(\)/);
  assert.equal(tenantMetadata.registration_number, 'REG-2026-001');
  assert.equal(tenantMetadata.curriculum, 'cambridge');
  assert.equal(tenantMetadata.institution_category, 'international_school');
  assert.equal(tenantMetadata.sms_sender_id, 'MYSHULE');
  assert.equal(tenantMetadata.domain, 'nairobi-international.myshule.africa');
  assert.deepEqual(tenantMetadata.quotas, {
    students: 1200,
    staff: 160,
    storage_gb: 200,
    sms_per_term: 50000,
    devices: 24,
  });
  assert.equal(tenantMetadata.onboarding_steps.go_live, 'blocked');
  assert.deepEqual(response.enabled_modules, ['students', 'finance', 'exams', 'parent_portal']);
  assert.equal(response.onboarding_profile?.curriculum, 'cambridge');
  assert.equal(response.onboarding_profile?.domain, 'nairobi-international.myshule.africa');
  assert.equal(response.onboarding_profile?.onboarding_steps.go_live, 'blocked');
  assert.equal(domainInsert?.values[1], 'nairobi-international.myshule.africa');
});

test('PlatformOnboardingService rejects duplicate school URL slugs without sending an invite', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const baselines: string[] = [];
  const sentInvites: Array<{
    to: string;
    assignedRole?: string;
    inviterName?: string;
    inviteUrl: string;
  }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
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
  const sentInvites: Array<{
    to: string;
    assignedRole?: string;
    inviterName?: string;
    inviteUrl: string;
  }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
                invite_metadata: {
                  display_name: 'Principal User',
                  role_name: 'School Principal/Admin',
                  invited_by_display_name: 'Previous Super Admin',
                },
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

        if (text.includes('FROM users') && text.includes('display_name')) {
          return { rows: [{ display_name: 'Support Admin', email: 'support@myshule.online' }] };
        }

        return { rows: [] };
      },
    } as never,
    {
      ensureTenantAuthorizationBaseline: async () => undefined,
    } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: {
        to: string;
        assignedRole?: string;
        inviterName?: string;
        inviteUrl: string;
      }) => {
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
  assert.equal(sentInvites[0]?.assignedRole, 'School Principal/Admin');
  assert.equal(sentInvites[0]?.inviterName, 'Support Admin');
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/my-shule-erp\.vercel\.app\/invite\/accept\?token=/);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /[?&]tenant=green-valley(?:&|$)/);
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
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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

test('PlatformOnboardingService unlocks stale Resend-domain failures after production sender is configured', async () => {
  const service = new PlatformOnboardingService(
    {
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async () => ({
        rows: [
          {
            tenant_id: 'green-valley',
            name: 'Green Valley School',
            subdomain: 'green-valley',
            status: 'active',
            created_at: new Date('2026-05-11T00:00:00.000Z'),
            admin_email: 'principal@example.test',
            invitation_status: 'failed',
            invite_expires_at: new Date('2026-05-18T00:00:00.000Z'),
            last_error_code: 'resend_domain_not_verified',
            last_error_summary:
              'Email delivery is blocked by Resend testing mode. Verify a Resend sending domain and set EMAIL_FROM to that verified domain before resending school invitations.',
            provider_status_code: 403,
          },
        ],
      }),
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    {
      getTransactionalEmailStatus: () => ({
        provider: 'resend',
        status: 'configured',
        api_key_configured: true,
        sender_configured: true,
        public_app_url_configured: true,
      }),
      hasLikelyProductionSenderConfigured: () => true,
    } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
  );

  const response = await service.listSchools();

  assert.equal(response[0]?.invitation_status, 'failed');
  assert.equal(response[0]?.can_resend_invite, true);
  assert.match(response[0]?.invitation_message ?? '', /resend it/i);
});

test('PlatformOnboardingService lists schools with persisted enabled module codes', async () => {
  const moduleLookups: string[] = [];
  const service = new PlatformOnboardingService(
    {
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async () => ({
        rows: [
          {
            tenant_id: 'green-valley',
            name: 'Green Valley School',
            subdomain: 'green-valley',
            status: 'active',
            created_at: new Date('2026-05-11T00:00:00.000Z'),
            admin_email: 'principal@example.test',
            invitation_status: 'sent',
            invite_expires_at: new Date('2026-05-18T00:00:00.000Z'),
          },
          {
            tenant_id: 'lake-view',
            name: 'Lake View School',
            subdomain: 'lake-view',
            status: 'active',
            created_at: new Date('2026-05-12T00:00:00.000Z'),
            admin_email: 'admin@example.test',
            invitation_status: 'sent',
            invite_expires_at: new Date('2026-05-19T00:00:00.000Z'),
          },
        ],
      }),
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    {
      getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }),
      hasLikelyProductionSenderConfigured: () => true,
    } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
    {
      listEnabledModulesForTenant: async (tenantId: string) => {
        moduleLookups.push(tenantId);
        return tenantId === 'green-valley'
          ? ['students', 'finance', 'communication_sms']
          : ['students', 'exams'];
      },
    } as never,
  );

  const response = await service.listSchools();

  assert.deepEqual(moduleLookups, ['green-valley', 'lake-view']);
  assert.deepEqual(response[0]?.enabled_modules, ['students', 'finance', 'communication_sms']);
  assert.deepEqual(response[1]?.enabled_modules, ['students', 'exams']);
});

test('PlatformOnboardingService summarizes tenants in product for the Super Admin overview', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new PlatformOnboardingService(
    {
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        return {
          rows: [
            {
              total_schools: '4',
              active_schools: '3',
              inactive_schools: '1',
              billing_active_schools: '2',
              billing_grace_period_schools: '1',
              billing_restricted_schools: '1',
              billing_suspended_schools: '0',
              pending_principal_invites: '1',
              failed_principal_invites: '1',
              expired_principal_invites: '1',
              schools_with_modules: '3',
              enabled_module_assignments: '12',
            },
          ],
        };
      },
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    {
      getTransactionalEmailStatus: () => ({ provider: 'resend', status: 'configured' }),
      hasLikelyProductionSenderConfigured: () => true,
    } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
  );

  const response = await service.getProductTenantSummary();

  assert.equal(response.total_schools, 4);
  assert.equal(response.active_schools, 3);
  assert.equal(response.inactive_schools, 1);
  assert.equal(response.billing_active_schools, 2);
  assert.equal(response.billing_grace_period_schools, 1);
  assert.equal(response.billing_restricted_schools, 1);
  assert.equal(response.billing_suspended_schools, 0);
  assert.equal(response.pending_principal_invites, 1);
  assert.equal(response.failed_principal_invites, 1);
  assert.equal(response.expired_principal_invites, 1);
  assert.equal(response.schools_with_modules, 3);
  assert.equal(response.enabled_module_assignments, 12);
  assert.match(response.generated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(queries[0]?.text ?? '', /FROM\s+tenants/i);
  assert.doesNotMatch(queries[0]?.text ?? '', /WHERE\s+tenants\.tenant_id\s*=/i);
});

test('PlatformOnboardingService lets Superadmin manually set school billing state', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const configuredAt = '2026-05-23T10:00:00.000Z';

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO subscriptions')) {
          return { rows: [] };
        }

        if (text.includes('FROM tenants') && text.includes('WHERE tenants.tenant_id = $1')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
                admin_email: 'principal@example.test',
                invitation_status: 'sent',
                invite_expires_at: new Date('2026-05-18T00:00:00.000Z'),
                subscription_status: 'past_due',
                subscription_plan_code: 'enterprise',
                subscription_metadata: {
                  manual_billing_state: 'grace_period',
                  manual_billing_configured_at: configuredAt,
                  manual_billing_note: 'Principal asked for extra onboarding time',
                },
                subscription_grace_period_ends_at: new Date('2026-05-30T00:00:00.000Z'),
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
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
    {
      listEnabledModulesForTenant: async () => ['students', 'finance'],
    } as never,
  );

  const response = await service.updateSchoolBilling('green-valley', {
    state: 'grace_period',
    note: 'Principal asked for extra onboarding time',
    effective_until: '2026-05-30T00:00:00.000Z',
  });

  const subscriptionQuery = queries.find((query) =>
    query.text.includes('INSERT INTO subscriptions'),
  );
  const lockQuery = queries.find((query) =>
    query.text.includes('pg_advisory_xact_lock'),
  );
  const auditQuery = queries.find((query) =>
    query.text.includes('INSERT INTO audit_logs'),
  );

  assert.ok(subscriptionQuery);
  assert.ok(lockQuery);
  assert.ok(auditQuery);
  assert.match(
    lockQuery.text,
    /SELECT\s+TRUE\s+AS\s+locked/i,
    'manual billing tenant lock must return a Prisma-supported scalar row instead of PostgreSQL void',
  );
  assert.match(auditQuery.text, /\bmodule\b/i);
  assert.match(auditQuery.text, /\bentity_type\b/i);
  assert.match(auditQuery.text, /\bentity_id\b/i);
  assert.match(auditQuery.text, /\bnew_values_json\b/i);
  assert.doesNotMatch(
    auditQuery.text,
    /VALUES\s*\(\$1,\s*\$1/i,
    'platform tenant lifecycle audits must not write tenant slugs into school_id foreign keys',
  );
  assert.equal(
    subscriptionQuery?.text.includes('ON CONFLICT'),
    false,
    'manual billing saves must not require a production conflict index',
  );
  assert.equal(subscriptionQuery?.values[0], 'green-valley');
  assert.equal(subscriptionQuery?.values[2], 'past_due');
  assert.match(String(subscriptionQuery?.values.at(-1)), /manual_billing_state/);
  assert.equal(response.billing?.state, 'grace_period');
  assert.equal(response.billing?.label, 'Grace period');
  assert.deepEqual(response.enabled_modules, ['students', 'finance']);
});

test('PlatformOnboardingService expires the current mutable subscription for manual expired billing', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
query: async (text: string, values: unknown[]) => {
        queries.push({ text, values });

        if (text.includes('UPDATE subscriptions') && values?.[2] === 'expired') {
          return { rowCount: 1, rows: [] };
        }

        if (text.includes('INSERT INTO subscriptions')) {
          throw new Error('expired state should update the current mutable subscription before inserting');
        }

        if (text.includes('FROM tenants') && text.includes('WHERE tenants.tenant_id = $1')) {
          return {
            rows: [
              {
                tenant_id: 'green-valley',
                name: 'Green Valley School',
                subdomain: 'green-valley',
                status: 'active',
                created_at: new Date('2026-05-11T00:00:00.000Z'),
                admin_email: 'principal@example.test',
                invitation_status: 'sent',
                invite_expires_at: new Date('2026-05-18T00:00:00.000Z'),
                subscription_status: 'expired',
                subscription_plan_code: 'enterprise',
                subscription_metadata: {
                  manual_billing_state: 'expired',
                  manual_billing_configured_at: '2026-05-23T10:00:00.000Z',
                },
                subscription_suspended_at: new Date('2026-05-23T10:00:00.000Z'),
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
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
    {
      listEnabledModulesForTenant: async () => ['students', 'finance'],
    } as never,
  );

  const response = await service.updateSchoolBilling('green-valley', {
    state: 'expired',
  });

  assert.equal(
    queries.some((query) =>
      query.text.includes('UPDATE subscriptions')
      && query.values[2] === 'expired'
      && query.values[0] === 'green-valley',
    ),
    true,
  );
  assert.equal(response.billing?.state, 'expired');
  assert.equal(response.billing?.access_mode, 'billing_only');
});

test('PlatformOnboardingService hard deletes an empty failed-invite school after slug confirmation', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
    queries.some((query) => query.text.includes('DELETE FROM school_module_access') && query.values[0] === 'green-valley'),
    true,
  );
  assert.equal(
    queries.some((query) => query.text.includes('DELETE FROM users') && query.values[0] === 'green-valley'),
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
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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
          executeWithTenant: async function(tenantId: string, ctx: any, cb: any) {
      return cb({
        $queryRawUnsafe: async (sql: string, ...params: any[]) => {
          const res = await (this as any).query(sql, params);
          return res.rows || res;
        }
      });
    },
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

test('PlatformOnboardingService getSettings retrieves or creates settings', async () => {
  let findFirstCalls = 0;
  let createCalls = 0;
  const mockSettings = {
    id: 'settings-123',
    maintenanceMode: false,
    platformName: 'Shule Hub',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const service = new PlatformOnboardingService(
    {
      platformSettings: {
        findFirst: async (options: any) => {
          findFirstCalls++;
          return null;
        },
        create: async (options: any) => {
          createCalls++;
          return {
            ...mockSettings,
            ...options.data,
          };
        },
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const result = await service.getSettings();
  assert.equal(findFirstCalls, 1);
  assert.equal(createCalls, 1);
  assert.equal(result.id, 'settings-123');
  assert.equal(result.maintenanceMode, false);
});

test('PlatformOnboardingService updateSettings updates existing settings', async () => {
  let findFirstCalls = 0;
  let updateCalls = 0;
  const mockSettings = {
    id: 'settings-123',
    maintenanceMode: false,
    platformName: 'Shule Hub',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const service = new PlatformOnboardingService(
    {
      platformSettings: {
        findFirst: async (options: any) => {
          findFirstCalls++;
          return mockSettings;
        },
        update: async (options: any) => {
          updateCalls++;
          assert.equal(options.where.id, 'settings-123');
          return {
            ...mockSettings,
            ...options.data,
          };
        },
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );

  const result = await service.updateSettings({
    maintenanceMode: true,
    platformName: 'New Platform Name',
    maxSchools: 100,
  });

  assert.equal(findFirstCalls, 1);
  assert.equal(updateCalls, 1);
  assert.equal(result.success, true);
  assert.equal(result.maintenanceMode, true);
  assert.equal(result.platformName, 'New Platform Name');
  assert.equal(result.maxSchools, 100);
});

test('PlatformOnboardingSchemaService creates platform payment gateways with platform-owner RLS', async () => {
  let schemaSql = '';
  const service = new PlatformOnboardingSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(schemaSql, /CREATE TABLE IF NOT EXISTS platform_payment_gateways/);
  assert.match(schemaSql, /ALTER TABLE tenants ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE tenant_domains ALTER COLUMN updated_at SET DEFAULT NOW\(\)/);
  assert.match(schemaSql, /ALTER TABLE platform_payment_gateways ENABLE ROW LEVEL SECURITY/);
  assert.match(schemaSql, /CREATE POLICY platform_payment_gateways_rls_policy/);
  assert.match(schemaSql, /NULLIF\(current_setting\('app\.role', true\), ''\) = 'platform_owner'/);
});

test('PlatformOnboardingService creates platform payment gateways without storing raw consumer keys', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new PlatformOnboardingService(
    {
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO platform_payment_gateways')) {
          const metadata = JSON.parse(String(values[4]));
          return {
            rows: [{
              id: '00000000-0000-0000-0000-000000000991',
              name: values[0],
              type: values[1],
              environment: values[2],
              status: 'Active',
              shortcode: values[3],
              metadata,
            }],
          };
        }

        return { rows: [] };
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { getStore: () => ({ role: 'platform_owner', user_id: 'owner-1' }) } as never,
  );

  const gateway = await service.createGateway({
    name: 'M-Pesa Main Paybill',
    type: 'M-Pesa Daraja',
    environment: 'Production',
    shortcode: '123456',
    consumerKey: 'secret-consumer-key',
  });

  assert.equal(gateway.name, 'M-Pesa Main Paybill');
  assert.equal(gateway.environment, 'Production');
  assert.equal(gateway.metadata.configured_without_secret, false);
  assert.notEqual(gateway.metadata.consumer_key_hash, 'secret-consumer-key');
  assert.equal(JSON.stringify(queries).includes('secret-consumer-key'), false);
});

test('PlatformOnboardingService updates platform payment gateways and preserves credentials when no new key is supplied', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new PlatformOnboardingService(
    {
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values });

        if (text.includes('UPDATE platform_payment_gateways')) {
          return {
            rowCount: 1,
            rows: [{
              id: values[0],
              name: values[1],
              type: values[2],
              environment: values[3],
              status: values[4],
              shortcode: values[5],
              metadata: { consumer_key_hash: 'existing-hash', configured_without_secret: false },
            }],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { getStore: () => ({ role: 'platform_owner', user_id: 'owner-1' }) } as never,
  );

  const gateway = await service.updateGateway('00000000-0000-0000-0000-000000000991', {
    name: 'M-Pesa Main Paybill',
    type: 'M-Pesa Daraja',
    environment: 'Production',
    status: 'Testing',
    shortcode: '123456',
  });

  assert.equal(gateway.status, 'Testing');
  assert.equal(queries[0].values[6], '{}');
});

test('PlatformOnboardingService hashes replacement gateway consumer keys on update', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new PlatformOnboardingService(
    {
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values });

        if (text.includes('UPDATE platform_payment_gateways')) {
          const metadata = JSON.parse(String(values[6]));
          return {
            rowCount: 1,
            rows: [{
              id: values[0],
              name: values[1],
              type: values[2],
              environment: values[3],
              status: values[4],
              shortcode: values[5],
              metadata,
            }],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { getStore: () => ({ role: 'platform_owner', user_id: 'owner-1' }) } as never,
  );

  const gateway = await service.updateGateway('00000000-0000-0000-0000-000000000991', {
    name: 'M-Pesa Main Paybill',
    type: 'M-Pesa Daraja',
    environment: 'Production',
    status: 'Active',
    shortcode: '123456',
    consumerKey: 'replacement-secret',
  });

  assert.equal(gateway.metadata.configured_without_secret, false);
  assert.notEqual(gateway.metadata.consumer_key_hash, 'replacement-secret');
  assert.equal(JSON.stringify(queries).includes('replacement-secret'), false);
});

test('PlatformOnboardingService updates platform user status through the users table', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const service = new PlatformOnboardingService(
    {
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values });

        if (text.includes('UPDATE users')) {
          return {
            rowCount: 1,
            rows: [{
              id: values[0],
              email: 'operator@myshule.test',
              display_name: 'Platform Operator',
              status: values[1],
              last_login_at: null,
              updated_at: '2026-06-23T00:00:00.000Z',
            }],
          };
        }

        return { rowCount: 0, rows: [] };
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    { getStore: () => ({ role: 'platform_owner', user_id: 'owner-1' }) } as never,
  );

  const user = await service.updatePlatformUserStatus('00000000-0000-0000-0000-000000000888', {
    status: 'disabled',
  });

  assert.equal(user.email, 'operator@myshule.test');
  assert.equal(user.status, 'Disabled');
  assert.equal(queries[0].values[1], 'disabled');
});

function createMockExecutionContext(options: { method?: string; path?: string } = {}) {
  const req = {
    method: options.method || 'GET',
    path: options.path || '/api/schools',
    url: options.path || '/api/schools',
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

function createMockRequestContextService(role: string | null) {
  return {
    getStore: () => ({
      role,
    }),
  } as any;
}

function createMockPlatformOnboardingService(maintenanceMode: boolean, maintenanceMessage?: string) {
  return {
    getSettings: async () => ({
      maintenanceMode,
      maintenanceMessage,
    }),
  } as any;
}

test('MaintenanceModeGuard allows platform_owner in maintenance mode', async () => {
  const guard = new MaintenanceModeGuard(
    { getAllAndOverride: () => false } as any,
    createMockRequestContextService(SUPERADMIN_ROLE_OWNER),
    createMockPlatformOnboardingService(true)
  );

  const context = createMockExecutionContext();
  const canActivate = await guard.canActivate(context);
  assert.equal(canActivate, true);
});

test('MaintenanceModeGuard blocks member role in maintenance mode', async () => {
  const guard = new MaintenanceModeGuard(
    { getAllAndOverride: () => false } as any,
    createMockRequestContextService('member'),
    createMockPlatformOnboardingService(true, 'System maintenance ongoing')
  );

  const context = createMockExecutionContext();
  await assert.rejects(
    async () => {
      await guard.canActivate(context);
    },
    (err: any) => {
      assert.ok(err instanceof ServiceUnavailableException);
      assert.equal(err.message, 'System maintenance ongoing');
      assert.equal(err.getStatus(), 503);
      return true;
    }
  );
});

test('MaintenanceModeGuard allows member role when maintenance mode is disabled', async () => {
  const guard = new MaintenanceModeGuard(
    { getAllAndOverride: () => false } as any,
    createMockRequestContextService('member'),
    createMockPlatformOnboardingService(false)
  );

  const context = createMockExecutionContext();
  const canActivate = await guard.canActivate(context);
  assert.equal(canActivate, true);
});

test('MaintenanceModeGuard allows public route when maintenance mode is active', async () => {
  const guard = new MaintenanceModeGuard(
    { getAllAndOverride: () => true } as any,
    createMockRequestContextService('member'),
    createMockPlatformOnboardingService(true)
  );

  const context = createMockExecutionContext();
  const canActivate = await guard.canActivate(context);
  assert.equal(canActivate, true);
});

test('MaintenanceModeGuard allows OPTIONS request when maintenance mode is active', async () => {
  const guard = new MaintenanceModeGuard(
    { getAllAndOverride: () => false } as any,
    createMockRequestContextService('member'),
    createMockPlatformOnboardingService(true)
  );

  const context = createMockExecutionContext({ method: 'OPTIONS' });
  const canActivate = await guard.canActivate(context);
  assert.equal(canActivate, true);
});

test('MaintenanceModeGuard allows platform routes when maintenance mode is active', async () => {
  const guard = new MaintenanceModeGuard(
    { getAllAndOverride: () => false } as any,
    createMockRequestContextService('member'),
    createMockPlatformOnboardingService(true)
  );

  const context1 = createMockExecutionContext({ path: '/api/platform/settings' });
  assert.equal(await guard.canActivate(context1), true);

  const context2 = createMockExecutionContext({ path: '/platform/setup' });
  assert.equal(await guard.canActivate(context2), true);

  const context3 = createMockExecutionContext({ path: '/api/health' });
  assert.equal(await guard.canActivate(context3), true);
});
