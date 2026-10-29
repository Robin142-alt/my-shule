# Library workstream progress

Status: in progress, not ready or deployed.

## 2026-10-28 backend continuation

- The original expanded disposable PostgreSQL desk suite completed **7/7 PASS**, 74.829 seconds; evidence `.codex-library-desk-integration.log`. This covers registration/global barcode uniqueness, exact retry, batch rollback/limits/event failure, outstanding/history school scope, return replay, competing batch requests and actual RLS.
- Main agent now owns all web, PDF and browser work. This agent owns library backend service/module/repository/tests only.
- Parent unified command-center single/department issues onto `issueBatch`, and wrapped its legacy return with a copy lock and event. These latest changes were not yet included in the 7-test result.
- Audit found core `LibraryService.issueCopy/issueByScan` still bypassed batch borrower limits and used separate copy/ledger writes. Core returns accepted stale loan IDs and had non-atomic copy/fine/ledger writes.
- Added four real database regression cases before fixing those routes: failed legacy issue ledger rollback; competing legacy scan/batch borrower limit; stale return after reissue and return-ledger rollback; unresolved lost loan remains outstanding and blocks new issue until recovered.
- The attempted RED run `.codex-library-legacy-red.log` was **aborted without a test result** at main agent request because simultaneous Jest/compiler checks caused severe memory paging. Ctrl+C completed runner session 75372 with exit 1. Do not count it as RED or GREEN evidence.
- Implemented `library-issue-workflow.ts`: one issue command now used by both service facades. Existing core `issues` and scanner `circulation/issue` preserve `{id,status}` responses and accept an optional retry key. They now share all validation, transactions, copy locks, person-level borrower locks, limits, events and audit writes. Person-level counting protects legacy duplicate memberships from bypassing limits.
- `LibraryService.returnCopy/returnByScan` now perform copy lock, active-loan recheck, copy update, ledger, workflow/audit, fine, existing billing handoff and fine notifications in one request transaction. A stale loan cannot release a reissued copy. Good-condition recovery of lost copies clears outstanding; lost declarations alone remain outstanding and count against limits.
- `LibraryRepository` provides read-only scan lookup for issue resolution (avoids locking a copy before the shared borrower lock). Return lookup retains `FOR UPDATE`; active-loan query rejects older reissued loans and ignores lost declarations until a real return.
- Command return retains lost/damaged fines, with resolved borrower/copy IDs passed to the existing fine flow; repeating a lost declaration is rejected instead of creating a duplicate fine.
- Barcode registry now also has RLS with no runtime policies: blanket table grants cannot reveal other schools' reserved codes; only the owning security-definer trigger can reserve them. Updated the real RLS regression to grant runtime SELECT/INSERT and verify no reads/direct writes.
- Unit adapters updated to verify shared command propagation and preserved scanner inputs, billing handoff and exact borrower notifications. Integration desk suite now has **11 cases, not yet run on these latest changes**.
- `git diff --check` scoped to library files passed (only CRLF notices). No compiler, lint or runtime result is claimed for these final backend edits yet.
- Main agent will run consolidated sequential verification: `apps/api/test/library-desk.integration-spec.ts`, `apps/api/test/librarian-reports.integration-spec.ts`; Node tests `apps/api/src/modules/library/library.test.ts` and `apps/api/src/modules/admin-command/librarian-reports.test.ts`, plus API build.

### Final integrity follow-up

- Main confirmed central PostgreSQL batch passed **145 tests across 8 suites**, including all **11 desk tests** and librarian reports. This was before the two follow-up changes below.
- Canonical borrower reports now scope an individual membership to the same school/person/type and group all legacy memberships using one deterministic membership ID. This preserves every ledger row and avoids partial individual reports or duplicate student totals. Added one DB regression asserting both individual selections include both loans, whole-school student total increases by one, and original ledger borrower IDs remain unchanged.
- `deleteBook` now locks title and copies in one transaction and rejects any circulation history, including returned copies and title-based reservation records. It still deletes unused titles and emits workflow/audit evidence. Registration holds a title `FOR SHARE` lock, coordinating with deletion's `FOR UPDATE` so concurrent registration cannot orphan copies. Added one DB regression for returned-history preservation plus successful unused-title deletion.
- Desk suite now **13 cases**; those two follow-ups await the coordinator's focused rerun. No heavyweight runs started by this agent.
- Read-only permission audit: new write routes explicitly require `library:write`; lookups/options inherit `library:read`; report explicitly requires `library:read`. Existing class module guard and global JWT/RBAC/ABAC/module guards remain enforced.
- Read-only portal audit: active `PortalPages` routes have no library section, and parent/student services do not query either `library_loans` or `library_circulation_ledger`. Unreferenced older parent command-center components contain static library demo copy. No new parent/student read-path regression was found; live portal library visibility was already absent. Existing `/library/summary` mixes obsolete `library_loans` and ledger counts in `LibraryRepository.buildSummary` (reported to coordinator; not edited).
- Reported existing source-based certification check in `scripts/module-certification.ts:87` to coordinator: availability enforcement now lives in `library-issue-workflow.ts`, so the check must follow the shared implementation rather than require old service error text.

