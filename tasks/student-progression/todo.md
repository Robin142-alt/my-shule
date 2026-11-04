# Student progression checklist

## November repair acceptance

- [x] Reproduce and safely reconcile enrollment/placement mismatch with immutable evidence and prevention at write paths.
- [x] Prepare and backfill complete reusable year structure; preserve overrides, expiry, identities and previous years.
- [x] Make notes optional consistently; preserve school policies and separate Principal approval.
- [x] Return truthful per-learner results for individual/bulk actions with retry/concurrency protection.
- [x] Verify automatic promotion, holds/repeaters, CBC/8-4-4 terminal grades and shared module projections.
- [x] Repair dependent selectors, status/count refresh and desktop/mobile workflows without redesign.
- [x] Verify independent term timetables and historical academic/financial records.
- [ ] Pass affected tests/types/builds and production release gates; deploy and record safe production evidence.

- [x] Inspect current production main, calendars, cohorts, admissions, roles, events, history and deployment conventions.
- [x] Define and test progression calendar/pathway policy and shared API contract.
- [x] Add tenant-scoped durable transition, decision and annual-run schema.
- [x] Implement atomic student placement, subject, hold/repeat, exit, reinstatement and correction commands with governance.
- [x] Implement safe destination preparation and resumable annual processing.
- [x] Connect periodic runtime and authenticated Run/Retry fallback.
- [x] Build and route shared Dean/Deputy/Principal progression workspace, timeline and exception controls.
- [x] Verify PostgreSQL histories, consistency, permissions, tenant boundaries, duplicate/race recovery and approvals.
- [x] Verify browser workflows, mobile usability and existing regressions.
- [ ] Review changes, deploy via existing pipeline and record observed production results.

Verification on 25 October 2026: 34 PostgreSQL scenarios, 195 focused frontend/navigation checks and 116 affected backend regression/policy checks passed locally; backend compilation, web typechecking and changed-file lint passed. Browser actions passed at 1440/768/390/320 pixels. The schema-only production snapshot accepted the additive migration twice and all six new tables enforce RLS. CI run 40209097023 passed all gates, including all 1,595 backend unit tests. The final date-boundary and private dashboard-refresh corrections passed all 34 PostgreSQL scenarios; their CI revision and production deployment remain to be verified.
