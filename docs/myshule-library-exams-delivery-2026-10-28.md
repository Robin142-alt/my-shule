# MyShule library, keyboard navigation and class-specific examinations

Status: historical implementation/evidence report. The release was subsequently deployed and verified; see `myshule-library-exams-final-acceptance-2026-10-29.md` for final current-main results, deployment evidence and explicit live-school/device limits. Both specifications were included.

Release integration note: verification totals below record the original checkout. The current-main release checkout is being revalidated; its authoritative status is [the release record](myshule-library-exams-release-2026-10-28.md). Library changes have been ported onto production Smart Library components, its existing global barcode registry and loan projection. Removed legacy desk helpers are not release components. Checked implementation coverage does not establish final release acceptance.

## Specification A — implemented behavior

- Book registration reuses the existing catalogue and registration workspace. The selected title stays highlighted above the paginated/searchable catalogue without a duplicate row. New titles are immediately selectable; repeated scans preserve focus and refresh available/total counts. Existing removal, category search and catalogue metrics remain available. Titles with borrowing history cannot be deleted.
- Issuing uses real tenant-scoped borrower and copy lookups, serial scanner processing, newest-first copies, latest-copy highlighting, duplicate rejection, and an independently scrolling queue. A named confirmation and book count stay above large queues. Borrower changes require an explicit decision. Unknown network outcomes retain the original retry identity and payload.
- Production Smart Library retains borrower/person and sorted-copy locks, eligibility/limit checks, exact retries, audit records and workflow events. Lost copies remain outstanding until recovery or an explicit recorded loss resolution; loss notices never describe them as returned.
- Borrower Records now produces complete individual, class/stream and whole-school reports from the canonical loan projection of the circulation ledger, including renewed due dates. Outstanding and historical records are separate. Legacy duplicate memberships are grouped by the actual person without rewriting ledger history. Empty individual reports retain verified borrower identity.
- One escaped, school-branded HTML representation supplies the embedded preview, printing and browser Save as PDF. It includes copy barcodes, dates, statuses, all matching rows, totals, student/admission/class/stream identity, generated-by metadata, signatures where appropriate, repeated borrower/table headers and A4 layouts. Private logos use the existing authenticated school-logo route; absent logos have a clean fallback.
- Existing return and Lost / Damaged workspaces retain governed copy/incident commands, reason validation and configured school fine rules. Scanner Enter cannot silently submit an incident. No separate condition workspace or alternative circulation ledger is introduced.
- Reusable, opt-in form/grid navigation preserves native controls, text editing, Tab, IME and scanner suffix handling. Disabled/hidden/read-only cells are skipped. The shared marksheet uses visible eligible rows and keeps Blank-filter rows mounted while a multi-digit score is typed.
- Keyboard coverage includes exam setup and marksheets; library registration/issue/return; admissions and guardians; secretary entry; finance payments, invoices, expenses and fee structures; stores and stocktake creation; boarding leave; transport routes; staff invitation, leave, allocation, payroll and HR entry groups; school profile. The existing stocktake workspace has no per-item count editor, so no new spreadsheet stocktake editor is claimed.

## Specification B — implemented behavior

- The existing examination cycle now stores independent class subject selections, with optional stream exceptions. The interface provides curriculum-filtered choices, clean names/codes, search, select-all/clear, counts, summaries, preserved drafts and navigation protection. It does not automatically select all academic subjects or require a teacher assignment.
- Existing create/configure APIs persist exact exam/class/subject windows and class papers transactionally. Version checks reject stale administrator edits. Empty drafts are allowed; incomplete configuration cannot open marks entry. Existing locked, reviewed, published and archived governance is retained.
- Eligibility follows actual enrollment, term/year/effective dates and the examination-time placement/stream. Teacher ownership remains enforced; authorized Exams Managers can enter unassigned subjects through the existing assisted-entry path.
- Markbook rows, completion denominators, submitted-sheet state, readiness, results and analytics use the same configured scope. Missing, absent, exempt and unexamined cases remain distinct. Newly eligible learners cannot disappear behind a submitted-sheet label.
- Both timetable mutation paths validate the configured paper, school, examination and lock state and persist changes with audit/events in one transaction.
- Report generation and analytics preserve historical evidence. Fresh historical report identity/comments now use the exam-time placement after later transfers. Existing report artifacts, publication history and grading configuration are preserved.
- Legacy global configurations remain explicitly reviewable. No Cartesian backfill assigns every subject to every class. Existing marks, custom multi-paper settings, schedule dependencies and unaffected class workflow state are protected against destructive edits.
- Existing report generation, moderation/publication, export, event, notification, cache and worker paths were audited through their shared repositories; tenant context and existing authorization remain intact.

