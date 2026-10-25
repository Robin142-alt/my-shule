# Student progression checklist

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

Local verification on 25 October 2026: 31 PostgreSQL scenarios, 195 focused frontend/navigation checks, 116 affected backend regression/policy checks; backend compilation, web typechecking and changed-file lint passed. Browser actions passed at 1440/768/390/320 pixels. The schema-only production snapshot accepted the additive migration twice and all six new tables enforce RLS. Broader backend run: 1,589 passed initially; its six failures were outdated transaction/lock mocks, corrected and covered by the 116 passing checks. CI and deployment remain to be verified.
