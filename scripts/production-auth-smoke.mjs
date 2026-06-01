#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_WEB_URL = 'https://myshule.online';
const DEFAULT_API_URL = 'https://my-shule-erp-api.vercel.app';
const DEFAULT_TENANT = 'kb-high';
const DEFAULT_EMAIL = 'teacher.invited@example.test';

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
  assertEqual(services.object_storage, 'configured', 'Object storage must be configured');
  assertEqual(services.malware_scanning, 'configured', 'Malware scanning must be configured');

  if (payload?.slo?.overall_status !== 'healthy' || payload?.slo?.active_alert_count !== 0) {
    throw new Error(
      `Observability/SLO must be healthy with 0 active alerts. Received ${payload?.slo?.overall_status ?? 'unknown'} with ${payload?.slo?.active_alert_count ?? 'unknown'} active alerts.`,
    );
  }
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
  return payload?.message === 'Invalid email or password';
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

  const ready = await fetchJson(targets.apiReadyUrl, { cache: 'no-store' });
  if (!ready.response.ok) {
    throw new Error(`API readiness returned HTTP ${ready.response.status}.`);
  }
  assertReadyPayload(ready.payload);
  checks.push('API readiness');

  const schoolLoginHtml = await fetchText(targets.schoolLoginUrl);
  assertAcceptedInviteLoginHtml(schoolLoginHtml, targets.email, 'school');
  checks.push('school accepted-invite login page');

  const parentLoginHtml = await fetchText(targets.parentLoginUrl);
  assertAcceptedInviteLoginHtml(parentLoginHtml, targets.email, 'parent');
  checks.push('parent accepted-invite login page');

  const csrf = await fetchJson(targets.webCsrfUrl, { cache: 'no-store' });
  if (!csrf.response.ok || typeof csrf.payload?.token !== 'string') {
    throw new Error('Web CSRF endpoint did not return a token.');
  }
  const cookieHeader =
    typeof csrf.response.headers.getSetCookie === 'function'
      ? extractCookieHeader(csrf.response.headers.getSetCookie())
      : extractCookieHeader(csrf.response.headers.get('set-cookie'));
  const fakeLogin = await fetchJson(targets.webLoginApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-myshule-csrf': csrf.payload.token,
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
  checks.push('web auth proxy');

  const supportStatus = await fetchJson(targets.supportStatusUrl, { cache: 'no-store' });
  if (!supportStatus.response.ok) {
    throw new Error(`Support status returned HTTP ${supportStatus.response.status}.`);
  }
  checks.push('public system status');

  return {
    ok: true,
    targets: {
      webUrl: targets.webUrl,
      apiUrl: targets.apiUrl,
      tenant: targets.tenant,
      email: targets.email,
    },
    checks,
  };
}

if (isMainModule(import.meta.url, process.argv[1])) {
  runSmoke()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
