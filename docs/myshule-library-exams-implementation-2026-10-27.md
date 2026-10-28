# Library, keyboard navigation, and class-specific examinations

Status: implementation in progress. No deployment or production verification claimed.

Both supplied master specifications are mandatory. This file records acceptance coverage and outstanding work across sessions. Existing payment plans in `tasks/` and pre-existing uncommitted changes are preserved.

## Execution and dependencies

1. Audit existing governance, school scope/RLS, events, durable state, permissions, routes, notifications, approvals, offline behavior, reporting and tests.
2. Define backend contracts and additive data relationships before connecting new UI.
3. Independently implement exam backend/downstream services, library workflows/reporting, and reusable keyboard navigation. Coordinate exam frontend and scanner exclusions centrally.
4. Verify each slice with regressions, then integrated compiler/lint/build/database/browser checks. Record actual results below.

## A — Library and navigation acceptance checklist

- [x] A1: Selected registration title has a distinct highlighted first position across pages/filters; no duplicate visible row, changed permanent ordering, or altered total; new titles selectable.
- [x] A1: Preserve selection, barcode readiness, and accurate available/total counts over repeated registration; no downward scrolling.
- [x] A2: Successful scans ordered newest first (including seventh), latest highlighted, exact copy barcode/title; distinct copies of same title; count/removal accurate.
- [x] A2: HID/Enter/manual/rapid scans keep scanner focus, borrower/due date/session; invalid/unavailable/duplicate scans give non-disruptive feedback and cannot race into duplicates.
- [x] A3: Heading/count/explicit confirmation at top, reachable desktop/mobile for 50+ items with independently scrollable list.
- [x] A3: Empty/double-submit guards, borrower eligibility/limits/copy availability, atomic idempotent issuing/retry; retain queue until confirmed success and handle partial/conflict/unknown outcomes safely.
- [x] A3: Borrower switching explicitly identifies affected borrower and requires a session decision.
- [x] A4.1: Existing Borrower Records report improved in place; outstanding excludes returned, differentiates current/overdue/unresolved lost; history remains separate and filters authoritative.
- [x] A4.2–3: Real school logo/name, clean logo fallback, title/scope/generation date; verified student name/admission/grade/stream and counts; no internal IDs or Robin Project footer.
- [x] A4.4–5: One copy per row, title/barcode/issued/due/status columns, natural wrapping, 10–12pt readable A4 styling, repeated headers/page breaks, no application navigation.
- [x] A4.6: Student/class/whole-school datasets include all matching records beyond pagination, deduplicate copies, reflect returns, correct group subtotals and tenant scope.
- [x] A4.7–8: Shared preview/print/PDF representation where supported, ready images/fonts, totals and optional signatures, clean footer/page numbers where practical.
- [x] A5.1: Reusable opt-in form Up/Down/safe Enter; preserve Tab, Shift+Tab, native text caret, numeric/date/select/autocomplete/multiline behavior.
- [x] A5.2: Editable marksheet grid arrows/Enter/Shift+Enter, explicit edit semantics, locked/unavailable cells skipped; compatible with new exam subjects/eligible rows.
- [x] A5.3: Inspect/integrate suitable library, exams, admissions/guardians, finance, inventory, staff, transport, boarding and school setup forms; no blanket unrelated-page interception.
- [x] A5.4–5: Visible focus, logical dynamic order, hidden/disabled/readonly skipping, values/validation/accessibility preserved, minimal scrolling, scanner suffix precedence, no accidental submission.
- [x] A6–8: Consistent existing design/mobile/workspaces; no competing modules, fake actions, record loss, unnecessary dependencies or destructive migrations; permissions/events/audits maintained.
- [x] A7: Tenant isolation, global barcode uniqueness, duplicate registration/loans prevented, return consistency, school-safe exports and concurrency tests.
- [ ] A9–10: Execute registration/scan/50+ queue/printing (3/many/hundreds, long titles, same title copies, missing/present logo)/keyboard/module regression acceptance tests; report actual results.

## B — Examination acceptance checklist

