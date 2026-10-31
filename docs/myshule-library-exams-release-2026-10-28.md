# Library and class-specific exams — production release record

Status: production deployment and automated/read-only verification completed on 29 October 2026. Final acceptance and explicit live-session/device limits: `myshule-library-exams-final-acceptance-2026-10-29.md`. The dated entries below retain earlier evidence.

The user explicitly requested deployment on 28 October 2026 after implementation and local verification. Both master specifications remain mandatory. The implementation/evidence report is `myshule-library-exams-delivery-2026-10-28.md`.

## Targets and source integrity

- GitHub: `Robin142-alt/my-shule`, production branch `main`.
- Current fetched production source: `9af9d4617f9936f70753ff4b48fe0a07b295b12d` (shared syllabus planning and teacher coverage, PR #119).
- The shared working checkout is based on older `f75c9195` and contains substantial unrelated user work. Do not publish that working tree wholesale or overwrite newer production payment, progression, syllabus or authentication behavior.
- Managed release checkout: `C:\Users\user\.codex\worktrees\library-class-exams-release\Shule hub`, branch `codex/library-class-exams-release-2026-10-28`, based on the production source above. All merge conflict markers have been resolved; integration verification remains open.
- Railway project `b2d0da22-8e73-496e-a373-1d6ece7f89ea`, production environment `fd0e5b42-1ae9-41db-88ab-78183e02a5ce`. API service `62241841-a98c-4058-b0af-bae872ed4929`; report interactive service `93622f5e-8b1c-44fb-b6bb-d0076fcde185`; report bulk service `5abe2f0c-7bbd-476a-b77c-959937a09e36`. Existing Git-triggered publication is retained.
- Cloudflare Worker `myshule-web`, live domain `https://www.myshule.online`, verified artifact deployment through the existing GitHub pipeline.

## Release checklist

- [x] Finish release-checkout lint and production build; release-specific browser/PDF and compiler evidence recorded separately from original-checkout evidence.
- [x] Prepare a scoped branch in the clean current-main checkout; integrate requested changes while retaining newer production architecture.
- [x] Review the release diff and rerun relevant release-source checks. Extend existing CI with new regression coverage.
- [x] Record current successful backend/worker/frontend versions for rollback.
- [x] Verify the production database contract read-only and create/verify a private backup before additive schema rollout. Never publish credentials or school records in Git/logs.
- [x] Create and attach release PR #120; all PR checks passed without bypasses at 77a1535d.
- [x] Merge the verified release and verify backend schema/readiness before frontend publication using the established deployment process.
- [x] Confirm all required deployed revisions, public/Worker smoke checks, unsigned-request rejection, schema/RLS and error logs.
- [x] Update consolidated acceptance, deployment evidence and remaining device/authenticated-workflow limitations.

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
- Cloudflare Worker version: `8d90389f-29e0-499d-81c1-0b79ad4e3cbe`, recorded in successful main workflow `40523237177`, deployment job `122275713734`. Recheck before publication.

## Current-main verification continuation

- Draft PR [#120](https://github.com/Robin142-alt/my-shule/pull/120) contains the scoped keyboard, examination, library and CI/evidence commits. It is attached to the task. No merge or deployment yet.
- Frontend TypeScript passed with exit 0. Initial release UI batch: 103 passed, 3 failed. Failures were stale assertions for newest-first payload ordering, unknown-outcome retries, and locked read-only markbook retrieval. Corrected assertions retain exact transaction identity and disabled-write checks. Fresh rerun: **3 suites / 77 tests passed**, 104.064 seconds (`.codex-release-web-retest.log`).
- First PR pipeline `40749503435`: Cloudflare production build, workerd verification, security audit and CodeQL passed. Quality stopped on an internal-link lint error in a new test. The test now uses the existing Next Link component; all quality gates are rerunning.
- The restarted disposable database run exposed a report-readiness fixture missing production mark identity/score columns. The fixture now models those columns and explicitly seeds its entered score. No production query or assertion was relaxed. Final integration result and fixture rerun remain pending.
- Earlier interrupted run `.codex-release-integration-3.log` has no completion result and is excluded from passing totals.
- Disposable integration run 4: **4 suites passed / 1 failed, 126 tests passed / 1 failed**, 234.903 seconds. The sole failure was the missing fixture columns described above. Corrected readiness rerun: **9/9 passed**, 183.28 seconds (`.codex-release-readiness-final.log`).
- Release browser fixtures: exam configuration passed at 320/390/768/1440px; keyboard passed at 375/1280px; library passed at 390/1440px after correcting its desktop preview height to fit the current shared modal. Registration, 56-copy queue, loss recording, 300-row preview and actual print invocation passed with zero console errors. Mobile exam/issue/keyboard and desktop preview screenshots were visually inspected.
- Release PDF checks: all **8 variants passed** (`.codex-release-pdf-verification.log`), including empty/3/60/300-copy reports, individual/class/school scopes, portrait/landscape and logo fallback. The 300-copy report has 27 A4 pages and exactly 300 distinct copy identifiers; no row-free trailing page. The full contact sheet, final page and logo variant were visually inspected.
- API build (Prisma generation + TypeScript) passed with exit 0 after all backend corrections (`.codex-release-api-build-2.log`).
- Production browser baseline: public homepage loaded; Dashboard navigated to `/legal/accept`. No agreement was accepted. Further interactive browser inspection became unavailable when browser control was disabled in Work settings. Isolated automated browser evidence above remains separate from live authenticated acceptance.

## CI continuation — 29 October 2026

- PR revision `401ccee2acbf1dcbbb41bb4eaacbb3e07c86bf19`, run `40759405967`: frontend quality (lint, configured component and browser regressions), production Cloudflare build/workerd smoke, and security audit passed. Backend unit stage ran 1,602 tests: 1,593 passed and nine failed. Subsequent backend/integration/deployment stages did not run; this is not a green release.
- The nine failures used obsolete global-subject payloads, omitted configuration versions/permission context, expected the old Cartesian windows, or counted seven dropdown queries before class offerings were added. Updated fixtures assert exact per-class pairs, preserved window status, version increments, tenant filtering and audit events. A public entry-point regression checks all three write operations reject missing permission before any transaction. Verification is pending.
- Local module-keyboard batch: six suites passed, with two admissions tests exceeding the default five-second timeout on this machine (39 passed, two failed). Admissions subsequently passed in the complete CI quality job. A redundant isolated local rerun was stopped while stalled before results; it is excluded from passing evidence.

- Revision `2c271c9d`, run `40774611490`: full frontend quality, production Worker build, security and CodeQL passed. Backend unit and all integration stages through exam setup/visibility/progress passed. Report generation passed (100 real seven-subject PDFs, 12.524 seconds). Readiness had one five-second timeout in its 56-exam/duplicate-enrollment case; combined report run: 35 passed, one timeout. This same case previously passed in the 60-second local readiness run. Give only this large unindexed-fixture test an explicit 60-second timeout, retaining every row and assertion. Remaining CI rerun is required.
- Focused affected exam-service rerun completed **13/13 passed** (`.codex-release-exam-unit-focus.log`). No production implementation was changed for the fixture corrections.

## Production rollout — 29 October 2026

- PR CI run `40778510709` passed in full. Backend logs contain 2,274 Node test executions (including the core 1,603) and 556 Jest integration test executions across 38 suite executions. Repeated workflow gates mean these are execution totals, not unique cases. The scoped readiness rerun also passed locally: 9/9, 290.021 seconds including startup.
- Refreshed private backup: `2026-10-28T22:30:44.232Z` (29 October 01:30 EAT), 5,469,306 bytes, 5,079 entries; full archive-read verification passed. SHA-256 `5349336a62b6d59d8f8a87d3bf927adc9e509d514453feda63389dfcd8825d44`. Earlier archive preserved.
- Merged PR #120 on 29 October at 10:02 EAT. Merge `19c7ea4abcd5b4bd0e93712b3c67829ce9bcb073` has the exact tested candidate tree. Main pipeline `40832937008` is in progress; no gate bypassed.
- All four Railway services deployed successfully at the merge revision: API `885df653-df00-4fb2-9d1d-2b95e313d75f`; payments `779696b8-0c61-4960-9113-76b2d9016b79`; reports bulk `2ea312e5-c95a-425d-b65c-cfcd9029ed57`; reports interactive `4c47f174-2b37-4f5c-b385-da712fe36124`.
- Operator read-only postflight passed (`.codex-release-postflight.json`): all three added columns present, 17 enabled guards with the new stream/timetable logic, forced RLS on all 13 inspected tables, runtime role without superuser/bypass, shared worker database, signed gateway acceptance and forged rejection. `/health` and `/health/ready` returned 200; unsigned exam setup and library catalogue returned 401.
- Bounded startup/live logs from all four deployments show successful startup with no error-level entries in the inspected samples. No production test mutations or legal acceptance were performed.
- Remaining: main-branch-only integration gates, Cloudflare artifact publication/version and live domain smoke, final consolidated report. Current report: `output/library-exams-release-acceptance.md`.

- Main pipeline `40832937008` passed frontend quality, Cloudflare build, security, and the complete backend build/unit/workflow integration job. Main-only integration and container publication are running; frontend publication remains gated on main integration.

## Final release outcome

Production run `40832937008` succeeded, including main-only integrations and container publication. Cloudflare deployed `b04a3f20-3df0-40ce-9103-ec942d5cf8e5` on 29 October at 10:26 EAT. Its CI smoke tests and independent follow-up smoke tests passed on the public domain and workers.dev host. Four exam/library anonymous probes returned 401 with private/no-store caching at 10:28 EAT. Main-only integration added 59 passing tests; the final 100-card real PDF benchmark took 8.085 seconds. The optional deploy-railway workflow job was skipped by its existing condition; Railway Git deployment independently succeeded for all four services.

Final evidence is consolidated in `myshule-library-exams-final-acceptance-2026-10-29.md` and `output/library-exams-release-acceptance.md`. No pending deployment step remains. Live authenticated school acceptance, physical scanner/printer and assistive-technology verification are not claimed; existing ambiguous exam mappings require school review. Production code remains revision `19c7ea4a`; subsequent documentation updates do not change runtime artifacts.
