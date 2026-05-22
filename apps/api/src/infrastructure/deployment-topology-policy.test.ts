import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEPLOYMENT_OPTIONS,
  buildDeploymentTopologyPolicy,
  evaluateDeploymentReadiness,
} from './deployment-topology-policy';

test('DEPLOYMENT_OPTIONS covers cloud, hybrid, and dedicated enterprise modes', () => {
  assert.deepEqual(DEPLOYMENT_OPTIONS, [
    'cloud_hosted',
    'hybrid_cloud',
    'dedicated_enterprise',
  ]);
});

test('buildDeploymentTopologyPolicy models shared SaaS infrastructure for 1000+ schools', () => {
  const policy = buildDeploymentTopologyPolicy({
    mode: 'cloud_hosted',
    expectedSchools: 1200,
    concurrentFeatureTarget: 30_000,
  });

  assert.equal(policy.mode, 'cloud_hosted');
  assert.equal(policy.shared_infrastructure, true);
  assert.equal(policy.tenant_aware_database, true);
  assert.equal(policy.tenant_level_encryption, true);
  assert.deepEqual(policy.required_components, [
    'postgresql',
    'redis_cache',
    'queue_workers',
    'object_storage',
    'cdn',
    'audit_storage',
    'backup_storage',
    'observability',
    'rate_limiting',
  ]);
  assert.ok(policy.scaling_methods.includes('horizontal_scaling'));
  assert.ok(policy.scaling_methods.includes('autoscaling'));
});

test('buildDeploymentTopologyPolicy adds sync gateway for hybrid mode', () => {
  const policy = buildDeploymentTopologyPolicy({
    mode: 'hybrid_cloud',
    expectedSchools: 150,
    concurrentFeatureTarget: 5_000,
  });

  assert.equal(policy.hybrid_sync_required, true);
  assert.ok(policy.required_components.includes('offline_sync_gateway'));
});

test('evaluateDeploymentReadiness fails missing enterprise-scale controls', () => {
  const policy = buildDeploymentTopologyPolicy({
    mode: 'dedicated_enterprise',
    expectedSchools: 1000,
    concurrentFeatureTarget: 20_000,
  });

  const result = evaluateDeploymentReadiness(policy, {
    tenantAwareDatabase: false,
    tenantLevelEncryption: true,
    readReplicas: false,
    queueWorkers: false,
    cdn: true,
    backupStorage: false,
    auditStorage: true,
    observability: false,
    hybridSyncGateway: false,
  });

  assert.equal(result.status, 'fail');
  assert.deepEqual(result.required_actions, [
    'Enable tenant-aware database isolation.',
    'Provision read replicas for 1000+ school scale.',
    'Provision queue workers for high-concurrency workflows.',
    'Provision encrypted backup storage.',
    'Enable observability before production launch.',
  ]);
});

test('evaluateDeploymentReadiness passes complete hybrid deployment', () => {
  const policy = buildDeploymentTopologyPolicy({
    mode: 'hybrid_cloud',
    expectedSchools: 300,
    concurrentFeatureTarget: 8_000,
  });

  const result = evaluateDeploymentReadiness(policy, {
    tenantAwareDatabase: true,
    tenantLevelEncryption: true,
    readReplicas: true,
    queueWorkers: true,
    cdn: true,
    backupStorage: true,
    auditStorage: true,
    observability: true,
    hybridSyncGateway: true,
  });

  assert.equal(result.status, 'pass');
  assert.deepEqual(result.required_actions, []);
});
