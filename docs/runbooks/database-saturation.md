# Database Saturation

Use this when API latency, PgBouncer saturation, or worker connection pressure breaches SLOs.

1. Check API p95/p99 by module, database pool saturation, and queue backlog dashboards.
2. Confirm PgBouncer is in transaction mode and API/worker connection budgets match production env.
3. Pause nonessential report exports and large SMS campaigns before school-day peak traffic.
4. Identify slow high-volume queries with query-plan review and verify cursor pagination is being used.
5. Scale API replicas or worker concurrency only within configured database connection budgets.
6. Record RTO/RPO impact if saturation affects backup restore, payment posting, or report-card generation.