- [x] B1–2: Shared exam cycle with independent class subjects; responsive class tabs/cards, curriculum-only subject options, checkboxes/counts/search/select-all/clear, persistent drafts, configured indicators, summary and navigation protection.
- [x] B3: Grade/Form defaults with optional stream differences, actual subject enrollment/electives/pathways eligibility, no dependency on teacher assignment or automatic curriculum inclusion.
- [x] B4: Stable school-scoped exam/class/subject relationships; unique records, transactional idempotent versioned saves, concurrent-edit rejection, RLS and job tenant context retained.
- [x] B5 marks: Only examined subjects and eligible students; authorized manager entry without teacher; teacher permissions retained.
- [x] B5 progress: Shared denominator/counts and submitted state; distinguish missing, absent, exempt, not examined and incomplete; overview and sheets agree.
- [x] B5 governance: Schedules/readiness respect mapping; opening/locking/moderation/publishing and unaffected class state preserved.
- [x] B5 reports: Applicable student subjects, configured totals/averages/grades/ranking/CBC/8-4-4/hybrid behavior, consistent preview/PDF/printing.
- [x] B5 integrations: Analytics/history, dashboards/teacher/parent portals, exports/notifications/caches/workers audited and corrected.
- [x] B6: Additive legacy handling preserves marks/reports/publications; only unambiguous inference; ambiguity explicitly reviewed; existing-result removals governed; no lock/progress reset.
- [x] B7: Clean subject labels/meaningful codes without generated technical identifiers; valid custom subjects retained.
- [x] B8: Create → class selection → independent subjects → stream review → save/reopen/edit → marks → moderation/publication/report cards works end to end.
- [x] B9: Isolated Form4=9 / Grade9=7 / Grade10=6 fixture, independent edits and eligible counts; failures rollback, repeat/concurrent saves, absent/withdrawn/elective/stream/zero/missing-curriculum/published cases and cross-school access tested.
- [ ] B10: Tests/typechecks/lint/build/migration/browser evidence, regressions fixed, rollout dependencies documented without false production claims.

## Verification record

Each entry states actual results. Checked implementation items are supported by component/service/database fixtures, with exact results and limits in `myshule-library-exams-delivery-2026-10-28.md`. Browser fixtures are not live authenticated production verification. Physical scanner, printer and screen-reader acceptance remain external checks; HID behavior here is exercised as keyboard input. Final build/print gates stay open until they pass.

- Initial API `npx tsc --noEmit --pretty false`: passed before implementation.
- Initial web typecheck: failed on pre-existing unsupported Testing Library `exact` option in `syllabus-coverage.test.tsx:170`. Replaced it with an anchored accessible-name regex, preserving the assertion.
- New `exam-class-subjects.test.tsx`: first run 4/4 failed against the global selection implementation; next run 4/4 passed after class selector integration.
- `npm --prefix apps/web run test:design -- --runTestsByPath tests/design/exam-class-subjects.test.tsx tests/design/exam-setup-edit-delete.test.tsx tests/design/workspace-navigation.test.tsx`: 3 suites, 23 tests passed. Later empty-draft and locked-state changes require another final run.
- `node apps/web/tests/design/exam-class-configuration-browser.mjs`: passed at 320/390/768/1440px. Actual component + isolated fixture API, class counts 9/7/6 initially, Grade 9 edit persists as 9/6/6 with version token; no school-wide subject list sent, no horizontal overflow, zero console errors. Screenshots and `results.json`: `output/exam-class-configuration/`. Mobile/desktop screenshots visually inspected.
- Keyboard helper and integration/browser checks are tracked by the keyboard workstream; final evidence pending consolidation.
- Disposable PostgreSQL exam and library suites are in progress. No production database touched.

## Current implementation inventory (not final acceptance)

