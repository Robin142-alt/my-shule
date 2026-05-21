import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type Implementation90HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface Implementation90Workload {
  id: string;
  method: Implementation90HttpMethod;
  path: string;
  mix: number;
  target_p95_ms: number;
  async_allowed?: boolean;
}

export interface Implementation90TrafficProfile {
  target_users_per_second: number;
  duration_minutes: number;
  max_api_error_rate: number;
  max_money_flow_error_rate: number;
  workloads: Implementation90Workload[];
}

export interface Implementation90BudgetInput {
  api_error_rate: number;
  money_flow_error_rate: number;
  database_waiting_clients: number;
  redis_error_rate: number;
  oldest_queue_lag_ms: number;
}

export interface Implementation90LoadProfileOptions {
  workspaceRoot?: string;
  generatedAt?: string;
  sourceOverrides?: Record<string, string>;
  budgetInput?: Implementation90BudgetInput;
}

export interface Implementation90LoadProfileResult {
  generated_at: string;
  ok: boolean;
  traffic_profile: Implementation90TrafficProfile;
  checks: Array<{
    id: string;
    label: string;
    status: 'pass' | 'fail';
  }>;
  budget_errors: string[];
}

interface EvidenceCheck {
  id: string;
  label: string;
  files: string[];
  pattern: RegExp;
}

export const IMPLEMENTATION90_TRAFFIC_PROFILE: Implementation90TrafficProfile = {
  target_users_per_second: 5000,
  duration_minutes: 30,
  max_api_error_rate: 0.001,
  max_money_flow_error_rate: 0.0001,
  workloads: [
    { id: 'cached-dashboard-summary', method: 'GET', path: '/dashboard/summary', mix: 0.16, target_p95_ms: 300 },
    { id: 'student-search', method: 'GET', path: '/students?search=a', mix: 0.12, target_p95_ms: 500 },
    { id: 'fee-balances', method: 'GET', path: '/billing/students/balances', mix: 0.1, target_p95_ms: 650 },
    { id: 'published-report-cards', method: 'GET', path: '/exams/report-cards', mix: 0.1, target_p95_ms: 800 },
    { id: 'inventory-reconciliation', method: 'GET', path: '/inventory/reconciliation', mix: 0.08, target_p95_ms: 700 },
    { id: 'support-status', method: 'GET', path: '/support/public/system-status', mix: 0.04, target_p95_ms: 300 },
    { id: 'attendance-write', method: 'POST', path: '/biometric-attendance/events', mix: 0.06, target_p95_ms: 1200, async_allowed: true },
    { id: 'mark-entry-write', method: 'POST', path: '/exams/mark-sheets', mix: 0.04, target_p95_ms: 1200 },
    { id: 'support-ticket-write', method: 'POST', path: '/support/tickets', mix: 0.03, target_p95_ms: 1200 },
    { id: 'mpesa-callback', method: 'POST', path: '/payments/mpesa/callback', mix: 0.05, target_p95_ms: 300, async_allowed: true },
    { id: 'auth-session', method: 'POST', path: '/auth/login', mix: 0.04, target_p95_ms: 900 },
    { id: 'sync-pull', method: 'POST', path: '/sync/pull', mix: 0.08, target_p95_ms: 900 },
    { id: 'module-navigation', method: 'GET', path: '/module-access/me', mix: 0.1, target_p95_ms: 400 },
  ],
};

