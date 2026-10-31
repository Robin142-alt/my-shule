# Marks Entry Hub corrections and direct keyboard navigation

Status: implemented, merged, deployed and verified on 31 October 2026. PR #121 merged at `018608749eafd86f0516563bb917d8642008472b` at 03:32 EAT; Cloudflare publication completed at 04:00 EAT after the backend rollout. PR/main CI and independent production postflight passed. This extends the deployed library/class-exam release `19c7ea4a`. Authenticated school and physical-device acceptance limits are stated below.

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
- [x] Type checks, lint and relevant build/regression checks; record actual results and limitations.
- [x] Production deployment and read-only postflight.

## Existing architecture

Both dashboards render `teacher-dashboard/exams-marks-workspace.tsx`; the manager supplies an assisted scope. Ordinary mark saves reject submitted sheets by design. Missing reasons are `exam_marks.score_status`, using the existing category list. The dedicated single-record correction retains the normal numeric mark submission safeguards. Existing transactional result-refresh and report-source revision triggers provide derived-data freshness. Previously, typing entered a grid mode which suppressed arrows. The shared handler now moves directly while retaining native text-caret behavior.

No production school data is to be used for test fixtures.

## Verification record (30–31 October 2026)

- Focused keyboard/workspace behavior: 49/49 passing. The original keyboard regression reproduced before the helper change (3 failed, 7 passed).
- API policy/validation/cache unit tests: 9/9 passing; broader compiled API/analytics/permissions regressions: 183/183 passing.
- PostgreSQL mark-entry, academic analytics and report generation: 118/118 passing across three suites on 30 October. Fixtures use the production SQL/functions and a disposable local database. The final mark-entry suite passed 67/67 on 31 October (239.691 seconds), including two additional HTTP/provenance cases. These totals overlap and must not be treated as distinct test cases.
- Chromium Teacher, assisted Exams Manager, and unassigned Exams Manager scenarios: passed at 320/390/768/1440 px. The exact 40-student keyboard sequence preserves 67/72/81/56; a submitted reason correction performs one reason request with no class resubmission.
- Chromium paper/category workflows: passed at all four widths, including horizontal navigation, vertical movement, value selection, maximum validation and Y results.
- Shared keyboard/scanner browser: passed at 375/1280 px; seven scanner suffixes, zero implicit saves and zero console errors.
- Visually inspected the 320 px Teacher and 1440 px Manager missing-reason screens. No horizontal overflow; success feedback and correction controls visible.
- Backend build passed locally. Final [PR CI 41148365435](https://github.com/Robin142-alt/my-shule/actions/runs/41148365435) passed at `e17fb2b378dadb5da56a6b47e437026e4b6dbc9e`: backend type checking, frontend lint, frontend TypeScript through the production Next build, compiled Cloudflare Worker verification, security audit and CodeQL. The merge tree is identical to this tested candidate.
- Final PR quality: 1,560 Jest and 26 Node executions plus browser checks. Backend: 2,276 Node and 575 Jest integration executions across 38 suite executions. These are execution totals, including repeated workflow gates. The 100-card, seven-subject PDF benchmark completed in 11.521 seconds with stored PDF bytes and audit/outbox persistence.
- [Production CI 41150685883](https://github.com/Robin142-alt/my-shule/actions/runs/41150685883) passed at merge revision `01860874`: the same 1,560 frontend Jest / 26 frontend Node / 2,276 backend Node / 575 backend Jest executions, plus 59 main-only integration executions across five suites. Lint, backend/frontend TypeScript, security checks, production Worker build/runtime, release container and Cloudflare deployment passed. The final 100-card report benchmark took 11.862 seconds. Railway deployment used the existing Git integration; the separate CI deploy-railway job was skipped by its existing mode condition.
- The first full PR run failed seven report-generation tests after UTC rolled to 31 October: a fixed exam ended on 30 October while fixture memberships defaulted to today's creation date. The fixture now records its September start date; production historical eligibility remains unchanged. The corrected report-generation/readiness suites passed locally 36/36 (275.391 seconds) and again in full PR CI 36/36.

Browser fixtures import actual production components/styles with isolated API adapters. They are not authenticated production-school acceptance. Failing/timeout attempts are excluded from passing totals. Initial integration fixture type/version mistakes and browser selector ambiguity were corrected without weakening business assertions.

The manager-origin regression first reproduced a forbidden correction after assigning a teacher. New records now use the existing `grade.created` audit convention and retain manager origin, while subsequent corrections record `grade.updated`. Both reason corrections and later numeric mark entry preserve original authorship. Interrupted local lint/type/integration processes are not counted as passes; the completed CI checks above provide lint/type evidence.

### Acceptance traceability

| Requested behavior | Passing coverage |
| --- | --- |
| Reasons before/after submission; individual save; peer marks unchanged | Mark-entry PostgreSQL/guarded HTTP and shared-workspace tests; browser scenario A for Teacher and Manager |
| Unauthorized/foreign school/assignment/paper/stream rejection | Mark-entry integration, permission tests and assisted/unassigned browser scopes |
| Reviewed, locked, published and archived safeguards | Parameterized mark/series state tests, current released-report guard, closed-window and stale-configuration tests |
| X/Y precedence, category scores, fresh reports and analytics | Immediate result snapshot/source-version regression, numeric category preservation, result-policy tests and academic analytics integration |
| Direct arrows, Enter/Shift+Enter, multiple columns, replacement selection | Shared keyboard behavior and paper browser tests; exact 40-student scenario B |
| Draft preservation, filtered rows, rapid entry, readonly/disabled cells | Shared keyboard/workspace tests and Teacher browser; native Tab, caret, IME and scanner regression checks |
| Concurrent writes, failed requests and audit/event failures | Simultaneous PostgreSQL correction gives one success/one 409 with no duplicates; transaction rollback/retry; UI preserves selection and reloads only the conflicting record |

These are automated acceptance results. Live Teacher/Exams Manager acceptance and physical keyboard/scanner/printer checks are not claimed.

## Backend contract and rollout

`PATCH /exams/marks/missing-reason` accepts the existing reason category, window/assessment/student identifiers, the exact `expected_updated_at` string returned by the mark read (or null for a new record), and the paper configuration version. Managers may supply the selected teacher and stream scope. The authenticated context supplies school and actor; request-supplied tenant IDs are rejected. A conflict requires reloading and reviewing that record before retrying.

No new table, column or Prisma migration. The existing runtime schema bootstrap replaces the category-score trigger function to retain detailed missing reasons while preserving Y precedence and numeric component values. Existing result and report-source triggers refresh derived data; analytics cache entries now include the database source revision, including corrections made through another API instance.

The backend deployed before the new frontend action. Application rollback can use the recorded pre-release versions while retaining all marks, audit records and additive database structures. No data restore or deletion is required for application rollback. Full PR/main CI, deployment and production postflight are complete.

Production baseline on 31 October: API, payments, bulk reports and interactive reports were at successful revision `19c7ea4a`. Read-only preflight verified forced RLS on 13 inspected tables and a non-bypassing runtime role. A fresh private backup at 02:46 EAT was fully archive-read verified: 5,520,856 bytes, 5,079 entries, SHA-256 `3d3219cf2330dfe7d903daf0fc3855b3f9d46c2750fae93dbf5ee91b639b0cfb`. No school marks were changed for testing.

Backend rollout completed at `01860874`. Read-only postflight on 31 October at 03:53 EAT passed: the detailed-reason category trigger is installed; the three earlier class-configuration columns, 17 enabled integrity guards and forced RLS on 13 inspected tables remain intact; the runtime role is neither superuser nor RLS-bypassing. Signed gateway identity was accepted and forged identity rejected. Health/readiness returned 200, unsigned examination/library reads returned 401, and unsigned `PATCH /exams/marks/missing-reason` returned 401.

| Railway service | Successful deployment |
| --- | --- |
| API | `5609b205-35ba-4f90-b679-cff28452bb2f` |
| Payments worker | `011884e1-f56f-478f-b99c-1cc857dd7529` |
| Bulk reports | `0adf8a6b-acad-45b8-9993-3eb434072820` |
| Interactive reports | `c745193e-cb7f-4b2a-93c2-6000a1b8e29f` |

Inspected deployment logs contain no error-level entries (API 350 lines, payments 63, bulk 25, interactive 19). API warnings about class-placement/admission mismatches and pool removal also occur in the previous deployment's warning logs. These existing school-data consistency warnings are recorded as an operational follow-up; no student placement was silently altered by this release.

Cloudflare version `d87c6874-6d27-4007-bd26-43ae3d6ec79a` was published at 04:00 EAT. CI and independent live smoke checks passed on https://www.myshule.online and https://myshule-web.ondurobinson.workers.dev: pages, assets, images, PWA, CSRF and unsigned tenant/API protection. Independent exam/library/marks reads returned 401 with private/no-store caching on both hosts. The reason PATCH returned 403 without CSRF evidence and 401 with valid CSRF but no authenticated session; both responses were private/non-cacheable. The initial probe expected authentication to run before CSRF, then was corrected to explicitly verify both layers; application behavior was unchanged.

Chrome loaded the deployed homepage and routed the existing authenticated session to the working Platform Owner dashboard at 04:03 EAT. No agreement was accepted. This session cannot provide Teacher/Exams Manager workflow acceptance; no role was impersonated and no live school marks were used as fixtures.

A later [scheduled operability run 41185999269](https://github.com/Robin142-alt/my-shule/actions/runs/41185999269) failed its static release-readiness check. Its only failing readiness item says the environment audit is absent: the checker searches for `env:production:audit`, while the workflow executes `node scripts/production-runtime-env-audit.mjs`. The actual environment audit artifact passed and hosted-auth smoke passed 6/6. Both checker and workflow are unchanged from pre-release `19c7ea4a`. Later synthetic monitoring [41192454610](https://github.com/Robin142-alt/my-shule/actions/runs/41192454610) passed. This existing monitoring mismatch remains an outstanding operational issue; the successful PR/production CI evidence above does not claim that every platform-wide readiness audit is green.

## Changed components and original specifications

The [PR #121 diff](https://github.com/Robin142-alt/my-shule/pull/121/files) is the complete 25-file inventory, including four evidence documents from the prior release. Runtime changes are the exam DTO/controller/service/repository, missing-reason policy, category-score trigger, shared Teacher/Exams Manager marks workspace and new inline Missing Marks panel, teacher API client, and reusable keyboard handler. Tests cover API policy, PostgreSQL marks/analytics/reports, the reason client, shared markbook, keyboard behavior and browser scenarios; CI runs the new regressions.

Specification A remains implemented: library registration/scanning/issuing, Borrower Records preview/download/print, and shared keyboard navigation. Specification B remains implemented: class/stream-specific exam subjects, transactional integrity, historical eligibility, marksheets, report cards and analytics. Their detailed acceptance, migration and print evidence is in [the consolidated A/B report](myshule-library-exams-final-acceptance-2026-10-29.md). This release reran the library browser/print checks and exam setup/eligibility/report regressions. It replaces marks-grid F2/Escape mode with direct arrows while retaining the existing scanner/form behavior.

## Readiness and remaining limits

No outstanding implementation or deployment dependency was identified for the requested changes. Feature CI and deployment gates passed and the software is deployed. The pre-existing scheduled readiness-check mismatch above remains unresolved. Authenticated Teacher/Exams Manager production acceptance and physical scanner/printer/assistive-technology checks remain unverified. Existing student-placement consistency warnings require school review, as do ambiguous legacy examination mappings documented in the original A/B report. Fixture browser tests and read-only production checks are not represented as live-school end-to-end acceptance or unconditional platform-wide production certification.