- New class subject selector with optional stream exceptions and term-aware curriculum filtering; existing exam setup now uses `class_subjects`, configuration version, legacy-review notice, locked-state read-only behavior, unsaved edit confirmation, and reusable keyboard handler. Same existing create/configure endpoints.
- Librarian route aliases `register-books`, `issue-book`, `return-book` now recognized by the existing role/workspace registries; command center integration is in progress.
- Backend agents are adapting existing exam windows and school-scoped library transactions. Full verification and downstream audit remain required.

## Continuation — 28 October 2026

- Exam configuration database suite: 18/18 passed in `.codex-class-exam-integration-3.log` after fixing class-paper removal and custom multi-paper protection. Later timetable and temporal-scope changes require revalidation.
- Library database suite: 7/7 passed in `.codex-library-desk-integration.log`, including atomic issue/replay, rollback, return replay, competing issues and RLS. Library component tests: 4/4 passed in `.codex-library-desk-web.log`.
- Keyboard affected regression batch: 8 suites / 72 tests passed; actual output `output/keyboard-navigation/regression.log`. Browser checks passed at 375/1280px. Focused lint 0 errors, 85 warnings. Further shared marksheet changes require relevant rerun.
- Web TypeScript check passed with exit 0 before subsequent unassigned-manager entry changes. API TypeScript check likewise passed before the final repository changes. Neither is a final whole-change check yet.
- Expanded exam UI suite reproduced reviewed-state editing (1 failed, 28 passed). Added `reviewed` to read-only states to match backend. Recheck pending.
- Downstream PostgreSQL batch: 4 suites passed, 1 failed (60 passed / 35 failed); failed fixture used old global subject payload. Updated fixture to class-specific contract and correct per-class paper IDs without removing assertions.
- Audit found missing manager entry for unassigned subjects and inconsistent enrollment term/year/date scope. Added authorized nullable-teacher path through existing markbook service, transactional save and frontend; added regression tests. First unassigned test reproduced missing assignments. Final pass not yet established.
- Timetable changes now validate same-school/same-exam configured paper and run slot/invigilator/audit writes in one transaction; database guard rejects foreign exam papers. New regression pending.
- Library route aliases now reach actual registration/issue/return/borrower components. Focus fixed after initial title/borrower choice; new scans scroll the independent queue to its top. New browser fixture covers registration across pages, 56 scans and 3/60/300-row PDF reports; run pending.
- Remaining: collect/fix current exam and library browser runs; test expired enrollment/unassigned writes and retained teacher restrictions; close legacy single-issue concurrency bypass; inspect report images/PDFs; final downstream, TypeScript, lint, build and migration validation; complete honest acceptance inventory and consolidated report.

## Baseline findings

- Repository already has extensive uncommitted changes in authentication, navigation, examinations, report cards and other modules. Preserve these; final change inventory must identify this request's files rather than claim the entire working tree.
- Exam setup uses global `subject_ids` plus `class_section_ids`, including automatic all-subject selection on create. Existing mutation endpoints, paper configuration, student enrollment and transaction/event infrastructure will be adapted.
- Existing library workspaces and report generation are the integration points; no new reporting sidebar is required.

## Consolidated validation pass — 28 October, 11:45 EAT