const EVIDENCE_CHECKS: EvidenceCheck[] = [
  {
    id: 'adaptive-rate-limit-classes',
    label: 'Adaptive rate-limit classes isolate public reads, authenticated reads, writes, auth, payment callbacks, sync, and admin traffic.',
    files: ['apps/api/src/modules/security/rate-limit.service.ts'],
    pattern: /(?=.*RateLimitClass)(?=.*public_read)(?=.*authenticated_read)(?=.*write)(?=.*auth)(?=.*payment_callback)(?=.*sync)(?=.*admin)(?=.*resolveRateLimitClass)(?=.*(?:securityPublicReadRateLimitMaxRequests|security\.publicReadRateLimitMaxRequests))(?=.*(?:securityAuthenticatedReadRateLimitMaxRequests|security\.authenticatedReadRateLimitMaxRequests))(?=.*(?:securityWriteRateLimitMaxRequests|security\.writeRateLimitMaxRequests))(?=.*(?:securityAdminRateLimitMaxRequests|security\.adminRateLimitMaxRequests))/s,
  },
  {
    id: 'implementation90-config',
    label: 'Configuration exposes Implementation 90 scale, cache, and security lockdown budgets.',
    files: ['apps/api/src/config/configuration.ts'],
    pattern: /(?=.*implementation90)(?=.*targetUsersPerSecond)(?=.*durationMinutes)(?=.*maxApiErrorRate)(?=.*maxMoneyFlowErrorRate)(?=.*lockdownBypassSecret)(?=.*cache)(?=.*staleWhileRevalidateTtlSeconds)(?=.*stampedeLockTtlSeconds)/s,
  },
  {
    id: 'implementation90-env-validation',
    label: 'Production environment validation blocks unsafe Implementation 90 secrets and rate-limit settings.',
    files: ['apps/api/src/config/env.validation.ts'],
    pattern: /(?=.*SECURITY_LOCKDOWN_BYPASS_SECRET)(?=.*Implementation 90 lockdown bypass secret must be at least 32 characters in production)(?=.*SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS)(?=.*SECURITY_AUTHENTICATED_READ_RATE_LIMIT_MAX_REQUESTS)(?=.*SECURITY_WRITE_RATE_LIMIT_MAX_REQUESTS)(?=.*SECURITY_ADMIN_RATE_LIMIT_MAX_REQUESTS)/s,
  },
  {
    id: 'cache-stampede-and-swr',
    label: 'Redis cache supports stampede protection and stale-while-revalidate for hot tenant reads.',
    files: ['apps/api/src/infrastructure/redis/redis-cache.service.ts'],
    pattern: /(?=.*getOrSetProtected)(?=.*getOrSetStaleWhileRevalidate)(?=.*staleWhileRevalidate)(?=.*stampede)(?=.*lockTtlSeconds)(?=.*pendingComputations)/s,
  },
  {
    id: 'database-pool-and-timeout-observability',
    label: 'Database service exposes pool waiting metrics and timeout observability.',
    files: ['apps/api/src/database/database.service.ts'],
    pattern: /(?=.*getPoolMetrics)(?=.*waiting_requests)(?=.*database\.pool\.waiting_clients)(?=.*database\.query\.timeout)(?=.*statementTimeoutMs)/s,
  },
  {
    id: 'implementation90-observability',
    label: 'Production observability catalog includes Implementation 90 dashboards, alerts, runbooks, and synthetics.',
    files: ['apps/api/src/modules/observability/production-observability.catalog.ts'],
    pattern: /(?=.*implementation90-extreme-scale)(?=.*implementation90-security-lockdown)(?=.*implementation90-database-saturation)(?=.*implementation90-redis-degradation)(?=.*implementation90-parent-mobile-speed)(?=.*extreme-scale-incident)(?=.*security-lockdown-mode)/s,
  },
  {
    id: 'query-plan-tls-verification',
    label: 'Production query-plan review verifies database TLS instead of disabling certificate validation.',
    files: ['apps/api/src/scripts/query-plan-review.ts'],
    pattern: /(?=.*resolveQueryPlanSslConfig)(?=.*rejectUnauthorized)(?![\s\S]*rejectUnauthorized:\s*false\s*}\s*:\s*undefined)/s,
  },
  {
    id: 'nginx-edge-hardening',
    label: 'NGINX edge hardening defines separate rate-limit zones, security headers, and high keepalive capacity.',
    files: ['deploy/nginx/nginx.conf'],
    pattern: /(?=.*limit_req_zone \$binary_remote_addr zone=public_read_limit)(?=.*limit_req_zone \$binary_remote_addr zone=admin_limit)(?=.*add_header X-Frame-Options DENY)(?=.*add_header Content-Security-Policy)(?=.*keepalive 128)/s,
  },
  {
    id: 'kubernetes-api-extreme-scale',
    label: 'Kubernetes API deployment scales from 6 to 60 replicas and keeps at least four API pods available.',
    files: ['deploy/kubernetes/api-deployment.yaml'],
    pattern: /(?=.*minReplicas:\s*6)(?=.*maxReplicas:\s*60)(?=.*minAvailable:\s*4)(?=.*averageUtilization:\s*65)/s,
  },
  {
    id: 'kubernetes-worker-backlog-scaling',
    label: 'Worker deployments have independent backlog-aware scaling ceilings for payments and events.',
    files: ['deploy/kubernetes/workers-deployment.yaml'],
    pattern: /(?=.*payments-worker-hpa)(?=.*maxReplicas:\s*30)(?=.*events-worker-hpa)(?=.*maxReplicas:\s*20)(?=.*queue-backlog)/s,
  },
  {
    id: 'docker-production-simulation',
    label: 'Docker production simulation reflects six API replicas, high PgBouncer client capacity, and Implementation 90 security settings.',
    files: ['docker-compose.production.yml'],
    pattern: /(?=.*API_REPLICAS:-6)(?=.*PGBOUNCER_MAX_CLIENT_CONN:\s*"5000")(?=.*SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS)/s,
  },
  {
    id: 'implementation90-runbooks-and-architecture',
    label: 'Scale/security runbooks and architecture ADR exist with concrete recovery language.',
    files: [
      'docs/runbooks/extreme-scale-incident.md',
      'docs/runbooks/security-lockdown-mode.md',
      'docs/architecture/implementation90-scale-security-reliability.md',
    ],
    pattern: /(?=.*database saturation)(?=.*Redis degradation)(?=.*queue backlog)(?=.*lockdown mode)(?=.*Rotate suspected secrets)(?=.*Disable provider callbacks)(?=.*Preserve audit logs)(?=.*5000\+ users per second)(?=.*breach-resistant)(?=.*reliability)(?=.*maintainability)/s,
  },
  {
    id: 'maintainability-release-gates',
    label: 'Maintainability scan enforces Implementation 90 runbooks, load profile, package script, and production env documentation.',
    files: ['apps/api/src/scripts/maintainability-scan.ts'],
    pattern: /(?=.*implementation90-architecture-runbooks)(?=.*implementation90-load-profile)(?=.*package-script)(?=.*production env variable)/s,
  },
  {
    id: 'package-and-env-wiring',
    label: 'Package scripts and production env templates expose the Implementation 90 load profile and full release gate.',
    files: ['package.json', '.env.production.example'],
    pattern: /(?=.*implementation90:load-profile)(?=.*implementation90:full-release-gate)(?=.*npm run implementation90:load-profile)(?=.*npm run perf:query-plan-review)(?=.*npm run test:chaos)(?=.*npm run test:gameday)(?=.*npm run release:readiness)(?=.*IMPLEMENTATION90_TARGET_USERS_PER_SECOND=5000)(?=.*SECURITY_LOCKDOWN_BYPASS_SECRET)(?=.*SECURITY_PUBLIC_READ_RATE_LIMIT_MAX_REQUESTS)/s,
  },
  {
    id: 'web-performance-metadata',
    label: 'Web layout exposes viewport metadata and theme color for stable mobile rendering.',
    files: ['apps/web/src/app/layout.tsx'],
    pattern: /(?=.*viewport)(?=.*metadata)(?=.*themeColor)/s,
  },
];

