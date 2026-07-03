#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_WEB_URL = 'https://www.myshule.online';
const DEFAULT_API_URL = 'https://my-shule-erp-api.vercel.app';
const DEFAULT_TENANT = 'kb-high';
const DEFAULT_EMAIL = 'teacher.invited@example.test';
const DEFAULT_ARTIFACT_PATH = 'docs/validation/production-auth-smoke.json';

function normalizeBaseUrl(value) {
  return String(value ?? '').trim().replace(/\/+$/, '');
}

export function buildSmokeTargets(input = {}) {
  const webUrl = normalizeBaseUrl(input.webUrl ?? process.env.MYSHULE_WEB_URL ?? DEFAULT_WEB_URL);
  const apiUrl = normalizeBaseUrl(input.apiUrl ?? process.env.MYSHULE_API_URL ?? DEFAULT_API_URL);
  const tenant = String(input.tenant ?? process.env.MYSHULE_SMOKE_TENANT ?? DEFAULT_TENANT).trim();
  const email = String(input.email ?? process.env.MYSHULE_SMOKE_EMAIL ?? DEFAULT_EMAIL).trim();
  const loginParams = new URLSearchParams({
    accepted: '1',
    email,
    tenant,
  });

  return {
    webUrl,
    apiUrl,
    tenant,
    email,
    apiReadyUrl: `${apiUrl}/health/ready`,
    supportStatusUrl: `${webUrl}/api/support/public/system-status`,
    schoolLoginUrl: `${webUrl}/school/login?${loginParams.toString()}`,
    parentLoginUrl: `${webUrl}/parent/login?${loginParams.toString()}`,
    webCsrfUrl: `${webUrl}/api/auth/csrf`,
    webLoginApiUrl: `${webUrl}/api/auth/login`,
  };
}

export function maskEmail(value) {
  const email = String(value ?? '').trim();
  const [local = '', domain = ''] = email.split('@');

  if (!local || !domain) {
    return 'masked-email';
  }

  return `${local.slice(0, 1)}***@${domain}`;
}

function sanitizeSmokeMessage(value, targets) {
  let message = String(value ?? '');
  const rawEmail = String(targets.email ?? '');

  if (rawEmail) {
    message = message
      .replaceAll(rawEmail, maskEmail(rawEmail))
      .replaceAll(encodeURIComponent(rawEmail), encodeURIComponent(maskEmail(rawEmail)));
  }

  return message;
}

export function buildSmokeArtifact({ ok, targets, checks, failures = [], error }) {
  const safeFailures = failures.map((failure) => ({
    id: failure.id,
    message: sanitizeSmokeMessage(failure.message, targets),
  }));
  const failureMessages = safeFailures.map((failure) => `${failure.id}: ${failure.message}`);
  const errorMessage = error
    ? sanitizeSmokeMessage(error instanceof Error ? error.message : error, targets)
    : failureMessages.join('; ');

  return {
    ok,
    generated_at: new Date().toISOString(),
    targets: {
      webUrl: targets.webUrl,
      apiUrl: targets.apiUrl,
      tenant: targets.tenant,
      email_masked: maskEmail(targets.email),
    },
    summary: {
      total: 6,
      passed: checks.length,
      failed: failures.length || (ok ? 0 : 1),
    },
    checks,
    failures: safeFailures,
    ...(errorMessage
      ? {
          error: {
            message: errorMessage,
          },
        }
      : {}),
  };
}

export function writeSmokeArtifact(artifact, artifactPath = DEFAULT_ARTIFACT_PATH) {
  const outputPath = path.resolve(process.cwd(), artifactPath);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return outputPath;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, received ${actual ?? 'missing'}.`);
  }
}

export function assertReadyPayload(payload) {
  const services = payload?.services ?? {};

  assertEqual(services.postgres, 'up', 'Postgres must be up');
  assertEqual(services.redis, 'up', 'Redis must be up');
  assertEqual(services.bullmq, 'configured', 'BullMQ must be configured');
  assertEqual(services.transactional_email, 'configured', 'Email must be configured');
  assertEqual(services.cors, 'configured', 'CORS must be configured');
  assertEqual(services.production_env, 'configured', 'Production environment must be configured');
  assertEqual(services.object_storage, 'configured', 'Object storage must be configured');
  assertEqual(services.malware_scanning, 'configured', 'Malware scanning must be configured');

  if (payload?.slo?.overall_status !== 'healthy' || payload?.slo?.active_alert_count !== 0) {
    throw new Error(
      `Observability/SLO must be healthy with 0 active alerts. Received ${payload?.slo?.overall_status ?? 'unknown'} with ${payload?.slo?.active_alert_count ?? 'unknown'} active alerts.`,
    );
  }
}

export function describeReadinessHttpFailure(status, payload) {
  const error = payload?.error && typeof payload.error === 'object' ? payload.error : {};
  const code = typeof error.code === 'string' && error.code.trim() ? ` (${error.code.trim()})` : '';
  const rawMessage = typeof error.message === 'string' ? error.message.trim() : '';
  const message = rawMessage ? `: ${rawMessage.replace(/[.?!]+$/, '')}` : '';

  return `API readiness returned HTTP ${status}${code}${message}.`;
}

export function assertAcceptedInviteLoginHtml(html, email, audienceLabel) {
  if (!html.includes('Use the password you just created')) {
    throw new Error(`${audienceLabel} accepted-invite login is missing the first-login password hint.`);
  }

  if (!html.includes(email)) {
    throw new Error(`${audienceLabel} accepted-invite login is missing the invited email.`);
  }

  if (!html.includes('new-password')) {
    throw new Error(`${audienceLabel} accepted-invite login is not preventing stale password autofill.`);
  }
}

export function extractCookieHeader(setCookieHeader) {
  const rawCookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];

  return rawCookies
    .map((cookie) => String(cookie).split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

export function isExpectedInvalidLoginPayload(payload) {
  return payload?.message === 'Invalid email or password' || payload?.message === 'Invalid credentials';
}

export function isMainModule(metaUrl, argvPath) {
  return Boolean(argvPath) && fileURLToPath(metaUrl) === path.resolve(argvPath);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

async function fetchText(url) {
  const response = await fetch(url, { cache: 'no-store' });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}.`);
  }

  return text;
}

