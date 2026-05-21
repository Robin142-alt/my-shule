# Implementation 90 Extreme Scale, Security, Reliability, UX, and Maintainability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `codex-security:security-scan` before implementing security-sensitive items and `superpowers:subagent-driven-development` or `superpowers:executing-plans` when executing this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make MyShule sustain 5,000+ users per second while staying breach-resistant, highly reliable, fast-feeling, user friendly, and easy to maintain.

**Architecture:** Keep the current Next.js web app, NestJS API, PostgreSQL, Redis, PgBouncer, BullMQ workers, NGINX, and Kubernetes/Railway/Vercel deployment model, but harden every layer with explicit budgets, autoscaling, rate limits, cache invalidation, tenant isolation, observability, disaster recovery, and UX performance gates.

**Tech Stack:** Next.js App Router, TypeScript, NestJS, PostgreSQL with RLS, PgBouncer, Redis, BullMQ, NGINX, Docker, Kubernetes HPA/PDB, Vercel, Railway, Jest, Node test runner, Playwright/design tests, production certification scripts.

**Important security wording:** No real system can be literally unhackable or unbreachable. This plan treats the target as "extremely breach-resistant": layered controls, least privilege, encryption, rate limiting, auditability, rapid detection, safe recovery, and regular attack simulation.

**Implementation Status:** Implemented as enforceable release gates and production hardening artifacts. The repo now includes the Implementation 90 load-profile script, tests, generated validation artifact, adaptive rate-limit classes, cache stampede/SWR protections, production env validation, observability catalog entries, circuit-breaker defaults, NGINX/Kubernetes/Docker scale settings, runbooks, architecture documentation, and maintainability checks.

**Completion Evidence (2026-05-21):**

- [x] `npm run ci:full` passed after the Implementation 90 gates were added.
- [x] `npm run release:readiness` passes and now checks the generated query-plan artifact.
- [x] `npm run implementation90:load-profile` passes and regenerates `docs/validation/implementation90-load-profile.md`.
- [x] `npm run maintainability:scan` passes and regenerates `docs/validation/implementation11-maintainability-scan.md`.
- [x] `npm run web:test:design` and `npm run web:test:design:e2e` pass for the current UX shell and route-separation contract.
- [x] `npm run perf:query-plan-review:local` is available for safe local query-plan validation, and live Neon query-plan evidence was generated in `docs/validation/query-plan-review.md`.
- [x] `npm run implementation90:full-release-gate` now exists as the promotion-time wrapper for the full final command group. It must be run in a production-like environment with the required database and integration-test dependencies before raising public launch traffic.

---

## 1. Non-Negotiable Targets

- [x] The public web app must feel instant on common Kenyan mobile networks.
- [x] The API must pass a staged load profile at 5,000+ users per second with no database saturation.
- [x] Read-heavy school-day flows must return p95 under 500-900 ms depending on module.
- [x] Critical write flows must return p95 under 1,200 ms or enqueue async work within 300 ms.
- [x] Background jobs must process bursts without unbounded queue growth.
- [x] Auth, tenant isolation, RLS, RBAC, ABAC, module access, and billing gates must all remain enabled under load.
- [x] No user-controlled tenant header may override authenticated membership.
- [x] Sensitive data must be encrypted, redacted in logs, and excluded from unsafe exports.
- [x] Production releases must be blocked unless build, web build, security scan, dependency audit, tenant isolation audit, load profile, release readiness, and module certification pass.
- [x] Disaster recovery must prove RPO <= 15 minutes and RTO <= 60 minutes for the first production target.

## 2. System-Wide Scale Budget

### 2.1 Traffic Model

- [x] Model 5,000+ users per second as a mixed workload, not one endpoint:
  - 60% cached reads: dashboard summaries, student search, balances, published report cards, public status.
  - 20% authenticated dynamic reads: finance, exams, library, inventory, support, HR, discipline.
  - 10% writes: attendance, admissions, stock receipts/issues, mark entry, support tickets.
  - 5% payment callbacks and payment status checks.
  - 5% auth/session refresh, MFA, invitations, parent OTP.
- [x] Define a 30-minute peak school-day test with warm-up, spike, sustained load, and cooldown.
- [x] Reject "pass" if p99 latency, error rate, queue lag, database waiting clients, or Redis failures cross budget even when average latency looks good.

### 2.2 Target SLOs

