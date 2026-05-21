import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMPLEMENTATION90_TRAFFIC_PROFILE,
  renderImplementation90LoadProfileMarkdown,
  runImplementation90LoadProfile,
  validateImplementation90Budgets,
  validateTrafficMix,
} from './implementation90-load-profile';

test('Implementation 90 traffic profile models a 5000 users-per-second mixed school-day workload', () => {
  assert.equal(IMPLEMENTATION90_TRAFFIC_PROFILE.target_users_per_second, 5000);
  assert.equal(IMPLEMENTATION90_TRAFFIC_PROFILE.duration_minutes, 30);
  assert.doesNotThrow(() => validateTrafficMix());
  assert.equal(
    IMPLEMENTATION90_TRAFFIC_PROFILE.workloads.some((workload) => workload.id === 'mpesa-callback'),
    true,
  );
  assert.equal(
    IMPLEMENTATION90_TRAFFIC_PROFILE.workloads.some((workload) => workload.id === 'auth-session'),
    true,
  );
  assert.equal(
    IMPLEMENTATION90_TRAFFIC_PROFILE.workloads.some((workload) => workload.id === 'cached-dashboard-summary'),
    true,
  );
});

test('validateImplementation90Budgets fails unsafe release metrics with actionable messages', () => {
  assert.deepEqual(
    validateImplementation90Budgets({
      api_error_rate: 0.002,
      money_flow_error_rate: 0.0002,
      database_waiting_clients: 1,
      redis_error_rate: 0.002,
      oldest_queue_lag_ms: 700000,
    }),
    [
      'API error rate is above 0.1%.',
      'Money-flow error rate is above 0.01%.',
      'Database pool has waiting clients.',
      'Redis error rate is above 0.1%.',
      'Oldest queue lag is above 10 minutes.',
    ],
  );

  assert.deepEqual(
    validateImplementation90Budgets({
      api_error_rate: 0.001,
      money_flow_error_rate: 0.0001,
      database_waiting_clients: 0,
      redis_error_rate: 0.001,
      oldest_queue_lag_ms: 600000,
    }),
    [],
  );
});

test('runImplementation90LoadProfile verifies scale, security, reliability, cache, deployment, UX, and maintainability evidence', () => {
  const result = runImplementation90LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/modules/security/rate-limit.service.ts': 'RateLimitClass public_read authenticated_read write auth payment_callback sync admin resolveRateLimitClass securityPublicReadRateLimitMaxRequests securityAuthenticatedReadRateLimitMaxRequests securityWriteRateLimitMaxRequests securityAdminRateLimitMaxRequests',
      'apps/api/src/config/configuration.ts': 'implementation90 targetUsersPerSecond durationMinutes maxApiErrorRate maxMoneyFlowErrorRate security.lockdownBypassSecret cache.staleWhileRevalidateTtlSeconds cache.stampedeLockTtlSeconds',
      'apps/api/src/config/env.validation.ts': 'SECURITY_LOCKDOWN_BYPASS_SECRET Implementation 90 lockdown bypass secret must be at least 32 characters in production SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS SECURITY_AUTHENTICATED_READ_RATE_LIMIT_MAX_REQUESTS SECURITY_WRITE_RATE_LIMIT_MAX_REQUESTS SECURITY_ADMIN_RATE_LIMIT_MAX_REQUESTS',
      'apps/api/src/infrastructure/redis/redis-cache.service.ts': 'getOrSetProtected getOrSetStaleWhileRevalidate staleWhileRevalidate stampede lockTtlSeconds pendingComputations',
      'apps/api/src/database/database.service.ts': 'getPoolMetrics waiting_requests database.pool.waiting_clients database.query.timeout statementTimeoutMs',
      'apps/api/src/modules/observability/production-observability.catalog.ts': 'implementation90-extreme-scale implementation90-security-lockdown implementation90-database-saturation implementation90-redis-degradation implementation90-parent-mobile-speed extreme-scale-incident security-lockdown-mode',
      'apps/api/src/scripts/query-plan-review.ts': 'resolveQueryPlanSslConfig rejectUnauthorized true',
      'deploy/nginx/nginx.conf': 'limit_req_zone $binary_remote_addr zone=public_read_limit limit_req_zone $binary_remote_addr zone=admin_limit add_header X-Frame-Options DENY add_header Content-Security-Policy keepalive 128',
      'deploy/kubernetes/api-deployment.yaml': 'minReplicas: 6 maxReplicas: 60 minAvailable: 4 averageUtilization: 65',
      'deploy/kubernetes/workers-deployment.yaml': 'payments-worker-hpa maxReplicas: 30 events-worker-hpa maxReplicas: 20 queue-backlog',
      'docker-compose.production.yml': 'API_REPLICAS:-6 PGBOUNCER_MAX_CLIENT_CONN: "5000" SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS',
      'docs/runbooks/extreme-scale-incident.md': 'database saturation Redis degradation queue backlog lockdown mode',
      'docs/runbooks/security-lockdown-mode.md': 'Rotate suspected secrets Disable provider callbacks Preserve audit logs',
      'docs/architecture/implementation90-scale-security-reliability.md': '5000+ users per second breach-resistant reliability maintainability',
      'apps/api/src/scripts/maintainability-scan.ts': 'implementation90-architecture-runbooks implementation90-load-profile package-script production env variable',
      'package.json': 'implementation90:load-profile implementation90:full-release-gate npm run implementation90:load-profile npm run perf:query-plan-review npm run test:chaos npm run test:gameday npm run release:readiness',
      '.env.production.example': 'IMPLEMENTATION90_TARGET_USERS_PER_SECOND=5000 SECURITY_LOCKDOWN_BYPASS_SECRET SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS',
      'apps/web/src/app/layout.tsx': 'viewport metadata themeColor',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.every((check) => check.status === 'pass'), true);
});

