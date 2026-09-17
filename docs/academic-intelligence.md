# Academic Intelligence upgrade

The existing `/exams/analytics` endpoint now supplies one shared calculation engine and one shared workspace. The live Exams Analytics tab, leadership workspaces, teacher/class-teacher experiences, HOD and Grade/Form Master use that contract. Existing marks, moderation, report-card and intervention workflows remain the operational paths.

## Audit and architecture

The previous implementation provided school, department and assignment aggregates, simple trend/subject charts, learner progress and data-quality counts. Its live exams presentation duplicated the Academic Intelligence workspace. Existing source contracts include exam series, weighted assessments, mark-entry windows, numeric/explicit mark status, reviewed/locked/published marks, current report-card versions, grading-policy boundaries, teaching allocations, class teachers, department HOD appointments, general academic role appointments and academic interventions.

The upgrade reuses those sources, the repository tenant execution helper, active tenant membership, service permissions, school query/mutation hooks, Recharts, the modal component and the existing intervention event/audit/notification/task flow. Analytics reads do not create events or notifications. Starting an intervention uses the existing persisted command and its governed side effects.

The governance review followed the repository boot order: authenticated role/capability and tenant context, parameterized database contracts, appointment scope, existing dashboard/routes, existing exam state machines, intervention notifications/audit, online mutation feedback, report workflows, and workflow/isolation tests. No new event bus, background infrastructure or analytics tables were introduced.

## Authorization

| Experience | Default scope | Backend boundary |
| --- | --- | --- |
| Subject Teacher | assignment | Active subject/class/term/stream allocation |
| Head of Subject | subject | Active subject-specific academic appointment, with optional year/class/stream restriction |
| Class Teacher | class | Active class-teacher appointment for the exam year |
| HOD | department | Active canonical department HOD appointment |
| Grade/Form Master | grade | Existing grade/form appointment's class/stream and optional year |
| Dean | school | Authorized school leadership role |
| Deputy Principal | school | Authorized school leadership role |
| Principal | school | Authorized school leadership role |

The responsibility selector contains only scopes authorized by the backend. A teacher who also holds a HOS appointment can select subject scope without gaining unrelated subjects. An explicit unauthorized scope is rejected. Client school IDs and actor IDs are ignored; tenant and identity come from the request context. Every query and subquery is tenant-bound and uses the existing RLS execution helper.

HOS required one additive field: `subject_id` on `academics_role_appointments`. The existing bootstrap migration adds it idempotently and replaces the active-appointment unique index with a subject-aware index. The existing academic appointment form/service validates and persists HOS subject ownership, and rejects a mismatched department or inactive subject. Historical appointments without a subject do not grant subject scope. No existing appointment is guessed or backfilled.

## Metrics and evidence rules

- Numeric performance requires valid locked/published marks and an approved/published current report card. Missing, absent, incomplete, invalid and unapproved numeric work never becomes zero.
- Assessment scores are normalized against their maximum and weighted with the existing assessment weight. Subject averages are combined equally into learner averages; population statistics give each learner equal weight. Period summaries combine available exam evidence within each learner. Coverage can differ between periods and is visible in counts.
- Mean, median, highest/lowest learner average, range and population standard deviation use approved numeric evidence. Mean grade is available only with one common grading policy. Points and positions remain absent for CBC competency reporting.
- Grading distributions and pass/fail rates count learner-subject results using the recorded grading policy and its configured boundaries. They are explicitly labelled with that denominator. Learners passing all subjects and learners failing any subject are separate counts. Ungraded numeric results do not silently pass at an invented threshold.
- Exam comparisons, historical benchmarks, term/year comparisons, learner trajectories, area baselines, consistency, score-band movement, performance gaps, opt-in positions and persisted cohort progression are derived by the engine. Changes are score or percentage-point differences, not relative percentage growth.
- Ranking uses only the authorized, filtered evidence population, shares tied positions, and requires the school's existing `show_rank` setting plus a traditional grading policy. It is labelled as a position within this selection.
- Risk thresholds are published in `ANALYTICS_RULES` and the advanced view. Reasons cover subject failures, sharp drops, missing/absent assessments, repeated failure, consecutive decline and personal-baseline decline. Consistency needs at least three exams. Historical risk uses the history available at the compared exam. Risk changes are observed associations, not diagnoses.
- Recognition filters identify high performers, improvement, consistent improvement, consistently high performance and passing all subjects. Teacher comparisons describe subject/class allocations and include historical context; they do not rank teacher effectiveness.
- Attention summaries are deterministic and link to the relevant evidence/action view. No external LLM or production fixture data is used.
- Intervention baselines are calculated again on the server for the authorized learner/subject. Client-supplied baseline scores cannot override them. Numeric before/after outcomes and success rates use measured completed interventions only. Effectiveness does not establish causation.

## Frontend and workflow integration

Eight overview cards lead into performance, comparisons, learners, trends, targets, risk, advanced analytics, exam analysis, interventions and operations. Report cards appear when a real report workflow callback is available. Authorized filters narrow the shared contract; the server paginates learner responses after matching risk, grade, status, recognition and learner search criteria.

Comparison tables drill into learners. Learner profiles show subject results, risk reasons, history, consistency and configured positions. The learner/subject matrix supports class follow-up. HOD subject comparisons name configured subject heads. Existing marks/report callbacks remain the next step for missing work, review and publication. Starting an intervention validates dates and required fields, disables duplicate submits, retains errors, and refreshes live data after persistence. Offline network errors are shown truthfully rather than reporting a queued intervention as saved.