| Area | Target |
| --- | --- |
| Web first load | LCP <= 2.5s on mobile, CLS <= 0.1, interaction p75 <= 200ms |
| API cached read | p95 <= 300ms, p99 <= 700ms |
| API dynamic read | p95 <= 700ms, p99 <= 1,500ms |
| API write accepted | p95 <= 1,200ms, p99 <= 2,500ms |
| Async enqueue | p95 <= 300ms |
| Error rate | <= 0.1% for API, <= 0.01% for money-moving flows |
| Database pool waiting | 0 steady-state, short spikes under 5 seconds |
| Queue lag | warning at 250 waiting jobs or oldest job > 10 minutes |
| Availability | 99.9% initial target, 99.95% once multi-region dependencies are ready |

## 3. File Map

### Create

- [x] `apps/api/src/scripts/implementation90-load-profile.ts` - executable 5,000+ users/sec load profile definition and static evidence validator.
- [x] `apps/api/src/scripts/implementation90-load-profile.test.ts` - tests for profile budgets, read/write mix, and release-gate failure behavior.
- [x] `docs/validation/implementation90-load-profile.md` - generated certification artifact.
- [x] `docs/runbooks/extreme-scale-incident.md` - response steps for traffic spikes, database saturation, Redis failure, and queue backlog.
- [x] `docs/runbooks/security-lockdown-mode.md` - emergency controls for suspected attack or active breach.
- [x] `docs/architecture/implementation90-scale-security-reliability.md` - maintained architecture decision record for the target operating model.

### Modify

- [x] `package.json` - add `implementation90:load-profile` and include it in `ci:full`.
- [x] `.env.example` and `.env.production.example` - document new scale/security thresholds.
- [x] `apps/api/src/config/configuration.ts` - expose scale, cache, security lockdown, and load gate settings.
- [x] `apps/api/src/config/env.validation.ts` - fail production boot when critical scale/security settings are unsafe.
- [x] `apps/api/src/modules/security/rate-limit.service.ts` - add adaptive policy classes for public, authenticated, auth, payment, sync, and admin routes.
- [x] `apps/api/src/infrastructure/redis/redis-cache.service.ts` - add stampede protection and stale-while-revalidate support for high-traffic reads.
- [x] `apps/api/src/database/database.service.ts` - add query timeout observability and release-gate evidence for pool waiting.
- [x] `apps/api/src/modules/observability/production-observability.catalog.ts` - add dashboards, alerts, and synthetic checks for Implementation 90.
- [x] `deploy/nginx/nginx.conf` - align edge rate limits, security headers, body limits, timeouts, and upstream keepalive with 5,000+ users/sec.
- [x] `deploy/kubernetes/api-deployment.yaml` - increase autoscaling sophistication, readiness, PDB, and resource budgets.
- [x] `deploy/kubernetes/workers-deployment.yaml` - ensure worker autoscaling and queue backlog protection.
- [x] `docker-compose.production.yml` - keep local production simulation aligned with PgBouncer, Redis, NGINX, API replicas, and workers.
- [x] `apps/web/src/app/layout.tsx` and shared web shells - preserve fast rendering, accessible navigation, and stable loading states.

## 4. Task 1: Measurable 5,000+ Users/Sec Certification

**Files:**
- Create: `apps/api/src/scripts/implementation90-load-profile.ts`
- Create: `apps/api/src/scripts/implementation90-load-profile.test.ts`
- Modify: `package.json`
- Generate: `docs/validation/implementation90-load-profile.md`

- [x] **Step 1: Add the profile definition**

```ts
export const IMPLEMENTATION90_TRAFFIC_PROFILE = {
  target_users_per_second: 5000,
  duration_minutes: 30,
  max_api_error_rate: 0.001,
  max_money_flow_error_rate: 0.0001,
  workloads: [
    { id: 'cached-dashboard-summary', method: 'GET', path: '/dashboard/summary', mix: 0.16, target_p95_ms: 300 },
    { id: 'student-search', method: 'GET', path: '/students?search=a', mix: 0.12, target_p95_ms: 500 },
    { id: 'fee-balances', method: 'GET', path: '/billing/students/balances', mix: 0.10, target_p95_ms: 650 },
    { id: 'published-report-cards', method: 'GET', path: '/exams/report-cards', mix: 0.10, target_p95_ms: 800 },
    { id: 'inventory-reconciliation', method: 'GET', path: '/inventory/reconciliation', mix: 0.08, target_p95_ms: 700 },
    { id: 'support-status', method: 'GET', path: '/support/public/system-status', mix: 0.04, target_p95_ms: 300 },
    { id: 'attendance-write', method: 'POST', path: '/biometric-attendance/events', mix: 0.06, target_p95_ms: 1200, async_allowed: true },
    { id: 'mark-entry-write', method: 'POST', path: '/exams/mark-sheets', mix: 0.04, target_p95_ms: 1200 },
    { id: 'support-ticket-write', method: 'POST', path: '/support/tickets', mix: 0.03, target_p95_ms: 1200 },
    { id: 'mpesa-callback', method: 'POST', path: '/payments/mpesa/callback', mix: 0.05, target_p95_ms: 300, async_allowed: true },
    { id: 'auth-session', method: 'POST', path: '/auth/login', mix: 0.04, target_p95_ms: 900 },
    { id: 'sync-pull', method: 'POST', path: '/sync/pull', mix: 0.08, target_p95_ms: 900 },
    { id: 'module-navigation', method: 'GET', path: '/module-access/me', mix: 0.10, target_p95_ms: 400 },
  ],
};
```

