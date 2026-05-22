import assert from 'node:assert/strict';
import test from 'node:test';

import {
  API_CATEGORY_REGISTRY,
  buildApiCategoryPolicy,
  classifyApiRoute,
} from './api-category-policy';

test('API_CATEGORY_REGISTRY covers public, internal, and third-party blueprint APIs', () => {
  assert.deepEqual(API_CATEGORY_REGISTRY.public.map((api) => api.code), [
    'parent',
    'student',
    'payment',
  ]);
  assert.deepEqual(API_CATEGORY_REGISTRY.internal.map((api) => api.code), [
    'ai_engine',
    'analytics_engine',
    'notification_engine',
    'integration_engine',
  ]);
  assert.deepEqual(API_CATEGORY_REGISTRY.third_party.map((api) => api.code), [
    'mpesa',
    'sms_provider',
    'email_provider',
    'biometric_system',
    'gps_system',
  ]);
});

test('buildApiCategoryPolicy applies tenant scope, auth audience, and rate limits', () => {
  const policy = buildApiCategoryPolicy({
    tenantId: 'tenant-api',
    enabledModules: ['parent_portal', 'finance', 'ai_insights', 'communication_sms', 'transport'],
  });

  assert.equal(policy.tenant_id, 'tenant-api');
  assert.equal(policy.routes.find((route) => route.code === 'parent')?.tenant_scoped, true);
  assert.equal(policy.routes.find((route) => route.code === 'ai_engine')?.audience, 'internal_service');
  assert.equal(policy.routes.find((route) => route.code === 'mpesa')?.requires_signature, true);
  assert.ok(policy.routes.every((route) => route.rate_limit_per_minute > 0));
  assert.ok(!policy.routes.some((route) => route.code === 'student'));
});

test('classifyApiRoute resolves enabled API routes and rejects inactive module surfaces', () => {
  const policy = buildApiCategoryPolicy({
    tenantId: 'tenant-api',
    enabledModules: ['parent_portal', 'finance'],
  });

  assert.equal(classifyApiRoute(policy, '/api/parent/students').status, 'pass');
  assert.equal(classifyApiRoute(policy, '/api/payments/mpesa/callback').status, 'pass');
  assert.deepEqual(classifyApiRoute(policy, '/api/internal/ai/recommendations'), {
    status: 'fail',
    reason: 'No enabled API category matches /api/internal/ai/recommendations.',
  });
});