## Database changes and rollout

No Prisma migration file or destructive data migration was added. The repository's existing runtime schema bootstrap contains additive, idempotent changes:

- `exam_series.configuration_version`, nullable `exam_series.class_subjects`, and `exam_mark_entry_windows.stream_scope`.
- Extended examination parent/tenant/configuration integrity triggers, including timetable paper ownership.
- The current production global barcode registry, circulation ledger, loan projection, RLS and command replay remain unchanged as the persistence foundation. This release does not add a second barcode registry or a competing circulation workflow.

The existing backend schema bootstrap runs before the updated frontend is published. Verify its completion and retain the additive columns on rollback. Read-only production preflight and a verified private backup are recorded in the release record. Ambiguous legacy exams require explicit school review; no historical marks or barcode identifiers are silently rewritten.

## Verification evidence

Only completed runs count. Logs remain in the repository workspace; browser/PDF fixtures use isolated test data, never a real school.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Consolidated PostgreSQL integration | 8 suites / 145 passed before final preservation additions | `.codex-library-exams-integration-final.log` |
| Library preservation rerun | 2 suites / 24 passed before empty-report/condition cases | `.codex-library-preservation-final.log` |
| Latest library suites | 2 suites / 26 passed; combined report suite failed on test timeouts | `.codex-final-preservation-report-regressions.log` |
| API build | Prisma generation + TypeScript exited 0 before final small changes | `.codex-api-build-final.log` |
| Final API compilation/unit regressions | TypeScript exited 0; 208/208 passed, 98.237 seconds | `.codex-api-compile-verified.log`, `.codex-api-unit-verified.log` |
| Frontend regression batch | 14 suites / 121 passed before final empty-report/condition additions | `.codex-library-exams-web-verified.log` |
| Exam configuration browser | Passed at 320/390/768/1440px; independent 9/7/6 selection, edit to 9/6/6, version 4, Back cancellation, no overflow/console errors | `.codex-exam-class-browser-final.log`, `output/exam-class-configuration/` |
| Keyboard browser | Passed at 375/1280px; native editing, grid modes, 7 scanner suffixes, zero implicit saves/console errors | `.codex-keyboard-browser-final.log`, `output/keyboard-navigation/` |
| Library browser | Final rerun passed at 390/1440px after catalogue card extraction; 10 registrations per width, 56 scans/issues, 300 preview rows, condition-recording payload, print readiness/call, no nested modal overflow/console errors | `.codex-library-browser-complete-3.log`, `output/library-desk/` |
| PDF extraction/rendering | All eight variants passed: 0/3/60/300 copies, individual/class/school, portrait/landscape, with/without logo. Empty individual: one page; 300 copies: 27 pages, no footer-only page. Rendered images visually inspected, including the full 27-page contact sheet and final page | `.codex-library-pdf-complete-2.log`, `output/library-desk/pdf-verification.json` |
| Final report generation | 19/19 passed; real 100-card, seven-subject PDF batch completed in 37.602 seconds with all artifacts persisted | `.codex-report-generation-verified-2.log` |
| Prisma schema validation | Passed; schema valid, exit 0 | `.codex-prisma-verified.log` |
| Focused frontend rerun | 2 suites / 16 passed after allowing 20 seconds for the seven-scan interaction | `.codex-web-followup-complete.log` |
| Final library/routing regressions | 2 suites / 18 passed, 109.913 seconds, including CSS footer escaping and catalogue card correction | `.codex-library-final-tests.log` |
| Final web TypeScript | Passed; serial pipeline advanced to lint only after exit 0 | `.codex-web-typecheck-complete.log` |
| Final web lint/build | In progress. First complete lint scan reported 13 errors / 1,455 warnings: two librarian React errors and 11 CommonJS import diagnostics. Corrections await verification; the build was interrupted to incorporate them | `.codex-web-lint-complete-2.log`, `.codex-final-lint-repairs.log` |