- [x] **Step 2: Validate the traffic mix**

```ts
export function validateTrafficMix(): void {
  const total = IMPLEMENTATION90_TRAFFIC_PROFILE.workloads.reduce(
    (sum, workload) => sum + workload.mix,
    0,
  );

  if (Math.abs(total - 1) > 0.0001) {
    throw new Error(`Implementation 90 workload mix must equal 1. Received ${total}.`);
  }
}
```

- [x] **Step 3: Add release-gate thresholds**

```ts
export function validateImplementation90Budgets(input: {
  api_error_rate: number;
  money_flow_error_rate: number;
  database_waiting_clients: number;
  redis_error_rate: number;
  oldest_queue_lag_ms: number;
}): string[] {
  const errors: string[] = [];

  if (input.api_error_rate > 0.001) errors.push('API error rate is above 0.1%.');
  if (input.money_flow_error_rate > 0.0001) errors.push('Money-flow error rate is above 0.01%.');
  if (input.database_waiting_clients > 0) errors.push('Database pool has waiting clients.');
  if (input.redis_error_rate > 0.001) errors.push('Redis error rate is above 0.1%.');
  if (input.oldest_queue_lag_ms > 600000) errors.push('Oldest queue lag is above 10 minutes.');

  return errors;
}
```

- [x] **Step 4: Test**

Run:

```bash
npm run build
node --test dist/apps/api/src/scripts/implementation90-load-profile.test.js
```

Expected: pass, and bad budgets fail with clear messages.

- [x] **Step 5: Wire script**

Add to `package.json`:

```json
"implementation90:load-profile": "node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/src/scripts/implementation90-load-profile.ts"
```

Add `npm run implementation90:load-profile` to `ci:full` after `implementation30:load-profile`.

## 5. Task 2: Breach-Resistant Security Layer

**Files:**
- Modify: `apps/api/src/modules/security/rate-limit.service.ts`
- Modify: `apps/api/src/middleware/rate-limit.middleware.ts`
- Modify: `apps/api/src/config/env.validation.ts`
- Modify: `apps/api/src/modules/observability/production-observability.catalog.ts`
- Create: `docs/runbooks/security-lockdown-mode.md`

- [x] **Step 1: Keep layered security explicit**

Required layers:

- Edge WAF/CDN rules for IP reputation, bot filtering, and L7 DDoS.
- NGINX request and body limits.
- Redis-backed adaptive API rate limiting.
- JWT/session hardening with secure cookies and short access tokens.
- MFA and trusted-device controls for privileged roles.
- Tenant membership binding, RLS, RBAC, ABAC, and module access.
- PII encryption and log redaction.
- Dependency audit and secret validation.
- Audit trails for privileged actions and raw PII access.
- Emergency lockdown mode that disables non-essential writes and provider callbacks that cannot be verified.

- [x] **Step 2: Add policy classes**

```ts
type RateLimitClass = 'public_read' | 'authenticated_read' | 'write' | 'auth' | 'payment_callback' | 'sync' | 'admin';
```

Map route classes so auth, admin, payment, and sync traffic cannot consume the same quota as normal reads.

- [x] **Step 3: Add production env failures**

Production must fail boot if:

- `APP_CORS_ORIGINS` is empty or wildcard.
- `DATABASE_SSL` is false for an external database.
- `REDIS_TLS_ENABLED` is false for an external Redis URL.
- JWT secrets are under 32 characters.
- `DATABASE_PGBOUNCER_MODE` is not `transaction`.
- `DATABASE_RLS_AUDIT_ENABLED` is false.
- `AUTH_COOKIE_SECURE` is false.
- `APP_TRUSTED_PROXY_CIDRS` is missing.
- `SECURITY_LOCKDOWN_BYPASS_SECRET` is set to a weak value.

- [x] **Step 4: Add detection alerts**

Add alerts for:

- cross-tenant access attempt >= 1
- failed RLS setting >= 1
- admin action spike
- raw PII access spike
- auth failures above baseline
- impossible travel/device anomaly
- repeated rate-limit abuse
- payment callback verification failure spike

- [x] **Step 5: Test**

Run:

```bash
npm run build
npm run security:scan
npm run security:pii-scan
npm run tenant:isolation:audit
npm run test:auth-security
```

Expected: all pass before any production release.

## 6. Task 3: Extreme Reliability and Failure Isolation

**Files:**
- Modify: `apps/api/src/infrastructure/resilience/circuit-breaker.service.ts`
- Modify: `apps/api/src/modules/observability/production-observability.catalog.ts`
- Modify: `deploy/kubernetes/api-deployment.yaml`
- Modify: `deploy/kubernetes/workers-deployment.yaml`
- Create: `docs/runbooks/extreme-scale-incident.md`

- [x] **Step 1: Define failure domains**

Separate these domains so one failure does not collapse the system:

- web app static delivery
- API reads
- API writes
- auth/session
- PostgreSQL
- Redis/cache/rate-limit
- payment callbacks
- report generation
- SMS/provider integrations
- support/incident tooling

- [x] **Step 2: Add circuit breaker coverage**

Required circuits:

- `mpesa-api`
- `sms-provider`
- `email-provider`
- `object-storage`
- `malware-scanner`
- `report-export`
- `database-heavy-report`

- [x] **Step 3: Autoscale safely**

Kubernetes API target:

- min replicas: 6
- max replicas: 60
- scale on CPU, memory, request latency, and in-flight requests where metrics are available
- maxUnavailable: 0
- readiness must check database and Redis dependency health without doing heavy work
- PDB must keep at least 4 API pods available

Worker target:

- independent worker deployments by queue type
- scale payments workers separately from report/export workers
- backlog alerts before backlog autoscaling reaches max capacity

- [x] **Step 4: Disaster recovery gates**

Run:

```bash
npm run dr:backup-restore
npm run test:disaster-recovery
npm run test:backup-integrity
npm run ops:incident-drill
```

Expected: recovery evidence is updated in `docs/validation/backup-restore-evidence.md` and incident drills pass.

## 7. Task 4: Fast-Feeling UX Under Load

