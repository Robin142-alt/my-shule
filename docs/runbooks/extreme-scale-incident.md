# Extreme Scale Incident Runbook

Use this runbook when traffic, queue backlog, Redis degradation, database saturation, or provider latency threatens the Implementation 90 budgets.

## Trigger Signals

- API p95 or p99 breaches the Implementation 90 load profile for more than 5 minutes.
- `database.pool.waiting_clients` is greater than 0 outside a short spike.
- Redis degradation produces cache errors or rate-limit errors above 0.1%.
- Queue backlog exceeds 250 waiting jobs or the oldest waiting job is older than 10 minutes.
- HPA reaches max replicas while request latency or queue lag keeps rising.

## First 5 Minutes

1. Declare the incident and name the primary failure domain: edge, API, database, Redis, queue, provider, or web.
2. Capture evidence from dashboards, API logs, database pool metrics, Redis memory, queue lag, HPA state, and deployment events.
3. Check whether the spike is legitimate school traffic, a bot flood, a provider retry storm, or a release regression.
4. Stop harm before optimizing: protect tenant isolation, payment integrity, auth, and audit logs.

## Traffic Controls

- Raise cache TTL only for safe read models such as public status, dashboard summaries, published report cards, and read-only balances.
- Shed non-essential exports, analytics, report generation, and provider retries before degrading login, payment callbacks, or core school reads.
- Keep parent/school read-only views available where data is safe and cached.
- If abuse is confirmed, tighten edge WAF and NGINX rate limits for the abusive class.
- If security risk is active, move to lockdown mode and follow `docs/runbooks/security-lockdown-mode.md`.

## Database Saturation

1. Inspect PgBouncer active, idle, waiting, and server connection counts.
2. Identify slow query fingerprints from `db.query.completed` and `database.query.timeout`.
3. Disable or queue heavy reports and exports.
4. Increase API replicas only if PgBouncer and Postgres still have capacity.
5. Prefer cache TTL increases and query-budget fixes over raising database connections.

## Redis Degradation

1. Confirm whether Redis is unavailable, slow, memory-constrained, or evicting aggressively.
2. Verify rate limiting still fails closed for auth/admin/payment abuse paths.
3. Allow non-critical cache reads to degrade to database only within database budget.
4. Disable cache stampede-prone dashboards if Redis is unavailable and database waiting clients appear.

## Queue Backlog

1. Identify the queue: payments, events, report exports, SMS, or support notifications.
2. Scale the specific worker deployment rather than all workers.
3. Pause low-priority report exports before payment verification or incident notifications.
4. Review oldest job age, failed job rate, retry loops, and provider circuit state.

## Recovery Order

1. Stop unsafe writes or abusive traffic.
2. Restore core authenticated reads.
3. Restore payment callback intake and idempotent processing.
4. Restore normal writes.
5. Drain queues.
6. Re-enable heavy reports and exports.
7. Publish post-incident evidence and actions.