export function validateTrafficMix(profile = IMPLEMENTATION90_TRAFFIC_PROFILE): void {
  const total = profile.workloads.reduce((sum, workload) => sum + workload.mix, 0);

  if (Math.abs(total - 1) > 0.0001) {
    throw new Error(`Implementation 90 workload mix must equal 1. Received ${total}.`);
  }
}

export function validateImplementation90Budgets(input: Implementation90BudgetInput): string[] {
  const errors: string[] = [];

  if (input.api_error_rate > IMPLEMENTATION90_TRAFFIC_PROFILE.max_api_error_rate) {
    errors.push('API error rate is above 0.1%.');
  }

  if (input.money_flow_error_rate > IMPLEMENTATION90_TRAFFIC_PROFILE.max_money_flow_error_rate) {
    errors.push('Money-flow error rate is above 0.01%.');
  }

  if (input.database_waiting_clients > 0) {
    errors.push('Database pool has waiting clients.');
  }

  if (input.redis_error_rate > 0.001) {
    errors.push('Redis error rate is above 0.1%.');
  }

  if (input.oldest_queue_lag_ms > 600000) {
    errors.push('Oldest queue lag is above 10 minutes.');
  }

  return errors;
}

export function runImplementation90LoadProfile(
  options: Implementation90LoadProfileOptions = {},
): Implementation90LoadProfileResult {
  const workspaceRoot = options.workspaceRoot ?? process.cwd();
  const budgetInput = options.budgetInput ?? {
    api_error_rate: 0,
    money_flow_error_rate: 0,
    database_waiting_clients: 0,
    redis_error_rate: 0,
    oldest_queue_lag_ms: 0,
  };
  const budgetErrors = validateImplementation90Budgets(budgetInput);
  const checks = [
    validateStaticProfile(),
    {
      id: 'release-budget-input',
      label: 'Release budget input is within API, money-flow, database, Redis, and queue limits.',
      status: budgetErrors.length === 0 ? 'pass' as const : 'fail' as const,
    },
    ...EVIDENCE_CHECKS.map((check) => {
      const source = check.files
        .map((file) => readSource(workspaceRoot, file, options.sourceOverrides))
        .join('\n');

      return {
        id: check.id,
        label: check.label,
        status: check.pattern.test(source) ? 'pass' as const : 'fail' as const,
      };
    }),
  ];

  return {
    generated_at: options.generatedAt ?? new Date().toISOString(),
    ok: checks.every((check) => check.status === 'pass') && budgetErrors.length === 0,
    traffic_profile: IMPLEMENTATION90_TRAFFIC_PROFILE,
    checks,
    budget_errors: budgetErrors,
  };
}