async function runSmoke() {
  const targets = buildSmokeTargets();
  const checks = [];
  const failures = [];

  async function runStep(id, action) {
    try {
      await action();
      checks.push(id);
    } catch (error) {
      failures.push({
        id,
        message: String(error instanceof Error ? error.message : error),
      });
    }
  }

  let csrfPayload = null;
  let csrfHeaders = null;

  await runStep('API readiness', async () => {
    const ready = await fetchJson(targets.apiReadyUrl, { cache: 'no-store' });
    if (!ready.response.ok) {
      throw new Error(describeReadinessHttpFailure(ready.response.status, ready.payload));
    }
    assertReadyPayload(ready.payload);
  });

  await runStep('school accepted-invite login page', async () => {
    const schoolLoginHtml = await fetchText(targets.schoolLoginUrl);
    assertAcceptedInviteLoginHtml(schoolLoginHtml, targets.email, 'school');
  });

  await runStep('parent accepted-invite login page', async () => {
    const parentLoginHtml = await fetchText(targets.parentLoginUrl);
    assertAcceptedInviteLoginHtml(parentLoginHtml, targets.email, 'parent');
  });

  await runStep('web CSRF endpoint', async () => {
    const csrf = await fetchJson(targets.webCsrfUrl, { cache: 'no-store' });
    if (!csrf.response.ok || typeof csrf.payload?.token !== 'string') {
      throw new Error('Web CSRF endpoint did not return a token.');
    }
    csrfPayload = csrf.payload;
    csrfHeaders = csrf.response.headers;
  });

  await runStep('web auth proxy', async () => {
    if (!csrfPayload || !csrfHeaders) {
      throw new Error('Web auth proxy could not run because the CSRF smoke step did not return a token.');
    }
    const cookieHeader =
      typeof csrfHeaders.getSetCookie === 'function'
        ? extractCookieHeader(csrfHeaders.getSetCookie())
        : extractCookieHeader(csrfHeaders.get('set-cookie'));
    const fakeLogin = await fetchJson(targets.webLoginApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-myshule-csrf': csrfPayload.token,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        audience: 'school',
        identifier: 'not-a-real-user@example.test',
        password: 'WrongPassword!2026',
        tenantSlug: targets.tenant,
      }),
      cache: 'no-store',
    });
    if (fakeLogin.response.status !== 401 || !isExpectedInvalidLoginPayload(fakeLogin.payload)) {
      throw new Error(
        `Web auth proxy did not reach the backend correctly. Received HTTP ${fakeLogin.response.status}: ${JSON.stringify(fakeLogin.payload)}`,
      );
    }
  });

  await runStep('public system status', async () => {
    const supportStatus = await fetchJson(targets.supportStatusUrl, { cache: 'no-store' });
    if (!supportStatus.response.ok) {
      throw new Error(`Support status returned HTTP ${supportStatus.response.status}.`);
    }
  });

  return buildSmokeArtifact({
    ok: failures.length === 0,
    targets,
    checks,
    failures,
  });
}

if (isMainModule(import.meta.url, process.argv[1])) {
  runSmoke()
    .then((result) => {
      writeSmokeArtifact(result, process.env.MYSHULE_PRODUCTION_AUTH_SMOKE_ARTIFACT ?? DEFAULT_ARTIFACT_PATH);
      console.log(JSON.stringify(result, null, 2));
      if (!result.ok) {
        process.exitCode = 1;
      }
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