- Main API build (`npm run build`, Prisma generate + TypeScript) exited 0. Follow-up timetable DTO validation and final one-line capability-preserving adjustment need the final compiler pass.
- Frontend batch `.codex-library-exams-ui-final.log`: 6 suites / 62 tests PASS. Subsequent print readiness, navigation protection and keyboard focus regressions are queued for the final batch.
- Library actual-component browser fixture passed at 390/1440px: 10 registrations per width, 56 successful scans, top confirmation, exact issued payload, 300 preview rows, no console errors or app horizontal overflow. Added real print-call readiness check and no nested preview scroll; passed. Fixtures are isolated; no live school or physical scanner used.
- Shared report HTML generated 3-, 60-, 300-copy PDFs, plus present-logo and landscape variants. PDF text extraction verified all distinct copy codes (3/60/300), A4 sizes, no technical/internal footer text, and page numbers. Rendered PNGs inspected. Inspection found orphan borrower headings on later pages; heading now moved into repeated table header and mobile document width preserved. That last improvement awaits regeneration and image review.
- Additional audit corrections: exact historical placement/stream and enrollment term/year/date eligibility; submitted-sheet denominator repair; null-teacher manager entry; atomic legacy library issue/return paths; shared borrower limits and lost-copy recovery; both timetable APIs validate configured papers and exam locks transactionally with audit/events; marksheet Blank filter retains focused row while typing.
- Concurrent compilers/test workers exhausted this 8GB machine's memory. Stopped owned lint/TypeScript and test workers, preserving logs. Aborted runs are NOT test results. Validation is now serial.
- Active central PostgreSQL integration command (session 40397, `.codex-library-exams-integration-final.log`) covers teacher visibility, configuration integrity, teacher progress, report readiness, academic intelligence, report generation, library desk and existing library reports. No final result yet.
- Remaining serial checks: fix integration failures; compiled API unit tests; Prisma validate; web focused regression batch; final TypeScript/lint/build; three browser fixtures and PDF regeneration/review; final source inventory and acceptance record.
- Production remains unverified. No deployment, migration against a real school, real notification, payment or borrowing-data mutation has been performed.

## Final verification continuation — 28 October

- Consolidated disposable PostgreSQL batch completed: **8 suites / 145 tests passed**, 267.57 seconds (`.codex-library-exams-integration-final.log`). Covers teacher visibility, configuration integrity, teacher progress, report readiness, academic intelligence, report generation, library desk and librarian reports. Later library canonical-membership, catalogue-preservation and summary changes are being rechecked separately.
- API compilation completed with exit 0; compiled API unit batch completed **208 / 208 passed**, 121.887 seconds (`.codex-api-compile-final.log`, `.codex-library-exams-unit-final.log`). Later library changes require the final compiler/unit rerun.
- Frontend regression batch completed **14 suites / 121 tests passed**, 469.01 seconds (`.codex-library-exams-web-verified.log`). Includes independent class configuration and navigation protection, assisted manager entry without a teacher, library registration/issuing/printing safeguards, keyboard edge cases, Blank-filter multi-digit marks entry, admissions, finance, stores, transport, boarding and workspace routing.
- Restored the existing catalogue Remove action, catalogue metrics and category search during final review; deletion now rejects borrowing history server-side and the UI preserves selection on rejection. No existing catalogue action was intentionally removed.
- Core library summary now reads the same latest circulation-ledger issues and real returns as borrower reports. Lost books remain outstanding until recovered; joins retain school scope. Added assertions comparing summary and report totals to the lost-book database regression.
- Remaining: focused library database rerun; final API/compiler and Prisma checks; web TypeScript/lint/production build; regenerated browser/PDF evidence; final acceptance and rollout report. Earlier aborted jobs remain excluded from results.

### Final evidence collected at 13:25 EAT

- Latest library suites: **26 tests passed** (15 desk + 11 reports), including no-loan individual identity and validated lost/damaged recording. The combined command's report-card suite initially failed due to test timeouts; that overall run is not labelled a pass.
- Final report-card suite: **19/19 passed** in `.codex-report-generation-verified-2.log`, including historical class/stream/comment selection. A real 100-student, seven-subject PDF batch completed in **37.602 seconds**, with 100 artifacts and corresponding audit/event persistence.
- Final API TypeScript compilation exited 0. Final API unit batch: **208/208 passed**, 98.237 seconds. Prisma schema validation exited 0 and reported valid schema.
- Final exam browser checks passed at **320/390/768/1440px** and keyboard checks at **375/1280px**. Updated exam mobile screenshot inspected; Save remains reachable and class selections remain separate.
- Library browser passed at **390/1440px** with 56 queued copies, 300 preview rows and a verified print call. PDF inspection caught a footer-only trailing page; fixed using the print page margin, with added assertions and empty/individual/class report variants. Final PDF regeneration remains pending.
- Latest full inventory and evidence: `docs/myshule-library-exams-delivery-2026-10-28.md`. Final focused web tests, TypeScript, lint, production build and PDF regeneration are running sequentially. No live school or production database was touched.
