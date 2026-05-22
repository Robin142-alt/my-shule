export const DEPLOYMENT_OPTIONS = [
  'cloud_hosted',
  'hybrid_cloud',
  'dedicated_enterprise',
] as const;

export type DeploymentOption = (typeof DEPLOYMENT_OPTIONS)[number];

export type DeploymentComponent =
  | 'postgresql'
  | 'redis_cache'
  | 'queue_workers'
  | 'object_storage'
  | 'cdn'
  | 'audit_storage'
  | 'backup_storage'
  | 'observability'
  | 'rate_limiting'
  | 'offline_sync_gateway'
  | 'dedicated_cluster';

export type DeploymentScalingMethod =
  | 'horizontal_scaling'
  | 'read_replicas'
  | 'queue_workers'
  | 'cdn_usage'
  | 'caching'
  | 'sharding_readiness'
  | 'autoscaling';

export type DeploymentTopologyPolicyInput = {
  mode: DeploymentOption;
  expectedSchools: number;
  concurrentFeatureTarget: number;
};

export type DeploymentTopologyPolicy = {
  mode: DeploymentOption;
  expected_schools: number;
  concurrent_feature_target: number;
  shared_infrastructure: boolean;
  tenant_aware_database: true;
  tenant_level_encryption: true;
  hybrid_sync_required: boolean;
  required_components: DeploymentComponent[];
  scaling_methods: DeploymentScalingMethod[];
};

export type DeploymentReadinessInput = {
  tenantAwareDatabase: boolean;
  tenantLevelEncryption: boolean;
  readReplicas: boolean;
  queueWorkers: boolean;
  cdn: boolean;
  backupStorage: boolean;
  auditStorage: boolean;
  observability: boolean;
  hybridSyncGateway: boolean;
};

export type DeploymentReadinessEvaluation = {
  mode: DeploymentOption;
  status: 'pass' | 'fail';
  required_actions: string[];
};

export function buildDeploymentTopologyPolicy(
  input: DeploymentTopologyPolicyInput,
): DeploymentTopologyPolicy {
  return {
    mode: input.mode,
    expected_schools: input.expectedSchools,
    concurrent_feature_target: input.concurrentFeatureTarget,
    shared_infrastructure: input.mode !== 'dedicated_enterprise',
    tenant_aware_database: true,
    tenant_level_encryption: true,
    hybrid_sync_required: input.mode === 'hybrid_cloud',
    required_components: requiredComponentsFor(input.mode),
    scaling_methods: [
      'horizontal_scaling',
      'read_replicas',
      'queue_workers',
      'cdn_usage',
      'caching',
      'sharding_readiness',
      'autoscaling',
    ],
  };
}

export function evaluateDeploymentReadiness(
  policy: DeploymentTopologyPolicy,
  input: DeploymentReadinessInput,
): DeploymentReadinessEvaluation {
  const actions: string[] = [];

  if (!input.tenantAwareDatabase) {
    actions.push('Enable tenant-aware database isolation.');
  }

  if (!input.tenantLevelEncryption) {
    actions.push('Enable tenant-level encryption.');
  }

  if (policy.expected_schools >= 1000 && !input.readReplicas) {
    actions.push('Provision read replicas for 1000+ school scale.');
  }

  if (!input.queueWorkers) {
    actions.push('Provision queue workers for high-concurrency workflows.');
  }

  if (!input.cdn) {
    actions.push('Provision CDN delivery for mobile-first access.');
  }

  if (!input.backupStorage) {
    actions.push('Provision encrypted backup storage.');
  }

  if (!input.auditStorage) {
    actions.push('Provision immutable audit storage.');
  }

  if (!input.observability) {
    actions.push('Enable observability before production launch.');
  }

  if (policy.hybrid_sync_required && !input.hybridSyncGateway) {
    actions.push('Provision offline sync gateway for hybrid cloud deployment.');
  }

  return {
    mode: policy.mode,
    status: actions.length === 0 ? 'pass' : 'fail',
    required_actions: actions,
  };
}

function requiredComponentsFor(mode: DeploymentOption): DeploymentComponent[] {
  const components: DeploymentComponent[] = [
    'postgresql',
    'redis_cache',
    'queue_workers',
    'object_storage',
    'cdn',
    'audit_storage',
    'backup_storage',
    'observability',
    'rate_limiting',
  ];

  if (mode === 'hybrid_cloud') {
    components.push('offline_sync_gateway');
  }

  if (mode === 'dedicated_enterprise') {
    components.push('dedicated_cluster');
  }

  return components;
}
