import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLUEPRINT_INTEGRATION_PROVIDERS,
  buildTenantIntegrationPolicy,
  evaluateIntegrationConfig,
} from './integration-policy';

test('buildTenantIntegrationPolicy enables Kenyan and external providers by active module', () => {
  const policy = buildTenantIntegrationPolicy({
    tenantId: 'tenant-integrations',
    enabledModules: ['finance', 'students', 'exams', 'communication_sms', 'transport', 'lms'],
  });

  assert.equal(policy.tenant_id, 'tenant-integrations');
  assert.ok(policy.allowed_providers.includes('mpesa'));
  assert.ok(policy.allowed_providers.includes('bank_apis'));
  assert.ok(policy.allowed_providers.includes('sms_gateways'));
  assert.ok(policy.allowed_providers.includes('knec_hooks'));
  assert.ok(policy.allowed_providers.includes('nemis_hooks'));
  assert.ok(policy.allowed_providers.includes('google_workspace'));
  assert.ok(policy.allowed_providers.includes('gps_trackers'));
  assert.ok(!policy.allowed_providers.includes('biometric_devices'));
  assert.deepEqual(BLUEPRINT_INTEGRATION_PROVIDERS.kenyan, [
    'mpesa',
    'bank_apis',
    'sms_gateways',
    'knec_hooks',
    'nemis_hooks',
  ]);
});

test('evaluateIntegrationConfig requires tenant scope, encrypted secrets, and provider fields', () => {
  const policy = buildTenantIntegrationPolicy({
    tenantId: 'tenant-integrations',
    enabledModules: ['finance'],
  });

  const result = evaluateIntegrationConfig(policy, {
    tenantId: 'other-tenant',
    provider: 'mpesa',
    secretEncrypted: false,
    configuredFields: ['paybill'],
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Configuration tenant must match policy tenant tenant-integrations.',
    'Encrypt provider secrets before activation.',
    'Configure required field shortcode for mpesa.',
    'Configure required field passkey_ref for mpesa.',
  ]);
});

test('evaluateIntegrationConfig blocks providers when the owning module is inactive', () => {
  const policy = buildTenantIntegrationPolicy({
    tenantId: 'tenant-integrations',
    enabledModules: ['finance'],
  });

  const result = evaluateIntegrationConfig(policy, {
    tenantId: 'tenant-integrations',
    provider: 'gps_trackers',
    secretEncrypted: true,
    configuredFields: ['provider_account_ref', 'webhook_secret_ref'],
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Activate module transport before configuring gps_trackers.',
  ]);
});

test('evaluateIntegrationConfig passes complete active provider configuration', () => {
  const policy = buildTenantIntegrationPolicy({
    tenantId: 'tenant-integrations',
    enabledModules: ['communication_sms'],
  });

  const result = evaluateIntegrationConfig(policy, {
    tenantId: 'tenant-integrations',
    provider: 'sms_gateways',
    secretEncrypted: true,
    configuredFields: ['sender_id', 'api_key_ref'],
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.required_actions, []);
});
