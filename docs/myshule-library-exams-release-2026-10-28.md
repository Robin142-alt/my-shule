# Library and class-specific exams — production release record

Status: release preparation in progress; nothing from this task has been deployed yet.

The user explicitly requested deployment on 28 October 2026 after implementation and local verification. Both master specifications remain mandatory. The implementation/evidence report is `myshule-library-exams-delivery-2026-10-28.md`.

## Targets and source integrity

- GitHub: `Robin142-alt/my-shule`, production branch `main`.
- Current fetched production source: `9af9d4617f9936f70753ff4b48fe0a07b295b12d` (shared syllabus planning and teacher coverage, PR #119).
- The shared working checkout is based on older `f75c9195` and contains substantial unrelated user work. Do not publish that working tree wholesale or overwrite newer production payment, progression, syllabus or authentication behavior.
- Managed release checkout: `C:\Users\user\.codex\worktrees\library-class-exams-release\Shule hub`, branch `codex/library-class-exams-release-2026-10-28`, based on the production source above. All merge conflict markers have been resolved; integration verification remains open.
- Railway project `b2d0da22-8e73-496e-a373-1d6ece7f89ea`, production environment `fd0e5b42-1ae9-41db-88ab-78183e02a5ce`. API service `62241841-a98c-4058-b0af-bae872ed4929`; report interactive service `93622f5e-8b1c-44fb-b6bb-d0076fcde185`; report bulk service `5abe2f0c-7bbd-476a-b77c-959937a09e36`. Existing Git-triggered publication is retained.
- Cloudflare Worker `myshule-web`, live domain `https://www.myshule.online`, verified artifact deployment through the existing GitHub pipeline.

## Release checklist

- [ ] Finish release-checkout lint and production build. Earlier browser/PDF and compiler evidence belongs to the original checkout and must not be represented as final release verification.
- [x] Prepare a scoped branch in the clean current-main checkout; integrate requested changes while retaining newer production architecture.
- [ ] Review the release diff and rerun relevant release-source checks. Extend existing CI with new regression coverage.
- [ ] Record current successful backend/worker/frontend versions for rollback.
- [ ] Verify the production database contract read-only and create/verify a private backup before additive schema rollout. Never publish credentials or school records in Git/logs.
- [ ] Create and attach a reviewable release PR; pass existing CI gates without bypassing checks.
- [ ] Merge the verified release and verify backend schema/readiness before frontend publication using the established deployment process.
- [ ] Confirm all required deployed revisions, public/Worker smoke checks, unsigned-request rejection, schema/RLS and error logs.
- [ ] Update consolidated acceptance, deployment evidence and remaining device/authenticated-workflow limitations.

## Rollback policy

Restore matching previous application artifacts or fix forward if health, authorization or data integrity regress. Preserve additive columns, mappings, barcode reservations and all subsequent school activity. Do not drop schema, rewrite historical marks/loans or restore a backup over new production transactions. Record concrete prior deployment identifiers before rollout.

No live school mutations, notifications or provider transactions are authorized merely as deployment test data. Use isolated fixtures for mutation acceptance and read-only production checks for existing records.

## Release integration evidence

- The production Smart Library service, global barcode registry, append-only circulation ledger, transactional command replay and projection remain authoritative. Registration selection, scan queue and Borrower Records changes now extend those existing components. Obsolete competing library endpoints and the old desk helper were not carried into this release.
- Exam roster changes extend the current shared roster used by progress, teacher entry, readiness and results. Current per-stream submission locks, flexible papers and governed correction workflows remain intact. Submitted sheets remain submitted when eligible blanks exist; missing counts stay visible and reopening uses the existing governed action.
- Backend build in this checkout completed with exit 0 (`.codex-release-api-build.log`). Subsequent integration fixes require another compiler pass.
- Initial disposable PostgreSQL run (`.codex-release-integration-1.log`): 1 suite passed, 3 failed; 42 tests passed, 18 failed. Exam setup passed. Failures identified duplicate merged visibility helpers, a missing academic-term fixture and a report test relying on unspecified loan ordering. Those fixture issues were corrected; rerun pending.
- Additional regression coverage now checks truthful loss notices, outstanding loss/recovery handling, and current selected-title counts after replaying an earlier registration. These additions are not yet recorded as passing.
- Frontend dependency installation is in progress. Release UI tests, browser/PDF verification, full build, CI, production backup/preflight and deployment remain outstanding.
- Frontend dependency installation subsequently completed successfully (1,080 packages, exit 0). A second database run is in progress; it exposed a batch-registration return-type annotation and remaining global-payload fixtures, now corrected. Teacher-suite default five-second timeouts caused unfinished fixture work; its fresh rerun will use a 60-second local test timeout with all assertions retained.
- Read-only production metadata preflight passed at `2026-10-28T17:06:20Z`: API and both report workers share the database; all 13 inspected academic/library tables have RLS enabled and forced; runtime role `shule_hub_runtime` is neither superuser nor RLS-bypassing. The three new exam configuration columns are not yet deployed.
- A private production backup was created at `2026-10-28T17:12:51Z`: 5,468,380 bytes, 5,079 archive entries, SHA-256 `ee44a8b9b2516d624ebb9100529857528de999fe9f887f8601de5226e9ab02e5`. The entire archive was read with `pg_restore` without connecting to a database; no restore or production mutation was performed. Credentials, archive and operator metadata remain outside the committed source.

## Prior backend deployments recorded before release

All four were successful at source revision `9af9d4617f9936f70753ff4b48fe0a07b295b12d` when inspected. Recheck before publication; these are rollback references, not this release's deployment evidence.

- API: `f3a26b9e-cf92-42dd-9e88-d76ac123e679`.
- Payments: `d203abc8-1a15-490f-b662-2720eea23d7f`.
- Reports bulk: `1042a575-15b4-474f-9aeb-a4ba10cebc9b`.
- Reports interactive: `35a80a52-ea8d-45b5-ba6f-506c28199a65`.
