# Scope-aware report cards and handoff

## Existing architecture and repair

The Exams Manager command center routes Report Cards to `LiveReportCardsWorkspace` and Handoff to `PublishingWorkspace`. Both use the authenticated Next school API proxy, Nest Exams controllers, `ExamsService`, and `ExamsRepository`. Durable cards and their generated snapshots live in `student_report_cards`; transitions are audited in `student_report_card_audit_logs`. Existing operational events, notification rules, and publication events connect the Exams Manager, Dean, Principal, and parent workflows.

The original scope helper was not used consistently. Repository queries duplicated scope rules; selected IDs could replace parent constraints; UI and server summary/result contracts differed; hierarchy rows were not grouped; pagination/export limits silently narrowed operations. Handoff duplicated the workflow UI. Bulk transitions did not preserve the individual notification path.

Both workspaces now use the same component and backend scope/transition implementation. The existing report-card state machine and PDF renderer remain authoritative.

## Scope contract

`ReportCardScope` contains `scopeType`, authenticated `schoolId`, and optional `examSeriesId`, `classSectionId`, `streamId`, `studentIds`, and `reportCardIds`.

HTTP fields use `scope_type`, `exam_series_id`, `class_section_id`, `stream_id`, `student_ids`, and `report_card_ids`. The server derives school ownership from authenticated request context, never a supplied school field. Selected lists always intersect every supplied parent constraint. Empty selections and inconsistent scope types fail instead of expanding to the school. A stream requires its class.

`parseReportCardScope`, `buildScopeSqlClause`, and `ExamsRepository.resolveReportCardScope` are shared by lists, summaries, transitions, and exports. Only current card revisions are included. The latest active student assignment supplies class/stream membership; a lateral join prevents duplicate legacy assignments from duplicating cards. This preserves the existing current-enrollment grouping rather than inventing historical enrollment semantics.

Ordering is class name, stream name, learner surname/first/middle name, admission number, and report-card ID as the final tie breaker.

## Frontend behavior

- Breadcrumbs support school, class, optional stream, and student. Streamless classes go straight to students.
- Scope changes clear row selections, preview state, and pending confirmations.
- All actions use the active server scope even when checkboxes are selected. Selected actions explicitly add the custom subset.
- Table search, status filters, and 50-row pagination affect the table only. The interface keeps scope totals visible; scope-wide operations never send the table's offset or limit.
- Every bulk action first requests fresh server eligibility and shows its total, eligible count, exclusions, and reasons. Confirmation freezes those scope parameters and its preview token.
- Partial results display successful, skipped, and failed counts with learner-level reasons, then refresh cards, counts, and hierarchy.
- Individual preview, comments, submission, recall, regeneration, print, and download remain available according to the existing audience/status rules. Handoff uses the Exams Manager audience and grants no publication authority.
- Export jobs show progress, errors, and one combined PDF download or print preview. Popup blocking falls back to downloading the PDF with a truthful explanation.

## Endpoints

| Endpoint under `/exams/report-cards` | Purpose |
| --- | --- |
| `GET /scoped` | Scoped, searched, paginated table with submission eligibility reasons and filtered total |
| `GET /scope-hierarchy` | Grouped school classes and applicable streams |
| `GET /scope-summary?target_action=submit` | Fresh counts, exclusions, and `preview_token`; use `export` for print/download |
| `POST /bulk-transition` | Scope, action, preview token, optional correction reason; returns per-card outcomes |
| `POST /exports` | Confirm export; returns a direct URL or an asynchronous job ID |
| `GET /exports/:jobId` | Actor- and school-bound status/progress/download URL |
| `GET /exports/:jobId/download` | Stream a completed export |
| `GET /bulk-download-pdf` | Confirmed synchronous PDF for at most 200 eligible cards |
| `GET /:reportCardId/download` | Existing individual PDF renderer |

Lists and downloads require the existing `exams:read` capability and school desk role. Workflow actions use the same individual role/capability checks: Exams Manager submission, Dean approval, Principal publication, and existing recall/withdrawal rules. Existing JWT, module, and tenant guards continue to apply.

## Workflow safeguards

`reportCardIneligibilitySql` is shared by preview, individual transitions, and bulk transitions. Submission requires a current revision, an allowed draft status, a valid persisted snapshot, subject results, both comments, and reviewed/locked marks. Correction-required revisions must be regenerated first. Approval, recall, publication, and withdrawal retain their status gates. Recall and withdrawal require a reason.

The confirmation token binds scope, action, ordered card IDs, workflow versions, update timestamps, and eligibility results. Changed scopes or revisions invalidate confirmation before execution. The token is a consistency check; authorization is independently enforced every time.

Transitions use batches of 25 inside tenant-bound transactions. Each batch performs one conditional multi-row update with timestamp/status/revision/scope checks, and inserts per-card audit records in the same SQL statement. Existing operational events, notification projections, and publication outbox events use that transaction. Event/notification failures roll back the affected batch, which is retried individually to isolate bad records; successful records remain committed. Concurrent callers cannot transition the same revision twice. Retrying after completion requires refreshed confirmation; already-processed cards become ineligible.

The normal path batches card reads and writes. Per-card governed events and notifications remain intentional; the browser issues one workflow request rather than hundreds of card requests.

## PDF generation and queue

The PDFKit renderer uses the exact individual page-content function, branding, snapshot data, verification code, and signature rules. Each learner starts on a new A4 page. Automated tests compare decompressed page content with individually generated PDFs.

The server resolves ordered IDs, reads snapshots in batches of 50, checks revisions, caches school images, and spools a combined PDF to a private temporary file. Rendering yields between pages and waits when the output buffer grows. A final scope check rejects changes made during rendering. Failures remove the temporary output instead of returning a partial PDF. The Next proxy streams PDF responses.

