import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertAcceptedInviteLoginHtml,
  assertReadyPayload,
  buildSmokeArtifact,
  buildSmokeTargets,
  describeReadinessHttpFailure,
  extractCookieHeader,
  isMainModule,
  isExpectedInvalidLoginPayload,
  maskEmail,
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
        production_env: 'configured',
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

test('describeReadinessHttpFailure includes sanitized bootstrap error details', () => {
  assert.equal(
    describeReadinessHttpFailure(503, {
      status: 'degraded',
      error: {
        code: 'api_bootstrap_failed',
        message: 'API runtime is not ready. Check production environment variables and backing services.',
      },
    }),
    'API readiness returned HTTP 503 (api_bootstrap_failed): API runtime is not ready. Check production environment variables and backing services.',
  );

  assert.equal(
    describeReadinessHttpFailure(503, null),
    'API readiness returned HTTP 503.',
  );
});

test('buildSmokeArtifact masks smoke email and records sanitized failure evidence', () => {
  const targets = buildSmokeTargets({
    webUrl: 'https://myshule.online',
    apiUrl: 'https://api.myshule.online',
    tenant: 'pilot-school',
    email: 'principal.real@example.com',
  });
  const artifact = buildSmokeArtifact({
    ok: false,
    targets,
    checks: ['API readiness'],
    error: new Error('Support status returned HTTP 503.'),
  });
  const serialized = JSON.stringify(artifact);

  assert.equal(maskEmail('principal.real@example.com'), 'p***@example.com');
  assert.equal(artifact.ok, false);
  assert.equal(artifact.summary.passed, 1);
  assert.equal(artifact.summary.failed, 1);
  assert.equal(artifact.targets.email_masked, 'p***@example.com');
  assert.match(artifact.error.message, /HTTP 503/);
  assert.equal(serialized.includes('principal.real@example.com'), false);
});

test('buildSmokeArtifact records multiple step failures without leaking encoded emails', () => {
  const targets = buildSmokeTargets({
    webUrl: 'https://myshule.online',
    apiUrl: 'https://api.myshule.online',
    tenant: 'pilot-school',
    email: 'teacher.real@example.com',
  });
  const artifact = buildSmokeArtifact({
    ok: false,
    targets,
    checks: ['web CSRF endpoint'],
    failures: [
      {
        id: 'API readiness',
        message: 'API readiness returned HTTP 503 (api_bootstrap_failed).',
      },
      {
        id: 'school accepted-invite login page',
        message: 'https://myshule.online/school/login?email=teacher.real%40example.com returned HTTP 500.',
      },
    ],
  });
  const serialized = JSON.stringify(artifact);

  assert.equal(artifact.summary.passed, 1);
  assert.equal(artifact.summary.failed, 2);
  assert.equal(artifact.failures.length, 2);
  assert.match(artifact.error.message, /API readiness/);
  assert.match(artifact.error.message, /school accepted-invite login page/);
  assert.equal(serialized.includes('teacher.real@example.com'), false);
  assert.equal(serialized.includes('teacher.real%40example.com'), false);
  assert.equal(serialized.includes('t***%40example.com'), true);
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

test('isExpectedInvalidLoginPayload accepts expected fake-login backend and web proxy responses', () => {
  assert.equal(isExpectedInvalidLoginPayload({ message: 'Invalid email or password' }), true);
  assert.equal(isExpectedInvalidLoginPayload({ message: 'Invalid credentials' }), true);
  assert.equal(isExpectedInvalidLoginPayload({ message: 'Authentication service is temporarily unavailable.' }), false);
  assert.equal(isExpectedInvalidLoginPayload(null), false);
});

test('isMainModule handles native Windows and POSIX argv paths', () => {
  const currentScriptUrl = new URL('./production-auth-smoke.mjs', import.meta.url);
  const currentScriptPath = fileURLToPath(currentScriptUrl);

  assert.equal(isMainModule(currentScriptUrl.href, currentScriptPath), true);
  assert.equal(isMainModule(new URL('./production-auth-smoke.mjs', import.meta.url).href, '/tmp/other-script.mjs'), false);
});
