# Implementation 30 Load Profile

Generated at: 2026-05-22T15:17:26.724Z

Status: pass

Schools: 1000
Students per school: 500
Parallel tenant batches: 50

## Checks

| Check | Status |
| --- | --- |
| Static load profile models 1000+ schools, 500+ students, M-Pesa bursts, and report-card generation budgets. | pass |
| Parallel-tenant report-card generation and M-Pesa reconciliation simulations meet P95 budgets. | pass |
| High-volume load profile covers dashboard, student, exams, and teacher mark-sheet read paths with P95 budgets. | pass |
| Query plan review covers protected high-volume tables and rejects sequential scans. | pass |
| Database migration defines high-volume partitions and tenant summary materialized views. | pass |
| Runtime config and env templates expose PgBouncer transaction pooling with API and worker connection budgets. | pass |
| Payments and report-export workers use bounded concurrency, retry attempts, exponential backoff, and retention limits. | pass |
| Tenant-aware cache service supports namespace invalidation through cursor scan backpressure. | pass |
| High-volume student directory list uses created-at/id keyset cursor pagination with no offset. | pass |
| Database service bypasses request-scoped transactions only for safe public read-only GET/HEAD queries. | pass |
| Module cache invalidation rules define tenant namespace eviction for students, billing, payments, and exams mutations. | pass |
| Parallel-tenant performance simulation covers report-card generation and M-Pesa reconciliation budgets. | pass |

## Query Budgets

| Budget | P95 ms | DB Round Trips | Rows/Page |
| --- | ---: | ---: | ---: |
| student-search | 500 | 2 | 50 |
| teacher-mark-sheets | 800 | 3 | 100 |
| exams-report-cards | 800 | 3 | 100 |
| mpesa-reconciliation-parallel-tenants | 1500 | 4 | 500 |
| report-card-generation | 2000 | 5 | 500 |
