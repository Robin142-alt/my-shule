import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertAcceptedInviteLoginHtml,
  assertReadyPayload,
  buildSmokeTargets,
  extractCookieHeader,
  isMainModule,
  isExpectedInvalidLoginPayload,
} from './production-auth-smoke.mjs';

test('buildSmokeTargets normalizes configured production URLs', () => {
  const targets = buildSmokeTargets({
    webUrl: 'https://myshule.online/',
    apiUrl: 'https://my-shule-erp-api.vercel.app/',
    tenant: 'kb-high',
    email: 'Teacher.Invited@Example.Test',
  });

  assert.equal(targets.apiReadyUrl, 'https://my-shule-erp-api.vercel.app/health/ready');
  assert.equal(
    targets.schoolLoginUrl,
    'https://myshule.online/school/login?accepted=1&email=Teacher.Invited%40Example.Test&tenant=kb-high',
  );
  assert.equal(
    targets.parentLoginUrl,
    'https://myshule.online/parent/login?accepted=1&email=Teacher.Invited%40Example.Test&tenant=kb-high',
  );
  assert.equal(targets.webLoginApiUrl, 'https://myshule.online/api/auth/login');
  assert.equal(targets.webCsrfUrl, 'https://myshule.online/api/auth/csrf');
});

test('assertReadyPayload requires production-critical services to be ready', () => {
  assert.doesNotThrow(() =>
    assertReadyPayload({
      services: {
        postgres: 'up',
        redis: 'up',
        bullmq: 'configured',
        transactional_email: 'configured',
        cors: 'configured',
        object_storage: 'configured',
        malware_scanning: 'configured',
      },
      slo: {
        overall_status: 'healthy',
        active_alert_count: 0,
      },
    }),
  );

  assert.throws(
    () =>
      assertReadyPayload({
        services: { postgres: 'up', redis: 'down' },
        slo: { overall_status: 'healthy', active_alert_count: 0 },
      }),
    /Redis must be up/,
  );
});

test('assertAcceptedInviteLoginHtml checks hint, invited email, and first-login autocomplete', () => {
  assert.doesNotThrow(() =>
    assertAcceptedInviteLoginHtml(
      '<input value="teacher@example.test" autocomplete="new-password" /><p>Use the password you just created</p>',
      'teacher@example.test',
      'school',
    ),
  );

  assert.throws(
    () =>
      assertAcceptedInviteLoginHtml(
        '<input value="Grace Wanjiku" autocomplete="current-password" />',
        'teacher@example.test',
        'school',
      ),
    /school accepted-invite login is missing the first-login password hint/,
  );
});

test('extractCookieHeader returns a safe cookie header for CSRF smoke checks', () => {
  assert.equal(
    extractCookieHeader(['myshule.csrf=token; Path=/; HttpOnly', 'other=value; Path=/']),
    'myshule.csrf=token; other=value',
  );
  assert.equal(extractCookieHeader('myshule.csrf=token; Path=/; HttpOnly'), 'myshule.csrf=token');
});

test('isExpectedInvalidLoginPayload accepts only the expected fake-login backend response', () => {
  assert.equal(isExpectedInvalidLoginPayload({ message: 'Invalid email or password' }), true);
  assert.equal(isExpectedInvalidLoginPayload({ message: 'Authentication service is temporarily unavailable.' }), false);
  assert.equal(isExpectedInvalidLoginPayload(null), false);
});

test('isMainModule handles native Windows and POSIX argv paths', () => {
  const currentScriptUrl = new URL('./production-auth-smoke.mjs', import.meta.url);
  const currentScriptPath = fileURLToPath(currentScriptUrl);

  assert.equal(isMainModule(currentScriptUrl.href, currentScriptPath), true);
  assert.equal(isMainModule(new URL('./production-auth-smoke.mjs', import.meta.url).href, '/tmp/other-script.mjs'), false);
});
