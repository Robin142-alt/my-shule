# MyShule: consolidated library and examination release acceptance

Status: both specifications implemented; production deployment and automated/read-only production verification completed on 29 October 2026. Live authenticated school/device acceptance limits remain below.

31 October follow-up: production revision `018608749eafd86f0516563bb917d8642008472b` retains both specifications and adds individual missing-reason correction plus direct score-input arrow navigation. PR #121 and production CI passed; all four backend services and Cloudflare are deployed. The original library/print and class-exam regressions passed again. See [the current marks-entry release report](marks-entry-reasons-navigation-2026-10-29.md) for final test totals, deployment identifiers, browser verification and remaining acceptance limits. The historical 29 October evidence below is retained.

Both supplied master specifications remain mandatory. This report describes the current-main release checkout, not the earlier development checkout. Review: https://github.com/Robin142-alt/my-shule/pull/120. Tested candidate revision: `77a1535deb41d394130c116ce1cbc605e09dac3b`. Merge revision: `19c7ea4abcd5b4bd0e93712b3c67829ce9bcb073`, 29 October 2026 at 10:02 EAT. The merge tree is identical to the tested candidate.

## Specification A

Implemented in the existing Smart Library: pinned registration selection and refreshed counts; newest-first highlighted scans; explicit confirmation above an independently scrolling 50+ copy queue; focus preservation, duplicate/invalid-scan handling, borrower-change decisions and exact retry identities; atomic issuing with borrower/copy locks, permissions, audit and events. Lost copies stay outstanding until recovery or an explicit resolution.

Borrower Records uses authoritative school-scoped loans for individual/class/stream/school reports beyond page limits. The shared escaped representation supplies branded preview, print and Save as PDF with copy barcodes, borrower identity, dates, statuses, totals, repeated headers, readable A4 pagination, signatures and logo fallback. Outstanding and history scopes remain separate.

Reusable opt-in keyboard navigation covers the applicable library, exam, admissions/guardians, finance, inventory, staff, transport, boarding and school setup forms. It preserves native editing, Tab, IME and scanner suffixes. Marksheet navigation uses visible eligible cells and preserves a focused blank-filter row during multi-digit entry.

## Specification B

Implemented independent class subjects and optional stream exceptions within each existing exam cycle. Curriculum-filtered choices, counts, search/select-all/clear, summaries, draft preservation, unsaved navigation protection and clean subject labels are integrated with existing create/configure APIs.

Backend writes validate school ownership, offerings, dates and stream membership, save transactionally, reject stale configuration versions, and preserve entered marks, custom papers, timetable dependencies and unrelated submission locks. Authorized managers can enter unassigned subjects; teacher ownership remains enforced. Shared historical enrollment/placement rules drive markbooks, progress, readiness, report generation and analytics. Both timetable write paths validate paper ownership and preserve audit/events. Ambiguous legacy exams require explicit review; historical marks are not rewritten.

## Source and database

The release changes 77 files against production base `9af9d4617f9936f70753ff4b48fe0a07b295b12d`: 2,965 insertions and 506 deletions, including tests and evidence. The original dirty checkout and unrelated user work were preserved.

Key components: `class-exam-configuration.ts`, `class-exam-persistence.ts`, `exams-manager-command.service.ts`, `exam-mark-roster.ts`, exam repository/analytics, `class-subject-selection.tsx`, exam setup and teacher marks workspaces; `smart-library.service.ts`, librarian commands and Smart Library components; `borrower-report.ts`; `keyboard-navigation.ts` and existing form integrations. The complete file inventory is in the PR diff and `docs/myshule-library-exams-delivery-2026-10-28.md`.

No destructive migration or new Prisma migration file. The existing runtime schema bootstrap adds `exam_series.configuration_version`, nullable `exam_series.class_subjects`, and `exam_mark_entry_windows.stream_scope`, and extends the existing integrity triggers. Rollback retains these additive structures and all school activity.

## Verification from the release checkout

| Check | Actual evidence |
| --- | --- |
| API build, frontend TypeScript, Prisma validation | Passed locally; backend type check also passed in current CI |
| Focused UI regressions | 3 suites / 77 passed |
| Targeted PostgreSQL integration | 127 cases have passing coverage across five suites; initial combined run had one readiness fixture failure, corrected and rerun 9/9 |
| Affected exam service tests | 13/13 passed after updating the obsolete global-subject fixtures; includes permission denial before any transaction |
| Full CI | PR run 40778510709 and production run 40832937008 passed. Production quality: 1,547 Jest + 26 Node test executions; backend: 2,274 Node + 556 Jest executions across 38 integration suite executions; main-only integration: 59 tests across five suite executions. Counts include repeated workflow gates. TypeScript, lint, security/CodeQL, container and production Worker build passed |
| Class configuration browser | Passed at 320/390/768/1440 px; independent 9/7/6, edit to 9/6/6, versioned persistence, no overflow or console errors |
| Keyboard browser | Passed at 375/1280 px; native editing, grid modes, seven scanner suffixes and no implicit saves |
| Library browser | Passed at 390/1440 px; ten registrations per width, 56-copy queue, explicit loss recording, 300-row preview and actual print invocation |
| Printable reports | Eight variants passed copy-count/text/A4/pagination checks; 0/3/60/300 copies, individual/class/school, logo/fallback and portrait/landscape. The 300-copy PDF is 27 pages; rendered pages and contact sheet were visually inspected |