test('runImplementation90LoadProfile fails when security and deployment evidence are missing', () => {
  const result = runImplementation90LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/modules/security/rate-limit.service.ts': '',
      'deploy/kubernetes/api-deployment.yaml': '',
      'deploy/nginx/nginx.conf': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.some((check) => check.id === 'adaptive-rate-limit-classes' && check.status === 'fail'), true);
  assert.equal(result.checks.some((check) => check.id === 'kubernetes-api-extreme-scale' && check.status === 'fail'), true);
  assert.equal(result.checks.some((check) => check.id === 'nginx-edge-hardening' && check.status === 'fail'), true);
});

test('runImplementation90LoadProfile fails when the full release gate is not wired', () => {
  const sourceOverrides = {
    'apps/api/src/modules/security/rate-limit.service.ts': 'RateLimitClass public_read authenticated_read write auth payment_callback sync admin resolveRateLimitClass securityPublicReadRateLimitMaxRequests securityAuthenticatedReadRateLimitMaxRequests securityWriteRateLimitMaxRequests securityAdminRateLimitMaxRequests',
    'apps/api/src/config/configuration.ts': 'implementation90 targetUsersPerSecond durationMinutes maxApiErrorRate maxMoneyFlowErrorRate security.lockdownBypassSecret cache.staleWhileRevalidateTtlSeconds cache.stampedeLockTtlSeconds',
    'apps/api/src/config/env.validation.ts': 'SECURITY_LOCKDOWN_BYPASS_SECRET Implementation 90 lockdown bypass secret must be at least 32 characters in production SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS SECURITY_AUTHENTICATED_READ_RATE_LIMIT_MAX_REQUESTS SECURITY_WRITE_RATE_LIMIT_MAX_REQUESTS SECURITY_ADMIN_RATE_LIMIT_MAX_REQUESTS',
    'apps/api/src/infrastructure/redis/redis-cache.service.ts': 'getOrSetProtected getOrSetStaleWhileRevalidate staleWhileRevalidate stampede lockTtlSeconds pendingComputations',
    'apps/api/src/database/database.service.ts': 'getPoolMetrics waiting_requests database.pool.waiting_clients database.query.timeout statementTimeoutMs',
    'apps/api/src/modules/observability/production-observability.catalog.ts': 'implementation90-extreme-scale implementation90-security-lockdown implementation90-database-saturation implementation90-redis-degradation implementation90-parent-mobile-speed extreme-scale-incident security-lockdown-mode',
    'apps/api/src/scripts/query-plan-review.ts': 'resolveQueryPlanSslConfig rejectUnauthorized true',
    'deploy/nginx/nginx.conf': 'limit_req_zone $binary_remote_addr zone=public_read_limit limit_req_zone $binary_remote_addr zone=admin_limit add_header X-Frame-Options DENY add_header Content-Security-Policy keepalive 128',
    'deploy/kubernetes/api-deployment.yaml': 'minReplicas: 6 maxReplicas: 60 minAvailable: 4 averageUtilization: 65',
    'deploy/kubernetes/workers-deployment.yaml': 'payments-worker-hpa maxReplicas: 30 events-worker-hpa maxReplicas: 20 queue-backlog',
    'docker-compose.production.yml': 'API_REPLICAS:-6 PGBOUNCER_MAX_CLIENT_CONN: "5000" SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS',
    'docs/runbooks/extreme-scale-incident.md': 'database saturation Redis degradation queue backlog lockdown mode',
    'docs/runbooks/security-lockdown-mode.md': 'Rotate suspected secrets Disable provider callbacks Preserve audit logs',
    'docs/architecture/implementation90-scale-security-reliability.md': '5000+ users per second breach-resistant reliability maintainability',
    'apps/api/src/scripts/maintainability-scan.ts': 'implementation90-architecture-runbooks implementation90-load-profile package-script production env variable',
    'package.json': 'implementation90:load-profile npm run implementation90:load-profile',
    '.env.production.example': 'IMPLEMENTATION90_TARGET_USERS_PER_SECOND=5000 SECURITY_LOCKDOWN_BYPASS_SECRET SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS',
    'apps/web/src/app/layout.tsx': 'viewport metadata themeColor',
  };
  const result = runImplementation90LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides,
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.some((check) => check.id === 'package-and-env-wiring' && check.status === 'fail'),
    true,
  );
});

test('renderImplementation90LoadProfileMarkdown includes acceptance budgets and failed checks', () => {
  const result = runImplementation90LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-21T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/modules/security/rate-limit.service.ts': '',
    },
  });
  const markdown = renderImplementation90LoadProfileMarkdown(result);

  assert.match(markdown, /Implementation 90 Load Profile/);
  assert.match(markdown, /5000/);
  assert.match(markdown, /adaptive-rate-limit-classes/);
});
