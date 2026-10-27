# Shared syllabus and teacher coverage

Subject heads define one published syllabus per school, subject, grade/form, academic year and term. Authorized department heads can do the same for subjects in their department. Principal, Deputy Principal and Dean have school monitoring access; that access alone does not grant syllabus authoring or permission to tick another teacher's work.

The module uses existing subjects, `class_sections.grade_level`, classes, streams, academic years/terms, teacher allocations, subject-head appointments and department-head appointments. It introduces no duplicate subject, calendar, class, stream or staff directory.

## Workspaces

- Teacher: Academics → Syllabus.
- Head of Subject: Academics & Teaching → Syllabus Coverage.
- HOD: Academics → Coverage Review.
- Principal: Academics → Syllabus Coverage.
- Deputy Principal: Teaching Workspace → Syllabus Coverage.
- Dean of Academics: Curriculum Coverage.

Teachers tick or untick individual subtopics and optionally save a teaching note. The server binds the actor, school, allocation and timestamp. Each teacher/allocation retains independent records, including when the same teacher teaches two streams. A different teacher cannot inherit completion ticks if an allocation changes owner. Ended allocations remain visible as read-only history.

The workspace provides compact progress summaries, expandable filters and responsive class cards on phones. Teacher mode shows the actor's own classes. Checklists offer All, To teach and Taught views plus topic search; filtering retains unsaved note drafts. The authoring form groups class/term selection, topics/subtopics and milestones into three steps with a persistent publish action. Optional subtopic settings remain collapsed until needed.

Coverage is completed active **required subtopics / active required subtopics**. Optional subtopics do not inflate that percentage. A topic is complete only when it has required subtopics and all are complete. Lesson plans, lesson logs and elapsed calendar time never create completion. A missing syllabus is reported as setup required.

Dates use the Kenyan school day. A requirement becomes overdue after its completion date, or an earlier milestone targeting it. Milestones show upcoming, overdue, completed or completed late. Catching up removes the current delay while preserving evidence that a milestone was completed late.

## Revisions and persistence

`academics_syllabi` stores the versioned topic/subtopic/milestone document. `academics_syllabus_coverage` stores independent checkbox state, note, teacher, completion time and version. Both tables have tenant-aware keys and forced PostgreSQL row-level security, bootstrapped by `AcademicsSchemaService` after the academic contracts exist. No existing lesson history is converted into claimed syllabus completion, and no demo data is seeded.

Revisions retain existing topic and subtopic IDs. Archive retired content rather than deleting it; archived content and its recorded coverage remain inspectable. Adding a required subtopic updates the denominator immediately. Moving a syllabus to a different subject, grade or period requires a new syllabus. Closing a term or year blocks coverage mutations and syllabus revisions.

Publication and teacher ticks run inside school-scoped transactions. Row/advisory locks and optimistic document/coverage versions reject stale edits and concurrent duplicate submissions. Audit and durable outbox writes participate in the same transaction. A failed governance write rolls back the mutation. Publication creates in-app notifications for allocated teachers. Routine teacher ticks require no approval.

Offline submissions are deliberately not queued by this workspace: failed writes remain visibly unsaved and notes remain available for retry. This prevents a queued checkbox from being applied silently after an allocation or syllabus revision changes.

## Contracts and reporting

- `GET /academics/syllabus`: authorized references, shared syllabi and allocation-level coverage.
- `POST /academics/syllabus`: publish a syllabus using school reference IDs, topics and milestones.
- `PATCH /academics/syllabus/:id`: publish a revision with the current syllabus `version`.
- `POST /academics/syllabus/:id/subtopics/:subtopicId/coverage`: requires `assignment_id`, boolean `completed`, `syllabus_version`, coverage `version` (zero for a new record), and optional `note` (maximum 2,000 characters).
- `POST /academics/syllabus/export`: audited CSV artifact containing only the caller's authorized allocations, document number, school ID, generation metadata, real coverage, outstanding subtopics, overdue requirements and milestone outcomes. Spreadsheet formula text is escaped. The coverage table provides the report preview; the download exports all authorized rows, independent of current display filters.