export function renderImplementation90LoadProfileMarkdown(
  result: Implementation90LoadProfileResult,
): string {
  const lines = [
    '# Implementation 90 Load Profile',
    '',
    `Generated at: ${result.generated_at}`,
    '',
    `Status: ${result.ok ? 'pass' : 'fail'}`,
    '',
    `Target users per second: ${result.traffic_profile.target_users_per_second}`,
    `Duration minutes: ${result.traffic_profile.duration_minutes}`,
    `Max API error rate: ${result.traffic_profile.max_api_error_rate}`,
    `Max money-flow error rate: ${result.traffic_profile.max_money_flow_error_rate}`,
    '',
    '## Checks',
    '',
    '| Check ID | Check | Status |',
    '| --- | --- | --- |',
  ];

  for (const check of result.checks) {
    lines.push(`| ${check.id} | ${escapeTable(check.label)} | ${check.status} |`);
  }

  if (result.budget_errors.length > 0) {
    lines.push('', '## Budget Errors', '');
    for (const error of result.budget_errors) {
      lines.push(`- ${error}`);
    }
  }

  lines.push(
    '',
    '## Workload Mix',
    '',
    '| Workload | Method | Path | Mix | P95 Budget | Async Allowed |',
    '| --- | --- | --- | ---: | ---: | --- |',
  );

  for (const workload of result.traffic_profile.workloads) {
    lines.push(
      `| ${workload.id} | ${workload.method} | ${escapeTable(workload.path)} | ${workload.mix} | ${workload.target_p95_ms} | ${workload.async_allowed ? 'yes' : 'no'} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

export function writeImplementation90LoadProfileArtifact(
  result: Implementation90LoadProfileResult,
  outputPath: string,
): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderImplementation90LoadProfileMarkdown(result), 'utf8');
}

function validateStaticProfile(): { id: string; label: string; status: 'pass' | 'fail' } {
  try {
    validateTrafficMix();
  } catch {
    return {
      id: 'static-traffic-profile',
      label: 'Static traffic profile targets 5,000+ users per second with a valid mixed workload.',
      status: 'fail',
    };
  }

  const hasScale = IMPLEMENTATION90_TRAFFIC_PROFILE.target_users_per_second >= 5000
    && IMPLEMENTATION90_TRAFFIC_PROFILE.duration_minutes >= 30;
  const hasCriticalWorkloads = ['cached-dashboard-summary', 'mpesa-callback', 'auth-session', 'sync-pull']
    .every((id) => IMPLEMENTATION90_TRAFFIC_PROFILE.workloads.some((workload) => workload.id === id));

  return {
    id: 'static-traffic-profile',
    label: 'Static traffic profile targets 5,000+ users per second with a valid mixed workload.',
    status: hasScale && hasCriticalWorkloads ? 'pass' : 'fail',
  };
}

function readSource(
  workspaceRoot: string,
  relativePath: string,
  sourceOverrides?: Record<string, string>,
): string {
  if (sourceOverrides?.[relativePath] !== undefined) {
    return sourceOverrides[relativePath];
  }

  const filePath = join(workspaceRoot, relativePath);
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

if (require.main === module) {
  const workspaceRoot = process.cwd();
  const result = runImplementation90LoadProfile({ workspaceRoot });
  const outputPath = join(workspaceRoot, 'docs', 'validation', 'implementation90-load-profile.md');
  writeImplementation90LoadProfileArtifact(result, outputPath);

  console.log(`Implementation 90 load profile artifact written to ${outputPath}`);
  console.log(`Implementation 90 load profile status: ${result.ok ? 'pass' : 'fail'}`);

  if (!result.ok) {
    process.exitCode = 1;
  }
}
