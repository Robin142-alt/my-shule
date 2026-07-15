import assert from 'node:assert/strict';
import test from 'node:test';

import { UnauthorizedException } from '@nestjs/common';

import { AuthInvitationService } from '../../auth/auth-invitation.service';
import { PlatformOnboardingService } from './platform-onboarding.service';

test('school activation golden path creates a clean school with only a pending principal invite', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const sentInvites: Array<{ to: string; inviteUrl: string; assignedRole?: string }> = [];

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO tenants')) {
          return {
            rows: [
              {
                tenant_id: 'maranda-high',
                name: 'Maranda High',
                subdomain: 'maranda-high',
                status: 'active',
                created_at: new Date('2026-07-15T08:00:00.000Z'),
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
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async (input: { to: string; inviteUrl: string; assignedRole?: string }) => {
        sentInvites.push(input);
      },
    } as never,
    { get: (key: string) => (key === 'email.publicAppUrl' ? 'https://myshule.online' : undefined) } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
  );

  const response = await service.createSchool({
    school_name: 'Maranda High',
    tenant_id: 'Maranda High',
    admin_email: 'principal@maranda.test',
    admin_name: 'Principal Wanjiku',
  });

  assert.equal(response.tenant_id, 'maranda-high');
  assert.equal(response.invitation_status, 'sent');
  assert.equal(sentInvites.length, 1);
  assert.equal(sentInvites[0]?.to, 'principal@maranda.test');
  assert.equal(sentInvites[0]?.assignedRole, 'School Principal/Admin');
  assert.match(sentInvites[0]?.inviteUrl ?? '', /^https:\/\/myshule\.online\/invite\/accept\?token=/);
  assert.match(sentInvites[0]?.inviteUrl ?? '', /[?&]tenant=maranda-high(?:&|$)/);

  const forbiddenSeedTargets = [
    'students',
    'parents',
    'invoices',
    'exams',
    'student_report_cards',
    'library_books',
    'clinic_visits',
    'health_visits',
    'staff',
    'tenant_memberships',
  ];
  for (const tableName of forbiddenSeedTargets) {
    assert.equal(
      queries.some((query) => new RegExp(`INSERT\\s+INTO\\s+${tableName}\\b`, 'i').test(query.text)),
      false,
      `school activation must not seed ${tableName}`,
    );
  }

  const tokenInsert = queries.find((query) => query.text.includes('INSERT INTO auth_action_tokens'));
  assert.equal(tokenInsert?.values[0], 'maranda-high');
  assert.equal(tokenInsert?.values[1], null);
  assert.equal(tokenInsert?.values[2], 'principal@maranda.test');
  assert.match(String(tokenInsert?.values[3]), /^[a-f0-9]{64}$/);
  const tokenMetadata = JSON.parse(String(tokenInsert?.values[5] ?? '{}'));
  assert.equal(tokenMetadata.purpose, 'school_admin_invitation');
  assert.equal(tokenMetadata.role_code, 'owner');
  assert.equal(tokenMetadata.role_name, 'School Principal/Admin');
});

test('school activation golden path rejects duplicate pending principal invite emails before token creation', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  let sentInvites = 0;

  const service = new PlatformOnboardingService(
    {
      withRequestTransaction: async (callback: () => Promise<unknown>) => callback(),
      query: async (text: string, values: unknown[] = []) => {
        queries.push({ text, values });

        if (text.includes('INSERT INTO tenants')) {
          return {
            rows: [
              {
                tenant_id: 'duplicate-school',
                name: 'Duplicate School',
                subdomain: 'duplicate-school',
                status: 'active',
                created_at: new Date('2026-07-15T08:00:00.000Z'),
              },
            ],
          };
        }

        if (text.includes('FROM auth_action_tokens') && text.includes('consumed_at IS NULL')) {
          return { rows: [{ tenant_id: 'existing-school' }] };
        }

        return { rows: [] };
      },
    } as never,
    { ensureTenantAuthorizationBaseline: async () => undefined } as never,
    {
      assertTransactionalEmailConfigured: () => undefined,
      sendInvitationEmail: async () => {
        sentInvites += 1;
      },
    } as never,
    { get: () => undefined } as never,
    { getStore: () => ({ user_id: 'platform-owner' }) } as never,
  );

  await assert.rejects(
    () =>
      service.createSchool({
        school_name: 'Duplicate School',
        tenant_id: 'Duplicate School',
        admin_email: 'principal@example.test',
        admin_name: 'Principal User',
      }),
    /already registered under another school/i,
  );

  assert.equal(sentInvites, 0);
  assert.equal(queries.some((query) => query.text.includes('INSERT INTO auth_action_tokens')), false);
  assert.equal(queries.some((query) => query.text.includes('INSERT INTO auth_email_outbox')), false);
});

test('school activation golden path rejects invitation acceptance for the wrong tenant', async () => {
  const service = new AuthInvitationService(
    {
      query: async () => {
        throw new Error('Invitation tenant mismatch');
      },
    } as never,
    { hash: async () => 'hashed-password' } as never,
  );

  await assert.rejects(
    () =>
      service.acceptInvitation({
        token: 'fresh-invitation-token-with-enough-entropy',
        password: 'StrongPass123',
        display_name: 'Principal User',
        expected_tenant_id: 'wrong-school',
      }),
    (error: unknown) =>
      error instanceof UnauthorizedException &&
      error.message === 'Invalid or expired invitation token',
  );
});