Loading, failed refresh, malformed nested data, empty approved results, missing history, no target and absent question data have explicit states. Cached analytics is suppressed when a refresh fails. Tables scroll horizontally within their workspace where necessary; forms, cards and actions use responsive layouts.

## Files changed for this upgrade

- API engine/scope/query and tests: `apps/api/src/modules/exams/analytics/`.
- Existing API integration: `exams.controller.ts`, `exams.service.ts`, `dto/exams.dto.ts`, `repositories/exams.repository.ts`, `exams-schema.service.ts`, and `exams.test.ts` under `apps/api/src/modules/exams/`.
- HOS appointment contract: academics DTO, schema, repository and service under `apps/api/src/modules/academics/`.
- Shared UI: `apps/web/src/components/school/academic-intelligence-workspace.tsx`, new `academic-intelligence-panels.tsx`, `grade-master-command-center.tsx`, and `academic-foundation-workspace.tsx`.
- Live Exams integration/reusable charts: `apps/web/src/components/modules/exams/exams-module-screen.tsx`, `AnalyticsDashboard.tsx`, and additive controlled behavior in `apps/web/src/components/ui/tabs.tsx`.
- Shared response types/validation: `apps/web/src/lib/modules/academic-intelligence.ts` and `exams-client.ts`.
- Tests: `apps/api/test/academic-intelligence.integration-spec.ts`, `apps/web/tests/design/academic-intelligence-upgrade.test.tsx`, and `academic-intelligence-browser.mjs`. The root test script includes the new engine/service tests.

Several of these files already had unrelated local edits when work began. Those edits, and unrelated authentication/admissions/cohort work, were preserved.

## Verification and limits

| Check | Result |
| --- | --- |
| Backend exams, academics, analytics engine and intervention service tests | 197 passed |
| Disposable PostgreSQL scope/RLS/migration/query-plan integration tests | 10 passed |
| Frontend analytics, exams, academic foundation and role/experience routing regressions | 81 passed across 11 suites |
| Final focused analytics UI run, including filter-reset regression | 10 passed across 2 suites |
| Additional broad dashboard action-contract run | 179 passed, 3 existing failures described below |
| API build and final TypeScript compile | Passed |
| Web TypeScript check | Passed |
| Final production Next.js build | Passed, including type checking and generation of 96 static pages; emitted bundle verified to contain the final filter fix |
| Full web ESLint run | No errors; existing repository warnings remain |
| Focused new analytics UI/chart/contract/test lint | Passed without warnings |
| Chromium shared-component workflow checks | Passed at 390×844 and 1440×1000 |

Reproduce the focused checks from the repository root:

```powershell
npm run build
node --test dist/apps/api/src/modules/exams/exams.test.js dist/apps/api/src/modules/academics/academics.test.js dist/apps/api/src/modules/exams/analytics/analytics.test.js dist/apps/api/src/modules/exams/analytics/analytics-service.test.js
node -r ts-node/register/transpile-only -r tsconfig-paths/register apps/api/test/support/run-integration-with-local-postgres.ts jest --config jest.integration.config.js --runInBand apps/api/test/academic-intelligence.integration-spec.ts
```

From `apps/web`, run `npm run lint`, `node node_modules/typescript/bin/tsc --noEmit`, `npm run test:design -- --testPathPatterns='academic-intelligence.*test|exams-workspace|teacher-exams-marks|exams-manager|academic-foundation|role-routing|experience-routing'`, and `node node_modules/next/dist/bin/next build`. The direct Next build avoids the existing clean-build helper's broad process termination. After a web build, run `node apps/web/tests/design/academic-intelligence-browser.mjs` from the repository root.

Verification logs and browser screenshots are stored under `output/academic-intelligence-*`. PostgreSQL tests run only against the repository's disposable database runner, with forced RLS and a restricted read role. They test all six scopes, tenant collisions, forbidden scope escalation, narrowing filters, historical evidence, bootstrap idempotence and the query plan. The browser harness renders the actual components with generated production CSS and test-only API evidence at 390×844 and 1440×1000; it exercises learner profiles, intervention submission, marks navigation and empty/error/loading states. It does not certify a live authenticated production school or an external notification provider.

The broader frontend regression run found three existing action-contract failures in `dashboard-action-contract.test.ts`: two expect older Deputy exam action source patterns, and one expects the older Dean generic action endpoint. Their target implementation files were unchanged by this upgrade. They are tracked as existing failures rather than removed or weakened.

The read model aggregates assessment rows in SQL, has tenant-aware indexes, caps history at 24 exam cycles through the selected exam plus an explicit comparison, and limits learner pages to 100. Query-plan output is `output/academic-intelligence-query-plan.json`. The small forced-RLS fixture checks SQL correctness and execution behavior; it is not a production-volume load certification. Large schools should benchmark their real learner/subject/history distribution before rollout. An authorized summary cache or projection can be added if those measurements justify it.

There is no general academic-target persistence model in the inspected exams/academics sources. Scope targets therefore show “No target configured”; intervention-specific targets remain available in their existing records. There are no recorded question-by-question learner scores, so question analytics is explicitly unavailable. Cohort history requires actual persisted cohort identifiers; no class-name inference is made. Separate HOS/HOD review percentages, returned-correction counts and approval-delay timing cannot be inferred from the existing generic mark states, so operations displays the real persisted states. Topic mastery, syllabus coverage and syllabus-versus-result analytics remain intentionally excluded.

No production database was seeded or modified, and no deployment was performed.
