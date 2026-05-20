import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IMPLEMENTATION30_LOAD_PROFILE,
  runImplementation30LoadProfile,
} from './implementation30-load-profile';

test('Implementation 30 load profile models 1000 schools with M-Pesa and report-card peak workloads', () => {
  assert.equal(IMPLEMENTATION30_LOAD_PROFILE.school_count, 1000);
  assert.equal(IMPLEMENTATION30_LOAD_PROFILE.students_per_school, 500);
  assert.ok(
    IMPLEMENTATION30_LOAD_PROFILE.school_day_workloads.some((workload) => workload.id === 'mpesa-callback-burst'),
  );
  assert.ok(
    IMPLEMENTATION30_LOAD_PROFILE.school_day_workloads.some((workload) => workload.id === 'report-card-generation'),
  );
  assert.ok(
    IMPLEMENTATION30_LOAD_PROFILE.query_budgets.some((budget) => budget.id === 'mpesa-reconciliation-parallel-tenants'),
  );
});

test('runImplementation30LoadProfile verifies query budgets, partitions, PgBouncer, cache invalidation, and worker backpressure evidence', () => {
  const result = runImplementation30LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/scripts/high-volume-workflow-load.ts': 'HIGH_VOLUME_WORKFLOW_LOADS targetP95Ms dashboard-summaries student-search exams-report-cards teacher-mark-sheets',
      'apps/api/src/scripts/query-plan-review.ts': 'QUERY_PLAN_REVIEWS protectedTables runQueryPlanReview Sequential scan LIMIT 25 LIMIT 50',
      'apps/api/src/database/migrations/001_partitioning_and_views.sql': 'PARTITION BY RANGE audit_logs_partitioned callback_logs_partitioned CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_payment_summary CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_student_summary',
      'apps/api/src/config/configuration.ts': 'DATABASE_API_MAX_CONNECTIONS DATABASE_WORKER_MAX_CONNECTIONS DATABASE_PGBOUNCER_MODE pgbouncer transaction maxConnections workerMaxConnections apiMaxConnections statementTimeoutMs',
      'apps/api/src/database/database.module.ts': 'database.apiMaxConnections database.workerMaxConnections database.pgBouncerMode app.runtime maxConnections statement_timeout',
      'apps/api/src/modules/payments/queue/payments-queue.processor.ts': '@Processor(PAYMENTS_QUEUE_NAME, { concurrency: 5 })',
      'apps/api/src/modules/payments/services/payments-job-producer.service.ts': 'attempts: 8 backoff type: exponential removeOnFail buildMpesaVerificationJobId',
      'apps/api/src/common/reports/report-export-queue.ts': 'shouldQueueReportExport DEFAULT_SYNC_EXPORT_ROW_LIMIT REPORT_EXPORT_JOB_OPTIONS attempts backoff estimated_rows',
      'apps/api/src/infrastructure/redis/redis-cache.service.ts': 'invalidateNamespace scan(cursor COUNT\', 100 KEY_PREFIX tenantId namespace',
      'apps/api/src/common/pagination/cursor-pagination.ts': 'decodeCreatedAtIdCursor base64url cursor',
      'apps/api/src/modules/students/repositories/students.repository.ts': 'decodeCreatedAtIdCursor cursor (created_at, id) < ORDER BY created_at DESC, id DESC',
      'apps/api/src/modules/students/dto/list-students-query.dto.ts': 'cursor',
      'apps/api/src/database/database.service.ts': 'isSafePublicReadOnlyRequestQuery READ_ONLY_SQL_PATTERN MUTATING_SQL_PATTERN context.tenant_id context.is_authenticated this.pool.query<T>(text, values)',
      'apps/api/src/common/cache/cache-invalidation-rules.ts': 'MODULE_CACHE_INVALIDATION_RULES student.created manual_fee_payment.posted mpesa.reconciliation.completed report_card.published tenant_namespace validateModuleCacheInvalidationRules',
      'apps/api/src/scripts/implementation30-load-profile.ts': 'IMPLEMENTATION30_PARALLEL_TENANT_PERFORMANCE_TESTS report-card-generation mpesa-reconciliation-parallel-tenants runParallelTenantPerformanceSimulation estimated_p95_ms target_p95_ms',
      '.env.production.example': 'DATABASE_API_MAX_CONNECTIONS=15 DATABASE_WORKER_MAX_CONNECTIONS=5 DATABASE_PGBOUNCER_MODE=transaction',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.checks.every((check) => check.status === 'pass'), true);
});