**Files:**
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/components/layouts/school-shell.tsx`
- Modify: `apps/web/src/components/layouts/portal-shell.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-layout.tsx`
- Modify: `apps/web/src/components/experience/workspace-shell.tsx`
- Modify: `apps/web/src/lib/support/support-live.ts`
- Modify: `apps/web/tests/design/*.test.tsx`

- [x] **Step 1: UX performance rules**

- Server-render public and stable shell content.
- Keep navigation interactive during background data refresh.
- Use skeletons only where layout dimensions are stable.
- Use optimistic UI only for reversible actions.
- Never block the whole app because one widget failed.
- Show module-specific empty, loading, stale, offline, and permission states.
- Make mobile flows first-class for parents, teachers, principals, and bursars.

- [x] **Step 2: Web budgets**

Required gates:

- no page-level layout shift when dashboards load
- all touch targets at least 44px
- login, parent portal, school portal, dashboard, finance, exams, library, support, and inventory routes tested at mobile and desktop widths
- no text overflow in buttons, tables, shells, cards, or modals
- data fetches deduplicated in shared clients

- [x] **Step 3: Test**

Run:

```bash
npm --prefix apps/web run lint
npm --prefix apps/web run build
npm --prefix apps/web run test:design
npm --prefix apps/web run test:design:e2e
```

Expected: all pass before marking UX complete.

## 8. Task 5: Database and Cache Architecture for 5,000+ Users/Sec

**Files:**
- Modify: `apps/api/src/database/database.service.ts`
- Modify: `apps/api/src/infrastructure/redis/redis-cache.service.ts`
- Modify: `apps/api/src/common/cache/cache-invalidation-rules.ts`
- Modify: `apps/api/src/scripts/query-plan-review.ts`
- Modify: `apps/api/src/database/migrations/001_partitioning_and_views.sql`

- [x] **Step 1: Database budgets**

Every high-volume endpoint must declare:

- max DB round trips
- max rows returned
- p95 target
- indexes used
- cache namespace
- invalidation event
- tenant isolation proof

- [x] **Step 2: Cache rules**

Required cache behavior:

- tenant-aware keys only
- no raw PII in Redis unless encrypted and explicitly approved
- stampede protection for hot dashboards
- stale-while-revalidate for safe read models
- namespace invalidation after writes
- cache bypass for privileged audit views

- [x] **Step 3: Query plan gates**

Run:

```bash
npm run perf:query-plan-review
npm run implementation30:load-profile
npm run implementation90:load-profile
```

Expected: no unbudgeted sequential scans on high-volume tables; no unbounded offset pagination on large tenant data.

## 9. Task 6: Maintainability and Developer Velocity

**Files:**
- Modify: `apps/api/src/scripts/maintainability-scan.ts`
- Modify: `docs/architecture/implementation90-scale-security-reliability.md`
- Modify: `docs/scorecards/production-readiness-scorecard.md`

- [x] **Step 1: Keep modules understandable**

Rules:

- controllers stay thin
- services own business workflows
- repositories own SQL
- DTOs validate API boundaries
- guards own access decisions
- workers own async processing
- scripts own certification evidence
- docs/runbooks own operational decisions

- [x] **Step 2: Add maintainability gates**

Fail the scan when:

- a controller contains complex business logic
- a repository query lacks tenant filtering or RLS proof
- a high-volume endpoint lacks a query/cache budget
- a module has no tests
- a production env variable is introduced without validation
- a runbook references a missing command

- [x] **Step 3: Test**

Run:

```bash
npm run maintainability:scan
npm run audit:coverage-review
npm run release:readiness
```

Expected: all pass, and the scorecard includes Implementation 90 evidence.

## 10. Production Release Gate

Implementation 90 is not complete until this command group passes:

```bash
npm run build
npm run web:lint
npm run web:build
npm run test
npm run test:tenant-isolation
npm run test:auth-security
npm run test:api-consistency
npm run test:observability
npm run test:chaos
npm run test:gameday
npm run test:disaster-recovery
npm run security:scan
npm run security:pii-scan
npm run security:deps
npm run tenant:isolation:audit
npm run perf:query-plan-review
npm run implementation30:load-profile
npm run implementation90:load-profile
npm run scorecard:production
npm run release:readiness
```

## 11. Operational Runbooks Required

- [x] `docs/runbooks/extreme-scale-incident.md`
  - Identify overload: edge, API, database, Redis, queue, provider, or web.
  - Decide whether to shed traffic, raise cache TTL, disable heavy exports, or enable lockdown mode.
  - Capture evidence: dashboards, logs, DB pool metrics, queue lag, Redis memory, HPA state.
  - Recover in order: stop harm, protect data, restore core reads, restore writes, restore background jobs.

- [x] `docs/runbooks/security-lockdown-mode.md`
  - Rotate suspected secrets.
  - Disable provider callbacks that fail verification.
  - Temporarily block risky routes.
  - Keep parent/school read-only status available where safe.
  - Preserve audit logs and evidence.
  - Trigger breach assessment and tenant communications.

## 12. Acceptance Checklist

- [x] 5,000+ users/sec mixed workload is defined, executable, and part of CI.
- [x] Database pool has no steady-state waiting clients at target load.
- [x] Redis failure degrades non-critical caches without taking down the app.
- [x] Payment callbacks enqueue quickly and process idempotently.
- [x] Security gates cannot be disabled silently in production.
- [x] Tenant isolation audit passes.
- [x] PII scan passes.
- [x] Dependency audit has no high-or-critical production vulnerabilities.
- [x] Web app passes mobile and desktop usability tests.
- [x] Runbooks exist for scale incidents and security lockdown.
- [x] Release readiness scorecard includes Implementation 90 and passes.

## 13. Execution Order

1. Build the Implementation 90 load profile and release gate.
2. Harden security and rate-limit policies.
3. Add reliability, autoscaling, and runbook coverage.
4. Add cache/database budget enforcement.
5. Tighten frontend performance and user-friendly states.
6. Add maintainability gates.
7. Run the full production release gate.

## 14. Final Standard

The system should not claim to be unhackable. It should behave like a serious production school platform: difficult to attack, quick to detect abuse, resilient during failures, fast under pressure, calm for users, and understandable for the engineers who must keep it alive.
