import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthEmailService, EmailDeliveryError } from './auth-email.service';

test('AuthEmailService reports transactional email as missing without secrets', () => {
  const service = new AuthEmailService({
    get: () => '',
  } as never);

  assert.deepEqual(service.getTransactionalEmailStatus(), {
    provider: 'resend',
    status: 'missing',
    api_key_configured: false,
    sender_configured: false,
    public_app_url_configured: false,
  });
});

test('AuthEmailService reports transactional email as configured without exposing secrets', () => {
  const service = new AuthEmailService({
    get: (key: string) => {
      if (key === 'email.provider') {
        return 'resend';
      }

      if (key === 'email.resendApiKey') {
        return 're_secret_key';
      }

      if (key === 'email.from') {
        return 'My Shule <noreply@example.test>';
      }

      if (key === 'email.publicAppUrl') {
        return 'https://my-shule-erp.vercel.app';
      }

      return '';
    },
  } as never);

  const status = service.getTransactionalEmailStatus();

  assert.equal(status.status, 'configured');
  assert.equal(status.api_key_configured, true);
  assert.equal(status.sender_configured, true);
  assert.equal(status.public_app_url_configured, true);
  assert.equal(JSON.stringify(status).includes('re_secret_key'), false);
  assert.equal(JSON.stringify(status).includes('noreply@example.test'), false);
});

test('AuthEmailService classifies Resend testing mode as a domain verification blocker', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        statusCode: 403,
        name: 'validation_error',
        message:
          'You can only send testing emails to your own email address (owner@example.test). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain.',
      }),
      { status: 403, headers: { 'content-type': 'application/json' } },
    )) as typeof fetch;

  const service = new AuthEmailService({
    get: (key: string) => {
      if (key === 'email.provider') return 'resend';
      if (key === 'email.resendApiKey') return 're_secret_key';
      if (key === 'email.from') return 'My Shule <onboarding@example.test>';
      if (key === 'email.requestTimeoutMs') return 1000;
      return '';
    },
  } as never);

  try {
    await assert.rejects(
      () =>
        service.sendInvitationEmail({
          to: 'principal@example.test',
          displayName: 'Principal User',
          schoolName: 'Green Valley School',
          assignedRole: 'School Principal/Admin',
          inviterName: 'MyShule Super Admin',
          inviteUrl: 'https://my-shule-erp.vercel.app/invite/accept?token=secret',
          expiresAt: new Date('2026-05-25T00:00:00.000Z'),
        }),
      (error: unknown) => {
        assert.equal(error instanceof EmailDeliveryError, true);
        assert.equal((error as EmailDeliveryError).code, 'resend_domain_not_verified');
        assert.match((error as EmailDeliveryError).safeMessage, /Verify a Resend sending domain/i);
        assert.equal(JSON.stringify(error).includes('re_secret_key'), false);
        assert.equal(JSON.stringify(error).includes('owner@example.test'), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AuthEmailService sends school invitations with role, inviter, expiry, and support context', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{
    subject?: string;
    html?: string;
    text?: string;
  }> = [];

  globalThis.fetch = (async (_url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ id: 'email-1' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  const service = new AuthEmailService({
    get: (key: string) => {
      if (key === 'email.provider') return 'resend';
      if (key === 'email.resendApiKey') return 're_secret_key';
      if (key === 'email.from') return 'My Shule <onboarding@example.test>';
      if (key === 'email.requestTimeoutMs') return 1000;
      return '';
    },
  } as never);

  try {
    await service.sendInvitationEmail({
      to: 'principal@example.test',
      displayName: 'Principal Wanjiku',
      schoolName: 'Kisumu Boys High School',
      assignedRole: 'School Principal/Admin',
      inviterName: 'MyShule Super Admin',
      inviteUrl: 'https://myshule.online/invite/accept?token=secret&tenant=kisumu-boys',
      expiresAt: new Date('2026-06-07T00:00:00.000Z'),
      supportNote: 'Contact MyShule support if this invitation looks wrong.',
    } as never);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.subject, 'You have been invited to My Shule ERP');
  assert.match(requests[0]?.text ?? '', /Principal Wanjiku/);
  assert.match(requests[0]?.text ?? '', /Kisumu Boys High School/);
  assert.match(requests[0]?.text ?? '', /School Principal\/Admin/);
  assert.match(requests[0]?.text ?? '', /MyShule Super Admin/);
  assert.match(requests[0]?.text ?? '', /2026-06-07T00:00:00\.000Z/);
  assert.match(requests[0]?.text ?? '', /Contact MyShule support/);
  assert.match(requests[0]?.html ?? '', /School Principal\/Admin/);
  assert.match(requests[0]?.html ?? '', /MyShule Super Admin/);
  assert.match(requests[0]?.html ?? '', /Contact MyShule support/);
});