Failed, interrupted and timed-out attempts are preserved in the release record and excluded from passing totals. Browser fixtures import actual components against isolated APIs; PostgreSQL integration separately verifies real services, transactions and tenant isolation. No live school mutation, payment or notification was used as test data.

The CI report-generation suite passed all 27 cases; its real 100-card/seven-subject benchmark took 8.085 seconds in the final main run (all PDFs persisted with audit/outbox); the earlier PR run took 12.524 seconds. The paired readiness suite had eight passes and one five-second timeout in its 56-exam fixture. That case now has an explicit 60-second test timeout with all data and assertions retained; the fresh local run with the scoped timeout passed 9/9 readiness cases in 290.021 seconds including suite startup. Full PR CI subsequently passed at revision `77a1535d`, run `40778510709`. Backend logs record 2,274 passing Node test executions (including the core 1,603) and 556 passing Jest integration test executions across 38 suite executions; some tests intentionally run in multiple workflow gates, so these totals are executions rather than unique cases.

## Regressions corrected

Corrected stale global-subject fixtures and old newest-first scan expectations; retained submitted-sheet locks while showing eligible missing marks; preserved historical enrollment/placement and manager entry without a teacher; protected configured timetable papers; retained exact retry payloads and loss semantics; corrected desktop preview nested scrolling and print pagination, including trailing pages and repeated borrower headings.

## Deployment and operational evidence

PR #120 merged; [production run 40832937008](https://github.com/Robin142-alt/my-shule/actions/runs/40832937008) completed successfully. The API, payments, bulk-report and interactive-report services are all successfully deployed at `19c7ea4a`. Read-only postflight passed at 2026-10-29T07:08:23.010Z: three added columns, 17 enabled integrity guards, forced RLS on 13 tables, non-bypassing runtime role, signed/forged gateway checks, HTTP health/readiness 200 and unsigned examination/library reads 401. Inspected startup/live logs contain no error-level entries. Cloudflare published version `b04a3f20-3df0-40ce-9103-ec942d5cf8e5` at 10:26 EAT. CI and independent live smoke tests passed on both https://www.myshule.online and https://myshule-web.ondurobinson.workers.dev: pages, assets, images, PWA, CSRF and unsigned tenant/API protection. Independent exam/library probes at 10:28 EAT returned 401 with private/no-store caching on both hosts.

Preflight confirmed forced RLS on all 13 inspected tables and a runtime role without superuser/RLS-bypass privileges. The API and three workers were rechecked on the prior successful revision. A private production backup was refreshed on 29 October at 01:30 EAT and fully archive-read verified (5,469,306 bytes, 5,079 entries, SHA-256 `5349336a62b6d59d8f8a87d3bf927adc9e509d514453feda63389dfcd8825d44`); the earlier archive was retained and no restore was performed. Previous application and Cloudflare versions are recorded for rollback.

## Remaining limits and readiness

Implementation, PR/main CI, merge, deployment and read-only production postflight are complete. The separate deploy-railway GitHub job was skipped by the existing deployment-mode condition; the established Railway Git integration successfully deployed all four services and their revisions were independently verified. Live authenticated browser acceptance could not proceed after browser control was disabled in Work settings; no legal agreement was accepted. Physical scanner, printer and assistive-technology checks are not claimed. Ambiguous legacy exam mappings require school review.

Technical release gates passed and the software is deployed. No remaining deployment dependency was observed. School-specific operational acceptance remains qualified by the authenticated-session, physical-device and assistive-technology limits above; do not interpret fixture tests or anonymous production probes as live-school end-to-end acceptance. Existing ambiguous examinations must be reviewed through the supplied configuration workflow before opening new marks.

### Backend deployment identifiers

- payments-worker: `779696b8-0c61-4960-9113-76b2d9016b79`.
- reports-bulk: `2ea312e5-c95a-425d-b65c-cfcd9029ed57`.
- my-shule-api: `885df653-df00-4fb2-9d1d-2b95e313d75f`.
- reports-interactive: `4c47f174-2b37-4f5c-b385-da712fe36124`.