test('runImplementation30LoadProfile fails when PgBouncer budgets are missing', () => {
  const result = runImplementation30LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/scripts/high-volume-workflow-load.ts': 'HIGH_VOLUME_WORKFLOW_LOADS targetP95Ms dashboard-summaries student-search exams-report-cards teacher-mark-sheets',
      'apps/api/src/scripts/query-plan-review.ts': 'QUERY_PLAN_REVIEWS protectedTables runQueryPlanReview Sequential scan LIMIT 25 LIMIT 50',
      'apps/api/src/database/migrations/001_partitioning_and_views.sql': 'PARTITION BY RANGE audit_logs_partitioned callback_logs_partitioned CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_payment_summary CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_student_summary',
      'apps/api/src/config/configuration.ts': '',
      'apps/api/src/database/database.module.ts': '',
      'apps/api/src/modules/payments/queue/payments-queue.processor.ts': '@Processor(PAYMENTS_QUEUE_NAME, { concurrency: 5 })',
      'apps/api/src/modules/payments/services/payments-job-producer.service.ts': 'attempts: 8 backoff type: exponential removeOnFail buildMpesaVerificationJobId',
      'apps/api/src/common/reports/report-export-queue.ts': 'shouldQueueReportExport DEFAULT_SYNC_EXPORT_ROW_LIMIT REPORT_EXPORT_JOB_OPTIONS attempts backoff estimated_rows',
      'apps/api/src/infrastructure/redis/redis-cache.service.ts': 'invalidateNamespace scan(cursor COUNT\', 100 KEY_PREFIX tenantId namespace',
      'apps/api/src/common/pagination/cursor-pagination.ts': 'decodeCreatedAtIdCursor base64url cursor',
      'apps/api/src/modules/students/repositories/students.repository.ts': 'decodeCreatedAtIdCursor cursor (created_at, id) < ORDER BY created_at DESC, id DESC',
      'apps/api/src/modules/students/dto/list-students-query.dto.ts': 'cursor',
      'apps/api/src/database/database.service.ts': 'isSafePublicReadOnlyRequestQuery READ_ONLY_SQL_PATTERN MUTATING_SQL_PATTERN context.tenant_id context.is_authenticated this.pool.query<T>(text, values)',
      'apps/api/src/common/cache/cache-invalidation-rules.ts': 'MODULE_CACHE_INVALIDATION_RULES student.created manual_fee_payment.posted mpesa.reconciliation.completed report_card.published tenant_namespace validateModuleCacheInvalidationRules',
      'apps/api/src/scripts/implementation30-load-profile.ts': 'IMPLEMENTATION30_PARALLEL_TENANT_PERFORMANCE_TESTS report-card-generation mpesa-reconciliation-parallel-tenants runParallelTenantPerformanceSimulation estimated_p95_ms target_p95_ms',
      '.env.production.example': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(
    result.checks.some((check) => check.id === 'pgbouncer-connection-budgets' && check.status === 'fail'),
    true,
  );
});

test('runImplementation30LoadProfile fails without cursor pagination, read-only bypass, cache rules, and parallel-tenant performance evidence', () => {
  const result = runImplementation30LoadProfile({
    workspaceRoot: '/',
    generatedAt: '2026-05-20T00:00:00.000Z',
    sourceOverrides: {
      'apps/api/src/scripts/high-volume-workflow-load.ts': 'HIGH_VOLUME_WORKFLOW_LOADS targetP95Ms dashboard-summaries student-search exams-report-cards teacher-mark-sheets',
      'apps/api/src/scripts/query-plan-review.ts': 'QUERY_PLAN_REVIEWS protectedTables runQueryPlanReview Sequential scan LIMIT 25 LIMIT 50',
      'apps/api/src/database/migrations/001_partitioning_and_views.sql': 'PARTITION BY RANGE audit_logs_partitioned callback_logs_partitioned CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_payment_summary CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tenant_student_summary',
      'apps/api/src/config/configuration.ts': 'DATABASE_API_MAX_CONNECTIONS DATABASE_WORKER_MAX_CONNECTIONS DATABASE_PGBOUNCER_MODE pgbouncer transaction maxConnections workerMaxConnections apiMaxConnections statementTimeoutMs',
      'apps/api/src/database/database.module.ts': 'database.apiMaxConnections database.workerMaxConnections database.pgBouncerMode app.runtime maxConnections statement_timeout',
      'apps/api/src/modules/payments/queue/payments-queue.processor.ts': '@Processor(PAYMENTS_QUEUE_NAME, { concurrency: 5 })',
      'apps/api/src/modules/payments/services/payments-job-producer.service.ts': 'attempts: 8 backoff type: exponential removeOnFail buildMpesaVerificationJobId',
      'apps/api/src/common/reports/report-export-queue.ts': 'shouldQueueReportExport DEFAULT_SYNC_EXPORT_ROW_LIMIT REPORT_EXPORT_JOB_OPTIONS attempts backoff estimated_rows',
      'apps/api/src/infrastructure/redis/redis-cache.service.ts': 'invalidateNamespace scan(cursor COUNT\', 100 KEY_PREFIX tenantId namespace',
      '.env.production.example': 'DATABASE_API_MAX_CONNECTIONS=15 DATABASE_WORKER_MAX_CONNECTIONS=5 DATABASE_PGBOUNCER_MODE=transaction',
      'apps/api/src/common/cache/cache-invalidation-rules.ts': '',
      'apps/api/src/database/database.service.ts': '',
      'apps/api/src/modules/students/repositories/students.repository.ts': '',
      'apps/api/src/scripts/implementation30-load-profile.ts': '',
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.checks.some((check) => check.id === 'cursor-pagination-evidence' && check.status === 'fail'), true);
  assert.equal(result.checks.some((check) => check.id === 'read-only-request-bypass' && check.status === 'fail'), true);
  assert.equal(result.checks.some((check) => check.id === 'module-cache-invalidation-rules' && check.status === 'fail'), true);
  assert.equal(result.checks.some((check) => check.id === 'parallel-tenant-performance-tests' && check.status === 'fail'), true);
});