All routes require authentication, Academics module access and `academics:read`. The service additionally requires active school membership and validates the authoring appointment or the exact teacher allocation. Student/parent access is denied even if another role happens to carry an academic read capability.

Events are `academic.syllabus.updated`, `academic.syllabus.coverage_updated` and `academic.syllabus.exported`. They use the existing school event envelope, audit repository and durable outbox. School-scoped dashboard events refresh shared queries; the workspace also refreshes every 15 seconds and offers manual retry.

## Bootstrap evidence and verification

The **CODEx Master Bootstrap**, **AGP Governance**, **Agent Governance Protocol** and **Tenant Isolation Layer** are enforced through authenticated route permissions, active school membership, appointment/allocation checks, tenant predicates and forced RLS. **Database Contract Layer** is implemented by `syllabus-schema.ts` and the academic schema bootstrap. **Event Bus Initialization** uses the existing publisher/outbox and realtime configuration. **Widget Registry Initialization** remains the existing dashboard registry; coverage is an operational workspace over shared academic data. **Autonomous Runtime Execution**, **Self-Healing Autonomous Agents**, **Cloud-Native Execution Layer** and **Global Execution Loop** retain existing platform behavior, with visible errors, refresh/retry and durable events instead of hidden failure or false success.

Run `npm run test:syllabus` for calculation tests, disposable PostgreSQL workflow/RLS tests and interactive React tests. Also run API/web TypeScript checks and the existing academic/dashboard regression suites. The tests cover independent teachers/streams, authorization, cross-school attempts, revisions, dates, unticking, notes, notifications, stale/concurrent submissions, governance rollback and export scope. Deployment is separate from local implementation and verification.

### Verification and release — 27 October 2026

- Initial implementation: 5 calculation tests, 10 disposable PostgreSQL tests and 8 React tests passed. The refined UI now has 10 syllabus tests; together with Dean usability and Head of Subject navigation, all 31 focused UI tests passed.
- API TypeScript compilation and web TypeScript checking passed.
- Targeted ESLint checks passed for the shared syllabus components, types, workspace adapters and new UI/browser tests.
- Six focused web suites passed all 101 tests: syllabus coverage, Dean usability, Dean/HOD contracts, Head of Subject navigation, Principal routes and Deputy routes. This total includes the 8 syllabus React tests above.
- `node apps/web/tests/design/syllabus-browser.mjs` passed at 320, 768, 1024 and 1440 pixels with no JavaScript errors or page overflow. It verified checkbox persistence, notes, independent streams, read-only monitoring and truthful failed writes. Screenshots and machine-readable results are in `tmp/syllabus-browser/`.
- The release worktree starts from production revision `14f1847b177a993f9ddb3011d304aeef78875e95`, retaining newer payment, legal, academic and report-card fixes. The original checkout's unrelated older changes were reconciled against current production rather than overwriting it. Its previously observed LegalController permission-metadata failure is already fixed in this production base.
- The refined component browser harness also passed from the release worktree, including the 390px syllabus editor and 320px checklist. No browser console errors were recorded.
- `npm run test:syllabus` passed on the reconciled release checkout: 5 calculation tests, 10 disposable PostgreSQL tests and 10 React tests.
- CI runs syllabus calculation tests with the backend unit suite, disposable PostgreSQL syllabus workflow tests in `build-and-test`, and the UI/routing tests in `quality`.

Database verification calls the real syllabus service and schema against disposable PostgreSQL with forced RLS. Audit, event and notification collaborators are transaction-bound test adapters. React tests and the browser harness exercise the real workspace components with test data; the browser harness serves local fixture endpoints and uses the existing compiled web CSS. These checks do not constitute an authenticated production school workflow test.

Deployment uses the existing main-branch Railway and Cloudflare pipeline. The API adds the two syllabus tables through its academic schema bootstrap before the verified web build is published. No data conversion or demo seeding is performed. Release status must be confirmed from the provider checks and live health endpoints; this document alone is not deployment evidence.

Rollback should retain the additive syllabus tables and recorded teacher coverage. Revert application changes through a reviewed release if necessary; do not drop these tables or restore a database backup over subsequent school activity. Older application code may display the former lesson-based coverage metric, so prefer a targeted forward fix where possible.