The older notes below describe prior milestones and are superseded by this continuation where they conflict.

Read both complete user specs, root/web AGENTS and Next client component guide. Actual existing library code does NOT match reported UI: active command-center IssueBooksWorkspace uses fake Sample Book Scanned and incompatible request; add_books and borrowers are generic tables. Separate live-role components exist and will be reused to avoid competing workflows.

Changes so far:
- apps/api/src/modules/admin-command/librarian-command.service.ts: lookupCopy, registerCopy, createTitle, issueBorrowers, atomic issueBatch with idempotency key/fingerprint/borrower+copy locks+limits/eligibility/events/audits; borrowerReport outstanding/history full database rows with group fields and totals. Existing methods preserved.
- librarian-command.controller.ts exposes copies/lookup, copies, titles, issue-borrowers, issue-batch, borrowers/report under existing library read/write permissions.
- library-schema.service.ts: global barcode reservation table (no tenant data) and trigger to prevent new cross-school duplicate registration; historical codes reserved without rewriting records.
- apps/api/test/library-desk.integration-spec.ts disposable PostgreSQL suite. Initial RED missing methods confirmed. Second run ongoing session 74307 (may not persist child restart).
- apps/web/src/components/school/librarian/issue-book-workspace.tsx replaced with real borrower search, serial scan lookups, newest first queue, duplicate guard, top confirmation, borrower switch safeguard and retry key. Needs tests/fixes: API failures currently all lock retry (must allow confirmed 4xx repair); confirm helper status error interface.
- books-workspace.tsx replaced with pinned selection above paginated catalogue, actual copy registration, create title, keyboard helper. Needs verify useSchoolQuery refetch return type.

Remaining:
1. Complete borrower print renderer and UI; authenticated logo route /api/school/identity/logo; A4 HTML with full records grouped per borrower; browser PDF uses same HTML.
2. Wire command-center issue/add_books/borrowers to reused components and initialView aliases (main already wired shared route aliases). Remove obsolete fake body safely.
3. API integration run failures, authorization/RLS coverage, historical duplicates safeguards, return behavior.
4. UI meaningful component tests and browser fixture desktop/mobile 50 scans/print hundreds records.
5. typecheck/lint + report results to main; avoid simultaneous global builds.

No production data or deployment touched. Preserve all extensive pre-existing dirty files.

## Consolidated completion evidence

- Original 11 desk cases passed in the 145-test combined PostgreSQL batch. The canonical-membership and catalogue-history follow-up passed in the 24-test library/reports rerun.
- Latest desk suite has 15 passing cases, plus 11 existing report cases, in `.codex-final-preservation-report-regressions.log`. Its separate report-card suite had test-timeout failures; these do not turn that combined run into an overall pass.
- Empty individual reports now include verified selected-borrower identity independently of loan rows. Added tenant-isolation and empty-report regressions. No ledger identities are rewritten.
- Coordinator corrected the core library summary to use the latest authoritative ledger issues/returns, including unresolved lost copies. Assertions compare summary and borrower-report totals.
- Existing Lost / Damaged workspace now records exact-copy conditions through the authorized existing return endpoint. Charge validation is explicit; repeated lost declarations cannot duplicate a fine. Good-condition recovery releases the outstanding loan. The new UI prevents scanner suffixes from submitting this sensitive action.
- Production component browser fixture passed registration/scanning/print readiness at 390/1440px. PDF inspection led to repeated borrower headers and a page-margin footer; final regeneration is tracked centrally.
- Latest consolidated source inventory, checks and rollout status: `docs/myshule-library-exams-delivery-2026-10-28.md`.