Exports above 200 eligible cards use the existing Redis/BullMQ infrastructure via `report-card-exports`. `ReportCardExportService` registers a worker with concurrency one per API process and retries failed jobs three times. It restores a sanitized authenticated request context, checks the exams module, and binds jobs/downloads to both actor and school.

Completed artifacts are stored through the existing tenant-aware file-object service in 1 MiB chunks so they are available across API replicas without loading the entire PDF into server memory. Downloading concatenates those bytes server-side into one PDF stream. Chunks carry the `reports` retention policy with 24-hour expiry; the existing storage retention process handles cleanup. Queue completion records are eligible for removal after one hour and failed jobs after one day. Repeated requests reuse a job while retained; expired completed artifacts can be regenerated. Each completed generation records per-card export audit entries and a `document.generated` operational event.

Redis failure produces a retryable error for large exports. Small exports remain available through the direct generation path. No additional queue product, new report-card table, or browser-side PDF concatenation is introduced.

## Changed files

API:

- `apps/api/src/modules/exams/report-card-scope.ts`
- `apps/api/src/modules/exams/repositories/exams.repository.ts`
- `apps/api/src/modules/exams/exams.service.ts`
- `apps/api/src/modules/exams/exams.controller.ts`
- `apps/api/src/modules/exams/exams.module.ts`
- `apps/api/src/modules/exams/dto/exams.dto.ts`
- `apps/api/src/modules/exams/report-card-download.controller.ts`
- `apps/api/src/modules/exams/services/report-card-pdf-artifact.ts`
- `apps/api/src/modules/exams/services/report-card-export.service.ts` (new)

Frontend:

- `apps/web/src/components/school/live-report-cards-workspace.tsx`
- `apps/web/src/components/school/exams-manager/publishing-workspace.tsx`
- `apps/web/src/lib/modules/exams-client.ts`
- `apps/web/src/lib/dashboard/server-api-proxy.ts`

Tests and documentation:

- `apps/api/src/modules/exams/report-card-scope.test.ts`
- `apps/api/src/modules/exams/exams.test.ts`
- `apps/api/src/modules/exams/services/report-card-bulk-pdf.test.ts` (new)
- `apps/api/src/modules/exams/services/report-card-export.test.ts` (new)
- `apps/api/test/report-card-scope.integration-spec.ts` (new)
- `apps/web/tests/design/report-card-scopes.test.tsx` (new)
- `apps/web/tests/design/live-report-card-actions.test.tsx`
- `apps/web/tests/design/report-card-generation-readiness.test.tsx`
- `apps/web/tests/design/exams-manager-command-center.test.ts`
- `package.json` (focused verification command)
- `docs/report-card-scopes.md` (new)

## Verification and deployment

Focused verification is available as `npm run test:report-card-scopes`. It builds the API, runs scope/PDF/export tests, starts disposable local PostgreSQL for integration tests, and runs the core frontend workflows. It does not use a deployed school database.

Verified locally:

- 21 focused API tests: scopes, parent intersection, empty-selection rejection, roles/capabilities, confirmation, PDF pages/layout, export ownership/expiry/degraded states, and a complete 205-card queued artifact.
- 7 PostgreSQL integration tests: forced tenant RLS, streamless classes, duplicate assignments, pagination, mixed eligibility, rollback of failed audit/event work, concurrent submission, stale tokens, and ordered resolution of 507 export cards.
- 48 frontend tests across eight suites: both desks, all vs selected, scope switching, student drill-down, pagination, partial failures, queue progress/download failures, actionable empty handoff, routing, individual actions, Principal release, curriculum, and layout.
- Rendered two-page PDF inspected visually at page resolution: clean layout and separate, correct learners.
- API build and TypeScript compilation passed.
- Two API route/access checks also passed (23 tests in the final API run).
- Full web lint passed with zero errors and 1,567 existing warnings. Final lint of all changed frontend files passed without warnings. `git diff --check` passed.

Release preparation also restored the existing scoped mark-entry workflow whose frontend API export and backend route had become disconnected. Teacher-specific reopenings use the same deadline policy for discovery, roster reads, and transactional saves. Closing an entry window revokes extensions while preserving marks for the normal moderation workflow. Tenant scope, assignment checks, final-result locks, audit records, and notifications remain enforced. The teacher visibility integration suite uses a separate PostgreSQL schema so combined suites cannot collide.

The release fixes include the Exams Manager command controller/service and progress projection, Class Teacher service, shared mark-entry policy, frontend API client and teacher progress component. Principal student navigation now accepts its existing caller's route mode, and three frontend test files use supported Testing Library/Next request types. Legacy Principal signature lookup again checks the relevant tenant memberships. CI now runs the new report-card scope, PDF, queue, database, and entry-control checks.

The release web production build and standalone web TypeScript check both pass. Expanded frontend verification passes 71 tests across ten suites, including the restored entry controls, Principal release, academic policy, and shared proxy contracts.

Final release verification: 308 API unit/workflow tests, 31 PostgreSQL integration tests across report-card scopes, teacher visibility and mark-entry progress, and the 71 frontend tests pass. API compilation passes. Full web lint reports zero errors and 1,567 existing warnings. Two additional API route/access tests passed in the preceding 310-test run.

No database migration or data backfill is required. Deploy API and web together because bulk mutations/exports now require a preview token and share the corrected result contract. Restart API instances to register the report-card export worker; existing Redis, queue-prefix configuration, file storage, and storage-retention cleanup must be operational.
