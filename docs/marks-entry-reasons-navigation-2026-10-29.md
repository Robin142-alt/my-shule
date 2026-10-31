# Marks Entry Hub corrections and direct keyboard navigation

Status: implementation verified locally; PR #121 is running release CI. This is a separate change from deployed library/class-exam release 19c7ea4a.

## Audit and implementation checklist

- [x] Trace shared Teacher/Exams Manager component, existing missing-reason categories, assignment/stream authorization, submission locks and result refresh triggers.
- [x] Individual reason API: authenticated tenant scope, assignment/stream/paper validation, draft/submitted-only corrections, optimistic concurrency, atomic audit/event, preserve all other marks and submission state.
- [x] Missing Marks section before/after submission: search, all/unassigned/assigned/X/Y filters, student/class/stream/subject/exam/status, compact reason editor, immediate save and truthful retry/conflict feedback.
- [x] Keep locked/reviewed/published results behind existing controlled correction/approval workflow.
- [x] Preserve X/Y precedence and refresh result snapshots/report source freshness/analytics on a reason change.
- [x] Direct Up/Down/Enter/Shift+Enter inside score inputs; select destination values; caret-aware horizontal navigation; native Tab/IME; skip disabled/readonly and follow filtered rows.
- [x] Preserve drafts and focus during rapid entry, reject invalid scores, no implicit saves/submits, concise accurate keyboard help.
- [x] Verify manager-created missing records remain editable after a teacher is assigned, preserving original authorship.
- [x] Backend integration regressions, frontend behavior tests, browser scenarios A/B at mobile and desktop widths.
- [ ] Type checks, lint and relevant build/regression checks; record actual results and limitations.

## Existing architecture

Both dashboards render `teacher-dashboard/exams-marks-workspace.tsx`; the manager supplies an assisted scope. Ordinary mark saves reject submitted sheets by design. Missing reasons are `exam_marks.score_status`, using the existing category list. A dedicated single-record correction is needed so normal numeric mark editing retains its submission safeguards. Existing transactional result-refresh and report-source revision triggers provide derived-data freshness. The shared grid handler currently enters a mode on typing which suppresses arrows; remove this mode for grid navigation while retaining native text-caret behavior.

No production school data is to be used for test fixtures.

## Verification record (30–31 October 2026, in progress)

- Focused keyboard/workspace behavior: 49/49 passing. The original keyboard regression reproduced before the helper change (3 failed, 7 passed).
- API policy/validation/cache unit tests: 9/9 passing; broader compiled API/analytics/permissions regressions: 183/183 passing.
- PostgreSQL mark-entry, academic analytics and report generation: 118/118 passing across three suites on 30 October. Fixtures use the production SQL/functions and a disposable local database. The final mark-entry suite passed 67/67 on 31 October (239.691 seconds), including two additional HTTP/provenance cases. These totals overlap and must not be treated as distinct test cases.
- Chromium Teacher, assisted Exams Manager, and unassigned Exams Manager scenarios: passed at 320/390/768/1440 px. The exact 40-student keyboard sequence preserves 67/72/81/56; a submitted reason correction performs one reason request with no class resubmission.
- Chromium paper/category workflows: passed at all four widths, including horizontal navigation, vertical movement, value selection, maximum validation and Y results.
- Shared keyboard/scanner browser: passed at 375/1280 px; seven scanner suffixes, zero implicit saves and zero console errors.
- Visually inspected the 320 px Teacher and 1440 px Manager missing-reason screens. No horizontal overflow; success feedback and correction controls visible.
- Backend build passed locally. PR CI at `ca4730738e6bd8a728faa6db613911720d3660b1` has passed backend type checking, frontend lint, frontend TypeScript through the production Next build, compiled Cloudflare Worker verification, security audit and CodeQL. Remaining CI gates are still running.
- The first full PR run passed the complete frontend quality gate (1,560 Jest executions plus browser checks), core API tests, and the 105-test exam setup/visibility/progress group. Its report-generation gate then failed seven tests after UTC rolled to 31 October: a fixed exam ended on 30 October while fixture memberships defaulted to today's creation date. The fixture now records its real September start date; production historical eligibility remains unchanged. The corrected report tests and a fresh full CI run are required before release.

Browser fixtures import actual production components/styles with isolated API adapters. They are not authenticated production-school acceptance. Failing/timeout attempts are excluded from passing totals. Initial integration fixture type/version mistakes and browser selector ambiguity were corrected without weakening business assertions.

The manager-origin regression first reproduced a forbidden correction after assigning a teacher. New records now use the existing `grade.created` audit convention and retain manager origin, while subsequent corrections record `grade.updated`. Both reason corrections and later numeric mark entry preserve original authorship. Interrupted local lint/type/integration processes are not counted as passes; the completed CI checks above provide lint/type evidence.

## Backend contract and rollout

`PATCH /exams/marks/missing-reason` accepts the existing reason category, window/assessment/student identifiers, the exact `expected_updated_at` string returned by the mark read (or null for a new record), and the paper configuration version. Managers may supply the selected teacher and stream scope. The authenticated context supplies school and actor; request-supplied tenant IDs are rejected. A conflict requires reloading and reviewing that record before retrying.

No new table, column or Prisma migration. The existing runtime schema bootstrap replaces the category-score trigger function to retain detailed missing reasons while preserving Y precedence and numeric component values. Existing result and report-source triggers refresh derived data; analytics cache entries now include the database source revision, including corrections made through another API instance.

Deploy the backend before relying on the new frontend action. Roll back application code to the recorded pre-release versions if checks fail; retain all marks, audit records and additive database structures. No data restore or deletion is required for application rollback. Deployment, full CI/build verification and production postflight have not yet been completed for this change.

Production baseline on 31 October: API, payments, bulk reports and interactive reports remain at `19c7ea4a`; all four deployments are successful. Read-only preflight verified forced RLS on 13 inspected tables and a non-bypassing runtime role. A fresh private backup at 02:46 EAT was fully archive-read verified: 5,520,856 bytes, 5,079 entries, SHA-256 `3d3219cf2330dfe7d903daf0fc3855b3f9d46c2750fae93dbf5ee91b639b0cfb`. The browser provided a working Platform Owner session, not a Teacher/Exams Manager session; no school marks were changed for testing.