One combined report-generation run had five failures after real PDF batches exceeded Jest's five-second default. Timed-out batches then wrote into following tests after table reset, causing misleading artifact-expiry/count errors. A subsequent run passed all 18 functional cases but exceeded the old one-minute 100-card benchmark limit. The suite now allows 60 seconds per functional test and 180 seconds for that benchmark, retaining every assertion and the full data volume. The fresh final run passed all 19 cases; its benchmark took 37.602 seconds. Earlier failed, memory-exhausted and aborted runs are not counted as passes.

The first focused web rerun passed 15/16 cases but the seven-scan interaction test hit the five-second default under host load. That multi-step test now allows 20 seconds, retaining every scan, duplicate, borrower-switch and count assertion. The fresh rerun passed 16/16. It used `TS_NODE_TRANSPILE_ONLY=true` only for the Jest TypeScript configuration loader; the subsequent full `tsc --noEmit` passed independently.

## Current-main release source inventory

Paths below are repository-relative. The workspace contained extensive unrelated changes before this task; this inventory does not claim ownership of the entire Git diff.

- Exam configuration/API: `apps/api/src/modules/exams/class-exam-configuration.ts`, `exam-setup-integrity-schema.ts`, `dto/exams.dto.ts`, `exams.service.ts`, `repositories/exams.repository.ts`; `apps/api/src/modules/admin-command/class-exam-persistence.ts`, `exam-setup-integrity.ts`, `exams-manager-command.service.ts`.
- Downstream exams: `apps/api/src/modules/exams/exam-mark-roster.ts`, `analytics/analytics-query.ts` and the shared exam repository. Current production class-teacher ownership and per-stream submission locking remain authoritative.
- Exam UI: `apps/web/src/components/school/exams-manager/class-subject-selection.tsx`, `exam-setup-workspace.tsx`, `api-client.ts`; `apps/web/src/components/school/teacher-dashboard/exams-marks-workspace.tsx`, `paper-settings.tsx`; `apps/web/src/lib/routing/workspace-navigation.tsx`.
- Library backend: `apps/api/src/modules/admin-command/librarian-command.service.ts`, `librarian-command.controller.ts`; `apps/api/src/modules/library/smart-library.service.ts`; `apps/api/src/scripts/module-certification.ts`.
- Library UI/reporting: `apps/web/src/components/library/smart-library-catalogue.tsx`, `smart-library-shared.tsx`, `smart-library-tools.tsx`, `smart-library-workspaces.tsx`; `apps/web/src/components/school/librarian-command-center.tsx`; `apps/web/src/lib/library/borrower-report.ts`; `apps/web/src/components/school/school-pages.tsx` and `apps/web/src/lib/routing/school-workspace-contract.ts`.
- Keyboard: `apps/web/src/lib/accessibility/keyboard-navigation.ts` and the existing forms listed in `docs/keyboard-workstream-progress.md`. No new navigation module/page or database model was introduced.
- Tests/evidence: examination/library PostgreSQL suites under `apps/api/test/`; API unit regressions; focused frontend tests and three browser fixtures under `apps/web/tests/design/`; `scripts/verify-library-print.py`; the implementation checklist and three workstream progress records.
- CI: `.github/workflows/ci-cd.yml` includes the new class/keyboard/component/browser tests and retains all existing deployment gates. No lint rule or permission is weakened.

Earlier original-checkout lint, syllabus-test and legacy-library corrections were not carried over where current production already supplied their equivalent. The release inventory above describes the actual diff against production, not every earlier exploratory edit.

## Remaining verification and deployment dependencies

Final web TypeScript/lint/production build and post-browser PDF revalidation remain open until recorded above. Report integration, API compiler/unit/Prisma validation, library/routing regressions and final browser fixtures have completed. No production database, payment, borrowing history, school settings or permissions were modified by test execution.

Live authenticated staging smoke testing, physical HID scanner testing, assistive-technology checks and an actual printer remain external verification steps. Browser tests import production components against isolated fixture APIs; PostgreSQL tests exercise real repositories/services/RLS separately. No deployment, real notification delivery or live-school acceptance is claimed.

Production readiness is not yet asserted while final checks are pending. Deployment requires the usual environment configuration, existing private report storage and worker setup, schema bootstrap, legacy review and staging acceptance.
